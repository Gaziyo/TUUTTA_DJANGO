import uuid
from django.utils.text import slugify
from rest_framework import serializers
from .models import Course, CourseModule, Lesson, AdaptiveReleaseRule


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
            'is_required', 'estimated_duration', 'unlock_requires',
            'lessons', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CourseSerializer(serializers.ModelSerializer):
    # slug is optional — auto-generated from title if not provided
    slug = serializers.SlugField(max_length=500, required=False)

    class Meta:
        model = Course
        fields = [
            'id', 'organization', 'title', 'slug', 'description', 'short_description',
            'thumbnail_url', 'category', 'tags', 'skill_level', 'estimated_duration',
            'learning_objectives', 'status', 'visibility', 'published_at',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'published_at', 'created_at', 'updated_at']

    def validate(self, attrs):
        if not attrs.get('slug'):
            base_slug = slugify(attrs.get('title', ''))
            attrs['slug'] = base_slug or f"course-{uuid.uuid4().hex[:8]}"
        return attrs


class CourseDetailSerializer(CourseSerializer):
    modules = CourseModuleSerializer(many=True, read_only=True)

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ['modules']


class AdaptiveReleaseRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdaptiveReleaseRule
        fields = [
            'id', 'course', 'module', 'rule_type', 'prerequisite_module',
            'assessment', 'min_score', 'min_bloom_level',
            'is_active', 'metadata', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
