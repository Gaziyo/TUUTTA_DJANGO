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
    run_autonomous_addie_pipeline_task,
    resume_autonomous_addie_pipeline_task,
    cancel_autonomous_addie_pipeline_task,
    retry_autonomous_stage_task,
)
from .models import (
    GenieSource,
    GeniePipeline,
    ELSProject,
    ELSProjectPhase,
    ELSProjectException,
    ELSProjectRunMetric,
)
from .serializers import (
    GenieSourceSerializer,
    GeniePipelineSerializer,
    ELSProjectSerializer,
    ELSProjectListSerializer,
    ELSProjectPhaseSerializer,
    ELSProjectExceptionSerializer,
    ELSProjectRunMetricSerializer,
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

    @action(detail=True, methods=['post'], url_path='pipeline/run-autonomous')
    def run_autonomous(self, request, pk=None, **kwargs):
        project = self.get_object()
        idempotency_key = (
            request.headers.get('Idempotency-Key')
            or request.data.get('idempotency_key')
            or f'auto-{project.id}-{int(timezone.now().timestamp())}'
        )
        result = run_autonomous_addie_pipeline_task(
            str(project.id),
            idempotency_key=idempotency_key,
            requested_by=str(request.user.id),
        )
        status_code = status.HTTP_200_OK
        if result.get('status') == 'missing':
            status_code = status.HTTP_404_NOT_FOUND
        elif result.get('status') in {'failed'}:
            status_code = status.HTTP_400_BAD_REQUEST
        return Response(result, status=status_code)

    @action(detail=True, methods=['post'], url_path='pipeline/resume')
    def resume_pipeline(self, request, pk=None, **kwargs):
        project = self.get_object()
        idempotency_key = (
            request.headers.get('Idempotency-Key')
            or request.data.get('idempotency_key')
            or f'resume-{project.id}-{int(timezone.now().timestamp())}'
        )
        result = resume_autonomous_addie_pipeline_task(
            str(project.id),
            idempotency_key=idempotency_key,
            requested_by=str(request.user.id),
        )
        status_code = status.HTTP_200_OK
        if result.get('status') == 'blocked':
            status_code = status.HTTP_409_CONFLICT
        elif result.get('status') == 'missing':
            status_code = status.HTTP_404_NOT_FOUND
        return Response(result, status=status_code)

    @action(detail=True, methods=['post'], url_path='pipeline/cancel')
    def cancel_pipeline(self, request, pk=None, **kwargs):
        project = self.get_object()
        reason = request.data.get('reason', 'Canceled by operator')
        result = cancel_autonomous_addie_pipeline_task(str(project.id), reason=reason)
        status_code = status.HTTP_200_OK
        if result.get('status') == 'missing':
            status_code = status.HTTP_404_NOT_FOUND
        return Response(result, status=status_code)

    @action(detail=True, methods=['post'], url_path='pipeline/retry-stage')
    def retry_stage(self, request, pk=None, **kwargs):
        project = self.get_object()
        phase = request.data.get('phase', '')
        result = retry_autonomous_stage_task(str(project.id), phase=phase, requested_by=str(request.user.id))
        status_code = status.HTTP_200_OK
        if result.get('status') == 'invalid_phase':
            status_code = status.HTTP_400_BAD_REQUEST
        elif result.get('status') == 'missing':
            status_code = status.HTTP_404_NOT_FOUND
        return Response(result, status=status_code)

    @action(detail=True, methods=['post'], url_path='pipeline/rollout')
    def update_rollout_controls(self, request, pk=None, **kwargs):
        project = self.get_object()
        mode = request.data.get('mode', 'autonomous')
        kill_switch = bool(request.data.get('kill_switch', False))
        guardrails = request.data.get('guardrails') or {}
        project.autonomous_mode = mode == 'autonomous' and not kill_switch
        project.phases_data = {
            **(project.phases_data or {}),
            'rollout_controls': {
                'mode': mode,
                'kill_switch': kill_switch,
                'guardrails': guardrails,
                'updated_by': str(request.user.id),
                'updated_at': timezone.now().isoformat(),
            },
        }
        project.save(update_fields=['autonomous_mode', 'phases_data', 'updated_at'])
        return Response({
            'project_id': str(project.id),
            'autonomous_mode': project.autonomous_mode,
            'rollout_controls': project.phases_data.get('rollout_controls', {}),
        })

    @action(detail=True, methods=['get'], url_path='pipeline/status')
    def pipeline_status(self, request, pk=None, **kwargs):
        project = self.get_object()
        phases = ELSProjectPhase.objects.filter(project=project).order_by('phase')
        return Response({
            'project_id': str(project.id),
            'run_state': project.run_state,
            'current_phase': project.current_phase,
            'run_id': str(project.current_run_id) if project.current_run_id else '',
            'idempotency_key': project.current_idempotency_key,
            'correlation_id': project.current_correlation_id,
            'run_attempt': project.run_attempt,
            'run_started_at': project.run_started_at,
            'run_completed_at': project.run_completed_at,
            'last_error_code': project.last_error_code,
            'last_error_message': project.last_error_message,
            'phases': ELSProjectPhaseSerializer(phases, many=True).data,
        })

    @action(detail=True, methods=['get'], url_path='pipeline/metrics')
    def pipeline_metrics(self, request, pk=None, **kwargs):
        project = self.get_object()
        run_id = request.query_params.get('run_id')
        qs = ELSProjectRunMetric.objects.filter(project=project).order_by('-created_at')
        if run_id:
            qs = qs.filter(run_id=run_id)
        return Response(ELSProjectRunMetricSerializer(qs[:250], many=True).data)

    @action(detail=True, methods=['get'], url_path='exceptions')
    def list_exceptions(self, request, pk=None, **kwargs):
        project = self.get_object()
        qs = ELSProjectException.objects.filter(project=project).order_by('-created_at')
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(ELSProjectExceptionSerializer(qs[:200], many=True).data)

    @action(detail=True, methods=['post'], url_path='exceptions/(?P<exception_id>[^/.]+)/resolve')
    def resolve_exception(self, request, pk=None, exception_id=None, **kwargs):
        project = self.get_object()
        exception = ELSProjectException.objects.filter(project=project, id=exception_id).first()
        if not exception:
            return Response({'error': 'exception not found'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action', 'resolve')
        notes = request.data.get('notes', '')
        if action == 'reject':
            exception.status = 'rejected'
        elif action == 'override':
            exception.status = 'overridden'
        else:
            exception.status = 'resolved'
        exception.resolved_by = request.user
        exception.resolution_notes = notes
        exception.resolved_at = timezone.now()
        exception.save(update_fields=['status', 'resolved_by', 'resolution_notes', 'resolved_at', 'updated_at'])
        return Response(ELSProjectExceptionSerializer(exception).data)
