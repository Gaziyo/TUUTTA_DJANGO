from rest_framework.routers import DefaultRouter
from .views import CognitiveProfileViewSet, GapMatrixViewSet

router = DefaultRouter()
router.register(r'cognitive-profiles', CognitiveProfileViewSet, basename='cognitive-profile')
router.register(r'gap-matrix', GapMatrixViewSet, basename='gap-matrix')

urlpatterns = router.urls
