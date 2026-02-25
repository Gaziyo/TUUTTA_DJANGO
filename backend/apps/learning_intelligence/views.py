from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    CognitiveProfile,
    GapMatrix,
    RemediationTrigger,
    AdaptivePolicy,
    AdaptiveRecommendation,
    AdaptiveDecisionLog,
    FailureRiskSnapshot,
    BaselineDiagnostic,
    GNNInsight,
    InterventionLog,
    GapClosureSnapshot,
)
from .serializers import (
    CognitiveProfileSerializer,
    GapMatrixSerializer,
    RemediationTriggerSerializer,
    AdaptivePolicySerializer,
    AdaptiveRecommendationSerializer,
    AdaptiveDecisionLogSerializer,
    FailureRiskSnapshotSerializer,
    BaselineDiagnosticSerializer,
    GNNInsightSerializer,
    InterventionLogSerializer,
    GapClosureSnapshotSerializer,
)


class CognitiveProfileViewSet(viewsets.ModelViewSet):
    serializer_class = CognitiveProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        qs = CognitiveProfile.objects.all()
        if org_id:
            qs = qs.filter(organization_id=org_id)
        # Non-staff users can only see their own profile
        if not user.is_staff:
            qs = qs.filter(user=user)
        return qs


class GapMatrixViewSet(viewsets.ModelViewSet):
    serializer_class = GapMatrixSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'priority']

    def get_queryset(self):
        user = self.request.user
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        qs = GapMatrix.objects.select_related('competency', 'recommended_course')
        if org_id:
            qs = qs.filter(organization_id=org_id)
        if not user.is_staff:
            qs = qs.filter(user=user)
        return qs

    @action(detail=False, methods=['post'], url_path='auto-enroll')
    def auto_enroll(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)
        from .tasks import auto_enroll_gap_courses_task

        auto_enroll_gap_courses_task.delay(str(org_id))
        return Response({'status': 'queued'})


class RemediationTriggerViewSet(viewsets.ModelViewSet):
    serializer_class = RemediationTriggerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return RemediationTrigger.objects.filter(organization_id=org_id)
        return RemediationTrigger.objects.none()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        serializer.save(organization_id=org_id)


class AdaptivePolicyViewSet(viewsets.ModelViewSet):
    serializer_class = AdaptivePolicySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return AdaptivePolicy.objects.filter(organization_id=org_id)
        return AdaptivePolicy.objects.none()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        serializer.save(organization_id=org_id)

    @action(detail=False, methods=['post'], url_path='optimize')
    def optimize(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)
        from .tasks import optimize_adaptive_policy_task

        optimize_adaptive_policy_task.delay(str(org_id))
        return Response({'status': 'queued'})

    @action(detail=False, methods=['post'], url_path='simulate')
    def simulate(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)
        from .tasks import run_multi_agent_policy_simulation_task

        episodes = request.data.get('episodes', 30)
        try:
            episodes = int(episodes)
        except (TypeError, ValueError):
            episodes = 30

        result = run_multi_agent_policy_simulation_task(str(org_id), episodes=max(5, min(200, episodes)))
        return Response({'status': 'completed', 'result': result})


class AdaptiveRecommendationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AdaptiveRecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        qs = AdaptiveRecommendation.objects.all()
        if org_id:
            qs = qs.filter(organization_id=org_id)
        if not user.is_staff:
            qs = qs.filter(user=user)
        return qs.order_by('-updated_at')

    @action(detail=False, methods=['post'], url_path='recalculate')
    def recalculate(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)
        from .tasks import generate_adaptive_recommendations_task

        generate_adaptive_recommendations_task.delay(str(org_id))
        return Response({'status': 'queued'})


class AdaptiveDecisionLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AdaptiveDecisionLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        qs = AdaptiveDecisionLog.objects.all()
        if org_id:
            qs = qs.filter(organization_id=org_id)
        if not user.is_staff:
            qs = qs.filter(user=user)
        return qs.order_by('-created_at')


class FailureRiskSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FailureRiskSnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        qs = FailureRiskSnapshot.objects.select_related('course', 'user')
        if org_id:
            qs = qs.filter(organization_id=org_id)
        if not user.is_staff:
            qs = qs.filter(user=user)
        return qs.order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='recalculate')
    def recalculate(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)
        from .tasks import compute_failure_risk_task

        compute_failure_risk_task.delay(str(org_id))
        return Response({'status': 'queued'})


class BaselineDiagnosticViewSet(viewsets.ModelViewSet):
    serializer_class = BaselineDiagnosticSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return BaselineDiagnostic.objects.filter(organization_id=org_id).order_by('-created_at')
        return BaselineDiagnostic.objects.none()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        serializer.save(organization_id=org_id, created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='run')
    def run(self, request, **kwargs):
        diagnostic = self.get_object()
        from .tasks import run_baseline_diagnostic_task

        run_baseline_diagnostic_task.delay(str(diagnostic.id))
        return Response({'status': 'queued'})


class GNNInsightViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GNNInsightSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return GNNInsight.objects.filter(organization_id=org_id).order_by('-created_at')
        return GNNInsight.objects.none()

    @action(detail=False, methods=['post'], url_path='refresh')
    def refresh(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)
        from .tasks import compute_gnn_insights_task

        compute_gnn_insights_task.delay(str(org_id))
        return Response({'status': 'queued'})


class InterventionLogViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        qs = InterventionLog.objects.all()
        if org_id:
            qs = qs.filter(organization_id=org_id)
        if not user.is_staff:
            qs = qs.filter(user=user)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        payload = {'organization_id': org_id}
        if not self.request.data.get('user'):
            payload['user'] = self.request.user
        serializer.save(**payload)


class GapClosureSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GapClosureSnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return GapClosureSnapshot.objects.filter(organization_id=org_id).order_by('-created_at')
        return GapClosureSnapshot.objects.none()

    @action(detail=False, methods=['post'], url_path='recalculate')
    def recalculate(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)
        from .tasks import record_gap_closure_snapshot_task

        record_gap_closure_snapshot_task.delay(str(org_id))
        return Response({'status': 'queued'})
