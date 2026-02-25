from rest_framework import serializers
from .models import Certificate, CertificateTemplate


class CertificateTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateTemplate
        fields = ['id', 'organization', 'name', 'template_data', 'is_default', 'created_at']


class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = [
            'id', 'user', 'course', 'organization', 'template',
            'certificate_number', 'issued_at', 'expires_at',
            'pdf_url', 'metadata'
        ]
