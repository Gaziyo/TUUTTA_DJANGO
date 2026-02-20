from rest_framework import serializers
from .models import Course, CourseModule, Lesson


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            'id', 'module', 'title', 'description', 'lesson_type',
            'order_index', 'is_required', 'estimated_duration', 'content',
            'assessment', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CourseModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = CourseModule
        fields = [
            'id', 'course', 'title', 'description', 'order_index',
            'is_required', 'estimated_duration', 'lessons', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            'id', 'organization', 'title', 'slug', 'description', 'short_description',
            'thumbnail_url', 'category', 'tags', 'skill_level', 'estimated_duration',
            'learning_objectives', 'status', 'visibility', 'published_at',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'published_at', 'created_at', 'updated_at']


class CourseDetailSerializer(CourseSerializer):
    modules = CourseModuleSerializer(many=True, read_only=True)

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ['modules']
