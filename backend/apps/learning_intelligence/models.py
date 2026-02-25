from django.db import models
from apps.organizations.models import Organization
from apps.accounts.models import User
import uuid


class CognitiveProfile(models.Model):
    """
    Per-learner cognitive fingerprint.
    Stores Bloom-level mastery scores, modality strengths, and response
    time distributions.  Updated after each assessment attempt.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cognitive_profiles')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='cognitive_profiles')

    # Bloom mastery: {remember, understand, apply, analyse, evaluate, create} → 0.0–1.0
    bloom_mastery = models.JSONField(default=dict)

    # Modality strengths: {reading, writing, listening, speaking, math, general_knowledge} → 0.0–1.0
    modality_strengths = models.JSONField(default=dict)
    preferred_modality = models.CharField(max_length=20, blank=True)

    # Performance metrics
    avg_response_time_ms = models.IntegerField(null=True, blank=True)
    accuracy_by_difficulty = models.JSONField(default=dict)  # {easy, medium, hard} → 0.0–1.0

    total_questions_answered = models.IntegerField(default=0)
    total_assessments_taken = models.IntegerField(default=0)

    last_assessment_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cognitive_profiles'
        unique_together = ['user', 'organization']

    def __str__(self):
        return f'CognitiveProfile({self.user_id}, org={self.organization_id})'


class GapMatrix(models.Model):
    """
    Skill/competency gap per learner.
    Derived by comparing CognitiveProfile against RoleCompetencyMapping.
    Drives course recommendations and remediation paths.
    """

    STATUSES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('closed', 'Closed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gap_matrix_entries')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='gap_matrix_entries')
    competency = models.ForeignKey(
        'competencies.Competency',
        on_delete=models.CASCADE,
        related_name='gap_entries',
    )

    current_bloom_level = models.IntegerField(default=0)   # learner's current level (0-6)
    target_bloom_level = models.IntegerField(default=0)    # required level for role (0-6)
    gap_score = models.FloatField(default=0.0)             # normalised 0.0–1.0

    # Weighted-gap components (Week 1 P0)
    bloom_gap_component = models.FloatField(default=0.0)
    modality_gap_component = models.FloatField(default=0.0)
    threshold_gap_component = models.FloatField(default=0.0)
    role_requirement_component = models.FloatField(default=0.0)

    weighted_bloom_gap = models.FloatField(default=0.0)
    weighted_modality_gap = models.FloatField(default=0.0)
    bloom_weight = models.FloatField(default=1.0)
    modality_weight = models.FloatField(default=1.0)

    threshold_score_target = models.FloatField(default=0.75)
    learner_score = models.FloatField(default=0.0)
    gap_details = models.JSONField(default=dict)

    priority = models.IntegerField(default=3)              # 1 (critical) – 5 (low)

    recommended_course = models.ForeignKey(
        'courses.Course',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gap_recommendations',
    )

    status = models.CharField(max_length=20, choices=STATUSES, default='open')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'gap_matrix'
        verbose_name_plural = 'gap matrix entries'
        unique_together = ['user', 'organization', 'competency']

    def __str__(self):
        return f'Gap({self.user_id}, {self.competency_id}): {self.gap_score:.2f}'


class RemediationTrigger(models.Model):
    """
    Defines when remediation should be assigned based on assessment failure
    or competency gap thresholds.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='remediation_triggers')
    competency = models.ForeignKey(
        'competencies.Competency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='remediation_triggers',
    )
    assessment = models.ForeignKey(
        'assessments.Assessment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='remediation_triggers',
    )
    remediation_course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='remediation_triggers',
    )

    min_gap_score = models.FloatField(default=0.3)
    max_attempts = models.IntegerField(default=2)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'remediation_triggers'
        indexes = [
            models.Index(fields=['organization', 'is_active']),
            models.Index(fields=['competency']),
        ]

    def __str__(self):
        return f'RemediationTrigger({self.organization_id})'


class RemediationAssignment(models.Model):
    STATUSES = [
        ('assigned', 'Assigned'),
        ('completed', 'Completed'),
        ('dismissed', 'Dismissed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='remediation_assignments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='remediation_assignments')
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_remediation_assignments',
    )
    trigger = models.ForeignKey(
        RemediationTrigger,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assignments',
    )
    enrollment = models.ForeignKey(
        'enrollments.Enrollment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='remediation_assignments',
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='remediation_assignments',
    )

    module_id = models.CharField(max_length=100, blank=True)
    lesson_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUSES, default='assigned')
    reason = models.TextField(blank=True)
    scheduled_reassessment_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'remediation_assignments'
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f'RemediationAssignment({self.user_id}, {self.course_id}, {self.status})'


