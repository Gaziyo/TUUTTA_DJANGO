from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification, NotificationOutbox
from .serializers import NotificationSerializer, NotificationOutboxSerializer
from .tasks import dispatch_pending_notifications
class NotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        qs = Notification.objects.filter(user=self.request.user)
        if org_id:
            qs = qs.filter(organization_id=org_id)
        return qs

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        qs = Notification.objects.filter(user=request.user, is_read=False)
        if org_id:
            qs = qs.filter(organization_id=org_id)
        qs.update(is_read=True, read_at=timezone.now())
        return Response({'status': 'ok'})


class NotificationOutboxViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationOutboxSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return NotificationOutbox.objects.filter(organization_id=org_id)
        return NotificationOutbox.objects.none()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        instance = serializer.save(organization_id=org_id)
        # Fire-and-forget dispatch
        dispatch_pending_notifications.delay()
        return instance
