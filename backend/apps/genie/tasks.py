from __future__ import annotations

import hashlib
import time
import uuid
from datetime import timedelta

from celery import shared_task
from django.db.models import Avg
from django.utils import timezone
from django.utils.text import slugify

from apps.assessments.models import Assessment, Question, QuestionOption
from apps.courses.models import Course, CourseModule, Lesson
from apps.enrollments.models import Enrollment
from apps.learning_intelligence.models import CognitiveProfile, GapMatrix
from apps.organizations.models import OrganizationMember
from apps.competencies.models import RoleCompetencyMapping
from apps.notifications.services import enqueue_notification
from apps.knowledge.models import KnowledgeDocument, KnowledgeChunk
from apps.knowledge.tasks import ingest_knowledge_document_task, analyze_knowledge_document_task
from apps.learning_intelligence.tasks import (
    compute_gap_matrix_task,
    auto_enroll_gap_courses_task,
    remediation_trigger_task,
    recalibrate_gap_matrix_task,
    record_gap_closure_snapshot_task,
)
from apps.analytics.tasks import compute_bloom_analytics_snapshot_task
from apps.certificates.tasks import issue_certificates_for_completed_enrollments

from .models import (
    ELSProject,
    ELSProjectPhase,
    ELSProjectException,
    ELSProjectRunMetric,
)

PIPELINE_PHASES = ['ingest', 'analyze', 'design', 'develop', 'implement', 'evaluate']
RUN_STATE_BY_PHASE = {
    'ingest': 'ingesting',
    'analyze': 'analyzing',
    'design': 'designing',
    'develop': 'developing',
    'implement': 'implementing',
    'evaluate': 'evaluating',
}
MAX_INGEST_RETRIES = 3
INGEST_RETRY_BACKOFF_SECONDS = [0, 1, 2]


def _phase_index(phase: str) -> int:
    try:
        return PIPELINE_PHASES.index(phase)
    except ValueError:
        return 0


def _artifact_lineage(project: ELSProject, phase: str) -> dict:
    document_ids = sorted([str(doc.id) for doc in project.knowledge_documents.all()])
    digest = hashlib.sha256(
        f'{project.id}|{phase}|{"|".join(document_ids)}|{project.run_attempt}'.encode('utf-8')
    ).hexdigest()
    return {
        'package_version': f'{phase}-v{int(project.run_attempt or 1)}',
        'policy_version': 'autonomous-policy-v1',
        'model_versions': {
            'ingest': 'knowledge-ingest-v1',
            'analyze': 'weighted-gap-v1',
            'design': 'addie-design-v1',
            'develop': 'addie-develop-v1',
            'evaluate': 'outcome-eval-v1',
        },
        'source_document_ids': document_ids,
        'provenance_hash': digest,
        'generated_at': timezone.now().isoformat(),
    }


def _module_band_for_bloom(level: int) -> str:
    if level <= 2:
        return 'foundation'
    if level == 3:
        return 'application'
    if level == 4:
        return 'analysis'
    return 'critical'


def _create_assessment_for_module(course, module, chunks):
    assessment = Assessment.objects.create(
        organization=course.organization,
        course=course,
        title=f'{module.title} Check',
        description='AI-generated knowledge check',
        assessment_type='quiz',
        assessment_subtype='formative',
        bloom_level=module.bloom_level_max,
        passing_score=70,
        max_attempts=3,
        is_published=False,
        created_by=course.created_by,
    )

    for idx, chunk in enumerate(chunks[:3]):
        question = Question.objects.create(
            assessment=assessment,
            question_text=f'Which statement best summarizes: {chunk.content[:160]}',
            question_type='mcq',
            order_index=idx,
            points=1,
            bloom_level=chunk.bloom_level,
            modality=chunk.metadata.get('modality_hint', 'reading') if chunk.metadata else 'reading',
            knowledge_chunk=chunk,
        )
        options = [
            ('Summary matches the passage.', True),
            ('The passage is about an unrelated topic.', False),
            ('The passage is only an example, not the main idea.', False),
            ('The passage provides no useful information.', False),
        ]
        for opt_idx, (text, is_correct) in enumerate(options):
            QuestionOption.objects.create(
                question=question,
                option_text=text,
                is_correct=is_correct,
                order_index=opt_idx,
            )

    return assessment


def _generate_course_from_document(document: KnowledgeDocument):
    title = f'Generated: {document.title}'
    slug = slugify(title) or f'course-{str(document.id)[:8]}'
    course = Course.objects.create(
        organization=document.organization,
        title=title,
        slug=slug,
        description=document.description or 'AI-generated course from uploaded content.',
        short_description=document.description[:250] if document.description else '',
        status='draft',
        visibility='organization',
        ai_generated=True,
        created_by=document.created_by,
    )

    chunks = list(KnowledgeChunk.objects.filter(document=document).order_by('chunk_index'))
    if not chunks:
        return course, []

    modules_by_band = {}
    for chunk in chunks:
        level = chunk.bloom_level or 2
        band = _module_band_for_bloom(level)
        modules_by_band.setdefault(band, []).append(chunk)

    created_assessments = []
    order = 0
    band_order = ['foundation', 'application', 'analysis', 'critical']
    for band in band_order:
        band_chunks = modules_by_band.get(band, [])
        if not band_chunks:
            continue
        module = CourseModule.objects.create(
            course=course,
            title=f'{band.title()} Module',
            description=f'Bloom {band} content derived from knowledge chunks.',
            order_index=order,
            bloom_band=band,
            bloom_level_min=min([c.bloom_level or 1 for c in band_chunks]),
            bloom_level_max=max([c.bloom_level or 2 for c in band_chunks]),
        )
        order += 1

        for idx, chunk in enumerate(band_chunks[:8]):
            Lesson.objects.create(
                module=module,
                title=f'Lesson {idx + 1}',
                description=chunk.content[:200],
                lesson_type='text',
                order_index=idx,
                content={'body': chunk.content},
                bloom_level=chunk.bloom_level,
                modality=chunk.metadata.get('modality_hint', 'reading') if chunk.metadata else 'reading',
            )

        assessment = _create_assessment_for_module(course, module, band_chunks)
        created_assessments.append(assessment)
        Lesson.objects.filter(module=module).order_by('order_index').update(assessment=assessment)

    return course, created_assessments


