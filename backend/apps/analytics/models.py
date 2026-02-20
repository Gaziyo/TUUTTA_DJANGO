from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
import uuid


class AnalyticsEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True)

    event_name = models.CharField(max_length=100)
    properties = models.JSONField(default=dict)
    session_id = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analytics_events'
        indexes = [
            models.Index(fields=['user', 'event_name']),
            models.Index(fields=['organization', 'event_name']),
            models.Index(fields=['created_at']),
        ]


class DailyStats(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    date = models.DateField()

    active_users = models.IntegerField(default=0)
    new_enrollments = models.IntegerField(default=0)
    completions = models.IntegerField(default=0)
    lessons_viewed = models.IntegerField(default=0)
    assessments_taken = models.IntegerField(default=0)
    total_time_spent = models.IntegerField(default=0)  # seconds

    class Meta:
        db_table = 'daily_stats'
        unique_together = ['organization', 'date']
