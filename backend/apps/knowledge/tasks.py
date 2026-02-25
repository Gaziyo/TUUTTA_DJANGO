from __future__ import annotations

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .models import KnowledgeDocument, KnowledgeChunk, KnowledgeNode, KnowledgeEdge
from .services import (
    extract_text_for_document,
    semantic_chunk_text,
    chunk_text,
    estimate_tokens,
    classify_bloom_level,
    summarize_bloom_distribution,
    infer_audience_profile,
    generate_embedding,
)


@shared_task
def ingest_knowledge_document_task(document_id: str, trigger_analyze: bool = True) -> str:
    try:
        document = KnowledgeDocument.objects.get(id=document_id)
    except KnowledgeDocument.DoesNotExist:
        return 'missing'

    document.status = 'processing'
    document.error_message = ''
    document.metadata = {**(document.metadata or {}), 'ingest_started_at': timezone.now().isoformat()}
    document.save(update_fields=['status', 'error_message', 'metadata', 'updated_at'])

    text = extract_text_for_document(document)
    if not text:
        document.status = 'failed'
        document.error_message = 'No content extracted. Provide content_text or configure OCR/transcription.'
        document.metadata = {**(document.metadata or {}), 'ingest_failed_at': timezone.now().isoformat()}
        document.save(update_fields=['status', 'error_message', 'metadata', 'updated_at'])
        return 'failed'

    chunks = semantic_chunk_text(text)
    if not chunks:
        chunks = chunk_text(text)
    if not chunks:
        document.status = 'failed'
        document.error_message = 'No chunks produced from extracted content.'
        document.metadata = {**(document.metadata or {}), 'ingest_failed_at': timezone.now().isoformat()}
        document.save(update_fields=['status', 'error_message', 'metadata', 'updated_at'])
        return 'failed'

    with transaction.atomic():
        KnowledgeChunk.objects.filter(document=document).delete()
        total_tokens = 0
        for idx, content in enumerate(chunks):
            token_count = estimate_tokens(content)
            total_tokens += token_count
            KnowledgeChunk.objects.create(
                document=document,
                chunk_index=idx,
                content=content,
                embedding=generate_embedding(content),
                token_count=token_count,
                metadata={'ingested_at': timezone.now().isoformat()},
            )

        document.content_text = text
        document.chunk_count = len(chunks)
        document.token_count = total_tokens
        document.status = 'indexed'
        document.metadata = {
            **(document.metadata or {}),
            'ingest_completed_at': timezone.now().isoformat(),
            'chunking': {'count': len(chunks), 'token_count': total_tokens},
        }
        document.save(update_fields=[
            'content_text', 'chunk_count', 'token_count',
            'status', 'metadata', 'updated_at',
        ])

    if trigger_analyze:
        analyze_knowledge_document_task.delay(document_id)
    return 'indexed'


@shared_task
def analyze_knowledge_document_task(document_id: str, trigger_gap: bool = True) -> str:
    try:
        document = KnowledgeDocument.objects.get(id=document_id)
    except KnowledgeDocument.DoesNotExist:
        return 'missing'

    document.metadata = {**(document.metadata or {}), 'analysis_started_at': timezone.now().isoformat()}
    document.save(update_fields=['metadata', 'updated_at'])

    bloom_levels = []
    for chunk in KnowledgeChunk.objects.filter(document=document).order_by('chunk_index'):
        feedback = (chunk.metadata or {}).get('feedback', {})
        primary = feedback.get('primary')
        secondary = feedback.get('secondary')
        confidence = feedback.get('confidence')
        modality = feedback.get('modality')
        if not all(value is not None for value in [primary, secondary, confidence, modality]):
            primary, secondary, confidence, modality = classify_bloom_level(chunk.content)
        chunk.bloom_level = primary
        chunk.metadata = {
            **(chunk.metadata or {}),
            'bloom': {
                'primary': primary,
                'secondary': secondary,
                'confidence': confidence,
            },
            'modality_hint': modality,
        }
        chunk.save(update_fields=['bloom_level', 'metadata'])
        bloom_levels.append(primary)

    document.metadata = {
        **(document.metadata or {}),
        'analysis_completed_at': timezone.now().isoformat(),
        'bloom_distribution': summarize_bloom_distribution(bloom_levels),
        'audience_profile': infer_audience_profile(document),
    }
    document.save(update_fields=['metadata', 'updated_at'])

    if trigger_gap:
        from apps.learning_intelligence.tasks import compute_gap_matrix_task

        compute_gap_matrix_task.delay(str(document.organization_id))

    return 'analyzed'


