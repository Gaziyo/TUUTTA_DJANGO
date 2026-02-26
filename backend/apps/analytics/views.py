from datetime import datetime, timedelta
import time

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    AnalyticsEvent, DailyStats, AuditLog, AnalyticsJob,
    GenieReportSchedule, GenieReportRun, ManagerDigestRun, BloomAnalyticsSnapshot,
    WorkforceCapabilityIndex, DepartmentBloomTrend, CompetencyTrajectoryForecast,
    ComplianceReadinessPrediction, StrategicSkillShortageDetection
)
from .serializers import (
    AnalyticsEventSerializer, DailyStatsSerializer, AuditLogSerializer, AnalyticsJobSerializer,
    GenieReportScheduleSerializer, GenieReportRunSerializer, ManagerDigestRunSerializer,
    BloomAnalyticsSnapshotSerializer,
    WorkforceCapabilityIndexSerializer, DepartmentBloomTrendSerializer, CompetencyTrajectoryForecastSerializer,
    ComplianceReadinessPredictionSerializer, StrategicSkillShortageDetectionSerializer
)
from .tasks import (
    start_analytics_job_task,
    compute_org_analytics_task,
    process_manager_digests_task,
    compute_bloom_analytics_snapshot_task,
    compute_org_forecasting_task,
)
from .exports import build_csv, create_summary_pdf, create_certificate_pdf, build_evidence_zip

from apps.organizations.models import Organization, OrganizationMember
from apps.accounts.models import User
from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.assessments.models import AssessmentAttempt
from apps.certificates.models import Certificate


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return AuditLog.objects.filter(organization_id=org_id).order_by('-timestamp')
        return AuditLog.objects.none()


class AnalyticsJobViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AnalyticsJobSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return AnalyticsJob.objects.filter(organization_id=org_id).order_by('-created_at')
        return AnalyticsJob.objects.none()

    @action(detail=False, methods=['post'], url_path='recalculate')
    def recalculate(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)
        job_id = start_analytics_job_task.delay(str(org_id), 'manual').get()
        compute_org_analytics_task.delay(str(org_id), job_id)
        return Response({'status': 'queued', 'jobId': job_id})


class GenieReportScheduleViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = GenieReportScheduleSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return GenieReportSchedule.objects.filter(organization_id=org_id).order_by('-created_at')
        return GenieReportSchedule.objects.none()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        serializer.save(organization_id=org_id)


class GenieReportRunViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = GenieReportRunSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return GenieReportRun.objects.filter(organization_id=org_id).order_by('-created_at')
        return GenieReportRun.objects.none()


class ManagerDigestRunViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ManagerDigestRunSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return ManagerDigestRun.objects.filter(organization_id=org_id).order_by('-created_at')
        return ManagerDigestRun.objects.none()

    @action(detail=False, methods=['post'], url_path='run-now')
    def run_now(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)
        run = ManagerDigestRun.objects.create(
            organization_id=org_id,
            status='queued',
            frequency=request.data.get('frequency') or 'weekly',
            roles=request.data.get('roles') or [],
        )
        process_manager_digests_task.delay()
        return Response(ManagerDigestRunSerializer(run).data)


class BloomAnalyticsSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BloomAnalyticsSnapshotSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return BloomAnalyticsSnapshot.objects.filter(organization_id=org_id).order_by('-created_at')
        return BloomAnalyticsSnapshot.objects.none()

    @action(detail=False, methods=['post'], url_path='recalculate')
    def recalculate(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)
        compute_bloom_analytics_snapshot_task.delay(str(org_id))
        return Response({'status': 'queued'})


class WorkforceCapabilityIndexViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WorkforceCapabilityIndexSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return WorkforceCapabilityIndex.objects.filter(organization_id=org_id).order_by('-created_at')
        return WorkforceCapabilityIndex.objects.none()

    @action(detail=False, methods=['post'], url_path='recalculate')
    def recalculate(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)
        compute_org_forecasting_task.delay(str(org_id))
        return Response({'status': 'queued'})


class DepartmentBloomTrendViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DepartmentBloomTrendSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return DepartmentBloomTrend.objects.filter(organization_id=org_id).order_by('-created_at')
        return DepartmentBloomTrend.objects.none()


class CompetencyTrajectoryForecastViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CompetencyTrajectoryForecastSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return CompetencyTrajectoryForecast.objects.filter(organization_id=org_id).order_by('-created_at')
        return CompetencyTrajectoryForecast.objects.none()


class ComplianceReadinessPredictionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ComplianceReadinessPredictionSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return ComplianceReadinessPrediction.objects.filter(organization_id=org_id).order_by('-created_at')
        return ComplianceReadinessPrediction.objects.none()


class StrategicSkillShortageDetectionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StrategicSkillShortageDetectionSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return StrategicSkillShortageDetection.objects.filter(organization_id=org_id).order_by('-created_at')
        return StrategicSkillShortageDetection.objects.none()


def _parse_date(value):
    if value is None or value == '':
        return None
    if isinstance(value, (int, float)):
        return timezone.make_aware(datetime.fromtimestamp(value / 1000.0))
    if isinstance(value, str):
        if value.isdigit():
            return timezone.make_aware(datetime.fromtimestamp(int(value) / 1000.0))
        try:
            parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed)
            return parsed
        except ValueError:
            return None
    return None


def _in_range(dt, start_dt, end_dt) -> bool:
    if not dt:
        return False
    if start_dt and dt < start_dt:
        return False
    if end_dt and dt > end_dt:
        return False
    return True


def _generate_presigned_url(key: str) -> str:
    if not (settings.AWS_ACCESS_KEY_ID and settings.AWS_STORAGE_BUCKET_NAME):
        return default_storage.url(key)
    try:
        import boto3
    except ImportError:
        return default_storage.url(key)
    client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
        endpoint_url=settings.AWS_S3_ENDPOINT_URL or None,
    )
    return client.generate_presigned_url(
        'get_object',
        Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': key},
        ExpiresIn=7 * 24 * 60 * 60,
    )


class EvidenceExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, org_id, **kwargs):
        org = Organization.objects.filter(id=org_id).first()
        if not org:
            return Response({'error': 'organization not found'}, status=status.HTTP_404_NOT_FOUND)

        member_exists = OrganizationMember.objects.filter(
            organization_id=org_id,
            user=request.user
        ).exists()
        if not member_exists:
            return Response({'error': 'org membership required'}, status=status.HTTP_403_FORBIDDEN)

        start_dt = _parse_date(request.data.get('startDate') or request.data.get('start_date'))
        end_dt = _parse_date(request.data.get('endDate') or request.data.get('end_date'))

        members = OrganizationMember.objects.filter(organization_id=org_id).select_related('user')
        courses = Course.objects.filter(organization_id=org_id)
        enrollments = Enrollment.objects.filter(organization_id=org_id).select_related('user', 'course')
        attempts = AssessmentAttempt.objects.filter(
            assessment__organization_id=org_id
        ).select_related('assessment', 'user')
        audit_logs = AuditLog.objects.filter(organization_id=org_id)
        certificates = Certificate.objects.filter(organization_id=org_id).select_related('user', 'course')

        members_by_user = {str(m.user_id): m for m in members}
        courses_by_id = {str(c.id): c for c in courses}

        filtered_enrollments = []
        for enrollment in enrollments:
            ref_dt = enrollment.completed_at or enrollment.enrolled_at or enrollment.started_at
            if (start_dt or end_dt) and not _in_range(ref_dt, start_dt, end_dt):
                continue
            filtered_enrollments.append(enrollment)

        filtered_attempts = []
        for attempt in attempts:
            ref_dt = attempt.submitted_at or attempt.started_at
            if (start_dt or end_dt) and not _in_range(ref_dt, start_dt, end_dt):
                continue
            filtered_attempts.append(attempt)

        filtered_audit_logs = []
        for log in audit_logs:
            ref_dt = log.timestamp or log.created_at
            if (start_dt or end_dt) and not _in_range(ref_dt, start_dt, end_dt):
                continue
            filtered_audit_logs.append({
                'id': str(log.id),
                'timestamp': (log.timestamp or log.created_at).isoformat() if (log.timestamp or log.created_at) else None,
                'actorId': log.actor_id,
                'actorName': log.actor_name,
                'actorType': log.actor_type,
                'action': log.action,
                'entityType': log.entity_type,
                'entityId': log.entity_id,
                'targetType': log.target_type,
                'targetId': log.target_id,
                'targetName': log.target_name,
                'changes': log.changes,
                'metadata': log.metadata,
            })

        filtered_certificates = []
        for cert in certificates:
            ref_dt = cert.issued_at
            if (start_dt or end_dt) and not _in_range(ref_dt, start_dt, end_dt):
                continue
            filtered_certificates.append(cert)

        completion_columns = [
            {'id': 'learner', 'label': 'Learner'},
            {'id': 'email', 'label': 'Email'},
            {'id': 'course', 'label': 'Course'},
            {'id': 'status', 'label': 'Status'},
            {'id': 'completedAt', 'label': 'Completed At'},
            {'id': 'dueDate', 'label': 'Due Date'},
        ]

        assessment_columns = [
            {'id': 'learner', 'label': 'Learner'},
            {'id': 'email', 'label': 'Email'},
            {'id': 'course', 'label': 'Course'},
            {'id': 'assessmentId', 'label': 'Assessment'},
            {'id': 'score', 'label': 'Score'},
            {'id': 'attempts', 'label': 'Attempts'},
            {'id': 'passed', 'label': 'Passed'},
            {'id': 'submittedAt', 'label': 'Submitted At'},
        ]

        training_completion_data = []
        for enrollment in filtered_enrollments:
            if enrollment.status != 'completed':
                continue
            member = members_by_user.get(str(enrollment.user_id))
            course = courses_by_id.get(str(enrollment.course_id))
            user = member.user if member else None
            training_completion_data.append({
                'learner': (user.display_name or user.get_full_name() or user.username) if user else 'Learner',
                'email': user.email if user else '-',
                'course': course.title if course else str(enrollment.course_id),
                'status': enrollment.status,
                'completedAt': enrollment.completed_at.isoformat() if enrollment.completed_at else '-',
                'dueDate': enrollment.due_date.isoformat() if enrollment.due_date else '-',
            })

        assessment_data = []
        for attempt in filtered_attempts:
            member = members_by_user.get(str(attempt.user_id))
            course = courses_by_id.get(str(attempt.assessment.course_id)) if attempt.assessment.course_id else None
            user = member.user if member else None
            assessment_data.append({
                'learner': (user.display_name or user.get_full_name() or user.username) if user else 'Learner',
                'email': user.email if user else '-',
                'course': course.title if course else str(attempt.assessment.course_id or ''),
                'assessmentId': str(attempt.assessment_id),
                'score': attempt.score if attempt.score is not None else '',
                'attempts': attempt.attempt_number,
                'passed': 'Yes' if attempt.passed else 'No',
                'submittedAt': attempt.submitted_at.isoformat() if attempt.submitted_at else '',
            })

        summary_pdf = create_summary_pdf({
            'orgName': org.name,
            'generatedAt': timezone.now().isoformat(),
            'recordCount': len(training_completion_data),
            'dateRange': (
                f"{start_dt.date().isoformat() if start_dt else 'Start'} - "
                f"{end_dt.date().isoformat() if end_dt else 'Now'}"
            ) if (start_dt or end_dt) else None,
        })

        completion_csv = build_csv(completion_columns, training_completion_data)
        assessment_csv = build_csv(assessment_columns, assessment_data)

        certificate_payloads = []
        for cert in filtered_certificates:
            member = members_by_user.get(str(cert.user_id))
            course = courses_by_id.get(str(cert.course_id))
            user = member.user if member else None
            metadata = cert.metadata or {}
            verification_url = metadata.get('verificationUrl') or metadata.get('verification_url') or ''
            pdf_bytes = create_certificate_pdf({
                'orgName': org.name,
                'learnerName': (user.display_name or user.get_full_name() or user.username) if user else 'Learner',
                'courseTitle': course.title if course else 'Course',
                'issuedAt': cert.issued_at.date().isoformat() if cert.issued_at else '',
                'certificateNumber': cert.certificate_number,
                'verificationUrl': verification_url,
            })
            certificate_payloads.append({
                'file_name': cert.certificate_number or str(cert.id),
                'pdf': pdf_bytes,
            })

        zip_bytes = build_evidence_zip({
            'summary_pdf': summary_pdf,
            'completion_csv': completion_csv,
            'assessment_csv': assessment_csv,
            'audit_logs': filtered_audit_logs,
            'certificates': certificate_payloads,
        })

        timestamp = int(time.time() * 1000)
        key = f"evidenceExports/{org_id}/audit_export_{timestamp}.zip"
        content_file = ContentFile(zip_bytes)
        content_file.content_type = 'application/zip'
        saved_path = default_storage.save(key, content_file)
        url = _generate_presigned_url(saved_path)

        return Response({'url': url, 'path': saved_path})


class MasterReportSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response(
                {'error': {'status': 403, 'code': 'forbidden', 'detail': 'Master permissions are required.'}},
                status=status.HTTP_403_FORBIDDEN,
            )

        now = timezone.now()
        week_ago = now - timedelta(days=7)

        organization_count = Organization.objects.filter(is_active=True).count()
        active_memberships = OrganizationMember.objects.filter(status='active').count()
        user_count = User.objects.count()
        course_count = Course.objects.count()
        enrollment_count = Enrollment.objects.count()
        completions_week = Enrollment.objects.filter(status='completed', completed_at__gte=week_ago).count()
        audit_events_week = AuditLog.objects.filter(timestamp__gte=week_ago).count()

        return Response(
            {
                'timestamp': now.isoformat(),
                'organizations': organization_count,
                'users': user_count,
                'active_memberships': active_memberships,
                'courses': course_count,
                'enrollments': enrollment_count,
                'completions_last_7d': completions_week,
                'audit_events_last_7d': audit_events_week,
            }
        )
