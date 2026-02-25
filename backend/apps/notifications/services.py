from typing import Iterable, Optional
from django.utils import timezone

from .models import NotificationOutbox


def enqueue_notification(
    *,
    user_id: str,
    org_id: Optional[str],
    notification_type: str,
    title: str,
    message: str,
    channels: Optional[Iterable[str]] = None,
    data: Optional[dict] = None,
    recipient_emails: Optional[Iterable[str]] = None,
    scheduled_for=None,
) -> NotificationOutbox:
    return NotificationOutbox.objects.create(
        user_id=user_id,
        organization_id=org_id,
        notification_type=notification_type,
        title=title,
        message=message,
        data=data or {},
        channels=list(channels or ['in_app']),
        recipient_emails=list(recipient_emails or []),
        scheduled_for=scheduled_for or timezone.now(),
        status='pending',
    )
