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


class AuditLog(models.Model):
    ACTOR_TYPES = [
        ('user', 'User'),
        ('admin', 'Admin'),
        ('system', 'System'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='audit_logs')

    timestamp = models.DateTimeField(auto_now_add=True)
    actor_id = models.CharField(max_length=100)
    actor_name = models.CharField(max_length=255, blank=True)
    actor_type = models.CharField(max_length=20, choices=ACTOR_TYPES, default='system')

    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100, blank=True)
    entity_id = models.CharField(max_length=100, blank=True)
    target_type = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=100, blank=True)
    target_name = models.CharField(max_length=255, blank=True)

    changes = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['organization', 'action']),
            models.Index(fields=['timestamp']),
        ]


class AnalyticsJob(models.Model):
    MODES = [
        ('scheduled', 'Scheduled'),
        ('manual', 'Manual'),
    ]

    STATUSES = [
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    mode = models.CharField(max_length=20, choices=MODES, default='scheduled')
    status = models.CharField(max_length=20, choices=STATUSES, default='queued')
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'analytics_jobs'


class GenieReportSchedule(models.Model):
    FREQUENCIES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    enabled = models.BooleanField(default=True)
    frequency = models.CharField(max_length=20, choices=FREQUENCIES)
    recipients = models.TextField()
    last_run_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'genie_report_schedules'


class GenieReportRun(models.Model):
    STATUSES = [
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    schedule = models.ForeignKey(GenieReportSchedule, on_delete=models.SET_NULL, null=True, blank=True)
    recipients = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUSES, default='queued')
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'genie_report_runs'


class ManagerDigestRun(models.Model):
    STATUSES = [
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    FREQUENCIES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUSES, default='queued')
    frequency = models.CharField(max_length=20, choices=FREQUENCIES, default='weekly')
    roles = models.JSONField(default=list, blank=True)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'manager_digest_runs'


class BloomAnalyticsSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='bloom_snapshots')
    department = models.ForeignKey('organizations.Department', on_delete=models.SET_NULL, null=True, blank=True)

    bloom_level = models.IntegerField()
    average_score = models.FloatField(default=0.0)
    pass_rate = models.FloatField(default=0.0)
    attempts_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bloom_analytics_snapshots'
        indexes = [
            models.Index(fields=['organization', 'bloom_level']),
            models.Index(fields=['created_at']),
        ]


class WorkforceCapabilityIndex(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='workforce_capability_indices')
    score = models.FloatField(default=0.0)
    trend = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workforce_capability_index'
        indexes = [models.Index(fields=['organization', 'created_at'])]


class DepartmentBloomTrend(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='department_bloom_trends')
    department = models.ForeignKey('organizations.Department', on_delete=models.SET_NULL, null=True, blank=True)
    bloom_level = models.IntegerField()
    trend = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'department_bloom_trends'
        indexes = [models.Index(fields=['organization', 'created_at'])]


class CompetencyTrajectoryForecast(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='competency_trajectory_forecasts')
    competency = models.ForeignKey('competencies.Competency', on_delete=models.SET_NULL, null=True, blank=True)
    forecast = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'competency_trajectory_forecasts'
        indexes = [models.Index(fields=['organization', 'created_at'])]


class ComplianceReadinessPrediction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='compliance_readiness_predictions')
    prediction = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'compliance_readiness_predictions'
        indexes = [models.Index(fields=['organization', 'created_at'])]


class StrategicSkillShortageDetection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='skill_shortage_detections')
    shortage = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'strategic_skill_shortage_detection'
        indexes = [models.Index(fields=['organization', 'created_at'])]
