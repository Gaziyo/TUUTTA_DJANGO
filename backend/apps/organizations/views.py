from rest_framework import viewsets, generics
from rest_framework.permissions import IsAuthenticated
from .models import Organization, OrganizationMember, Department, Team
from .serializers import OrganizationSerializer, DepartmentSerializer, TeamSerializer, OrganizationMemberDetailSerializer


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


class MyMembershipsView(generics.ListAPIView):
    """Return all organization memberships for the currently authenticated user."""
    serializer_class = OrganizationMemberDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrganizationMember.objects.filter(
            user=self.request.user
        ).select_related('organization', 'user')


class OrganizationMemberViewSet(viewsets.ModelViewSet):
    """
    Nested under /organizations/{organization_pk}/members/.
    POST is idempotent — returns existing membership if user is already a member.
    """
    serializer_class = OrganizationMemberDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk')
        return OrganizationMember.objects.filter(
            organization_id=org_id
        ).select_related('organization', 'user')

    def create(self, request, *args, **kwargs):
        from rest_framework.response import Response
        from rest_framework import status as drf_status
        org_id = self.kwargs.get('organization_pk')
        user_id = request.data.get('user')
        existing = OrganizationMember.objects.filter(
            organization_id=org_id, user_id=user_id
        ).select_related('organization', 'user').first()
        if existing:
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=drf_status.HTTP_200_OK)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organization_id=org_id)
        return Response(serializer.data, status=drf_status.HTTP_201_CREATED)


class MemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Flat endpoint: /members/{pk}/ for retrieve, PATCH, DELETE by membership ID."""
    serializer_class = OrganizationMemberDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrganizationMember.objects.select_related('organization', 'user')
