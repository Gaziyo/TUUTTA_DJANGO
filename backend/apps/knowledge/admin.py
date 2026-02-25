from django.contrib import admin
from .models import KnowledgeDocument, KnowledgeChunk

admin.site.register(KnowledgeDocument)
admin.site.register(KnowledgeChunk)
