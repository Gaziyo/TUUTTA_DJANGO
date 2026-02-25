from rest_framework import serializers
from .models import (
    CognitiveProfile,
    GapMatrix,
    RemediationTrigger,
    RemediationAssignment,
    AdaptivePolicy,
    AdaptiveRecommendation,
    AdaptiveDecisionLog,
    FailureRiskSnapshot,
    BaselineDiagnostic,
    GNNInsight,
    InterventionLog,
    GapClosureSnapshot,
)


class CognitiveProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CognitiveProfile
        fields = [
            'id', 'user', 'organization',
            'bloom_mastery', 'modality_strengths', 'preferred_modality',
            'avg_response_time_ms', 'accuracy_by_difficulty',
            'total_questions_answered', 'total_assessments_taken',
            'last_assessment_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class GapMatrixSerializer(serializers.ModelSerializer):
    competency_name = serializers.CharField(source='competency.name', read_only=True)
    recommended_course_title = serializers.CharField(source='recommended_course.title', read_only=True)

    class Meta:
        model = GapMatrix
        fields = [
            'id', 'user', 'organization', 'competency', 'competency_name',
            'current_bloom_level', 'target_bloom_level', 'gap_score',
            'bloom_gap_component', 'modality_gap_component', 'threshold_gap_component',
            'role_requirement_component', 'weighted_bloom_gap', 'weighted_modality_gap',
            'bloom_weight', 'modality_weight', 'threshold_score_target', 'learner_score',
            'gap_details',
            'priority', 'recommended_course', 'recommended_course_title',
            'status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RemediationTriggerSerializer(serializers.ModelSerializer):
    competency_name = serializers.CharField(source='competency.name', read_only=True)
    assessment_title = serializers.CharField(source='assessment.title', read_only=True)
    remediation_course_title = serializers.CharField(source='remediation_course.title', read_only=True)

    class Meta:
        model = RemediationTrigger
        fields = [
            'id', 'organization', 'competency', 'competency_name',
            'assessment', 'assessment_title', 'remediation_course', 'remediation_course_title',
            'min_gap_score', 'max_attempts', 'is_active', 'metadata',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RemediationAssignmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = RemediationAssignment
        fields = [
            'id', 'organization', 'user', 'created_by', 'trigger', 'enrollment',
            'course', 'course_title', 'module_id', 'lesson_id',
            'status', 'reason', 'scheduled_reassessment_at', 'metadata',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AdaptivePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = AdaptivePolicy
        fields = [
            'id', 'organization', 'name', 'description', 'status',
            'current_version', 'config', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AdaptiveRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdaptiveRecommendation
        fields = [
            'id', 'organization', 'user', 'policy', 'action_type',
            'score', 'reason', 'payload', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AdaptiveDecisionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdaptiveDecisionLog
        fields = [
            'id', 'organization', 'user', 'policy', 'action_type',
            'payload', 'reward', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class FailureRiskSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = FailureRiskSnapshot
        fields = [
            'id', 'organization', 'user', 'course', 'risk_score',
            'risk_level', 'reasons', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class BaselineDiagnosticSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaselineDiagnostic
        fields = '__all__'


class GNNInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = GNNInsight
        fields = '__all__'


class InterventionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterventionLog
        fields = '__all__'


class GapClosureSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = GapClosureSnapshot
        fields = '__all__'
