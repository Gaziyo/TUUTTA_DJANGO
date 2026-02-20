from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
import uuid


class Notification(models.Model):
    TYPES = [
        ('course_assigned', 'Course Assigned'),
        ('course_completed', 'Course Completed'),
        ('achievement_earned', 'Achievement Earned'),
        ('assessment_due', 'Assessment Due'),
        ('certificate_issued', 'Certificate Issued'),
        ('announcement', 'Announcement'),
        ('reminder', 'Reminder'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True)

    notification_type = models.CharField(max_length=50, choices=TYPES)
    title = models.CharField(max_length=500)
    message = models.TextField()
    data = models.JSONField(default=dict)

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} - {self.title}'
