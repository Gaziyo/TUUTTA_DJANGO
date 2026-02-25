from rest_framework import serializers
from .models import (
    CompetencyFramework, Competency, RoleCompetencyMapping, CompliancePolicy,
    CompetencyScore, CompetencySnapshot, BloomLevel
)


class CompetencyFrameworkSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetencyFramework
        fields = ['id', 'organization', 'name', 'description', 'version', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CompetencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Competency
        fields = [
            'id', 'organization', 'framework', 'parent',
            'name', 'description', 'level', 'bloom_level_target',
            'required_modalities', 'threshold_score',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RoleCompetencyMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleCompetencyMapping
        fields = ['id', 'organization', 'competency', 'role_name', 'required_level', 'is_mandatory', 'priority', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        priority = attrs.get('priority')
        is_mandatory = attrs.get('is_mandatory')
        if priority and is_mandatory is None:
            attrs['is_mandatory'] = priority == 'mandatory'
        elif is_mandatory is not None and not priority:
            attrs['priority'] = 'mandatory' if is_mandatory else 'recommended'
        return attrs


class CompliancePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = CompliancePolicy
        fields = [
            'id', 'organization', 'name', 'description', 'regulation',
            'due_days', 'recurrence_days', 'penalty_description',
            'linked_course', 'linked_assessment', 'linked_competencies', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CompetencyScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetencyScore
        fields = '__all__'


class CompetencySnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetencySnapshot
        fields = '__all__'


class BloomLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloomLevel
        fields = '__all__'
