from django.contrib import admin
from .models import Assessment, Question, QuestionOption, AssessmentAttempt


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'organization', 'assessment_type', 'is_published', 'created_at']
    list_filter = ['assessment_type', 'is_published']
    search_fields = ['title']


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['question_text', 'assessment', 'question_type', 'points']
    list_filter = ['question_type']


admin.site.register(QuestionOption)
admin.site.register(AssessmentAttempt)
