from rest_framework import serializers
from .models import GenieSource, GeniePipeline


class GenieSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = GenieSource
        fields = ['id', 'name', 'source_type', 'url', 'status', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at', 'status']


class GeniePipelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeniePipeline
        fields = ['id', 'name', 'sources', 'config', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']
