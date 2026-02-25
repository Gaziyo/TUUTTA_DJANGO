from django.core.files.storage import default_storage
from django.utils.text import slugify
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .tasks import ingest_knowledge_document_task, build_knowledge_graph_task
from .models import KnowledgeDocument, KnowledgeChunk, KnowledgeNode, KnowledgeEdge
from .serializers import (
    KnowledgeDocumentSerializer,
    KnowledgeDocumentListSerializer,
    KnowledgeChunkSerializer,
    KnowledgeNodeSerializer,
    KnowledgeEdgeSerializer,
)


class KnowledgeDocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'source_type']

    def get_serializer_class(self):
        if self.action == 'list':
            return KnowledgeDocumentListSerializer
        return KnowledgeDocumentSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return KnowledgeDocument.objects.filter(organization_id=org_id)
        return KnowledgeDocument.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request, *args, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'detail': 'organization is required'}, status=status.HTTP_400_BAD_REQUEST)

        upload = request.FILES.get('file')
        source_url = (request.data.get('source_url') or '').strip()
        content_text = request.data.get('content_text', '')
        title = request.data.get('title')
        description = request.data.get('description', '')
        source_type = request.data.get('source_type')

        file_path = ''
        if upload:
            filename = slugify(upload.name.rsplit('.', 1)[0]) or 'document'
            ext = upload.name.rsplit('.', 1)[-1].lower() if '.' in upload.name else 'bin'
            if not source_type:
                if ext in {'pdf'}:
                    source_type = 'pdf'
                elif ext in {'mp3', 'wav', 'm4a', 'aac', 'ogg'}:
                    source_type = 'audio'
                elif ext in {'mp4', 'mov', 'avi', 'mkv'}:
                    source_type = 'video'
                elif ext in {'zip', 'scorm'}:
                    source_type = 'scorm'
                else:
                    source_type = 'text'
            storage_path = f"knowledge/{org_id}/{filename}-{upload.size}.{ext}"
            file_path = default_storage.save(storage_path, upload)
        if not source_type:
            if source_url:
                source_type = 'url'
            else:
                source_type = 'text' if content_text else 'pdf'

        if not upload and not content_text and not source_url:
            return Response(
                {'detail': 'Provide one of file, content_text, or source_url.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not title:
            title = upload.name if upload else (source_url or 'Knowledge Document')

        document = KnowledgeDocument.objects.create(
            organization_id=org_id,
            created_by=request.user,
            title=title,
            description=description,
            source_type=source_type,
            source_url=source_url,
            file_path=file_path,
            content_text=content_text or '',
            status='pending',
            metadata={
                'original_filename': upload.name if upload else None,
                'content_type': upload.content_type if upload else None,
                'upload_size': upload.size if upload else None,
                'file_ext': upload.name.rsplit('.', 1)[-1].lower() if upload else None,
            },
        )

        ingest_knowledge_document_task.delay(str(document.id))

        serializer = KnowledgeDocumentSerializer(document)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='ingest')
    def ingest(self, request, *args, **kwargs):
        document = self.get_object()
        ingest_knowledge_document_task.delay(str(document.id))
        return Response({'status': 'queued', 'document_id': str(document.id)})


class KnowledgeChunkViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KnowledgeChunkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        document_pk = self.kwargs.get('document_pk')
        if document_pk:
            return KnowledgeChunk.objects.filter(document_id=document_pk)
        org_id = self.request.query_params.get('organization')
        if org_id:
            return KnowledgeChunk.objects.filter(document__organization_id=org_id)
        return KnowledgeChunk.objects.none()

    @action(detail=True, methods=['post'], url_path='feedback')
    def feedback(self, request, *args, **kwargs):
        chunk = self.get_object()
        metadata = chunk.metadata or {}
        metadata['feedback'] = {
            'primary': request.data.get('primary'),
            'secondary': request.data.get('secondary'),
            'confidence': request.data.get('confidence', 1.0),
            'modality': request.data.get('modality'),
            'notes': request.data.get('notes', ''),
            'provided_by': str(request.user.id),
            'provided_at': timezone.now().isoformat(),
        }
        if request.data.get('primary'):
            chunk.bloom_level = request.data.get('primary')
        chunk.metadata = metadata
        chunk.save(update_fields=['bloom_level', 'metadata'])
        return Response({'status': 'recorded'})


class KnowledgeNodeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KnowledgeNodeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return KnowledgeNode.objects.filter(organization_id=org_id)
        return KnowledgeNode.objects.none()

    @action(detail=False, methods=['post'], url_path='build')
    def build(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=status.HTTP_400_BAD_REQUEST)
        build_knowledge_graph_task.delay(str(org_id))
        return Response({'status': 'queued'})


class KnowledgeEdgeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KnowledgeEdgeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return KnowledgeEdge.objects.filter(organization_id=org_id)
        return KnowledgeEdge.objects.none()
