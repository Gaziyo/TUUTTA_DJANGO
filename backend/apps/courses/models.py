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
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    order_index = models.IntegerField(default=0)

    is_required = models.BooleanField(default=True)
    estimated_duration = models.IntegerField(null=True, blank=True)

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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lessons'
        ordering = ['order_index']

    def __str__(self):
        return self.title
