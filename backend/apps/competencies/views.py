from rest_framework import viewsets, permissions
from .models import (
    CompetencyFramework, Competency, RoleCompetencyMapping, CompliancePolicy,
    CompetencyScore, CompetencySnapshot, BloomLevel
)
from .serializers import (
    CompetencyFrameworkSerializer,
    CompetencySerializer,
    RoleCompetencyMappingSerializer,
    CompliancePolicySerializer,
    CompetencyScoreSerializer,
    CompetencySnapshotSerializer,
    BloomLevelSerializer,
)
from apps.organizations.models import OrganizationMember

ADMIN_ROLES = {'org_admin', 'manager'}


def _is_org_admin(user, org_id):
    return OrganizationMember.objects.filter(
        user=user, organization_id=org_id, role__in=ADMIN_ROLES
    ).exists()


class CompetencyFrameworkViewSet(viewsets.ModelViewSet):
    serializer_class = CompetencyFrameworkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return CompetencyFramework.objects.filter(organization_id=org_id)
        return CompetencyFramework.objects.none()


class CompetencyViewSet(viewsets.ModelViewSet):
    serializer_class = CompetencySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['framework', 'level']

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return Competency.objects.filter(organization_id=org_id)
        return Competency.objects.none()


class RoleCompetencyMappingViewSet(viewsets.ModelViewSet):
    serializer_class = RoleCompetencyMappingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['role_name']

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return RoleCompetencyMapping.objects.filter(organization_id=org_id)
        return RoleCompetencyMapping.objects.none()


class CompliancePolicyViewSet(viewsets.ModelViewSet):
    serializer_class = CompliancePolicySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['regulation', 'is_active']

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return CompliancePolicy.objects.filter(organization_id=org_id)
        return CompliancePolicy.objects.none()


class CompetencyScoreViewSet(viewsets.ModelViewSet):
    serializer_class = CompetencyScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['user', 'competency', 'competency_tag']

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return CompetencyScore.objects.filter(organization_id=org_id)
        return CompetencyScore.objects.none()


class CompetencySnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CompetencySnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['competency_tag']

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return CompetencySnapshot.objects.filter(organization_id=org_id).order_by('-created_at')
        return CompetencySnapshot.objects.none()


class BloomLevelViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BloomLevelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BloomLevel.objects.all().order_by('level')
