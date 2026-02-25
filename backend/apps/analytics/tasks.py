from datetime import timedelta
from typing import Optional

from celery import shared_task
from django.utils import timezone
from django.db.models import Count, Avg

from apps.organizations.models import Organization, OrganizationMember
from apps.enrollments.models import Enrollment
from apps.progress.models import LessonProgress
from apps.assessments.models import AssessmentAttempt
from apps.notifications.services import enqueue_notification

from .models import (
    DailyStats, AnalyticsJob, GenieReportSchedule, GenieReportRun, ManagerDigestRun,
    BloomAnalyticsSnapshot, WorkforceCapabilityIndex, DepartmentBloomTrend,
    CompetencyTrajectoryForecast, ComplianceReadinessPrediction, StrategicSkillShortageDetection,
)


def _create_or_update_daily_stats(org_id: str, date):
    enrollments_today = Enrollment.objects.filter(
        organization_id=org_id,
        enrolled_at__date=date
    ).count()
    completions_today = Enrollment.objects.filter(
        organization_id=org_id,
        completed_at__date=date
    ).count()
    lessons_viewed = LessonProgress.objects.filter(
        progress_record__course__organization_id=org_id,
        started_at__date=date
    ).count()
    assessments_taken = AssessmentAttempt.objects.filter(
        assessment__organization_id=org_id,
        started_at__date=date
    ).count()
    active_users = OrganizationMember.objects.filter(organization_id=org_id).count()

    DailyStats.objects.update_or_create(
        organization_id=org_id,
        date=date,
        defaults={
            'active_users': active_users,
            'new_enrollments': enrollments_today,
            'completions': completions_today,
            'lessons_viewed': lessons_viewed,
            'assessments_taken': assessments_taken,
            'total_time_spent': 0,
        }
    )


@shared_task
def start_analytics_job_task(org_id: str, mode: str = 'scheduled') -> str:
    job = AnalyticsJob.objects.create(
        organization_id=org_id,
        mode=mode,
        status='processing',
    )
    return str(job.id)


@shared_task
def compute_org_analytics_task(org_id: str, job_id: Optional[str] = None) -> None:
    date = timezone.localdate()
    _create_or_update_daily_stats(org_id, date)
    if job_id:
        AnalyticsJob.objects.filter(id=job_id).update(
            status='success',
            completed_at=timezone.now(),
        )


@shared_task
def analytics_refresh_scheduler() -> None:
    orgs = Organization.objects.all()
    for org in orgs:
        job_id = start_analytics_job_task(str(org.id), 'scheduled')
        compute_org_analytics_task(str(org.id), job_id)


@shared_task
def genie_report_scheduler() -> int:
    now = timezone.now()
    count = 0
    schedules = GenieReportSchedule.objects.filter(enabled=True)
    for schedule in schedules:
        due = False
        if not schedule.last_run_at:
            due = True
        else:
            delta = now - schedule.last_run_at
            if schedule.frequency == 'weekly' and delta >= timedelta(days=7):
                due = True
            if schedule.frequency == 'monthly' and delta >= timedelta(days=30):
                due = True
        if not due:
            continue
        GenieReportRun.objects.create(
            organization=schedule.organization,
            schedule=schedule,
            recipients=schedule.recipients,
            status='queued',
        )
        schedule.last_run_at = now
        schedule.save(update_fields=['last_run_at'])
        count += 1
    return count


@shared_task
def manager_digest_scheduler() -> int:
    now = timezone.now()
    created = 0
    orgs = Organization.objects.all()
    for org in orgs:
        notifications = (org.settings or {}).get('notifications', {})
        if not notifications.get('managerDigestEnabled'):
            continue
        frequency = notifications.get('managerDigestFrequency', 'weekly')
        roles = notifications.get('managerDigestRoles', ['team_lead', 'ld_manager', 'org_admin'])
        ManagerDigestRun.objects.create(
            organization=org,
            status='queued',
            frequency=frequency,
            roles=roles,
        )
        created += 1
    return created


@shared_task
def process_manager_digests_task() -> int:
    runs = ManagerDigestRun.objects.filter(status='queued')[:25]
    processed = 0
    for run in runs:
        run.status = 'processing'
        run.save(update_fields=['status'])
        roles = run.roles or ['team_lead', 'ld_manager', 'org_admin']
        managers = OrganizationMember.objects.filter(
            organization=run.organization,
            role__in=roles
        )
        enrollments = Enrollment.objects.filter(organization=run.organization)
        total = enrollments.count()
        completed = enrollments.filter(status='completed').count()
        overdue = enrollments.filter(status__in=['enrolled', 'in_progress'], due_date__lt=timezone.now()).count()
        for manager in managers:
            enqueue_notification(
                user_id=str(manager.user_id),
                org_id=str(run.organization_id),
                notification_type='manager_digest',
                title='Manager digest',
                message=f'Total enrollments: {total}. Completed: {completed}. Overdue: {overdue}.',
                channels=['in_app', 'email'],
                data={'total': total, 'completed': completed, 'overdue': overdue}
            )
        run.status = 'sent'
        run.completed_at = timezone.now()
        run.save(update_fields=['status', 'completed_at'])
        processed += 1
    return processed


