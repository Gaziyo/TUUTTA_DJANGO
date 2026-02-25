from django.contrib import admin
from .models import Course, CourseModule, Lesson, LearningPath, LearningPathCourse


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'organization', 'status', 'category', 'created_at']
    list_filter = ['status', 'category', 'visibility']
    search_fields = ['title', 'description']
    ordering = ['-created_at']


@admin.register(CourseModule)
class CourseModuleAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order_index']
    ordering = ['course', 'order_index']


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'module', 'lesson_type', 'order_index']
    list_filter = ['lesson_type']


@admin.register(LearningPath)
class LearningPathAdmin(admin.ModelAdmin):
    list_display = ['title', 'organization', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['title', 'description']
    ordering = ['-created_at']


@admin.register(LearningPathCourse)
class LearningPathCourseAdmin(admin.ModelAdmin):
    list_display = ['learning_path', 'course', 'order_index', 'is_required']
    list_filter = ['is_required']
    ordering = ['learning_path', 'order_index']
