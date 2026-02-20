from rest_framework import viewsets
from .models import Assessment, Question
from .serializers import AssessmentSerializer, QuestionSerializer


class AssessmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssessmentSerializer
    search_fields = ['title', 'description']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        return Assessment.objects.filter(
            organization__members__user=user
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer

    def get_queryset(self):
        return Question.objects.filter(
            assessment_id=self.kwargs['assessment_pk']
        ).order_by('order_index')

    def perform_create(self, serializer):
        serializer.save(assessment_id=self.kwargs['assessment_pk'])
