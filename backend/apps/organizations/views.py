from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Organization, OrganizationMember, Department, Team
from .serializers import OrganizationSerializer, DepartmentSerializer, TeamSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Organization.objects.filter(
            members__user=self.request.user,
            is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        org = serializer.save(created_by=self.request.user)
        # Automatically add the creating user as org_admin
        OrganizationMember.objects.get_or_create(
            organization=org,
            user=self.request.user,
            defaults={'role': 'org_admin'},
        )


class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk')
        return Department.objects.filter(organization_id=org_id)


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk')
        return Team.objects.filter(organization_id=org_id)
