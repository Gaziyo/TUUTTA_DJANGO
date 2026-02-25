import uuid
from django.utils.text import slugify
from rest_framework import serializers
from .models import (
    Course,
    CourseModule,
    Lesson,
    AdaptiveReleaseRule,
    LearningPath,
    LearningPathCourse,
)


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


class LearningPathCourseSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = LearningPathCourse
        fields = [
            'id', 'learning_path', 'course', 'course_title',
            'order_index', 'is_required', 'unlock_after',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LearningPathSerializer(serializers.ModelSerializer):
    path_courses = LearningPathCourseSerializer(many=True, read_only=True)
    courses = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)

    class Meta:
        model = LearningPath
        fields = [
            'id', 'organization', 'title', 'description', 'thumbnail_url',
            'estimated_duration', 'status', 'created_by',
            'path_courses', 'courses',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def _sync_courses(self, learning_path: LearningPath, courses_payload: list[dict]) -> None:
        LearningPathCourse.objects.filter(learning_path=learning_path).delete()
        for index, raw in enumerate(courses_payload):
            course_id = raw.get('course') or raw.get('course_id')
            if not course_id:
                continue
            order_index = raw.get('order_index', raw.get('order', index))
            unlock_after = raw.get('unlock_after')
            LearningPathCourse.objects.create(
                learning_path=learning_path,
                course_id=course_id,
                order_index=int(order_index or 0),
                is_required=bool(raw.get('is_required', raw.get('isRequired', True))),
                unlock_after_id=unlock_after or None,
            )

    def create(self, validated_data):
        courses_payload = validated_data.pop('courses', [])
        learning_path = super().create(validated_data)
        if courses_payload:
            self._sync_courses(learning_path, courses_payload)
        return learning_path

    def update(self, instance, validated_data):
        courses_payload = validated_data.pop('courses', None)
        learning_path = super().update(instance, validated_data)
        if courses_payload is not None:
            self._sync_courses(learning_path, courses_payload)
        return learning_path
