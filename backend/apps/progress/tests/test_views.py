"""API tests for the progress endpoints."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization, OrganizationMember
from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.progress.models import ProgressRecord

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="learner@example.com",
        email="learner@example.com",
        password="LearnPass1!",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        username="other@example.com",
        email="other@example.com",
        password="OtherPass1!",
    )


@pytest.fixture
def organization(db, user):
    org = Organization.objects.create(
        name="Test Org",
        slug="test-org",
        plan="professional",
        created_by=user,
    )
    OrganizationMember.objects.create(organization=org, user=user, role="learner")
    return org


@pytest.fixture
def course(db, organization, user):
    return Course.objects.create(
        title="Test Course",
        description="desc",
        organization=organization,
        created_by=user,
        status="published",
    )


@pytest.fixture
def enrollment(db, user, course, organization):
    return Enrollment.objects.create(
        user=user,
        course=course,
        organization=organization,
        status="enrolled",
    )


@pytest.fixture
def progress_record(db, user, course, enrollment):
    return ProgressRecord.objects.create(
        user=user,
        course=course,
        enrollment=enrollment,
        completion_percentage=25,
        total_time_spent=300,
    )


@pytest.fixture
def auth_client(api_client, user):
    resp = api_client.post(
        reverse("login"),
        {"email": "learner@example.com", "password": "LearnPass1!"},
        format="json",
    )
    token = resp.data.get("access")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.fixture
def other_auth_client(api_client, other_user):
    resp = api_client.post(
        reverse("login"),
        {"email": "other@example.com", "password": "OtherPass1!"},
        format="json",
    )
    token = resp.data.get("access")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
class TestProgressViewSet:
    def test_list_unauthenticated(self, api_client):
        resp = api_client.get(reverse("progress-list"))
        assert resp.status_code == 401

    def test_list_own_progress(self, auth_client, progress_record):
        resp = auth_client.get(reverse("progress-list"))
        assert resp.status_code == 200
        ids = [p["id"] for p in (resp.data.get("results") or resp.data)]
        assert str(progress_record.id) in ids

    def test_cannot_see_other_users_progress(self, other_auth_client, progress_record):
        resp = other_auth_client.get(reverse("progress-list"))
        assert resp.status_code == 200
        items = resp.data.get("results") if isinstance(resp.data, dict) else resp.data
        ids = [p["id"] for p in (items or [])]
        assert str(progress_record.id) not in ids

    def test_retrieve_progress_record(self, auth_client, progress_record):
        resp = auth_client.get(reverse("progress-detail", kwargs={"pk": str(progress_record.id)}))
        assert resp.status_code == 200
        assert resp.data["id"] == str(progress_record.id)
        assert float(resp.data["completion_percentage"]) == 25.0

    def test_create_progress_record(self, auth_client, user, course, enrollment):
        resp = auth_client.post(
            reverse("progress-list"),
            {
                "user": str(user.id),
                "course": str(course.id),
                "enrollment": str(enrollment.id),
                "completion_percentage": "0.00",
                "total_time_spent": 0,
            },
            format="json",
        )
        assert resp.status_code == 201

    def test_update_progress_percentage(self, auth_client, progress_record):
        resp = auth_client.patch(
            reverse("progress-detail", kwargs={"pk": str(progress_record.id)}),
            {"completion_percentage": "75.00", "total_time_spent": 900},
            format="json",
        )
        assert resp.status_code == 200
        assert float(resp.data["completion_percentage"]) == 75.0

    def test_delete_progress_record(self, auth_client, progress_record):
        resp = auth_client.delete(reverse("progress-detail", kwargs={"pk": str(progress_record.id)}))
        assert resp.status_code == 204
        assert not ProgressRecord.objects.filter(id=progress_record.id).exists()

    def test_duplicate_progress_record_rejected(self, auth_client, user, course, progress_record):
        """unique_together = ['user', 'course'] prevents duplicates."""
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            ProgressRecord.objects.create(user=user, course=course)
