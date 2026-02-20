from rest_framework import serializers
from .models import Enrollment


class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = [
            'id', 'user', 'course', 'organization', 'status', 'progress_percentage',
            'enrolled_at', 'started_at', 'completed_at', 'due_date', 'assigned_by',
        ]
        read_only_fields = ['id', 'enrolled_at']
