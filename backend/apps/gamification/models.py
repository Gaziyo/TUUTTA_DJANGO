from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
import uuid


class Achievement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True)

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    icon_url = models.URLField(blank=True)
    badge_color = models.CharField(max_length=20, blank=True)

    achievement_type = models.CharField(max_length=50)
    criteria = models.JSONField(default=dict)
    points = models.IntegerField(default=0)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'achievements'

    def __str__(self):
        return self.name


class UserAchievement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)

    earned_at = models.DateTimeField(auto_now_add=True)
    notified = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_achievements'
        unique_together = ['user', 'achievement']


class UserXP(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='xp_records')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True)

    total_xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_xp'
        unique_together = ['user', 'organization']


class XPTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.IntegerField()
    reason = models.CharField(max_length=255)
    reference_type = models.CharField(max_length=50, blank=True)
    reference_id = models.UUIDField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'xp_transactions'
