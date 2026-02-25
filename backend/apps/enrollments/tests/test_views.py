"""API tests for the enrollments endpoints."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization, OrganizationMember
from apps.courses.models import Course
from apps.enrollments.models import Enrollment

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
def admin_user(db):
    return User.objects.create_user(
        username="admin@example.com",
        email="admin@example.com",
        password="AdminPass1!",
    )


@pytest.fixture
def organization(db, admin_user):
    org = Organization.objects.create(
        name="Test Org",
        slug="test-org",
        plan="professional",
        created_by=admin_user,
    )
    OrganizationMember.objects.create(organization=org, user=admin_user, role="org_admin")
    return org


@pytest.fixture
def course(db, organization, admin_user):
    return Course.objects.create(
        title="Test Course",
        description="A test course",
        organization=organization,
        created_by=admin_user,
        status="published",
    )


@pytest.fixture
def auth_client(api_client, user, organization):
    """Learner auth client — member of the org."""
    OrganizationMember.objects.get_or_create(organization=organization, user=user, defaults={"role": "learner"})
    resp = api_client.post(
        reverse("login"),
        {"email": "learner@example.com", "password": "LearnPass1!"},
        format="json",
    )
    token = resp.data.get("access")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """Admin auth client."""
    resp = api_client.post(
        reverse("login"),
        {"email": "admin@example.com", "password": "AdminPass1!"},
        format="json",
    )
    token = resp.data.get("access")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.fixture
def enrollment(db, user, course, organization):
    return Enrollment.objects.create(
        user=user,
        course=course,
        organization=organization,
        status="enrolled",
    )


@pytest.mark.django_db
class TestEnrollmentViewSet:
    def test_list_unauthenticated(self, api_client):
        resp = api_client.get(reverse("enrollment-list"))
        assert resp.status_code == 401

    def test_list_own_enrollments(self, auth_client, enrollment):
        resp = auth_client.get(reverse("enrollment-list"))
        assert resp.status_code == 200
        ids = [e["id"] for e in (resp.data.get("results") or resp.data)]
        assert str(enrollment.id) in ids

    def test_create_enrollment(self, auth_client, user, course, organization):
        resp = auth_client.post(
            reverse("enrollment-list"),
            {
                "user": str(user.id),
                "course": str(course.id),
                "organization": str(organization.id),
                "status": "enrolled",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["status"] == "enrolled"

    def test_retrieve_enrollment(self, auth_client, enrollment):
        resp = auth_client.get(reverse("enrollment-detail", kwargs={"pk": str(enrollment.id)}))
        assert resp.status_code == 200
        assert resp.data["id"] == str(enrollment.id)

    def test_update_enrollment_status(self, auth_client, enrollment):
        resp = auth_client.patch(
            reverse("enrollment-detail", kwargs={"pk": str(enrollment.id)}),
            {"status": "in_progress"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["status"] == "in_progress"

    def test_delete_enrollment(self, auth_client, enrollment):
        resp = auth_client.delete(reverse("enrollment-detail", kwargs={"pk": str(enrollment.id)}))
        assert resp.status_code == 204
        assert not Enrollment.objects.filter(id=enrollment.id).exists()

    def test_learner_cannot_see_other_users_enrollment(self, auth_client, admin_user, course, organization):
        """Learner should not see another user's enrollment in the default queryset."""
        other_enrollment = Enrollment.objects.create(
            user=admin_user,
            course=course,
            organization=organization,
            status="enrolled",
        )
        resp = auth_client.get(reverse("enrollment-list"))
        items = resp.data.get("results") if isinstance(resp.data, dict) else resp.data
        ids = [e["id"] for e in (items or [])]
        assert str(other_enrollment.id) not in ids

    def test_admin_can_see_org_enrollments(self, admin_client, enrollment, organization):
        """Admin querying with ?organization= should see all org enrollments."""
        resp = admin_client.get(
            reverse("enrollment-list"),
            {"organization": str(organization.id)},
        )
        assert resp.status_code == 200
        ids = [e["id"] for e in (resp.data.get("results") or resp.data)]
        assert str(enrollment.id) in ids

    def test_duplicate_enrollment_rejected(self, auth_client, user, course, organization, enrollment):
        resp = auth_client.post(
            reverse("enrollment-list"),
            {
                "user": str(user.id),
                "course": str(course.id),
                "organization": str(organization.id),
                "status": "enrolled",
            },
            format="json",
        )
        assert resp.status_code == 400
