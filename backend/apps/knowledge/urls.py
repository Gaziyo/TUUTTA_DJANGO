from rest_framework.routers import DefaultRouter
from .views import KnowledgeDocumentViewSet, KnowledgeChunkViewSet

router = DefaultRouter()
router.register(r'documents', KnowledgeDocumentViewSet, basename='knowledge-document')
router.register(r'chunks', KnowledgeChunkViewSet, basename='knowledge-chunk')

urlpatterns = router.urls
