from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.views import RegisterView, LoginView, LogoutView, CurrentUserView
from apps.organizations.views import OrganizationViewSet, DepartmentViewSet, TeamViewSet, MyMembershipsView, OrganizationMemberViewSet, MemberDetailView
from apps.courses.views import CourseViewSet, CourseModuleViewSet, LessonViewSet, AdaptiveReleaseRuleViewSet
from apps.assessments.views import AssessmentViewSet, QuestionViewSet
from apps.enrollments.views import EnrollmentViewSet
from apps.progress.views import ProgressViewSet
from apps.gamification.views import AchievementViewSet, LeaderboardView
from apps.certificates.views import CertificateViewSet, CertificateTemplateViewSet
from apps.ai_services.views import ChatCompletionView, TranscribeView, TextToSpeechView, WebSearchView
from apps.competencies.views import (
    CompetencyFrameworkViewSet, CompetencyViewSet, RoleCompetencyMappingViewSet,
    CompliancePolicyViewSet, CompetencyScoreViewSet, CompetencySnapshotViewSet, BloomLevelViewSet
)
from apps.knowledge.views import (
    KnowledgeDocumentViewSet,
    KnowledgeChunkViewSet,
    KnowledgeNodeViewSet,
    KnowledgeEdgeViewSet,
)
from apps.notifications.views import NotificationViewSet, NotificationOutboxViewSet
from apps.learning_intelligence.views import (
    CognitiveProfileViewSet,
    GapMatrixViewSet,
    RemediationTriggerViewSet,
    AdaptivePolicyViewSet,
    AdaptiveRecommendationViewSet,
    AdaptiveDecisionLogViewSet,
    FailureRiskSnapshotViewSet,
    BaselineDiagnosticViewSet,
    GNNInsightViewSet,
    InterventionLogViewSet,
    GapClosureSnapshotViewSet,
)
from apps.genie.views import GenieSourceViewSet, GeniePipelineViewSet, ELSProjectViewSet
from apps.analytics.views import (
    AuditLogViewSet, AnalyticsJobViewSet,
    GenieReportScheduleViewSet, GenieReportRunViewSet, ManagerDigestRunViewSet,
    BloomAnalyticsSnapshotViewSet,
    WorkforceCapabilityIndexViewSet, DepartmentBloomTrendViewSet,
    CompetencyTrajectoryForecastViewSet, ComplianceReadinessPredictionViewSet,
    StrategicSkillShortageDetectionViewSet,
    EvidenceExportView
)
from apps.governance.views import (
    GovernancePolicyViewSet,
    ExplainabilityLogViewSet,
    BiasScanViewSet,
    ModelVersionViewSet,
    HumanOverrideViewSet,
)
from apps.webhooks.views import WebhookEndpointViewSet, WebhookDeliveryViewSet


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
router.register(r'certificates', CertificateViewSet, basename='certificate')
router.register(r'certificate-templates', CertificateTemplateViewSet, basename='certificate-templates')
router.register(r'notifications', NotificationViewSet, basename='notification')

# Nested routers
courses_router = nested_routers.NestedDefaultRouter(router, r'courses', lookup='course')
courses_router.register(r'modules', CourseModuleViewSet, basename='course-modules')
courses_router.register(r'adaptive-release-rules', AdaptiveReleaseRuleViewSet, basename='course-adaptive-release-rules')

modules_router = nested_routers.NestedDefaultRouter(courses_router, r'modules', lookup='module')
modules_router.register(r'lessons', LessonViewSet, basename='module-lessons')

assessments_router = nested_routers.NestedDefaultRouter(router, r'assessments', lookup='assessment')
assessments_router.register(r'questions', QuestionViewSet, basename='assessment-questions')

