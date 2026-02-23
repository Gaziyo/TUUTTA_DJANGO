from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.views import RegisterView, LoginView, LogoutView, CurrentUserView
from apps.organizations.views import OrganizationViewSet, DepartmentViewSet, TeamViewSet, MyMembershipsView, OrganizationMemberViewSet, MemberDetailView
from apps.courses.views import CourseViewSet, CourseModuleViewSet, LessonViewSet
from apps.assessments.views import AssessmentViewSet, QuestionViewSet
from apps.enrollments.views import EnrollmentViewSet
from apps.progress.views import ProgressViewSet
from apps.gamification.views import AchievementViewSet, LeaderboardView
from apps.ai_services.views import ChatCompletionView, TranscribeView


def health_check(request):
    return JsonResponse({'status': 'ok'})


# Main router
router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'assessments', AssessmentViewSet, basename='assessment')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'achievements', AchievementViewSet, basename='achievement')
router.register(r'progress', ProgressViewSet, basename='progress')

# Nested routers
courses_router = nested_routers.NestedDefaultRouter(router, r'courses', lookup='course')
courses_router.register(r'modules', CourseModuleViewSet, basename='course-modules')

modules_router = nested_routers.NestedDefaultRouter(courses_router, r'modules', lookup='module')
modules_router.register(r'lessons', LessonViewSet, basename='module-lessons')

assessments_router = nested_routers.NestedDefaultRouter(router, r'assessments', lookup='assessment')
assessments_router.register(r'questions', QuestionViewSet, basename='assessment-questions')

orgs_router = nested_routers.NestedDefaultRouter(router, r'organizations', lookup='organization')
orgs_router.register(r'departments', DepartmentViewSet, basename='organization-departments')
orgs_router.register(r'teams', TeamViewSet, basename='organization-teams')
orgs_router.register(r'members', OrganizationMemberViewSet, basename='organization-members')

urlpatterns = [
    path('admin/', admin.site.urls),

    # API v1
    path('api/v1/', include([
        # Auth
        path('auth/register/', RegisterView.as_view(), name='register'),
        path('auth/login/', LoginView.as_view(), name='login'),
        path('auth/logout/', LogoutView.as_view(), name='logout'),
        path('auth/token/refresh/', __import__('rest_framework_simplejwt.views', fromlist=['TokenRefreshView']).TokenRefreshView.as_view(), name='token-refresh'),
        path('auth/me/', CurrentUserView.as_view(), name='current-user'),

        # Memberships
        path('members/me/', MyMembershipsView.as_view(), name='my-memberships'),
        path('members/<uuid:pk>/', MemberDetailView.as_view(), name='member-detail'),

        # Main routes
        path('', include(router.urls)),
        path('', include(courses_router.urls)),
        path('', include(modules_router.urls)),
        path('', include(assessments_router.urls)),
        path('', include(orgs_router.urls)),

        # AI Services
        path('ai/chat/', ChatCompletionView.as_view(), name='ai-chat'),
        path('ai/transcribe/', TranscribeView.as_view(), name='ai-transcribe'),

        # Gamification
        path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),

        # Health check
        path('health/', health_check, name='health-check'),

        # API Schema
        path('schema/', SpectacularAPIView.as_view(), name='schema'),
        path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    ])),
]
