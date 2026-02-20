"""Unit tests for the accounts app models."""
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="StrongPass123!",
        )
        assert user.pk is not None
        assert user.email == "test@example.com"
        assert user.subscription_tier == "free"
        assert user.check_password("StrongPass123!")

    def test_str_returns_email(self):
        user = User.objects.create_user(
            username="struser",
            email="str@example.com",
            password="pass",
        )
        assert str(user) == "str@example.com"

    def test_firebase_uid_nullable(self):
        user = User.objects.create_user(
            username="nofire",
            email="nofire@example.com",
            password="pass",
        )
        assert user.firebase_uid is None

    def test_firebase_uid_unique(self):
        from django.db import IntegrityError
        User.objects.create_user(
            username="u1", email="u1@example.com", password="pass", firebase_uid="uid123"
        )
        with pytest.raises(IntegrityError):
            User.objects.create_user(
                username="u2", email="u2@example.com", password="pass", firebase_uid="uid123"
            )

    def test_subscription_tier_choices(self):
        user = User.objects.create_user(
            username="prouser", email="pro@example.com", password="pass",
            subscription_tier="professional"
        )
        assert user.subscription_tier == "professional"
