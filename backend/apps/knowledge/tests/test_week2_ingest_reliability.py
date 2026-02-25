import pytest
from django.contrib.auth import get_user_model

from apps.organizations.models import Organization
from apps.knowledge.models import KnowledgeDocument
from apps.knowledge.tasks import ingest_knowledge_document_task


User = get_user_model()


@pytest.fixture
def organization(db):
    owner = User.objects.create_user(
        username='ingest-owner@test.com',
        email='ingest-owner@test.com',
        password='OwnerPass1!',
    )
    return Organization.objects.create(
        name='Ingest Org',
        slug='ingest-org',
        plan='professional',
        created_by=owner,
    )


@pytest.mark.django_db
def test_ingest_capability_error_code_for_missing_ocr_dependency(monkeypatch, organization):
    document = KnowledgeDocument.objects.create(
        organization=organization,
        created_by=organization.created_by,
        title='Scanned image',
        source_type='text',
        file_path='knowledge/test-image.png',
        status='pending',
    )

    from apps.knowledge import services

    def fake_can_extract(_doc):
        return {
            'ok': False,
            'error_code': 'OCR_DEPENDENCY_MISSING',
            'message': 'OCR dependencies are not installed.',
            'retryable': False,
            'details': {'extension': 'png'},
        }

    monkeypatch.setattr(services, 'can_extract_document', fake_can_extract)

    result = ingest_knowledge_document_task(str(document.id))
    assert result == 'failed'

    document.refresh_from_db()
    assert document.status == 'failed'
    assert 'OCR_DEPENDENCY_MISSING' in document.error_message
    assert document.metadata['ingest_error']['error_code'] == 'OCR_DEPENDENCY_MISSING'
    assert document.metadata['ingest_error']['retryable'] is False


@pytest.mark.django_db
def test_ingest_retries_when_retryable_error(monkeypatch, organization):
    document = KnowledgeDocument.objects.create(
        organization=organization,
        created_by=organization.created_by,
        title='Retry URL',
        source_type='url',
        source_url='https://example.com/doc',
        status='pending',
    )

    from apps.knowledge import services
    from apps.knowledge import tasks

    attempts = {'count': 0}

    def fake_extract(_doc):
        attempts['count'] += 1
        return {
            'text': '',
            'error': {
                'error_code': 'URL_FETCH_FAILED',
                'message': 'upstream timeout',
                'retryable': True,
                'details': {'attempt': attempts['count']},
            },
        }

    queued = []

    def fake_delay(*args, **kwargs):
        queued.append({'args': args, 'kwargs': kwargs})
        return None

    monkeypatch.setattr(tasks, 'extract_text_for_document_with_status', fake_extract)
    monkeypatch.setattr(tasks.ingest_knowledge_document_task, 'delay', fake_delay)

    result = ingest_knowledge_document_task(str(document.id))
    assert result == 'failed'

    document.refresh_from_db()
    assert document.metadata['ingest_error']['error_code'] == 'URL_FETCH_FAILED'
    assert document.metadata['ingest_error']['retryable'] is True
    assert document.metadata['ingest_attempt'] == 1
    assert document.metadata['ingest_next_attempt'] == 2
    assert len(queued) == 1


@pytest.mark.django_db
def test_ingest_no_retry_after_max_attempts(monkeypatch, organization):
    document = KnowledgeDocument.objects.create(
        organization=organization,
        created_by=organization.created_by,
        title='Max attempts URL',
        source_type='url',
        source_url='https://example.com/doc',
        status='pending',
        metadata={'ingest_attempt': 2},
    )

    from apps.knowledge import tasks

    def fake_extract(_doc):
        return {
            'text': '',
            'error': {
                'error_code': 'URL_FETCH_FAILED',
                'message': 'upstream timeout',
                'retryable': True,
                'details': {},
            },
        }

    queued = []

    def fake_delay(*args, **kwargs):
        queued.append({'args': args, 'kwargs': kwargs})
        return None

    monkeypatch.setattr(tasks, 'extract_text_for_document_with_status', fake_extract)
    monkeypatch.setattr(tasks.ingest_knowledge_document_task, 'delay', fake_delay)

    result = ingest_knowledge_document_task(str(document.id))
    assert result == 'failed'

    document.refresh_from_db()
    assert document.metadata['ingest_attempt'] == 3
    assert len(queued) == 0