def _quality_issues_for_generated_content(course: Course, assessments: list[Assessment]) -> list[str]:
    issues: list[str] = []
    modules = list(CourseModule.objects.filter(course=course))
    if not modules:
        issues.append('No modules generated.')
        return issues

    for module in modules:
        lesson_count = Lesson.objects.filter(module=module).count()
        if lesson_count == 0:
            issues.append(f'Module "{module.title}" has no lessons.')

    for assessment in assessments:
        question_count = Question.objects.filter(assessment=assessment).count()
        if question_count < 3:
            issues.append(f'Assessment "{assessment.title}" has fewer than 3 questions.')

    if not course.description or len(course.description.strip()) < 24:
        issues.append('Course description is too short.')
    return issues


def _touch_phase(project: ELSProject, phase: str, status: str):
    record, _ = ELSProjectPhase.objects.get_or_create(project=project, phase=phase)
    record.status = status
    if status == 'in_progress' and not record.started_at:
        record.started_at = timezone.now()
    if status == 'completed' and not record.completed_at:
        record.completed_at = timezone.now()
    if status in {'failed', 'exception_required', 'canceled'}:
        record.completed_at = timezone.now()
    record.save()


def _set_project_run_state(
    project: ELSProject,
    run_state: str,
    *,
    run_id: str | None = None,
    idempotency_key: str | None = None,
    correlation_id: str | None = None,
    error_code: str = '',
    error_message: str = '',
    completed: bool = False,
) -> None:
    project.run_state = run_state
    if run_id is not None:
        project.current_run_id = run_id
    if idempotency_key is not None:
        project.current_idempotency_key = idempotency_key
    if correlation_id is not None:
        project.current_correlation_id = correlation_id
    if run_state in {'ingesting', 'analyzing', 'designing', 'developing', 'implementing', 'evaluating'}:
        project.run_started_at = project.run_started_at or timezone.now()
    if completed:
        project.run_completed_at = timezone.now()
    project.last_error_code = error_code
    project.last_error_message = error_message
    project.save(update_fields=[
        'run_state',
        'current_run_id',
        'current_idempotency_key',
        'current_correlation_id',
        'run_started_at',
        'run_completed_at',
        'last_error_code',
        'last_error_message',
        'updated_at',
    ])


def _record_phase_metric(
    project: ELSProject,
    run_id: uuid.UUID,
    phase: str,
    started_at: float,
    status: str = 'success',
    quality_score: float | None = None,
    metadata: dict | None = None,
) -> None:
    duration_ms = int((time.monotonic() - started_at) * 1000)
    ELSProjectRunMetric.objects.create(
        project=project,
        run_id=run_id,
        phase=phase,
        status=status,
        duration_ms=max(duration_ms, 0),
        quality_score=quality_score,
        metadata=metadata or {},
    )


def _default_gate(phase: str, checks: list[dict]) -> tuple[float, float]:
    if not checks:
        return 0.85, 0.2
    failed = [check for check in checks if not check.get('passed', False)]
    confidence = max(0.05, 1.0 - (0.2 * len(failed)))
    risk = min(1.0, 0.15 * len(failed))
    if phase == 'develop' and failed:
        risk = max(risk, 0.72)
        confidence = min(confidence, 0.58)
    return round(confidence, 3), round(risk, 3)


