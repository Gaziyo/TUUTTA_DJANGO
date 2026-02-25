from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
import uuid


class Course(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('review', 'In Review'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='courses')

    title = models.CharField(max_length=500)
    slug = models.SlugField(max_length=500)
    description = models.TextField(blank=True)
    short_description = models.CharField(max_length=500, blank=True)
    thumbnail_url = models.URLField(blank=True)

    category = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list)
    skill_level = models.CharField(max_length=20, blank=True)

    estimated_duration = models.IntegerField(null=True, blank=True)  # minutes
    learning_objectives = models.JSONField(default=list)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    visibility = models.CharField(max_length=20, default='organization')

    published_at = models.DateTimeField(null=True, blank=True)

    # Cognitive OS extensions
    target_bloom_depth = models.IntegerField(null=True, blank=True)   # highest Bloom level targeted (1-6)
    competency_tag = models.ForeignKey(
        'competencies.Competency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='courses',
    )
    ai_generated = models.BooleanField(default=False)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_courses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'courses'
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return self.title


class CourseModule(models.Model):
    BLOOM_BANDS = [
        ('foundation', 'Foundation'),       # Bloom 1-2
        ('application', 'Application'),     # Bloom 3
        ('analysis', 'Analysis'),           # Bloom 4
        ('critical', 'Critical/Creative'),  # Bloom 5-6
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    order_index = models.IntegerField(default=0)

    is_required = models.BooleanField(default=True)
    estimated_duration = models.IntegerField(null=True, blank=True)

    # Cognitive OS extensions
    bloom_band = models.CharField(max_length=20, choices=BLOOM_BANDS, blank=True)
    bloom_level_min = models.IntegerField(null=True, blank=True)  # lowest Bloom level in module
    bloom_level_max = models.IntegerField(null=True, blank=True)  # highest Bloom level in module
    unlock_requires = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unlocks',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_modules'
        ordering = ['order_index']

    def __str__(self):
        return self.title


class Lesson(models.Model):
    LESSON_TYPES = [
        ('video', 'Video'),
        ('text', 'Text'),
        ('audio', 'Audio'),
        ('interactive', 'Interactive'),
        ('exercise', 'Exercise'),
        ('assignment', 'Assignment'),
        ('scorm', 'SCORM'),
    ]

    MODALITIES = [
        ('reading', 'Reading'),
        ('writing', 'Writing'),
        ('listening', 'Listening'),
        ('speaking', 'Speaking'),
        ('math', 'Math'),
        ('general_knowledge', 'General Knowledge'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name='lessons')

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    lesson_type = models.CharField(max_length=20, choices=LESSON_TYPES)
    order_index = models.IntegerField(default=0)

    is_required = models.BooleanField(default=True)
    estimated_duration = models.IntegerField(null=True, blank=True)

    content = models.JSONField(default=dict)

    assessment = models.ForeignKey(
        'assessments.Assessment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    # Cognitive OS extensions
    bloom_level = models.IntegerField(null=True, blank=True)   # 1=Remember … 6=Create
    modality = models.CharField(max_length=20, choices=MODALITIES, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lessons'
        ordering = ['order_index']

    def __str__(self):
        return self.title


class AdaptiveReleaseRule(models.Model):
    RULE_TYPES = [
        ('prerequisite_module', 'Prerequisite Module'),
        ('assessment_passed', 'Assessment Passed'),
        ('bloom_mastery', 'Bloom Mastery'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='adaptive_release_rules')
    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name='adaptive_release_rules')

    rule_type = models.CharField(max_length=30, choices=RULE_TYPES)
    prerequisite_module = models.ForeignKey(
        CourseModule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adaptive_release_dependents',
    )
    assessment = models.ForeignKey(
        'assessments.Assessment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adaptive_release_rules',
    )
    min_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    min_bloom_level = models.IntegerField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'adaptive_release_rules'
        indexes = [
            models.Index(fields=['course', 'module']),
            models.Index(fields=['rule_type']),
        ]

    def __str__(self):
        return f'AdaptiveReleaseRule({self.course_id}, {self.module_id}, {self.rule_type})'
