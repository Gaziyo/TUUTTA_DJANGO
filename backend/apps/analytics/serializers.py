from rest_framework import serializers
from .models import (
    AnalyticsEvent, DailyStats, AuditLog, AnalyticsJob,
    GenieReportSchedule, GenieReportRun, ManagerDigestRun, BloomAnalyticsSnapshot,
    WorkforceCapabilityIndex, DepartmentBloomTrend, CompetencyTrajectoryForecast,
    ComplianceReadinessPrediction, StrategicSkillShortageDetection
)


class AnalyticsEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsEvent
        fields = '__all__'


class DailyStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyStats
        fields = '__all__'


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'


class AnalyticsJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsJob
        fields = '__all__'


class GenieReportScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = GenieReportSchedule
        fields = '__all__'


class GenieReportRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = GenieReportRun
        fields = '__all__'


class ManagerDigestRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManagerDigestRun
        fields = '__all__'


class BloomAnalyticsSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloomAnalyticsSnapshot
        fields = '__all__'


class WorkforceCapabilityIndexSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkforceCapabilityIndex
        fields = '__all__'


class DepartmentBloomTrendSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepartmentBloomTrend
        fields = '__all__'


class CompetencyTrajectoryForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetencyTrajectoryForecast
        fields = '__all__'


class ComplianceReadinessPredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceReadinessPrediction
        fields = '__all__'


class StrategicSkillShortageDetectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StrategicSkillShortageDetection
        fields = '__all__'
