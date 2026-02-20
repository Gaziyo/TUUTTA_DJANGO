from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Course, CourseModule, Lesson
from .serializers import (
    CourseSerializer, CourseDetailSerializer,
    CourseModuleSerializer, LessonSerializer,
)


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


class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer

    def get_queryset(self):
        return Lesson.objects.filter(
            module_id=self.kwargs['module_pk']
        ).order_by('order_index')

    def perform_create(self, serializer):
        serializer.save(module_id=self.kwargs['module_pk'])
