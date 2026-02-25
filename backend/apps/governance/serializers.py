from rest_framework import serializers
from .models import (
    GovernancePolicy,
    ExplainabilityLog,
    BiasScan,
    ModelVersion,
    HumanOverride,
)


class GovernancePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernancePolicy
        fields = '__all__'


class ExplainabilityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExplainabilityLog
        fields = '__all__'


class BiasScanSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiasScan
        fields = '__all__'


class ModelVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelVersion
        fields = '__all__'


class HumanOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = HumanOverride
        fields = '__all__'
