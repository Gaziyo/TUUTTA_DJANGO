from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Profile
    display_name = models.CharField(max_length=255, blank=True)
    photo_url = models.URLField(blank=True)
    bio = models.TextField(blank=True)

    # Firebase migration field (temporary)
    firebase_uid = models.CharField(max_length=128, unique=True, null=True, blank=True)

    # Settings
    settings = models.JSONField(default=dict)

    # Subscription
    subscription_tier = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('starter', 'Starter'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ],
        default='free'
    )
    stripe_customer_id = models.CharField(max_length=255, blank=True)

    # Timestamps
    last_active_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email or self.username