def _evaluate_stage_gate(project: ELSProject, phase: str) -> tuple[str, float, float, list[dict], str]:
    checks: list[dict] = []
    reason_code = ''

    if phase == 'ingest':
        docs = list(project.knowledge_documents.all())
        indexed = [doc for doc in docs if doc.status == 'indexed']
        checks.append({
            'name': 'documents_indexed',
            'passed': len(docs) == len(indexed) and len(docs) > 0,
            'details': {'total_documents': len(docs), 'indexed': len(indexed)},
        })
        if len(docs) != len(indexed):
            reason_code = 'INGEST_INDEX_INCOMPLETE'

    elif phase == 'analyze':
        analyze_data = (project.phases_data or {}).get('analyze', {})
        checks.append({
            'name': 'objective_candidates_present',
            'passed': len(analyze_data.get('objective_candidates', [])) > 0,
            'details': {'objective_candidates': len(analyze_data.get('objective_candidates', []))},
        })
        if len(analyze_data.get('objective_candidates', [])) == 0:
            reason_code = 'ANALYZE_OBJECTIVES_MISSING'

    elif phase == 'design':
        design_data = (project.phases_data or {}).get('design', {})
        strategy = design_data.get('assessment_strategy', {})
        checks.append({
            'name': 'assessment_strategy_generated',
            'passed': bool(strategy),
            'details': {'has_strategy': bool(strategy)},
        })
        if not strategy:
            reason_code = 'DESIGN_STRATEGY_MISSING'

    elif phase == 'develop':
        develop_data = (project.phases_data or {}).get('develop', {})
        checks.append({
            'name': 'quality_review_required',
            'passed': not bool(develop_data.get('review_required', False)),
            'details': {'review_required': bool(develop_data.get('review_required', False))},
        })
        if develop_data.get('review_required', False):
            reason_code = 'DEVELOP_QUALITY_REVIEW_REQUIRED'

    elif phase == 'implement':
        implement_data = (project.phases_data or {}).get('implement', {})
        created_enrollments = int(implement_data.get('created_enrollments', 0))
        checks.append({
            'name': 'enrollments_created',
            'passed': created_enrollments > 0,
            'details': {'created_enrollments': created_enrollments},
        })
        if created_enrollments <= 0:
            reason_code = 'IMPLEMENT_NO_ENROLLMENTS'

    elif phase == 'evaluate':
        evaluate_data = (project.phases_data or {}).get('evaluate', {})
        checks.append({
            'name': 'outcome_package_generated',
            'passed': bool(evaluate_data.get('outcome_package')),
            'details': {'has_outcome_package': bool(evaluate_data.get('outcome_package'))},
        })
        if not evaluate_data.get('outcome_package'):
            reason_code = 'EVALUATE_OUTCOME_PACKAGE_MISSING'

    confidence, risk = _default_gate(phase, checks)
    gate_result = 'pass'
    if any(not check.get('passed', False) for check in checks):
        gate_result = 'exception_required' if phase == 'develop' else 'fail'
    if gate_result == 'pass':
        reason_code = ''
    return gate_result, confidence, risk, checks, reason_code


@shared_task
def ingest_project_task(project_id: str) -> str:
    project = ELSProject.objects.filter(id=project_id).first()
    if not project:
        return 'missing'
    _touch_phase(project, 'ingest', 'in_progress')

    ingest_results: list[dict] = []
    dead_letter_documents: list[dict] = []
    capability_checks: list[dict] = []

    for document in project.knowledge_documents.all():
        source_type = (document.source_type or '').strip()
        has_url = bool((document.source_url or '').strip())
        has_file = bool((document.file_path or '').strip())
        has_text = bool((document.content_text or '').strip())
        supported_source = source_type in {'pdf', 'url', 'text', 'video', 'audio', 'scorm'}
        capability_passed = supported_source and (
            has_text or has_file or (source_type == 'url' and has_url)
        )
        capability_error = ''
        if not supported_source:
            capability_error = 'INGEST_UNSUPPORTED_SOURCE_TYPE'
        elif not capability_passed:
            capability_error = 'INGEST_INPUT_MISSING_CONTENT'

        capability_checks.append({
            'document_id': str(document.id),
            'source_type': source_type,
            'supported_source': supported_source,
            'has_url': has_url,
            'has_file': has_file,
            'has_text': has_text,
            'passed': capability_passed,
            'error_code': capability_error,
        })

        if not capability_passed:
            document.status = 'failed'
            document.error_message = f'[{capability_error}] Capability pre-check failed.'
            document.metadata = {
                **(document.metadata or {}),
                'ingest_error': {
                    'error_code': capability_error,
                    'retryable': False,
                    'attempt': 0,
                },
            }
            document.save(update_fields=['status', 'error_message', 'metadata', 'updated_at'])
            dead_letter_documents.append({
                'document_id': str(document.id),
                'error_code': capability_error,
                'retryable': False,
            })
            continue

        attempt = 0
        result = 'failed'
        while attempt < MAX_INGEST_RETRIES:
            attempt += 1
            result = ingest_knowledge_document_task(str(document.id), trigger_analyze=False)
            document.refresh_from_db()
            if result == 'indexed' and document.status == 'indexed':
                break
            if attempt < MAX_INGEST_RETRIES:
                time.sleep(INGEST_RETRY_BACKOFF_SECONDS[min(attempt, len(INGEST_RETRY_BACKOFF_SECONDS) - 1)])

        doc_metadata = document.metadata or {}
        ingest_results.append({
            'document_id': str(document.id),
            'status': document.status,
            'attempts': attempt,
            'chunk_count': int(document.chunk_count or 0),
            'token_count': int(document.token_count or 0),
            'error_message': document.error_message,
            'error_code': (doc_metadata.get('ingest_error') or {}).get('error_code', ''),
            'retryable': bool((doc_metadata.get('ingest_error') or {}).get('retryable', False)),
        })
        if document.status != 'indexed':
            dead_letter_documents.append({
                'document_id': str(document.id),
                'error_code': (doc_metadata.get('ingest_error') or {}).get('error_code', 'INGEST_FAILED'),
                'retryable': bool((doc_metadata.get('ingest_error') or {}).get('retryable', False)),
                'attempts': attempt,
            })

    project.phases_data = {
        **(project.phases_data or {}),
        'ingest': {
            'documents_processed': len(ingest_results),
            'capability_checks': capability_checks,
            'ingest_results': ingest_results,
            'retry_strategy': {
                'max_retries': MAX_INGEST_RETRIES,
                'backoff_seconds': INGEST_RETRY_BACKOFF_SECONDS,
            },
            'dead_letter_documents': dead_letter_documents,
            'provenance': {
                'source_document_ids': [str(doc.id) for doc in project.knowledge_documents.all()],
                **_artifact_lineage(project, 'ingest'),
            },
        },
    }
    project.save(update_fields=['phases_data', 'updated_at'])

    _touch_phase(project, 'ingest', 'completed')
    return 'completed'


