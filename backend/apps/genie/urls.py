from rest_framework.routers import DefaultRouter
from .views import GenieSourceViewSet, GeniePipelineViewSet, ELSProjectViewSet

router = DefaultRouter()
router.register(r'sources', GenieSourceViewSet, basename='genie-source')
router.register(r'pipelines', GeniePipelineViewSet, basename='genie-pipeline')
router.register(r'els-projects', ELSProjectViewSet, basename='els-project')

urlpatterns = router.urls
