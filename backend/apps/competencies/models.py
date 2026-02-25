from django.db import models
from apps.organizations.models import Organization
import uuid


class CompetencyFramework(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='competency_frameworks')

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'competency_frameworks'

    def __str__(self):
        return f'{self.name} v{self.version}'


class Competency(models.Model):
    LEVELS = [
        ('novice', 'Novice'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='competencies')
    framework = models.ForeignKey(
        CompetencyFramework,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='competencies',
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
    )

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    level = models.CharField(max_length=20, choices=LEVELS, blank=True)
    bloom_level_target = models.IntegerField(null=True, blank=True)  # 1-6
    required_modalities = models.JSONField(default=list)  # e.g. ["reading", "math"]
    threshold_score = models.FloatField(default=0.75)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'competencies'
        verbose_name_plural = 'competencies'

    def __str__(self):
        return self.name


class BloomLevel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    level = models.IntegerField(unique=True)
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    verbs = models.JSONField(default=list)

    class Meta:
        db_table = 'bloom_levels'
        ordering = ['level']

    def __str__(self):
        return f'L{self.level} {self.name}'


class RoleCompetencyMapping(models.Model):
    REQUIRED_LEVELS = [
        ('novice', 'Novice'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    ]
    PRIORITY_LEVELS = [
        ('mandatory', 'Mandatory'),
        ('recommended', 'Recommended'),
        ('optional', 'Optional'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='role_competency_mappings')
    competency = models.ForeignKey(Competency, on_delete=models.CASCADE, related_name='role_mappings')

    role_name = models.CharField(max_length=255)
    required_level = models.CharField(max_length=20, choices=REQUIRED_LEVELS)
    is_mandatory = models.BooleanField(default=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS, default='mandatory')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'role_competency_mappings'
        unique_together = ['organization', 'role_name', 'competency']

    def __str__(self):
        return f'{self.role_name} → {self.competency.name}'


class CompliancePolicy(models.Model):
    REGULATIONS = [
        ('gdpr', 'GDPR'),
        ('iso27001', 'ISO 27001'),
        ('hipaa', 'HIPAA'),
        ('sox', 'SOX'),
        ('pci_dss', 'PCI-DSS'),
        ('custom', 'Custom'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='compliance_policies')

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    regulation = models.CharField(max_length=20, choices=REGULATIONS, default='custom')

    # How many days after hire/role-change must training be completed
    due_days = models.IntegerField(default=30)
    recurrence_days = models.IntegerField(null=True, blank=True)  # recurring cadence
    penalty_description = models.TextField(blank=True)

    linked_course = models.ForeignKey(
        'courses.Course',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='compliance_policies',
    )
    linked_assessment = models.ForeignKey(
        'assessments.Assessment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='compliance_policies',
    )
    linked_competencies = models.ManyToManyField(
        Competency,
        blank=True,
        related_name='compliance_policies',
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'compliance_policies'
        verbose_name_plural = 'compliance policies'

    def __str__(self):
        return self.name


class CompetencyScore(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='competency_scores')
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='competency_scores')
    competency = models.ForeignKey(Competency, on_delete=models.SET_NULL, null=True, blank=True)
    competency_tag = models.CharField(max_length=255, blank=True)

    score = models.FloatField(default=0.0)
    assessed_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    course_id = models.CharField(max_length=100, blank=True)
    enrollment_id = models.CharField(max_length=100, blank=True)
    assessment_id = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'competency_scores'
        indexes = [
            models.Index(fields=['organization', 'competency_tag']),
            models.Index(fields=['user']),
        ]


class CompetencySnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='competency_snapshots')
    competency_tag = models.CharField(max_length=255)
    average_score = models.FloatField(default=0.0)
    count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'competency_snapshots'
        indexes = [
            models.Index(fields=['organization', 'competency_tag']),
            models.Index(fields=['created_at']),
        ]
