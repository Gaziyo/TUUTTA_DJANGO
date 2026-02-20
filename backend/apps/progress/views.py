from rest_framework import viewsets
from .models import ProgressRecord
from .serializers import ProgressRecordSerializer


class ProgressViewSet(viewsets.ModelViewSet):
    serializer_class = ProgressRecordSerializer
    ordering = ['-updated_at']

    def get_queryset(self):
        return ProgressRecord.objects.filter(user=self.request.user)