@shared_task
def analyze_project_task(project_id: str) -> str:
    project = ELSProject.objects.filter(id=project_id).first()
    if not project:
        return 'missing'
    _touch_phase(project, 'analyze', 'in_progress')
    for document in project.knowledge_documents.all():
        analyze_knowledge_document_task(str(document.id), trigger_gap=False)
    compute_gap_matrix_task(str(project.organization_id))

    members_qs = OrganizationMember.objects.filter(organization=project.organization).select_related('user')
    role_targets = RoleCompetencyMapping.objects.filter(organization=project.organization)
    open_gaps = GapMatrix.objects.filter(
        organization=project.organization,
        status__in=['open', 'in_progress'],
    ).select_related('competency', 'user')
    cognitive_profiles = CognitiveProfile.objects.filter(organization=project.organization)

    top_gaps = list(open_gaps.order_by('-gap_score')[:20])
    objective_candidates = []
    seen = set()
    for gap in top_gaps:
        key = str(gap.competency_id)
        if key in seen:
            continue
        seen.add(key)
        objective_candidates.append({
            'competency_id': key,
            'competency_name': gap.competency.name if gap.competency else '',
            'target_bloom_level': gap.target_bloom_level,
            'priority': gap.priority,
            'recommended_action': 'close_gap_via_targeted_path',
            'weighted_gap_score': round(float(gap.gap_score or 0.0), 4),
            'weighted_bloom_gap': round(float(gap.weighted_bloom_gap or 0.0), 4),
            'weighted_modality_gap': round(float(gap.weighted_modality_gap or 0.0), 4),
        })

    weighted_gap_summary = {
        'avg_gap_score': round(float(open_gaps.aggregate(avg=Avg('gap_score')).get('avg') or 0.0), 4),
        'avg_weighted_bloom_gap': round(float(open_gaps.aggregate(avg=Avg('weighted_bloom_gap')).get('avg') or 0.0), 4),
        'avg_weighted_modality_gap': round(float(open_gaps.aggregate(avg=Avg('weighted_modality_gap')).get('avg') or 0.0), 4),
    }
    target_state = [
        {
            'competency_id': str(mapping.competency_id),
            'competency_name': mapping.competency.name if mapping.competency else '',
            'role_name': mapping.role_name,
            'required_level': mapping.required_level,
            'is_mandatory': bool(mapping.is_mandatory),
            'priority': mapping.priority,
        }
        for mapping in role_targets.select_related('competency')
    ]
    baseline_state = {
        'members': members_qs.count(),
        'learners': members_qs.filter(role='learner').count(),
        'cognitive_profiles': cognitive_profiles.count(),
        'avg_response_time_ms': round(
            float(cognitive_profiles.aggregate(avg=Avg('avg_response_time_ms')).get('avg') or 0.0), 2
        ),
    }

    project.phases_data = {
        **(project.phases_data or {}),
        'analyze': {
            'context_sources': {
                'lms_history_loaded': True,
                'competency_framework_loaded': role_targets.exists(),
                'prior_outcomes_loaded': True,
            },
            'baseline_state': baseline_state,
            'target_state': target_state,
            'audience_profile': {
                'total_members': members_qs.count(),
                'roles': list(members_qs.values_list('role', flat=True).distinct()),
                'role_target_count': role_targets.count(),
            },
            'gap_summary': {
                'open_gap_count': open_gaps.count(),
                'critical_gap_count': open_gaps.filter(priority=1).count(),
                **weighted_gap_summary,
            },
            'objective_candidates': objective_candidates,
            'provenance': _artifact_lineage(project, 'analyze'),
        },
    }
    project.save(update_fields=['phases_data', 'updated_at'])
    _touch_phase(project, 'analyze', 'completed')
    return 'completed'


@shared_task
def develop_project_task(project_id: str) -> str:
    project = ELSProject.objects.filter(id=project_id).first()
    if not project:
        return 'missing'
    _touch_phase(project, 'develop', 'in_progress')

    created_course_ids = list(project.created_course_ids or [])
    created_assessment_ids = list(project.created_assessment_ids or [])

    quality_report = []
    for document in project.knowledge_documents.all():
        course, assessments = _generate_course_from_document(document)
        created_course_ids.append(str(course.id))
        created_assessment_ids.extend([str(a.id) for a in assessments])
        issues = _quality_issues_for_generated_content(course, assessments)
        quality_report.append({
            'document_id': str(document.id),
            'course_id': str(course.id),
            'assessment_ids': [str(a.id) for a in assessments],
            'issues': issues,
            'review_required': len(issues) > 0,
        })

    project.created_course_ids = created_course_ids
    project.created_assessment_ids = created_assessment_ids
    design_data = (project.phases_data or {}).get('design', {})
    existing_learning_package = design_data.get('learning_package', {})
    assessment_package = {
        'package_id': f'apkg-{project.id}-{int(time.time())}',
        'item_bank': [
            {
                'assessment_id': str(assessment_id),
                'question_count': Question.objects.filter(assessment_id=assessment_id).count(),
            }
            for assessment_id in created_assessment_ids
        ],
        'scoring_policies': {
            'passing_score': 70,
            'max_attempts': 3,
        },
        'mastery_criteria': {
            'objective_threshold': 0.75,
        },
    }
    learning_package = {
        **existing_learning_package,
        'assets': [
            {'course_id': str(course_id), 'type': 'course'}
            for course_id in created_course_ids
        ],
        'lineage': _artifact_lineage(project, 'develop'),
    }

    project.phases_data = {
        **(project.phases_data or {}),
        'develop': {
            'generated_items': quality_report,
            'review_required': any(item['review_required'] for item in quality_report),
            'quality_gate': 'v1',
            'learning_package': learning_package,
            'assessment_package': assessment_package,
            'rubric_policy': {
                'auto_scoring': ['mcq', 'fill_blank', 'drag_drop'],
                'human_ai_hybrid_scoring': ['writing', 'speaking'],
            },
            'lineage': _artifact_lineage(project, 'develop'),
        },
    }
    project.save(update_fields=['created_course_ids', 'created_assessment_ids', 'phases_data', 'updated_at'])

    _touch_phase(project, 'develop', 'completed')
    return 'completed'


