from rest_framework.routers import DefaultRouter
from .views import (
    AuditLogViewSet, AnalyticsJobViewSet,
    GenieReportScheduleViewSet, GenieReportRunViewSet,
    ManagerDigestRunViewSet,
)

router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')
router.register(r'analytics-jobs', AnalyticsJobViewSet, basename='analytics-jobs')
router.register(r'genie-report-schedules', GenieReportScheduleViewSet, basename='genie-report-schedules')
router.register(r'genie-report-runs', GenieReportRunViewSet, basename='genie-report-runs')
router.register(r'manager-digest-runs', ManagerDigestRunViewSet, basename='manager-digest-runs')

urlpatterns = router.urls
