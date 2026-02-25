import hashlib
import hmac
import json
import time
from typing import Dict, Any, List

from django.conf import settings
from django.utils import timezone

from .models import WebhookEndpoint, WebhookDelivery


def _build_signature(secret: str, timestamp: str, payload: Dict[str, Any]) -> str:
    body = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    message = f'{timestamp}.{body}'.encode('utf-8')
    digest = hmac.new(secret.encode('utf-8'), message, hashlib.sha256).hexdigest()
    return f'v1={digest}'


def enqueue_event(org_id: str, event: str, data: Dict[str, Any]) -> List[WebhookDelivery]:
    endpoints = WebhookEndpoint.objects.filter(organization_id=org_id, is_active=True)
    deliveries: List[WebhookDelivery] = []

    for endpoint in endpoints:
        if endpoint.events and event not in endpoint.events:
            continue
        delivery = WebhookDelivery.objects.create(
            endpoint=endpoint,
            event=event,
            payload=data,
            status='pending'
        )
        deliveries.append(delivery)

    return deliveries


def deliver_webhook(delivery: WebhookDelivery) -> None:
    try:
        import requests
    except Exception as exc:
        delivery.status = 'failed'
        delivery.attempt_count += 1
        delivery.error_message = f'Requests unavailable: {exc}'
        delivery.save(update_fields=['status', 'attempt_count', 'error_message'])
        return
    endpoint = delivery.endpoint
    timestamp = str(int(time.time()))
    signature = _build_signature(endpoint.secret, timestamp, delivery.payload)

    headers = {
        settings.WEBHOOK_EVENT_HEADER: delivery.event,
        settings.WEBHOOK_TIMESTAMP_HEADER: timestamp,
        settings.WEBHOOK_SIGNATURE_HEADER: signature,
        'Content-Type': 'application/json',
    }
    headers.update(endpoint.headers or {})

    try:
        response = requests.post(
            endpoint.url,
            json=delivery.payload,
            headers=headers,
            timeout=10,
        )
        delivery.http_status = response.status_code
        delivery.attempt_count += 1
        if 200 <= response.status_code < 300:
            delivery.status = 'sent'
            delivery.delivered_at = timezone.now()
            endpoint.last_delivered_at = timezone.now()
            endpoint.save(update_fields=['last_delivered_at'])
        else:
            delivery.status = 'failed'
            delivery.error_message = f'HTTP {response.status_code}'
    except Exception as exc:
        delivery.status = 'failed'
        delivery.attempt_count += 1
        delivery.error_message = str(exc)[:500]

    delivery.save(update_fields=[
        'status', 'attempt_count', 'http_status', 'error_message', 'delivered_at'
    ])