@shared_task
def design_project_task(project_id: str) -> str:
    project = ELSProject.objects.filter(id=project_id).first()
    if not project:
        return 'missing'
    _touch_phase(project, 'design', 'in_progress')

    analyze_data = (project.phases_data or {}).get('analyze', {})
    objective_candidates = analyze_data.get('objective_candidates', [])
    objectives = []
    for document in project.knowledge_documents.all():
        dist = document.metadata.get('bloom_distribution', {}) if document.metadata else {}
        objectives.append({
            'document_id': str(document.id),
            'title': document.title,
            'bloom_distribution': dist,
            'objective': f'Learners will master {document.title}',
        })
    for candidate in objective_candidates:
        objectives.append({
            'document_id': '',
            'title': candidate.get('competency_name', ''),
            'bloom_distribution': {},
            'objective': f"Close competency gap for {candidate.get('competency_name', '')}",
            'competency_id': candidate.get('competency_id'),
            'target_bloom_level': candidate.get('target_bloom_level'),
            'priority': candidate.get('priority'),
        })

    learning_package = {
        'package_id': f'lpkg-{project.id}-{int(time.time())}',
        'package_version': f'lpkg-v{int(project.run_attempt or 1)}',
        'objectives': objectives,
        'path_graph': {
            'nodes': [{'id': f'objective-{idx + 1}', 'label': obj.get('objective', '')} for idx, obj in enumerate(objectives)],
            'edges': [
                {'from': f'objective-{idx}', 'to': f'objective-{idx + 1}'}
                for idx in range(1, max(1, len(objectives)))
            ],
        },
        'objective_architecture': {
            'source': 'autonomous_addie_design',
            'objective_count': len(objectives),
            'competency_aligned': len([obj for obj in objectives if obj.get('competency_id')]),
        },
        'delivery_rules': {
            'modality_mix': ['reading', 'writing', 'listening', 'speaking'],
            'unlock_policy': 'sequential_with_remediation',
        },
        'lineage': _artifact_lineage(project, 'design'),
    }

    project.phases_data = {
        **(project.phases_data or {}),
        'design': {
            'learning_objectives': objectives,
            'assessment_strategy': {
                'levels': ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'],
                'note': 'Auto-generated mapping',
                'modalities': ['mcq', 'fill_blank', 'drag_drop', 'writing', 'speaking'],
            },
            'learning_package': learning_package,
            'lineage': _artifact_lineage(project, 'design'),
        }
    }
    project.save(update_fields=['phases_data', 'updated_at'])

    _touch_phase(project, 'design', 'completed')
    return 'completed'


@shared_task
def implement_project_task(project_id: str) -> str:
    project = ELSProject.objects.filter(id=project_id).first()
    if not project:
        return 'missing'
    _touch_phase(project, 'implement', 'in_progress')

    gap_user_ids = list(
        GapMatrix.objects.filter(
            organization=project.organization,
            status__in=['open', 'in_progress'],
        ).values_list('user_id', flat=True).distinct()
    )
    if gap_user_ids:
        target_members = OrganizationMember.objects.filter(
            organization=project.organization,
            user_id__in=gap_user_ids,
        ).select_related('user')
        resolver_scope = 'gap_based'
    else:
        target_members = OrganizationMember.objects.filter(
            organization=project.organization,
            role='learner',
        ).select_related('user')
        resolver_scope = 'learner_role_default'

    created_enrollments = 0
    touched_enrollments = 0
    due_date = timezone.now() + timedelta(days=30)
    created_by = project.created_by
    linked_assessments = list(project.created_assessment_ids or [])

    for course_id in (project.created_course_ids or []):
        course = Course.objects.filter(id=course_id, organization=project.organization).first()
        if not course:
            continue
        for member in target_members:
            enrollment, was_created = Enrollment.objects.get_or_create(
                organization=project.organization,
                user=member.user,
                course=course,
                defaults={
                    'status': 'enrolled',
                    'due_date': due_date,
                    'assigned_by': created_by,
                },
            )
            touched_enrollments += 1
            if was_created:
                created_enrollments += 1
                enqueue_notification(
                    user_id=str(member.user_id),
                    org_id=str(project.organization_id),
                    notification_type='enrollment_new',
                    title='New autonomous learning assignment',
                    message=f'You have been enrolled in "{course.title}" by the autonomous ELS pipeline.',
                    channels=['in_app'],
                    data={
                        'course_id': str(course.id),
                        'project_id': str(project.id),
                    },
                )

    auto_enrolled_from_gaps = auto_enroll_gap_courses_task(str(project.organization_id))
    runtime_catalog = {
        'published': True,
        'published_at': timezone.now().isoformat(),
        'learning_package_id': (
            ((project.phases_data or {}).get('design', {}).get('learning_package') or {}).get('package_id', '')
        ),
        'assessment_package_id': (
            ((project.phases_data or {}).get('develop', {}).get('assessment_package') or {}).get('package_id', '')
        ),
        'lineage': _artifact_lineage(project, 'implement'),
    }
    project.phases_data = {
        **(project.phases_data or {}),
        'implement': {
            'resolver_scope': resolver_scope,
            'target_member_count': target_members.count(),
            'created_enrollments': created_enrollments,
            'touched_enrollments': touched_enrollments,
            'auto_enrolled_from_gaps': auto_enrolled_from_gaps,
            'assessment_package_linked': len(linked_assessments) > 0,
            'assessment_ids': linked_assessments,
            'due_date_days': 30,
            'runtime_catalog': runtime_catalog,
        },
    }
    project.save(update_fields=['phases_data', 'updated_at'])

    _touch_phase(project, 'implement', 'completed')
    return 'completed'


