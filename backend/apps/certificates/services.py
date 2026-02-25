import uuid
from typing import Optional

from .models import Certificate, CertificateTemplate


def issue_certificate(*, user, course, organization, enrollment_id: Optional[str] = None) -> Certificate:
    existing = Certificate.objects.filter(user=user, course=course, organization=organization).first()
    if existing:
        return existing

    template = CertificateTemplate.objects.filter(organization=organization, is_default=True).first()
    certificate_number = f"CERT-{uuid.uuid4().hex[:12].upper()}"

    metadata = {}
    if enrollment_id:
        metadata['enrollment_id'] = enrollment_id

    return Certificate.objects.create(
        user=user,
        course=course,
        organization=organization,
        template=template,
        certificate_number=certificate_number,
        metadata=metadata,
    )
