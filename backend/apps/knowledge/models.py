from django.db import models
from apps.organizations.models import Organization
from apps.accounts.models import User
import uuid


class KnowledgeDocument(models.Model):
    SOURCE_TYPES = [
        ('pdf', 'PDF'),
        ('url', 'URL'),
        ('text', 'Plain Text'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('scorm', 'SCORM Package'),
    ]

    STATUSES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('indexed', 'Indexed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='knowledge_documents')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_documents')

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)

    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    source_url = models.URLField(blank=True)
    file_path = models.CharField(max_length=1000, blank=True)  # S3/GCS path

    content_text = models.TextField(blank=True)  # extracted raw text
    language = models.CharField(max_length=10, default='en')

    status = models.CharField(max_length=20, choices=STATUSES, default='pending')
    error_message = models.TextField(blank=True)

    # Chunk metadata populated after ingestion
    chunk_count = models.IntegerField(default=0)
    token_count = models.IntegerField(default=0)

    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'knowledge_documents'

    def __str__(self):
        return self.title


class KnowledgeChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(KnowledgeDocument, on_delete=models.CASCADE, related_name='chunks')

    chunk_index = models.IntegerField()
    content = models.TextField()

    # Vector embedding stored as JSON array (migrate to pgvector VectorField later)
    embedding = models.JSONField(null=True, blank=True)

    token_count = models.IntegerField(default=0)

    # Bloom classification inferred during ingestion
    bloom_level = models.IntegerField(null=True, blank=True)

    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'knowledge_chunks'
        ordering = ['document', 'chunk_index']
        unique_together = ['document', 'chunk_index']

    def __str__(self):
        return f'{self.document.title} — chunk {self.chunk_index}'


class KnowledgeNode(models.Model):
    NODE_TYPES = [
        ('chunk', 'Knowledge Chunk'),
        ('competency', 'Competency'),
        ('concept', 'Concept'),
        ('learner', 'Learner'),
        ('assessment', 'Assessment'),
        ('bloom', 'Bloom Level'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='knowledge_nodes')
    node_type = models.CharField(max_length=20, choices=NODE_TYPES)
    label = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'knowledge_nodes'
        indexes = [
            models.Index(fields=['organization', 'node_type']),
        ]

    def __str__(self):
        return f'{self.node_type}:{self.label}'


class KnowledgeEdge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='knowledge_edges')
    source = models.ForeignKey(KnowledgeNode, on_delete=models.CASCADE, related_name='out_edges')
    target = models.ForeignKey(KnowledgeNode, on_delete=models.CASCADE, related_name='in_edges')
    weight = models.FloatField(default=1.0)
    relation = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'knowledge_edges'
        indexes = [
            models.Index(fields=['organization']),
        ]

    def __str__(self):
        return f'{self.source_id} -> {self.target_id}'
