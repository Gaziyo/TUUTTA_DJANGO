from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import (
    Course,
    CourseModule,
    Lesson,
    AdaptiveReleaseRule,
    LearningPath,
    LearningPathCourse,
)
from .serializers import (
    CourseSerializer, CourseDetailSerializer,
    CourseModuleSerializer, LessonSerializer,
    AdaptiveReleaseRuleSerializer,
    LearningPathSerializer,
    LearningPathCourseSerializer,
)
from .services import get_module_unlock_status


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    filterset_fields = ['status', 'category', 'visibility']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title', 'published_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        return Course.objects.filter(
            organization__members__user=user
        ).select_related('organization', 'created_by').distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        course = self.get_object()
        course.status = 'published'
        course.published_at = timezone.now()
        course.save()
        return Response({'status': 'published'})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        course = self.get_object()
        course.status = 'archived'
        course.save()
        return Response({'status': 'archived'})


class CourseModuleViewSet(viewsets.ModelViewSet):
    serializer_class = CourseModuleSerializer

    def get_queryset(self):
        return CourseModule.objects.filter(
            course_id=self.kwargs['course_pk']
        ).order_by('order_index')

    def perform_create(self, serializer):
        serializer.save(course_id=self.kwargs['course_pk'])

    @action(detail=True, methods=['get'], url_path='unlock-status')
    def unlock_status(self, request, course_pk=None, pk=None):
        module = self.get_object()
        unlocked, reasons = get_module_unlock_status(request.user, module)
        return Response({'unlocked': unlocked, 'reasons': reasons})


class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer

    def get_queryset(self):
        return Lesson.objects.filter(
            module_id=self.kwargs['module_pk']
        ).order_by('order_index')

    def perform_create(self, serializer):
        serializer.save(module_id=self.kwargs['module_pk'])


class AdaptiveReleaseRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AdaptiveReleaseRuleSerializer

    def get_queryset(self):
        course_id = self.kwargs.get('course_pk') or self.request.query_params.get('course')
        qs = AdaptiveReleaseRule.objects.select_related('course', 'module')
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def perform_create(self, serializer):
        course_id = self.kwargs.get('course_pk') or self.request.data.get('course')
        serializer.save(course_id=course_id)


class LearningPathViewSet(viewsets.ModelViewSet):
    serializer_class = LearningPathSerializer
    filterset_fields = ['status']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        user = self.request.user
        qs = LearningPath.objects.select_related('organization', 'created_by').prefetch_related('path_courses__course')
        if org_id:
            qs = qs.filter(organization_id=org_id)
        else:
            qs = qs.filter(organization__members__user=user)
        return qs.distinct()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        serializer.save(organization_id=org_id, created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        learning_path = self.get_object()
        learning_path.status = 'published'
        learning_path.save(update_fields=['status', 'updated_at'])
        return Response({'status': 'published'})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        learning_path = self.get_object()
        learning_path.status = 'archived'
        learning_path.save(update_fields=['status', 'updated_at'])
        return Response({'status': 'archived'})


class LearningPathCourseViewSet(viewsets.ModelViewSet):
    serializer_class = LearningPathCourseSerializer

    def get_queryset(self):
        return LearningPathCourse.objects.filter(
            learning_path_id=self.kwargs['learning_path_pk']
        ).select_related('course').order_by('order_index', 'created_at')

    def perform_create(self, serializer):
        serializer.save(learning_path_id=self.kwargs['learning_path_pk'])
