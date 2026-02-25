from rest_framework.routers import DefaultRouter
from .views import (
    CompetencyFrameworkViewSet,
    CompetencyViewSet,
    RoleCompetencyMappingViewSet,
    CompliancePolicyViewSet,
)

router = DefaultRouter()
router.register(r'frameworks', CompetencyFrameworkViewSet, basename='competency-framework')
router.register(r'competencies', CompetencyViewSet, basename='competency')
router.register(r'role-mappings', RoleCompetencyMappingViewSet, basename='role-competency-mapping')
router.register(r'compliance-policies', CompliancePolicyViewSet, basename='compliance-policy')

urlpatterns = router.urls
