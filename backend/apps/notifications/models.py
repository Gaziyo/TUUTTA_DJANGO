from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
import uuid


class Notification(models.Model):
    TYPES = [
        ('course_assigned', 'Course Assigned'),
        ('enrollment_new', 'Enrollment New'),
        ('course_completed', 'Course Completed'),
        ('achievement_earned', 'Achievement Earned'),
        ('assessment_due', 'Assessment Due'),
        ('certificate_issued', 'Certificate Issued'),
        ('certificate_expiring', 'Certificate Expiring'),
        ('announcement', 'Announcement'),
        ('reminder', 'Reminder'),
        ('enrollment_created', 'Enrollment Created'),
        ('enrollment_overdue', 'Enrollment Overdue'),
        ('enrollment_reminder', 'Enrollment Reminder'),
        ('policy_updated', 'Policy Updated'),
        ('manager_digest', 'Manager Digest'),
        ('feedback_received', 'Feedback Received'),
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


class NotificationOutbox(models.Model):
    STATUSES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    CHANNELS = [
        ('in_app', 'In-App'),
        ('email', 'Email'),
        ('push', 'Push'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_outbox')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True)

    notification_type = models.CharField(max_length=50, choices=Notification.TYPES)
    title = models.CharField(max_length=500)
    message = models.TextField()
    data = models.JSONField(default=dict)

    channels = models.JSONField(default=list)  # ['email', 'in_app', ...]
    recipient_emails = models.JSONField(default=list, blank=True)

    status = models.CharField(max_length=20, choices=STATUSES, default='pending')
    scheduled_for = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    attempts = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_outbox'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['scheduled_for']),
            models.Index(fields=['created_at']),
        ]
