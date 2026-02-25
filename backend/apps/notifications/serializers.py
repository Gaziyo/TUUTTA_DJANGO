from rest_framework import serializers
from .models import Notification, NotificationOutbox


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'organization', 'notification_type', 'title', 'message',
            'data', 'is_read', 'read_at', 'created_at'
        ]


class NotificationOutboxSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationOutbox
        fields = [
            'id', 'user', 'organization', 'notification_type', 'title', 'message',
            'data', 'channels', 'recipient_emails', 'status', 'scheduled_for',
            'sent_at', 'error_message', 'attempts', 'created_at', 'updated_at'
        ]