@shared_task
def build_knowledge_graph_task(org_id: str) -> int:
    from apps.competencies.models import Competency
    from apps.assessments.models import AssessmentAttempt
    from apps.organizations.models import OrganizationMember

    KnowledgeEdge.objects.filter(organization_id=org_id).delete()
    KnowledgeNode.objects.filter(organization_id=org_id).delete()

    nodes = {}
    # Competency nodes
    for competency in Competency.objects.filter(organization_id=org_id):
        node = KnowledgeNode.objects.create(
            organization_id=org_id,
            node_type='competency',
            label=competency.name,
            metadata={'competency_id': str(competency.id)},
        )
        nodes[f'competency:{competency.id}'] = node

    # Bloom level nodes
    for bloom in range(1, 7):
        node = KnowledgeNode.objects.create(
            organization_id=org_id,
            node_type='bloom',
            label=f'Bloom L{bloom}',
            metadata={'bloom_level': bloom},
        )
        nodes[f'bloom:{bloom}'] = node

    # Learner nodes
    for membership in OrganizationMember.objects.filter(organization_id=org_id).select_related('user'):
        node = KnowledgeNode.objects.create(
            organization_id=org_id,
            node_type='learner',
            label=membership.user.display_name or membership.user.email,
            metadata={'user_id': str(membership.user_id), 'role': membership.role},
        )
        nodes[f'learner:{membership.user_id}'] = node

    # Assessment nodes
    assessments = (
        AssessmentAttempt.objects
        .filter(assessment__organization_id=org_id)
        .select_related('assessment')
        .values_list('assessment_id', 'assessment__title')
        .distinct()
    )
    for assessment_id, assessment_title in assessments:
        node = KnowledgeNode.objects.create(
            organization_id=org_id,
            node_type='assessment',
            label=assessment_title or f'Assessment {assessment_id}',
            metadata={'assessment_id': str(assessment_id)},
        )
        nodes[f'assessment:{assessment_id}'] = node

    # Chunk nodes and edges
    chunks = KnowledgeChunk.objects.filter(document__organization_id=org_id).select_related('document')
    for chunk in chunks:
        node = KnowledgeNode.objects.create(
            organization_id=org_id,
            node_type='chunk',
            label=f'{chunk.document.title} #{chunk.chunk_index + 1}',
            metadata={'chunk_id': str(chunk.id), 'document_id': str(chunk.document_id)},
        )
        nodes[f'chunk:{chunk.id}'] = node

        for comp_key, comp_node in nodes.items():
            if not comp_key.startswith('competency:'):
                continue
            similarity_weight = 0.5
            if chunk.embedding:
                similarity_weight = 0.6
            KnowledgeEdge.objects.create(
                organization_id=org_id,
                source=node,
                target=comp_node,
                weight=similarity_weight,
                relation='covers',
            )
        if chunk.bloom_level and nodes.get(f'bloom:{chunk.bloom_level}'):
            KnowledgeEdge.objects.create(
                organization_id=org_id,
                source=node,
                target=nodes[f'bloom:{chunk.bloom_level}'],
                weight=1.0,
                relation='classified_as',
            )

    # Learner-assessment edges (weighted by score)
    attempts = AssessmentAttempt.objects.filter(
        assessment__organization_id=org_id,
        submitted_at__isnull=False,
    ).select_related('assessment', 'user')
    for attempt in attempts:
        learner = nodes.get(f'learner:{attempt.user_id}')
        assessment = nodes.get(f'assessment:{attempt.assessment_id}')
        if not learner or not assessment:
            continue
        percentage = float(attempt.percentage or 0.0)
        KnowledgeEdge.objects.create(
            organization_id=org_id,
            source=learner,
            target=assessment,
            weight=round(max(0.1, min(1.0, percentage / 100.0)), 2),
            relation='attempted',
        )

    return KnowledgeNode.objects.filter(organization_id=org_id).count()