@shared_task
def evaluate_project_task(project_id: str) -> str:
    project = ELSProject.objects.filter(id=project_id).first()
    if not project:
        return 'missing'
    _touch_phase(project, 'evaluate', 'in_progress')
    compute_bloom_analytics_snapshot_task(str(project.organization_id))
    remediation_trigger_task(str(project.organization_id))
    recalibrate_gap_matrix_task(str(project.organization_id))
    record_gap_closure_snapshot_task(str(project.organization_id))
    issue_certificates_for_completed_enrollments(str(project.organization_id))

    enrollments = Enrollment.objects.filter(organization=project.organization)
    completed_count = enrollments.filter(status='completed').count()
    total_enrollments = enrollments.count()
    completion_rate = round((completed_count / total_enrollments), 4) if total_enrollments else 0.0
    average_gap = (
        GapMatrix.objects.filter(
            organization=project.organization,
            status__in=['open', 'in_progress', 'closed'],
        ).aggregate(avg_gap=Avg('gap_score')).get('avg_gap')
        or 0.0
    )
    mastery_index = round(max(0.0, 1.0 - float(average_gap)), 4)
    outcome_package = {
        'performance_results': {
            'total_enrollments': total_enrollments,
            'completed_enrollments': completed_count,
            'completion_rate': completion_rate,
        },
        'learning_outcomes': {
            'mastery_index': mastery_index,
            'average_gap_score': round(float(average_gap), 4),
        },
        'objective_attainment': {
            'attained': completed_count,
            'in_progress': max(0, total_enrollments - completed_count),
        },
        'recommended_next_action': 'continue_autonomous_cycle',
        'evaluation_windows': ['instant', '7d', '30d'],
        'lineage': _artifact_lineage(project, 'evaluate'),
    }
    feedback_to_analyze = {
        'next_cycle_inputs': {
            'prior_completion_rate': completion_rate,
            'prior_mastery_index': mastery_index,
            'prior_average_gap': round(float(average_gap), 4),
        }
    }
    project.last_outcome_package = outcome_package
    project.phases_data = {
        **(project.phases_data or {}),
        'evaluate': {
            'outcome_package': outcome_package,
            'retention_transfer_signals': {
                'window_7d_pending': True,
                'window_30d_pending': True,
            },
            'lineage': _artifact_lineage(project, 'evaluate'),
        },
        'analyze_feedback': feedback_to_analyze,
    }
    project.save(update_fields=['phases_data', 'last_outcome_package', 'updated_at'])

    _touch_phase(project, 'evaluate', 'completed')
    return 'completed'


def _apply_gate_result(
    project: ELSProject,
    phase: str,
    gate_result: str,
    confidence: float,
    risk: float,
    checks: list[dict],
) -> ELSProjectPhase:
    record, _ = ELSProjectPhase.objects.get_or_create(project=project, phase=phase)
    record.confidence_score = confidence
    record.risk_score = risk
    record.quality_checks = checks
    record.gate_result = gate_result
    if gate_result == 'pass':
        if record.status == 'in_progress':
            record.status = 'completed'
    elif gate_result == 'exception_required':
        record.status = 'exception_required'
    else:
        record.status = 'failed'
    record.save(update_fields=[
        'confidence_score',
        'risk_score',
        'quality_checks',
        'gate_result',
        'status',
        'updated_at',
    ])
    return record


def _raise_project_exception(
    project: ELSProject,
    phase: str,
    reason_code: str,
    reason_message: str,
    confidence: float,
    risk: float,
) -> ELSProjectException:
    priority = 'medium'
    if risk >= 0.85:
        priority = 'critical'
    elif risk >= 0.7:
        priority = 'high'
    return ELSProjectException.objects.create(
        project=project,
        phase=phase,
        reason_code=reason_code or 'QUALITY_GATE_EXCEPTION',
        reason_message=reason_message,
        confidence_score=confidence,
        risk_score=risk,
        status='open',
        priority=priority,
        due_at=timezone.now() + timedelta(days=2),
        metadata={
            'phase': phase,
            'source': 'autonomous_addie_pipeline',
        },
    )


