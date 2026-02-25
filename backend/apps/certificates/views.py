from rest_framework import viewsets, permissions
from .models import Certificate, CertificateTemplate
from .serializers import CertificateSerializer, CertificateTemplateSerializer


class CertificateViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CertificateSerializer
    filterset_fields = ['organization', 'user', 'course']

    def get_queryset(self):
        return Certificate.objects.filter(user=self.request.user) | Certificate.objects.filter(
            organization__members__user=self.request.user
        )


class CertificateTemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CertificateTemplateSerializer

    def get_queryset(self):
        org_id = self.request.query_params.get('organization')
        if org_id:
            return CertificateTemplate.objects.filter(organization_id=org_id)
        return CertificateTemplate.objects.none()