orgs_router = nested_routers.NestedDefaultRouter(router, r'organizations', lookup='organization')
orgs_router.register(r'departments', DepartmentViewSet, basename='organization-departments')
orgs_router.register(r'teams', TeamViewSet, basename='organization-teams')
orgs_router.register(r'members', OrganizationMemberViewSet, basename='organization-members')
# Cognitive OS nested routes
orgs_router.register(r'competency-frameworks', CompetencyFrameworkViewSet, basename='organization-competency-frameworks')
orgs_router.register(r'competencies', CompetencyViewSet, basename='organization-competencies')
orgs_router.register(r'role-competency-mappings', RoleCompetencyMappingViewSet, basename='organization-role-mappings')
orgs_router.register(r'compliance-policies', CompliancePolicyViewSet, basename='organization-compliance-policies')
orgs_router.register(r'competency-scores', CompetencyScoreViewSet, basename='organization-competency-scores')
orgs_router.register(r'competency-snapshots', CompetencySnapshotViewSet, basename='organization-competency-snapshots')
router.register(r'bloom-levels', BloomLevelViewSet, basename='bloom-levels')
orgs_router.register(r'knowledge-documents', KnowledgeDocumentViewSet, basename='organization-knowledge-documents')
orgs_router.register(r'knowledge-chunks', KnowledgeChunkViewSet, basename='organization-knowledge-chunks')
orgs_router.register(r'knowledge-nodes', KnowledgeNodeViewSet, basename='organization-knowledge-nodes')
orgs_router.register(r'knowledge-edges', KnowledgeEdgeViewSet, basename='organization-knowledge-edges')
orgs_router.register(r'cognitive-profiles', CognitiveProfileViewSet, basename='organization-cognitive-profiles')
orgs_router.register(r'gap-matrix', GapMatrixViewSet, basename='organization-gap-matrix')
orgs_router.register(r'remediation-triggers', RemediationTriggerViewSet, basename='organization-remediation-triggers')
orgs_router.register(r'adaptive-policies', AdaptivePolicyViewSet, basename='organization-adaptive-policies')
orgs_router.register(r'adaptive-recommendations', AdaptiveRecommendationViewSet, basename='organization-adaptive-recommendations')
orgs_router.register(r'adaptive-decisions', AdaptiveDecisionLogViewSet, basename='organization-adaptive-decisions')
orgs_router.register(r'failure-risks', FailureRiskSnapshotViewSet, basename='organization-failure-risks')
orgs_router.register(r'baseline-diagnostics', BaselineDiagnosticViewSet, basename='organization-baseline-diagnostics')
orgs_router.register(r'gnn-insights', GNNInsightViewSet, basename='organization-gnn-insights')
orgs_router.register(r'intervention-logs', InterventionLogViewSet, basename='organization-intervention-logs')
orgs_router.register(r'gap-closure-snapshots', GapClosureSnapshotViewSet, basename='organization-gap-closure-snapshots')
orgs_router.register(r'notifications', NotificationViewSet, basename='organization-notifications')
orgs_router.register(r'notification-outbox', NotificationOutboxViewSet, basename='organization-notification-outbox')
orgs_router.register(r'webhook-endpoints', WebhookEndpointViewSet, basename='organization-webhook-endpoints')
orgs_router.register(r'webhook-deliveries', WebhookDeliveryViewSet, basename='organization-webhook-deliveries')
orgs_router.register(r'audit-logs', AuditLogViewSet, basename='organization-audit-logs')
orgs_router.register(r'analytics-jobs', AnalyticsJobViewSet, basename='organization-analytics-jobs')
orgs_router.register(r'bloom-analytics', BloomAnalyticsSnapshotViewSet, basename='organization-bloom-analytics')
orgs_router.register(r'workforce-capability', WorkforceCapabilityIndexViewSet, basename='organization-workforce-capability')
orgs_router.register(r'department-bloom-trends', DepartmentBloomTrendViewSet, basename='organization-department-bloom-trends')
orgs_router.register(r'competency-forecasts', CompetencyTrajectoryForecastViewSet, basename='organization-competency-forecasts')
orgs_router.register(r'compliance-readiness', ComplianceReadinessPredictionViewSet, basename='organization-compliance-readiness')
orgs_router.register(r'skill-shortages', StrategicSkillShortageDetectionViewSet, basename='organization-skill-shortages')
orgs_router.register(r'genie-report-schedules', GenieReportScheduleViewSet, basename='organization-genie-report-schedules')
orgs_router.register(r'genie-report-runs', GenieReportRunViewSet, basename='organization-genie-report-runs')
orgs_router.register(r'manager-digest-runs', ManagerDigestRunViewSet, basename='organization-manager-digest-runs')
# Governance
orgs_router.register(r'governance-policies', GovernancePolicyViewSet, basename='organization-governance-policies')
orgs_router.register(r'explainability-logs', ExplainabilityLogViewSet, basename='organization-explainability-logs')
orgs_router.register(r'bias-scans', BiasScanViewSet, basename='organization-bias-scans')
orgs_router.register(r'model-versions', ModelVersionViewSet, basename='organization-model-versions')
orgs_router.register(r'human-overrides', HumanOverrideViewSet, basename='organization-human-overrides')
# ELS Pipeline routes
orgs_router.register(r'els-projects', ELSProjectViewSet, basename='organization-els-projects')

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

        # Genie / ELS
        path('genie/', include('apps.genie.urls')),

        # AI Services
        path('ai/chat/', ChatCompletionView.as_view(), name='ai-chat'),
        path('ai/transcribe/', TranscribeView.as_view(), name='ai-transcribe'),
        path('ai/tts/', TextToSpeechView.as_view(), name='ai-tts'),
        path('ai/search/', WebSearchView.as_view(), name='ai-search'),

        # Evidence export
        path('organizations/<uuid:org_id>/evidence-export/', EvidenceExportView.as_view(), name='evidence-export'),

        # Gamification
        path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),

        # Health check
        path('health/', health_check, name='health-check'),

        # API Schema
        path('schema/', SpectacularAPIView.as_view(), name='schema'),
        path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    ])),
]
