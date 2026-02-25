from __future__ import annotations

from celery import shared_task
from django.utils import timezone
from django.utils.text import slugify

from apps.assessments.models import Assessment, Question, QuestionOption
from apps.courses.models import Course, CourseModule, Lesson
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

from .models import ELSProject, ELSProjectPhase


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
    record.save()


@shared_task
def ingest_project_task(project_id: str) -> str:
    project = ELSProject.objects.filter(id=project_id).first()
    if not project:
        return 'missing'
    _touch_phase(project, 'ingest', 'in_progress')
    for document in project.knowledge_documents.all():
        ingest_knowledge_document_task(str(document.id), trigger_analyze=False)
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
    project.phases_data = {
        **(project.phases_data or {}),
        'develop': {
            'generated_items': quality_report,
            'review_required': any(item['review_required'] for item in quality_report),
            'quality_gate': 'v1',
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

    objectives = []
    for document in project.knowledge_documents.all():
        dist = document.metadata.get('bloom_distribution', {}) if document.metadata else {}
        objectives.append({
            'document_id': str(document.id),
            'title': document.title,
            'bloom_distribution': dist,
            'objective': f'Learners will master {document.title}',
        })

    project.phases_data = {
        **(project.phases_data or {}),
        'design': {
            'learning_objectives': objectives,
            'assessment_strategy': {
                'levels': ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'],
                'note': 'Auto-generated mapping',
            },
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
    auto_enroll_gap_courses_task(str(project.organization_id))
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
    _touch_phase(project, 'evaluate', 'completed')
    return 'completed'
