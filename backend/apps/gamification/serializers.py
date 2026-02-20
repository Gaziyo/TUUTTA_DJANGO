from rest_framework import serializers
from .models import Achievement, UserAchievement, UserXP


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['id', 'name', 'description', 'icon_url', 'badge_color', 'achievement_type', 'points', 'is_active']
        read_only_fields = ['id']


class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)

    class Meta:
        model = UserAchievement
        fields = ['id', 'achievement', 'earned_at']
        read_only_fields = ['id', 'earned_at']


class UserXPSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserXP
        fields = ['id', 'user', 'total_xp', 'level', 'updated_at']
        read_only_fields = ['id', 'updated_at']
