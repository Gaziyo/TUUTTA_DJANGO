from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
import uuid


class GovernancePolicy(models.Model):
    POLICY_TYPES = [
        ('ai_usage', 'AI Usage'),
        ('data_retention', 'Data Retention'),
        ('model_risk', 'Model Risk'),
        ('custom', 'Custom'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='governance_policies')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    name = models.CharField(max_length=255)
    policy_type = models.CharField(max_length=30, choices=POLICY_TYPES, default='custom')
    description = models.TextField(blank=True)
    content = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'governance_policies'
        indexes = [models.Index(fields=['organization', 'policy_type'])]


class ExplainabilityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='explainability_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    model_name = models.CharField(max_length=255)
    decision_type = models.CharField(max_length=255)
    input_ref = models.CharField(max_length=255, blank=True)
    output_ref = models.CharField(max_length=255, blank=True)
    rationale = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'explainability_logs'
        indexes = [models.Index(fields=['organization', 'model_name'])]


class BiasScan(models.Model):
    STATUSES = [
        ('queued', 'Queued'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='bias_scans')
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUSES, default='queued')
    results = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'bias_scans'


class ModelVersion(models.Model):
    STATUSES = [
        ('staged', 'Staged'),
        ('active', 'Active'),
        ('deprecated', 'Deprecated'),
        ('rolled_back', 'Rolled Back'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='model_versions')
    model_name = models.CharField(max_length=255)
    version = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUSES, default='staged')
    metrics = models.JSONField(default=dict)

    deployed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'model_versions'
        unique_together = ['organization', 'model_name', 'version']


class HumanOverride(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='human_overrides')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    target_type = models.CharField(max_length=255)
    target_id = models.CharField(max_length=255)
    action = models.CharField(max_length=255)
    reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'human_overrides'
        indexes = [models.Index(fields=['organization', 'target_type'])]
