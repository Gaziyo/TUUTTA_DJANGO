from rest_framework import serializers
from .models import ProgressRecord, ModuleProgress, LessonProgress, ProgressEvent


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ['id', 'lesson', 'status', 'started_at', 'completed_at', 'time_spent', 'last_position']
        read_only_fields = ['id']


class ModuleProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuleProgress
        fields = ['id', 'module', 'status', 'completion_percentage', 'started_at', 'completed_at', 'time_spent']
        read_only_fields = ['id']


class ProgressRecordSerializer(serializers.ModelSerializer):
    module_progress = ModuleProgressSerializer(many=True, read_only=True)
    lesson_progress = LessonProgressSerializer(many=True, read_only=True)

    class Meta:
        model = ProgressRecord
        fields = [
            'id', 'user', 'course', 'completion_percentage', 'total_time_spent',
            'last_accessed_at', 'completed_at', 'module_progress', 'lesson_progress',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
