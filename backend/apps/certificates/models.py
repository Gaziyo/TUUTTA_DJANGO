from django.db import models
from apps.accounts.models import User
from apps.courses.models import Course
from apps.organizations.models import Organization
import uuid


class CertificateTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    template_data = models.JSONField(default=dict)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'certificate_templates'


class Certificate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    template = models.ForeignKey(CertificateTemplate, on_delete=models.SET_NULL, null=True, blank=True)

    certificate_number = models.CharField(max_length=100, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    pdf_url = models.URLField(blank=True)
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = 'certificates'
        unique_together = ['user', 'course']

    def __str__(self):
        return f'{self.user} - {self.course} certificate'
