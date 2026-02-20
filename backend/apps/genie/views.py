from rest_framework import viewsets
from .models import GenieSource, GeniePipeline
from .serializers import GenieSourceSerializer, GeniePipelineSerializer


class GenieSourceViewSet(viewsets.ModelViewSet):
    serializer_class = GenieSourceSerializer

    def get_queryset(self):
        user = self.request.user
        return GenieSource.objects.filter(organization__members__user=user).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class GeniePipelineViewSet(viewsets.ModelViewSet):
    serializer_class = GeniePipelineSerializer

    def get_queryset(self):
        user = self.request.user
        return GeniePipeline.objects.filter(organization__members__user=user).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