def _run_phase(project: ELSProject, phase: str) -> str:
    if phase == 'ingest':
        return ingest_project_task(str(project.id))
    if phase == 'analyze':
        return analyze_project_task(str(project.id))
    if phase == 'design':
        return design_project_task(str(project.id))
    if phase == 'develop':
        return develop_project_task(str(project.id))
    if phase == 'implement':
        return implement_project_task(str(project.id))
    if phase == 'evaluate':
        return evaluate_project_task(str(project.id))
    return 'missing'


@shared_task
def run_autonomous_addie_pipeline_task(
    project_id: str,
    idempotency_key: str = '',
    requested_by: str = '',
    start_phase: str = 'ingest',
    skip_completed: bool = False,
) -> dict:
    project = ELSProject.objects.filter(id=project_id).first()
    if not project:
        return {'status': 'missing', 'project_id': project_id}
    normalized_start_phase = start_phase if start_phase in PIPELINE_PHASES else 'ingest'

    normalized_key = (idempotency_key or '').strip()
    if not normalized_key:
        normalized_key = f'auto-{project_id}-{int(time.time())}'

    if (
        project.current_idempotency_key == normalized_key
        and project.current_run_id
        and project.run_state in {
            'queued', 'ingesting', 'analyzing', 'designing', 'developing', 'implementing', 'evaluating',
            'completed', 'exception_required',
        }
    ):
        return {
            'status': 'existing',
            'project_id': str(project.id),
            'run_id': str(project.current_run_id),
            'run_state': project.run_state,
            'idempotency_key': normalized_key,
        }

    run_id = uuid.uuid4()
    correlation_id = f'corr-{run_id}'
    project.run_attempt = int(project.run_attempt or 0) + 1
    project.current_phase = normalized_start_phase
    project.run_started_at = timezone.now()
    project.run_completed_at = None
    project.last_error_code = ''
    project.last_error_message = ''
    project.save(update_fields=[
        'run_attempt',
        'current_phase',
        'run_started_at',
        'run_completed_at',
        'last_error_code',
        'last_error_message',
        'updated_at',
    ])
    _set_project_run_state(
        project,
        'queued',
        run_id=str(run_id),
        idempotency_key=normalized_key,
        correlation_id=correlation_id,
    )

    phase_sequence = PIPELINE_PHASES[_phase_index(normalized_start_phase):]
    for phase in phase_sequence:
        phase_started = time.monotonic()
        project.current_phase = phase
        project.save(update_fields=['current_phase', 'updated_at'])
        _set_project_run_state(project, RUN_STATE_BY_PHASE[phase], run_id=str(run_id))

        phase_record = ELSProjectPhase.objects.filter(project=project, phase=phase).first()
        if skip_completed and phase_record and phase_record.status == 'completed':
            _record_phase_metric(
                project,
                run_id,
                phase,
                phase_started,
                status='success',
                metadata={'phase_result': 'skipped_completed'},
            )
            continue

        _touch_phase(project, phase, 'in_progress')

        result = _run_phase(project, phase)
        project.refresh_from_db()
        if result == 'missing':
            _touch_phase(project, phase, 'failed')
            _set_project_run_state(
                project,
                'failed',
                run_id=str(run_id),
                error_code='PHASE_EXECUTION_MISSING',
                error_message=f'{phase} execution returned missing',
                completed=True,
            )
            _record_phase_metric(
                project,
                run_id,
                phase,
                phase_started,
                status='failed',
                metadata={'phase_result': result},
            )
            return {
                'status': 'failed',
                'project_id': str(project.id),
                'run_id': str(run_id),
                'phase': phase,
                'error_code': 'PHASE_EXECUTION_MISSING',
            }

        gate_result, confidence, risk, checks, reason_code = _evaluate_stage_gate(project, phase)
        _apply_gate_result(project, phase, gate_result, confidence, risk, checks)
        metric_status = 'success' if gate_result == 'pass' else gate_result
        _record_phase_metric(
            project,
            run_id,
            phase,
            phase_started,
            status=metric_status,
            quality_score=confidence,
            metadata={'checks': checks, 'gate_result': gate_result},
        )

        if gate_result == 'exception_required':
            exception = _raise_project_exception(
                project=project,
                phase=phase,
                reason_code=reason_code or 'QUALITY_GATE_EXCEPTION',
                reason_message=f'Quality gate routed {phase} to exception review.',
                confidence=confidence,
                risk=risk,
            )
            _set_project_run_state(
                project,
                'exception_required',
                run_id=str(run_id),
                error_code=exception.reason_code,
                error_message=exception.reason_message,
                completed=True,
            )
            return {
                'status': 'exception_required',
                'project_id': str(project.id),
                'run_id': str(run_id),
                'phase': phase,
                'exception_id': str(exception.id),
                'reason_code': exception.reason_code,
            }

        if gate_result == 'fail':
            _set_project_run_state(
                project,
                'failed',
                run_id=str(run_id),
                error_code=reason_code or 'QUALITY_GATE_FAILED',
                error_message=f'Quality gate failed at {phase}.',
                completed=True,
            )
            return {
                'status': 'failed',
                'project_id': str(project.id),
                'run_id': str(run_id),
                'phase': phase,
                'error_code': reason_code or 'QUALITY_GATE_FAILED',
            }

    _set_project_run_state(project, 'completed', run_id=str(run_id), completed=True)
    return {
        'status': 'completed',
        'project_id': str(project.id),
        'run_id': str(run_id),
        'run_state': 'completed',
        'start_phase': normalized_start_phase,
        'outcome_package': project.last_outcome_package,
    }