@shared_task
def compute_bloom_analytics_snapshot_task(org_id: str) -> int:
    org = Organization.objects.filter(id=org_id).first()
    if not org:
        return 0

    members = OrganizationMember.objects.filter(organization=org).values('user_id', 'department_id')
    dept_by_user = {str(m['user_id']): m['department_id'] for m in members}

    attempts = AssessmentAttempt.objects.filter(
        assessment__organization_id=org_id,
        percentage__isnull=False,
    ).select_related('assessment', 'user')

    aggregates = {}
    for attempt in attempts:
        bloom = attempt.assessment.bloom_level
        if not bloom:
            continue
        dept_id = dept_by_user.get(str(attempt.user_id))
        key = (dept_id, bloom)
        if key not in aggregates:
            aggregates[key] = {'count': 0, 'total': 0.0, 'passed': 0}
        aggregates[key]['count'] += 1
        aggregates[key]['total'] += float(attempt.percentage or 0)
        aggregates[key]['passed'] += 1 if attempt.passed else 0

    created = 0
    for (dept_id, bloom), stats in aggregates.items():
        avg_score = stats['total'] / stats['count'] if stats['count'] else 0.0
        pass_rate = stats['passed'] / stats['count'] if stats['count'] else 0.0
        BloomAnalyticsSnapshot.objects.create(
            organization=org,
            department_id=dept_id,
            bloom_level=bloom,
            average_score=round(avg_score, 2),
            pass_rate=round(pass_rate, 2),
            attempts_count=stats['count'],
        )
        created += 1

    return created


@shared_task
def compute_org_forecasting_task(org_id: str | None = None) -> int:
    from apps.competencies.models import Competency
    from apps.learning_intelligence.models import GapMatrix

    orgs = Organization.objects.filter(id=org_id) if org_id else Organization.objects.all()
    processed = 0

    for org in orgs:
        WorkforceCapabilityIndex.objects.filter(organization=org).delete()
        DepartmentBloomTrend.objects.filter(organization=org).delete()
        CompetencyTrajectoryForecast.objects.filter(organization=org).delete()
        ComplianceReadinessPrediction.objects.filter(organization=org).delete()
        StrategicSkillShortageDetection.objects.filter(organization=org).delete()

        gaps = GapMatrix.objects.filter(organization=org)
        if gaps.exists():
            avg_gap = gaps.aggregate(Avg('gap_score'))['gap_score__avg'] or 0.0
            score = max(0.0, 1.0 - avg_gap)
        else:
            score = 0.5

        WorkforceCapabilityIndex.objects.create(
            organization=org,
            score=round(score, 2),
            trend={'current': round(score, 2), 'note': 'Heuristic estimate'},
        )

        # Department Bloom trends from BloomAnalyticsSnapshot
        snapshots = BloomAnalyticsSnapshot.objects.filter(organization=org)
        for snap in snapshots:
            DepartmentBloomTrend.objects.create(
                organization=org,
                department_id=snap.department_id,
                bloom_level=snap.bloom_level,
                trend={'average_score': snap.average_score, 'pass_rate': snap.pass_rate},
            )

        for competency in Competency.objects.filter(organization=org):
            gap_entry = gaps.filter(competency=competency).order_by('-gap_score').first()
            forecast = {
                'competency': competency.name,
                'gap_score': gap_entry.gap_score if gap_entry else 0.0,
                'estimated_weeks': 6 if gap_entry and gap_entry.gap_score > 0.5 else 3,
            }
            CompetencyTrajectoryForecast.objects.create(
                organization=org,
                competency=competency,
                forecast=forecast,
            )

        compliance_pred = {
            'ready_percentage': round(score * 100, 1),
            'note': 'Heuristic compliance readiness',
        }
        ComplianceReadinessPrediction.objects.create(
            organization=org,
            prediction=compliance_pred,
        )

        shortages = []
        for competency in Competency.objects.filter(organization=org):
            gap_entry = gaps.filter(competency=competency).order_by('-gap_score').first()
            if gap_entry and gap_entry.gap_score >= 0.6:
                shortages.append({'competency': competency.name, 'gap_score': gap_entry.gap_score})
        StrategicSkillShortageDetection.objects.create(
            organization=org,
            shortage={'items': shortages},
        )
        processed += 1

    return processed
