from rest_framework import serializers
from .models import KnowledgeDocument, KnowledgeChunk, KnowledgeNode, KnowledgeEdge


class KnowledgeChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeChunk
        fields = ['id', 'document', 'chunk_index', 'content', 'token_count', 'bloom_level', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']


class KnowledgeDocumentSerializer(serializers.ModelSerializer):
    chunks = KnowledgeChunkSerializer(many=True, read_only=True)

    class Meta:
        model = KnowledgeDocument
        fields = [
            'id', 'organization', 'created_by',
            'title', 'description', 'source_type', 'source_url', 'file_path',
            'language', 'status', 'error_message',
            'chunk_count', 'token_count', 'metadata',
            'created_at', 'updated_at', 'chunks',
        ]
        read_only_fields = ['id', 'created_by', 'chunk_count', 'token_count', 'created_at', 'updated_at']


class KnowledgeDocumentListSerializer(serializers.ModelSerializer):
    """Lightweight list serializer — excludes chunk list and raw content."""

    class Meta:
        model = KnowledgeDocument
        fields = [
            'id', 'organization', 'title', 'description',
            'source_type', 'source_url', 'language',
            'status', 'chunk_count', 'token_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class KnowledgeNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeNode
        fields = '__all__'


class KnowledgeEdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeEdge
        fields = '__all__'
