from rest_framework import serializers
from .models import WebhookEndpoint, WebhookDelivery


class WebhookEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = [
            'id', 'organization', 'name', 'url', 'is_active', 'secret',
            'events', 'headers', 'created_at', 'updated_at', 'last_delivered_at'
        ]
        read_only_fields = ['secret', 'created_at', 'updated_at', 'last_delivered_at']


class WebhookDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDelivery
        fields = [
            'id', 'endpoint', 'event', 'payload', 'status',
            'attempt_count', 'http_status', 'error_message',
            'created_at', 'delivered_at'
        ]
