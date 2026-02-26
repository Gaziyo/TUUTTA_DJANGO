from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
import uuid


class GenieSource(models.Model):
    SOURCE_TYPES = [
        ('document', 'Document'),
        ('url', 'URL'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('text', 'Text'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='genie_sources')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    name = models.CharField(max_length=500)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    url = models.URLField(blank=True)
    file_path = models.CharField(max_length=1000, blank=True)
    content = models.TextField(blank=True)

    status = models.CharField(max_length=20, default='pending')
    processed_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'genie_sources'

    def __str__(self):
        return self.name


class GeniePipeline(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    name = models.CharField(max_length=500)
    sources = models.ManyToManyField(GenieSource, blank=True)

    config = models.JSONField(default=dict)
    status = models.CharField(max_length=20, default='draft')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'genie_pipelines'


# ─── ELS (Enterprise Learning System) 9-Phase Pipeline ───────────────────────

ELS_PHASES = [
    ('ingest', 'Content Ingestion'),
    ('analyze', 'Needs Analysis'),
    ('design', 'Course Design'),
    ('develop', 'AI Development'),
    ('implement', 'Implementation'),
    ('evaluate', 'Evaluation'),
    ('personalize', 'Personalization'),
    ('portal', 'Manager Portal'),
    ('govern', 'Governance'),
]

PHASE_STATUSES = [
    ('pending', 'Pending'),
    ('in_progress', 'In Progress'),
    ('completed', 'Completed'),
    ('skipped', 'Skipped'),
    ('failed', 'Failed'),
    ('exception_required', 'Exception Required'),
    ('canceled', 'Canceled'),
]

RUN_STATES = [
    ('idle', 'Idle'),
    ('queued', 'Queued'),
    ('ingesting', 'Ingesting'),
    ('analyzing', 'Analyzing'),
    ('designing', 'Designing'),
    ('developing', 'Developing'),
    ('implementing', 'Implementing'),
    ('evaluating', 'Evaluating'),
    ('completed', 'Completed'),
    ('failed', 'Failed'),
    ('exception_required', 'Exception Required'),
    ('canceled', 'Canceled'),
]

GATE_RESULTS = [
    ('pending', 'Pending'),
    ('pass', 'Pass'),
    ('exception_required', 'Exception Required'),
    ('fail', 'Fail'),
]


class ELSProject(models.Model):
    """
    Top-level container for an ELS 9-phase ADDIE+Cognitive pipeline project.
    Tracks progression through all phases and links to Cognitive OS models.
    """

    PROJECT_STATUSES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('archived', 'Archived'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='els_projects')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='els_projects_created')
    last_modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='els_projects_modified')

    name = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=PROJECT_STATUSES, default='draft')
    current_phase = models.CharField(max_length=20, choices=ELS_PHASES, default='ingest')
    run_state = models.CharField(max_length=30, choices=RUN_STATES, default='idle')
    current_run_id = models.UUIDField(null=True, blank=True)
    current_idempotency_key = models.CharField(max_length=128, blank=True)
    current_correlation_id = models.CharField(max_length=128, blank=True)
    run_attempt = models.IntegerField(default=0)
    run_started_at = models.DateTimeField(null=True, blank=True)
    run_completed_at = models.DateTimeField(null=True, blank=True)
    last_error_code = models.CharField(max_length=100, blank=True)
    last_error_message = models.TextField(blank=True)
    autonomous_mode = models.BooleanField(default=True)
    last_outcome_package = models.JSONField(default=dict)

    # Flexible per-phase snapshot data (started_at, completed_at, output keys)
    phases_data = models.JSONField(default=dict)

    # IDs of resources created during the pipeline
    created_course_ids = models.JSONField(default=list)
    created_assessment_ids = models.JSONField(default=list)
    created_learning_path_ids = models.JSONField(default=list)

    # FK links to Cognitive OS ingest phase
    knowledge_documents = models.ManyToManyField(
        'knowledge.KnowledgeDocument',
        blank=True,
        related_name='els_projects',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'els_projects'
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.name} ({self.organization.name})'


class ELSProjectPhase(models.Model):
    """
    Detailed per-phase record for an ELSProject.
    One row per phase per project — upserted when a phase is started or completed.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(ELSProject, on_delete=models.CASCADE, related_name='phase_records')
    phase = models.CharField(max_length=20, choices=ELS_PHASES)
    status = models.CharField(max_length=20, choices=PHASE_STATUSES, default='pending')

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Flexible phase-specific output data (objectives, design choices, etc.)
    output_data = models.JSONField(default=dict)

    # Bloom taxonomy distribution captured at design phase
    bloom_distribution = models.JSONField(default=dict)
    confidence_score = models.FloatField(null=True, blank=True)
    risk_score = models.FloatField(null=True, blank=True)
    quality_checks = models.JSONField(default=list)
    gate_result = models.CharField(max_length=30, choices=GATE_RESULTS, default='pending')

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'els_project_phases'
        unique_together = ['project', 'phase']
        ordering = ['project', 'phase']

    def __str__(self):
        return f'{self.project.name} / {self.phase} ({self.status})'


class ELSProjectException(models.Model):
    STATUSES = [
        ('open', 'Open'),
        ('resolved', 'Resolved'),
        ('rejected', 'Rejected'),
        ('overridden', 'Overridden'),
    ]
    PRIORITIES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(ELSProject, on_delete=models.CASCADE, related_name='exceptions')
    phase = models.CharField(max_length=20, choices=ELS_PHASES)
    reason_code = models.CharField(max_length=100)
    reason_message = models.TextField(blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    risk_score = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUSES, default='open')
    priority = models.CharField(max_length=20, choices=PRIORITIES, default='medium')
    due_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='els_exceptions_resolved',
    )
    resolution_notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'els_project_exceptions'
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['created_at']),
        ]


class ELSProjectRunMetric(models.Model):
    STATUSES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('exception_required', 'Exception Required'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(ELSProject, on_delete=models.CASCADE, related_name='run_metrics')
    run_id = models.UUIDField()
    phase = models.CharField(max_length=20, choices=ELS_PHASES)
    status = models.CharField(max_length=20, choices=STATUSES, default='success')
    duration_ms = models.IntegerField(default=0)
    retry_count = models.IntegerField(default=0)
    token_cost = models.FloatField(default=0.0)
    compute_cost = models.FloatField(default=0.0)
    quality_score = models.FloatField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'els_project_run_metrics'
        indexes = [
            models.Index(fields=['project', 'run_id']),
            models.Index(fields=['created_at']),
        ]
