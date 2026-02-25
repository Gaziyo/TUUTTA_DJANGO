from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .tasks import (
    ingest_project_task,
    analyze_project_task,
    design_project_task,
    develop_project_task,
    implement_project_task,
    evaluate_project_task,
)
from .models import GenieSource, GeniePipeline, ELSProject, ELSProjectPhase
from .serializers import (
    GenieSourceSerializer,
    GeniePipelineSerializer,
    ELSProjectSerializer,
    ELSProjectListSerializer,
    ELSProjectPhaseSerializer,
)

ELS_PHASE_ORDER = ['ingest', 'analyze', 'design', 'develop', 'implement', 'evaluate', 'personalize', 'portal', 'govern']


class GenieSourceViewSet(viewsets.ModelViewSet):
    serializer_class = GenieSourceSerializer

    def get_queryset(self):
        user = self.request.user
        return GenieSource.objects.filter(organization__members__user=user).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class GeniePipelineViewSet(viewsets.ModelViewSet):
    serializer_class = GeniePipelineSerializer

    def get_queryset(self):
        user = self.request.user
        return GeniePipeline.objects.filter(organization__members__user=user).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ELSProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'current_phase']

    def get_serializer_class(self):
        if self.action == 'list':
            return ELSProjectListSerializer
        return ELSProjectSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return ELSProject.objects.filter(organization_id=org_id).prefetch_related('phase_records')
        return ELSProject.objects.filter(
            organization__members__user=self.request.user
        ).prefetch_related('phase_records').distinct()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        project = serializer.save(
            created_by=self.request.user,
            last_modified_by=self.request.user,
            organization_id=org_id,
        )
        # Initialise all 9 phase records at pending
        for phase, _ in ELSProjectPhase._meta.get_field('phase').choices:
            ELSProjectPhase.objects.get_or_create(
                project=project,
                phase=phase,
                defaults={'status': 'pending'},
            )

    def perform_update(self, serializer):
        serializer.save(last_modified_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='phases/(?P<phase>[^/.]+)/start')
    def start_phase(self, request, pk=None, **kwargs):
        project = self.get_object()
        phase = kwargs.get('phase')
        record, _ = ELSProjectPhase.objects.get_or_create(project=project, phase=phase)
        record.status = 'in_progress'
        record.started_at = timezone.now()
        record.save()
        project.current_phase = phase
        project.last_modified_by = request.user
        project.save(update_fields=['current_phase', 'last_modified_by', 'updated_at'])
        return Response(ELSProjectPhaseSerializer(record).data)

    @action(detail=True, methods=['post'], url_path='phases/(?P<phase>[^/.]+)/complete')
    def complete_phase(self, request, pk=None, **kwargs):
        project = self.get_object()
        phase = kwargs.get('phase')
        record, _ = ELSProjectPhase.objects.get_or_create(project=project, phase=phase)
        record.status = 'completed'
        record.completed_at = timezone.now()
        output_data = request.data.get('output_data', {})
        if output_data:
            record.output_data = output_data
        bloom_dist = request.data.get('bloom_distribution', {})
        if bloom_dist:
            record.bloom_distribution = bloom_dist
        record.save()

        # Auto-advance current_phase to next
        try:
            idx = ELS_PHASE_ORDER.index(phase)
            if idx < len(ELS_PHASE_ORDER) - 1:
                project.current_phase = ELS_PHASE_ORDER[idx + 1]
        except ValueError:
            pass

        project.last_modified_by = request.user
        project.save(update_fields=['current_phase', 'last_modified_by', 'updated_at'])
        return Response(ELSProjectPhaseSerializer(record).data)

    @action(detail=True, methods=['post'], url_path='link-course')
    def link_course(self, request, pk=None, **kwargs):
        project = self.get_object()
        course_id = str(request.data.get('course_id', ''))
        if course_id and course_id not in project.created_course_ids:
            project.created_course_ids.append(course_id)
            project.last_modified_by = request.user
            project.save(update_fields=['created_course_ids', 'last_modified_by', 'updated_at'])
        return Response({'created_course_ids': project.created_course_ids})

    @action(detail=True, methods=['post'], url_path='link-assessment')
    def link_assessment(self, request, pk=None, **kwargs):
        project = self.get_object()
        assessment_id = str(request.data.get('assessment_id', ''))
        if assessment_id and assessment_id not in project.created_assessment_ids:
            project.created_assessment_ids.append(assessment_id)
            project.last_modified_by = request.user
            project.save(update_fields=['created_assessment_ids', 'last_modified_by', 'updated_at'])
        return Response({'created_assessment_ids': project.created_assessment_ids})

    @action(detail=True, methods=['post'], url_path='pipeline/ingest')
    def run_ingest(self, request, pk=None, **kwargs):
        project = self.get_object()
        ingest_project_task.delay(str(project.id))
        return Response({'status': 'queued', 'phase': 'ingest'})

    @action(detail=True, methods=['post'], url_path='pipeline/analyze')
    def run_analyze(self, request, pk=None, **kwargs):
        project = self.get_object()
        analyze_project_task.delay(str(project.id))
        return Response({'status': 'queued', 'phase': 'analyze'})

    @action(detail=True, methods=['post'], url_path='pipeline/develop')
    def run_develop(self, request, pk=None, **kwargs):
        project = self.get_object()
        develop_project_task.delay(str(project.id))
        return Response({'status': 'queued', 'phase': 'develop'})

    @action(detail=True, methods=['post'], url_path='pipeline/design')
    def run_design(self, request, pk=None, **kwargs):
        project = self.get_object()
        design_project_task.delay(str(project.id))
        return Response({'status': 'queued', 'phase': 'design'})

    @action(detail=True, methods=['post'], url_path='pipeline/implement')
    def run_implement(self, request, pk=None, **kwargs):
        project = self.get_object()
        implement_project_task.delay(str(project.id))
        return Response({'status': 'queued', 'phase': 'implement'})

    @action(detail=True, methods=['post'], url_path='pipeline/evaluate')
    def run_evaluate(self, request, pk=None, **kwargs):
        project = self.get_object()
        evaluate_project_task.delay(str(project.id))
        return Response({'status': 'queued', 'phase': 'evaluate'})
