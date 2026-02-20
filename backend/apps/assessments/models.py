from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
import uuid


class Assessment(models.Model):
    TYPES = [
        ('quiz', 'Quiz'),
        ('exam', 'Exam'),
        ('survey', 'Survey'),
        ('assignment', 'Assignment'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True)

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    instructions = models.TextField(blank=True)

    assessment_type = models.CharField(max_length=20, choices=TYPES)
    difficulty = models.CharField(max_length=20, blank=True)

    time_limit = models.IntegerField(null=True, blank=True)  # minutes
    passing_score = models.DecimalField(max_digits=5, decimal_places=2, default=70)
    max_attempts = models.IntegerField(default=1)

    shuffle_questions = models.BooleanField(default=False)
    shuffle_options = models.BooleanField(default=False)
    show_correct_answers = models.BooleanField(default=True)

    is_published = models.BooleanField(default=False)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assessments'

    def __str__(self):
        return self.title


class Question(models.Model):
    TYPES = [
        ('mcq', 'Multiple Choice'),
        ('multiple_select', 'Multiple Select'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
        ('essay', 'Essay'),
        ('fill_blank', 'Fill in the Blank'),
        ('matching', 'Matching'),
        ('ordering', 'Ordering'),
        ('drag_drop', 'Drag and Drop'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='questions')

    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=TYPES)
    order_index = models.IntegerField(default=0)

    points = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    explanation = models.TextField(blank=True)
    hint = models.TextField(blank=True)

    media_url = models.URLField(blank=True)
    is_required = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'questions'
        ordering = ['order_index']


class QuestionOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')

    option_text = models.TextField()
    is_correct = models.BooleanField(default=False)
    order_index = models.IntegerField(default=0)
    feedback = models.TextField(blank=True)

    match_target = models.TextField(blank=True)

    class Meta:
        db_table = 'question_options'
        ordering = ['order_index']


class AssessmentAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='attempts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assessment_attempts')

    attempt_number = models.IntegerField(default=1)

    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    time_spent = models.IntegerField(null=True, blank=True)  # seconds

    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    max_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    passed = models.BooleanField(null=True, blank=True)

    status = models.CharField(max_length=20, default='in_progress')

    graded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='graded_attempts')
    graded_at = models.DateTimeField(null=True, blank=True)
    grader_feedback = models.TextField(blank=True)

    class Meta:
        db_table = 'assessment_attempts'


class AssessmentResponse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(AssessmentAttempt, on_delete=models.CASCADE, related_name='responses')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)

    response_text = models.TextField(blank=True)
    selected_options = models.JSONField(default=list)

    points_earned = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    feedback = models.TextField(blank=True)

    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'assessment_responses'
        unique_together = ['attempt', 'question']
