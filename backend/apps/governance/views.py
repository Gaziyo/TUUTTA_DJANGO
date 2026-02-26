from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    GovernancePolicy,
    ExplainabilityLog,
    BiasScan,
    ModelVersion,
    HumanOverride,
)
from .serializers import (
    GovernancePolicySerializer,
    ExplainabilityLogSerializer,
    BiasScanSerializer,
    ModelVersionSerializer,
    HumanOverrideSerializer,
)
from apps.analytics.models import AuditLog


class GovernancePolicyViewSet(viewsets.ModelViewSet):
    serializer_class = GovernancePolicySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return GovernancePolicy.objects.filter(organization_id=org_id)
        return GovernancePolicy.objects.none()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        serializer.save(organization_id=org_id, created_by=self.request.user)


class ExplainabilityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ExplainabilityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return ExplainabilityLog.objects.filter(organization_id=org_id).order_by('-created_at')
        return ExplainabilityLog.objects.none()


class BiasScanViewSet(viewsets.ModelViewSet):
    serializer_class = BiasScanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return BiasScan.objects.filter(organization_id=org_id).order_by('-created_at')
        return BiasScan.objects.none()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        serializer.save(organization_id=org_id)

    @action(detail=True, methods=['post'], url_path='run')
    def run(self, request, **kwargs):
        scan = self.get_object()
        scan.status = 'running'
        scan.save(update_fields=['status'])

        # Lightweight fairness snapshot by role distribution and score spread.
        from apps.organizations.models import OrganizationMember
        from apps.assessments.models import AssessmentAttempt

        members = OrganizationMember.objects.filter(organization=scan.organization).values('role').order_by()
        role_counts = {}
        for member in members:
            role = member.get('role') or 'unknown'
            role_counts[role] = role_counts.get(role, 0) + 1

        attempts = AssessmentAttempt.objects.filter(
            assessment__organization=scan.organization,
            submitted_at__isnull=False,
        ).select_related('assessment')
        modality_scores = {}
        modality_counts = {}
        for attempt in attempts:
            modality = (attempt.assessment.modality or 'reading') if attempt.assessment else 'reading'
            modality_scores[modality] = modality_scores.get(modality, 0.0) + float(attempt.percentage or 0.0)
            modality_counts[modality] = modality_counts.get(modality, 0) + 1

        modality_distribution = {}
        for modality, total in modality_scores.items():
            count = modality_counts.get(modality, 1)
            modality_distribution[modality] = round(total / count, 2)

        scan.status = 'completed'
        scan.completed_at = timezone.now()
        scan.results = {
            'role_distribution': role_counts,
            'modality_score_distribution': modality_distribution,
            'summary': 'Heuristic bias scan completed.',
        }
        scan.save(update_fields=['status', 'completed_at', 'results'])
        return Response(self.get_serializer(scan).data)


class ModelVersionViewSet(viewsets.ModelViewSet):
    serializer_class = ModelVersionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return ModelVersion.objects.filter(organization_id=org_id).order_by('-created_at')
        return ModelVersion.objects.none()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        serializer.save(organization_id=org_id)

    @action(detail=True, methods=['post'], url_path='rollback')
    def rollback(self, request, **kwargs):
        version = self.get_object()
        with transaction.atomic():
            ModelVersion.objects.filter(
                organization=version.organization,
                model_name=version.model_name,
                status='active',
            ).exclude(id=version.id).update(status='rolled_back')
            version.status = 'active'
            version.deployed_at = timezone.now()
            version.save(update_fields=['status', 'deployed_at'])
        return Response(self.get_serializer(version).data)


class HumanOverrideViewSet(viewsets.ModelViewSet):
    serializer_class = HumanOverrideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return HumanOverride.objects.filter(organization_id=org_id).order_by('-created_at')
        return HumanOverride.objects.none()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        serializer.save(organization_id=org_id, user=self.request.user)


class MasterGovernanceAuditView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response(
                {'error': {'status': 403, 'code': 'forbidden', 'detail': 'Master permissions are required.'}},
                status=403,
            )

        recent_audits = AuditLog.objects.select_related('organization').order_by('-timestamp')[:100]
        recent_overrides = HumanOverride.objects.select_related('organization', 'user').order_by('-created_at')[:50]
        open_bias_scans = BiasScan.objects.filter(status__in=['queued', 'running']).count()
        active_policies = GovernancePolicy.objects.filter(is_active=True).count()

        return Response(
            {
                'summary': {
                    'active_policies': active_policies,
                    'open_bias_scans': open_bias_scans,
                    'recent_overrides': recent_overrides.count(),
                    'recent_audit_events': recent_audits.count(),
                },
                'recent_audits': [
                    {
                        'id': str(log.id),
                        'organization': log.organization.name if log.organization else '',
                        'organization_id': str(log.organization_id) if log.organization_id else None,
                        'action': log.action,
                        'actor_name': log.actor_name,
                        'timestamp': log.timestamp.isoformat() if log.timestamp else None,
                    }
                    for log in recent_audits
                ],
                'recent_overrides': [
                    {
                        'id': str(override.id),
                        'organization': override.organization.name if override.organization else '',
                        'target_type': override.target_type,
                        'target_id': override.target_id,
                        'action': override.action,
                        'reason': override.reason,
                        'created_at': override.created_at.isoformat() if override.created_at else None,
                    }
                    for override in recent_overrides
                ],
            }
        )
