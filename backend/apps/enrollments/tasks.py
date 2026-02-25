from datetime import timedelta
from django.db import models
from django.utils import timezone
from celery import shared_task

from apps.organizations.models import Organization
from apps.enrollments.models import Enrollment
from apps.notifications.services import enqueue_notification


def _channels_from_org_settings(settings_dict: dict) -> list[str]:
    notifications = settings_dict.get('notifications', {}) if settings_dict else {}
    channels: list[str] = []
    if notifications.get('inAppEnabled', True):
        channels.append('in_app')
    if notifications.get('emailEnabled'):
        channels.append('email')
    if notifications.get('pushEnabled'):
        channels.append('push')
    return channels or ['in_app']


@shared_task
def send_deadline_reminders() -> int:
    now = timezone.now()
    sent = 0
    orgs = Organization.objects.all()
    for org in orgs:
        settings_dict = org.settings or {}
        notifications = settings_dict.get('notifications', {})
        if not notifications.get('assignmentDue', True):
            continue
        reminder_days = notifications.get('reminderDaysBefore', 3)
        channels = _channels_from_org_settings(settings_dict)

        cutoff_start = now
        cutoff_end = now + timedelta(days=reminder_days)

        enrollments = Enrollment.objects.filter(
            organization=org,
            status__in=['enrolled', 'in_progress'],
            due_date__isnull=False,
            due_date__gte=cutoff_start,
            due_date__lte=cutoff_end,
        )
        for enrollment in enrollments:
            enqueue_notification(
                user_id=str(enrollment.user_id),
                org_id=str(org.id),
                notification_type='enrollment_reminder',
                title='Training due soon',
                message=f'"{enrollment.course.title}" is due soon.',
                channels=channels,
                data={'enrollmentId': str(enrollment.id), 'courseId': str(enrollment.course_id)},
            )
            sent += 1
    return sent


@shared_task
def check_overdue_enrollments() -> int:
    now = timezone.now()
    sent = 0
    orgs = Organization.objects.all()
    for org in orgs:
        settings_dict = org.settings or {}
        notifications = settings_dict.get('notifications', {})
        if not notifications.get('assignmentDue', True):
            continue
        channels = _channels_from_org_settings(settings_dict)

        enrollments = Enrollment.objects.filter(
            organization=org,
            status__in=['enrolled', 'in_progress'],
            due_date__isnull=False,
            due_date__lt=now,
        )
        for enrollment in enrollments:
            enqueue_notification(
                user_id=str(enrollment.user_id),
                org_id=str(org.id),
                notification_type='enrollment_overdue',
                title='Training overdue',
                message=f'"{enrollment.course.title}" is overdue. Please complete as soon as possible.',
                channels=channels,
                data={'enrollmentId': str(enrollment.id), 'courseId': str(enrollment.course_id)},
            )
            sent += 1
    return sent
