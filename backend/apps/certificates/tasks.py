from celery import shared_task
from django.utils import timezone

from apps.enrollments.models import Enrollment
from .services import issue_certificate


@shared_task
def issue_certificates_for_completed_enrollments(org_id: str | None = None) -> int:
    enrollments = Enrollment.objects.filter(status='completed')
    if org_id:
        enrollments = enrollments.filter(organization_id=org_id)
    created = 0
    for enrollment in enrollments.select_related('user', 'course', 'organization'):
        cert = issue_certificate(
            user=enrollment.user,
            course=enrollment.course,
            organization=enrollment.organization,
            enrollment_id=str(enrollment.id),
        )
        if cert:
            created += 1
    return created
