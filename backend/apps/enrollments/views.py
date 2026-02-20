from rest_framework import viewsets
from .models import Enrollment
from .serializers import EnrollmentSerializer


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    filterset_fields = ['status', 'course']
    ordering = ['-enrolled_at']

    def get_queryset(self):
        user = self.request.user
        return Enrollment.objects.filter(user=user)
