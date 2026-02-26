from rest_framework import serializers
from .models import (
    GenieSource,
    GeniePipeline,
    ELSProject,
    ELSProjectPhase,
    ELSProjectException,
    ELSProjectRunMetric,
)


class GenieSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = GenieSource
        fields = ['id', 'organization', 'created_by', 'name', 'source_type', 'url', 'status', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at', 'status', 'created_by']


class GeniePipelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeniePipeline
        fields = ['id', 'organization', 'created_by', 'name', 'sources', 'config', 'status', 'created_at']
        read_only_fields = ['id', 'created_at', 'created_by']


class ELSProjectPhaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ELSProjectPhase
        fields = [
            'id', 'project', 'phase', 'status',
            'started_at', 'completed_at',
            'output_data', 'bloom_distribution', 'notes',
            'confidence_score', 'risk_score', 'quality_checks', 'gate_result',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ELSProjectExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ELSProjectException
        fields = [
            'id', 'project', 'phase', 'reason_code', 'reason_message',
            'confidence_score', 'risk_score', 'status', 'priority', 'due_at',
            'resolved_by', 'resolution_notes', 'metadata',
            'created_at', 'resolved_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'resolved_at', 'updated_at']


class ELSProjectRunMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = ELSProjectRunMetric
        fields = [
            'id', 'project', 'run_id', 'phase', 'status',
            'duration_ms', 'retry_count', 'token_cost', 'compute_cost',
            'quality_score', 'metadata', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ELSProjectSerializer(serializers.ModelSerializer):
    phase_records = ELSProjectPhaseSerializer(many=True, read_only=True)
    exceptions = ELSProjectExceptionSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True, default='')

    class Meta:
        model = ELSProject
        fields = [
            'id', 'organization', 'created_by', 'created_by_name',
            'last_modified_by',
            'name', 'description', 'status', 'current_phase',
            'run_state', 'current_run_id', 'current_idempotency_key', 'current_correlation_id',
            'run_attempt', 'run_started_at', 'run_completed_at',
            'last_error_code', 'last_error_message', 'autonomous_mode', 'last_outcome_package',
            'phases_data',
            'created_course_ids', 'created_assessment_ids', 'created_learning_path_ids',
            'knowledge_documents',
            'phase_records',
            'exceptions',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class ELSProjectListSerializer(serializers.ModelSerializer):
    """Lightweight list serializer — excludes phase_records detail."""
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True, default='')

    class Meta:
        model = ELSProject
        fields = [
            'id', 'organization', 'name', 'description',
            'status', 'current_phase', 'run_state', 'run_attempt', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
