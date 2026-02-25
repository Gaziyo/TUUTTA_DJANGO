from django.conf import settings
from django.db import models
from django.utils import timezone
from celery import shared_task

from .models import Notification, NotificationOutbox


def _send_email(to_emails: list[str], subject: str, html: str) -> None:
    if not settings.SENDGRID_API_KEY:
        raise RuntimeError('SENDGRID_API_KEY is not configured')
    if not to_emails:
        raise RuntimeError('No recipient emails provided')

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
    except Exception as exc:
        raise RuntimeError(f'SendGrid unavailable: {exc}') from exc

    message = Mail(
        from_email=settings.SENDGRID_FROM_EMAIL,
        to_emails=to_emails,
        subject=subject,
        html_content=html,
    )
    client = SendGridAPIClient(settings.SENDGRID_API_KEY)
    client.send(message)


@shared_task
def dispatch_pending_notifications(limit: int = 50) -> int:
    now = timezone.now()
    pending = NotificationOutbox.objects.filter(status='pending').filter(
        models.Q(scheduled_for__lte=now) | models.Q(scheduled_for__isnull=True)
    )[:limit]

    sent_count = 0
    for entry in pending:
        entry.attempts += 1
        channels = entry.channels or ['in_app']
        errors: list[str] = []

        if 'in_app' in channels:
            Notification.objects.create(
                user=entry.user,
                organization=entry.organization,
                notification_type=entry.notification_type,
                title=entry.title,
                message=entry.message,
                data=entry.data or {},
            )

        if 'email' in channels:
            emails = entry.recipient_emails or []
            if entry.user and entry.user.email:
                if entry.user.email not in emails:
                    emails.append(entry.user.email)
            try:
                _send_email(emails, entry.title, f"<p>{entry.message}</p>")
            except Exception as exc:
                errors.append(str(exc)[:500])

        if errors:
            entry.status = 'failed'
            entry.error_message = '; '.join(errors)[:500]
        else:
            entry.status = 'sent'
            entry.sent_at = timezone.now()
            sent_count += 1

        entry.save(update_fields=[
            'status', 'sent_at', 'error_message', 'attempts', 'updated_at'
        ])

    return sent_count
