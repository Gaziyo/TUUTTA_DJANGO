from django.contrib import admin
from .models import Course, CourseModule, Lesson


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
