from django.db import models
from apps.accounts.models import User
from apps.courses.models import Course, CourseModule, Lesson
from apps.enrollments.models import Enrollment
import uuid


class ProgressRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress_records')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='progress_records')
    enrollment = models.ForeignKey(Enrollment, on_delete=models.SET_NULL, null=True, blank=True)

    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_time_spent = models.IntegerField(default=0)  # seconds
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'progress_records'
        unique_together = ['user', 'course']


class ModuleProgress(models.Model):
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    progress_record = models.ForeignKey(ProgressRecord, on_delete=models.CASCADE, related_name='module_progress')
    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent = models.IntegerField(default=0)
    last_accessed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'module_progress'
        unique_together = ['progress_record', 'module']


class LessonProgress(models.Model):
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    progress_record = models.ForeignKey(ProgressRecord, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent = models.IntegerField(default=0)
    last_accessed_at = models.DateTimeField(null=True, blank=True)

    last_position = models.IntegerField(null=True, blank=True)  # seconds for video

    class Meta:
        db_table = 'lesson_progress'
        unique_together = ['progress_record', 'lesson']


class ProgressEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)

    event_type = models.CharField(max_length=50)
    data = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'progress_events'
        indexes = [
            models.Index(fields=['user', 'event_type']),
            models.Index(fields=['created_at']),
        ]
