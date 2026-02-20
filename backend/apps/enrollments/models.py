from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
from apps.courses.models import Course
import uuid


class Enrollment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('enrolled', 'Enrolled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('dropped', 'Dropped'),
        ('expired', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enrolled')
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    enrolled_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)

    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_enrollments')

    class Meta:
        db_table = 'enrollments'
        unique_together = ['user', 'course', 'organization']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['course', 'status']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f'{self.user} enrolled in {self.course}'
