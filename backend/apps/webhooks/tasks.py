from celery import shared_task
from .models import WebhookDelivery
from .services import deliver_webhook


@shared_task
def deliver_webhook_task(delivery_id: str) -> None:
    try:
        delivery = WebhookDelivery.objects.select_related('endpoint').get(id=delivery_id)
    except WebhookDelivery.DoesNotExist:
        return
    if delivery.status != 'pending':
        return
    deliver_webhook(delivery)


@shared_task
def dispatch_pending_webhooks(limit: int = 50) -> int:
    pending = WebhookDelivery.objects.select_related('endpoint').filter(status='pending')[:limit]
    for delivery in pending:
        deliver_webhook(delivery)
    return pending.count()
