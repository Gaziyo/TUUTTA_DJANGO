from django.db import models
from apps.organizations.models import Organization
import uuid
import secrets


def generate_secret() -> str:
    return secrets.token_hex(24)


class WebhookEndpoint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='webhook_endpoints')

    name = models.CharField(max_length=255, blank=True)
    url = models.URLField()
    is_active = models.BooleanField(default=True)
    secret = models.CharField(max_length=128, default=generate_secret)

    # Optional allow-list of event names; empty = all events
    events = models.JSONField(default=list, blank=True)
    headers = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'webhook_endpoints'

    def __str__(self):
        return f'{self.organization_id} → {self.url}'


class WebhookDelivery(models.Model):
    STATUSES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    endpoint = models.ForeignKey(WebhookEndpoint, on_delete=models.CASCADE, related_name='deliveries')

    event = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUSES, default='pending')
    attempt_count = models.IntegerField(default=0)
    http_status = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'webhook_deliveries'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
