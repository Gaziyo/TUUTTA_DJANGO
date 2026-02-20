from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
import uuid


class GenieSource(models.Model):
    SOURCE_TYPES = [
        ('document', 'Document'),
        ('url', 'URL'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('text', 'Text'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='genie_sources')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    name = models.CharField(max_length=500)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    url = models.URLField(blank=True)
    file_path = models.CharField(max_length=1000, blank=True)
    content = models.TextField(blank=True)

    status = models.CharField(max_length=20, default='pending')
    processed_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'genie_sources'

    def __str__(self):
        return self.name


class GeniePipeline(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    name = models.CharField(max_length=500)
    sources = models.ManyToManyField(GenieSource, blank=True)

    config = models.JSONField(default=dict)
    status = models.CharField(max_length=20, default='draft')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'genie_pipelines'