@shared_task
def resume_autonomous_addie_pipeline_task(project_id: str, idempotency_key: str = '', requested_by: str = '') -> dict:
    project = ELSProject.objects.filter(id=project_id).first()
    if not project:
        return {'status': 'missing', 'project_id': project_id}

    open_exception = ELSProjectException.objects.filter(project=project, status='open').exists()
    if open_exception:
        return {
            'status': 'blocked',
            'project_id': str(project.id),
            'reason_code': 'OPEN_EXCEPTION_EXISTS',
        }

    start_phase = project.current_phase if project.current_phase in PIPELINE_PHASES else 'ingest'
    run_key = (idempotency_key or '').strip() or f'resume-{project.id}-{int(time.time())}'
    return run_autonomous_addie_pipeline_task(
        project_id=str(project.id),
        idempotency_key=run_key,
        requested_by=requested_by,
        start_phase=start_phase,
        skip_completed=True,
    )


@shared_task
def cancel_autonomous_addie_pipeline_task(project_id: str, reason: str = 'Canceled by operator') -> dict:
    project = ELSProject.objects.filter(id=project_id).first()
    if not project:
        return {'status': 'missing', 'project_id': project_id}

    if project.run_state in {'completed', 'failed', 'exception_required', 'canceled', 'idle'}:
        return {
            'status': 'noop',
            'project_id': str(project.id),
            'run_state': project.run_state,
        }

    current_phase = project.current_phase if project.current_phase in PIPELINE_PHASES else 'ingest'
    phase_record, _ = ELSProjectPhase.objects.get_or_create(project=project, phase=current_phase)
    phase_record.status = 'canceled'
    phase_record.completed_at = timezone.now()
    phase_record.save(update_fields=['status', 'completed_at', 'updated_at'])

    _set_project_run_state(
        project,
        'canceled',
        run_id=str(project.current_run_id) if project.current_run_id else None,
        error_code='RUN_CANCELED',
        error_message=reason,
        completed=True,
    )
    return {
        'status': 'canceled',
        'project_id': str(project.id),
        'run_state': 'canceled',
        'phase': current_phase,
    }


@shared_task
def retry_autonomous_stage_task(project_id: str, phase: str, requested_by: str = '') -> dict:
    project = ELSProject.objects.filter(id=project_id).first()
    if not project:
        return {'status': 'missing', 'project_id': project_id}
    if phase not in PIPELINE_PHASES:
        return {'status': 'invalid_phase', 'project_id': str(project.id), 'phase': phase}

    run_id = uuid.uuid4()
    phase_started = time.monotonic()
    project.current_phase = phase
    project.run_attempt = int(project.run_attempt or 0) + 1
    project.save(update_fields=['current_phase', 'run_attempt', 'updated_at'])
    _set_project_run_state(project, RUN_STATE_BY_PHASE[phase], run_id=str(run_id))
    _touch_phase(project, phase, 'in_progress')

    result = _run_phase(project, phase)
    if result == 'missing':
        _touch_phase(project, phase, 'failed')
        _set_project_run_state(
            project,
            'failed',
            run_id=str(run_id),
            error_code='PHASE_EXECUTION_MISSING',
            error_message=f'{phase} execution returned missing',
            completed=True,
        )
        _record_phase_metric(project, run_id, phase, phase_started, status='failed', metadata={'phase_result': result})
        return {'status': 'failed', 'project_id': str(project.id), 'phase': phase, 'error_code': 'PHASE_EXECUTION_MISSING'}

    gate_result, confidence, risk, checks, reason_code = _evaluate_stage_gate(project, phase)
    _apply_gate_result(project, phase, gate_result, confidence, risk, checks)
    metric_status = 'success' if gate_result == 'pass' else gate_result
    _record_phase_metric(
        project,
        run_id,
        phase,
        phase_started,
        status=metric_status,
        quality_score=confidence,
        metadata={'checks': checks, 'gate_result': gate_result, 'mode': 'stage_retry'},
    )

    if gate_result == 'exception_required':
        exception = _raise_project_exception(
            project=project,
            phase=phase,
            reason_code=reason_code or 'QUALITY_GATE_EXCEPTION',
            reason_message=f'Stage retry routed {phase} to exception review.',
            confidence=confidence,
            risk=risk,
        )
        _set_project_run_state(
            project,
            'exception_required',
            run_id=str(run_id),
            error_code=exception.reason_code,
            error_message=exception.reason_message,
            completed=True,
        )
        return {
            'status': 'exception_required',
            'project_id': str(project.id),
            'phase': phase,
            'exception_id': str(exception.id),
        }

    if gate_result == 'fail':
        _set_project_run_state(
            project,
            'failed',
            run_id=str(run_id),
            error_code=reason_code or 'QUALITY_GATE_FAILED',
            error_message=f'Quality gate failed at {phase}.',
            completed=True,
        )
        return {
            'status': 'failed',
            'project_id': str(project.id),
            'phase': phase,
            'error_code': reason_code or 'QUALITY_GATE_FAILED',
        }

    _set_project_run_state(project, 'completed', run_id=str(run_id), completed=True)
    return {
        'status': 'completed',
        'project_id': str(project.id),
        'phase': phase,
        'run_state': 'completed',
    }