class AdaptivePolicy(models.Model):
    STATUSES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='adaptive_policies')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUSES, default='draft')
    current_version = models.CharField(max_length=50, blank=True)
    config = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'adaptive_policies'
        indexes = [
            models.Index(fields=['organization', 'status']),
        ]

    def __str__(self):
        return f'AdaptivePolicy({self.name})'


class AdaptiveRecommendation(models.Model):
    ACTION_TYPES = [
        ('recommend_course', 'Recommend Course'),
        ('nudge_course', 'Nudge Course Progress'),
        ('assign_remediation', 'Assign Remediation'),
        ('unlock_module', 'Unlock Module'),
        ('explore_paths', 'Explore Learning Paths'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='adaptive_recommendations')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='adaptive_recommendations')
    policy = models.ForeignKey(
        AdaptivePolicy,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recommendations',
    )

    action_type = models.CharField(max_length=40, choices=ACTION_TYPES)
    score = models.FloatField(default=0.0)
    reason = models.TextField(blank=True)
    payload = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'adaptive_recommendations'
        unique_together = ['organization', 'user', 'action_type']
        indexes = [
            models.Index(fields=['organization', 'action_type']),
        ]

    def __str__(self):
        return f'AdaptiveRecommendation({self.user_id}, {self.action_type})'


class AdaptiveDecisionLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='adaptive_decisions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='adaptive_decisions')
    policy = models.ForeignKey(
        AdaptivePolicy,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decision_logs',
    )

    action_type = models.CharField(max_length=40)
    payload = models.JSONField(default=dict)
    reward = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'adaptive_decision_logs'
        indexes = [
            models.Index(fields=['organization', 'action_type']),
            models.Index(fields=['created_at']),
        ]


class InterventionLog(models.Model):
    STATUSES = [
        ('queued', 'Queued'),
        ('executed', 'Executed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='interventions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interventions')
    action_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUSES, default='queued')
    outcome = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'intervention_logs'
        indexes = [
            models.Index(fields=['organization', 'created_at']),
        ]


class FailureRiskSnapshot(models.Model):
    RISK_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='failure_risk_snapshots')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='failure_risk_snapshots')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='failure_risk_snapshots')

    risk_score = models.FloatField(default=0.0)
    risk_level = models.CharField(max_length=10, choices=RISK_LEVELS, default='low')
    reasons = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'failure_risk_snapshots'
        indexes = [
            models.Index(fields=['organization', 'risk_level']),
            models.Index(fields=['created_at']),
        ]


class BaselineDiagnostic(models.Model):
    TARGET_TYPES = [
        ('organization', 'Organization'),
        ('department', 'Department'),
        ('team', 'Team'),
        ('role', 'Role'),
        ('user', 'User'),
    ]

    STATUSES = [
        ('draft', 'Draft'),
        ('queued', 'Queued'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='baseline_diagnostics')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    name = models.CharField(max_length=255)
    target_type = models.CharField(max_length=20, choices=TARGET_TYPES, default='organization')
    target_id = models.CharField(max_length=255, blank=True)
    role_name = models.CharField(max_length=255, blank=True)

    assessment = models.ForeignKey(
        'assessments.Assessment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='baseline_diagnostics',
    )
    status = models.CharField(max_length=20, choices=STATUSES, default='draft')
    results = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)

    scheduled_for = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'baseline_diagnostics'
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['target_type']),
        ]

    def __str__(self):
        return f'BaselineDiagnostic({self.name})'


class GNNInsight(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='gnn_insights')
    name = models.CharField(max_length=255)
    insight_type = models.CharField(max_length=255, blank=True)
    metrics = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gnn_insights'
        indexes = [models.Index(fields=['organization', 'created_at'])]


class GapClosureSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='gap_closure_snapshots')
    average_gap_score = models.FloatField(default=0.0)
    total_open = models.IntegerField(default=0)
    total_closed = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gap_closure_snapshots'
        indexes = [models.Index(fields=['organization', 'created_at'])]
