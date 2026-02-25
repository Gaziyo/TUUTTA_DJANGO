from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import Enrollment
from .serializers import EnrollmentSerializer
from apps.organizations.models import OrganizationMember


ADMIN_ROLES = {'org_admin', 'manager'}


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    filterset_fields = ['status', 'course']
    ordering = ['-enrolled_at']

    def get_queryset(self):
        user = self.request.user
        org_id = self.request.query_params.get('organization')

        if org_id:
            # Allow admins/managers to see all enrollments in their org
            is_admin = OrganizationMember.objects.filter(
                user=user,
                organization_id=org_id,
                role__in=ADMIN_ROLES,
            ).exists()
            if is_admin:
                return Enrollment.objects.filter(organization_id=org_id)
            # Non-admin: scope to their own enrollments within the org
            return Enrollment.objects.filter(user=user, organization_id=org_id)

        return Enrollment.objects.filter(user=user)

    @action(detail=False, methods=['post'], url_path='bulk-enroll')
    def bulk_enroll(self, request, **kwargs):
        org_id = request.data.get('organization')
        course_id = request.data.get('course')
        user_ids = request.data.get('user_ids') or []
        due_days = request.data.get('due_days', 30)
        if not (org_id and course_id and user_ids):
            return Response({'error': 'organization, course, and user_ids are required'}, status=status.HTTP_400_BAD_REQUEST)

        due_date = timezone.now() + timedelta(days=int(due_days))
        created = 0
        for user_id in user_ids:
            _, was_created = Enrollment.objects.get_or_create(
                organization_id=org_id,
                course_id=course_id,
                user_id=user_id,
                defaults={'due_date': due_date},
            )
            if was_created:
                created += 1
        return Response({'created': created})
