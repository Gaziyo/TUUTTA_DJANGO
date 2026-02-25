from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import WebhookEndpoint, WebhookDelivery
from .serializers import WebhookEndpointSerializer, WebhookDeliverySerializer
from .services import enqueue_event
from .tasks import deliver_webhook_task


class WebhookEndpointViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WebhookEndpointSerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return WebhookEndpoint.objects.filter(organization_id=org_id)
        return WebhookEndpoint.objects.none()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk') or self.request.data.get('organization')
        serializer.save(organization_id=org_id)

    @action(detail=False, methods=['post'], url_path='test')
    def test_webhook(self, request, **kwargs):
        org_id = self.kwargs.get('organization_pk') or request.data.get('organization')
        if not org_id:
            return Response({'error': 'organization is required'}, status=400)

        deliveries = enqueue_event(org_id, 'webhook.test', {
            'message': 'This is a signed test webhook from Tuutta.',
            'sentAt': int(__import__('time').time() * 1000)
        })
        for delivery in deliveries:
            deliver_webhook_task.delay(str(delivery.id))
        return Response({'status': 'queued', 'deliveries': len(deliveries)})


class WebhookDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WebhookDeliverySerializer

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk') or self.request.query_params.get('organization')
        if org_id:
            return WebhookDelivery.objects.filter(endpoint__organization_id=org_id)
        endpoint_id = self.request.query_params.get('endpoint')
        if endpoint_id:
            return WebhookDelivery.objects.filter(endpoint_id=endpoint_id)
        return WebhookDelivery.objects.none()
