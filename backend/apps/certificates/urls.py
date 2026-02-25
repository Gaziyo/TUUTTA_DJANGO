from rest_framework.routers import DefaultRouter
from .views import CertificateViewSet, CertificateTemplateViewSet

router = DefaultRouter()
router.register(r'certificates', CertificateViewSet, basename='certificates')
router.register(r'certificate-templates', CertificateTemplateViewSet, basename='certificate-templates')

urlpatterns = router.urls
