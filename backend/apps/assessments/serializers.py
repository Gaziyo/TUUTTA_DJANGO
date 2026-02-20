from rest_framework import serializers
from .models import Assessment, Question, QuestionOption, AssessmentAttempt, AssessmentResponse


class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ['id', 'option_text', 'is_correct', 'order_index', 'feedback', 'match_target']
        read_only_fields = ['id']


class QuestionSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'assessment', 'question_text', 'question_type', 'order_index',
            'points', 'explanation', 'hint', 'media_url', 'is_required', 'options',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = [
            'id', 'organization', 'course', 'title', 'description', 'instructions',
            'assessment_type', 'difficulty', 'time_limit', 'passing_score', 'max_attempts',
            'shuffle_questions', 'shuffle_options', 'show_correct_answers', 'is_published',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class AssessmentAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentAttempt
        fields = [
            'id', 'assessment', 'user', 'attempt_number', 'started_at', 'submitted_at',
            'time_spent', 'score', 'max_score', 'percentage', 'passed', 'status',
            'graded_by', 'graded_at', 'grader_feedback',
        ]
        read_only_fields = ['id', 'started_at']
