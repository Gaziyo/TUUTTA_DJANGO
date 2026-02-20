"""API tests for the courses endpoints (CRUD + publish)."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization, OrganizationMember

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


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
    OrganizationMember.objects.create(
        organization=org, user=admin_user, role="org_admin"
    )
    return org


@pytest.fixture
def auth_client(api_client, admin_user):
    resp = api_client.post(
        reverse("login"),
        {"email": "admin@example.com", "password": "AdminPass1!"},
        format="json",
    )
    token = resp.data.get("access")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
class TestCourseViewSet:
    def test_list_courses_unauthenticated(self, api_client):
        resp = api_client.get(reverse("course-list"))
        assert resp.status_code == 401

    def test_list_courses_authenticated(self, auth_client):
        resp = auth_client.get(reverse("course-list"))
        assert resp.status_code == 200
        assert "results" in resp.data or isinstance(resp.data, list)

    def test_create_course(self, auth_client, organization):
        resp = auth_client.post(
            reverse("course-list"),
            {
                "title": "Django for Beginners",
                "description": "Learn Django from scratch",
                "organization": str(organization.id),
                "status": "draft",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["title"] == "Django for Beginners"

    def test_create_course_missing_title(self, auth_client, organization):
        resp = auth_client.post(
            reverse("course-list"),
            {"description": "No title", "organization": str(organization.id)},
            format="json",
        )
        assert resp.status_code == 400

    def test_retrieve_course(self, auth_client, organization):
        create_resp = auth_client.post(
            reverse("course-list"),
            {
                "title": "Retrievable Course",
                "description": "desc",
                "organization": str(organization.id),
                "status": "draft",
            },
            format="json",
        )
        course_id = create_resp.data["id"]
        resp = auth_client.get(reverse("course-detail", kwargs={"pk": course_id}))
        assert resp.status_code == 200
        assert resp.data["id"] == course_id

    def test_update_course(self, auth_client, organization):
        create_resp = auth_client.post(
            reverse("course-list"),
            {
                "title": "Old Title",
                "description": "desc",
                "organization": str(organization.id),
                "status": "draft",
            },
            format="json",
        )
        course_id = create_resp.data["id"]
        resp = auth_client.patch(
            reverse("course-detail", kwargs={"pk": course_id}),
            {"title": "New Title"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["title"] == "New Title"

    def test_delete_course(self, auth_client, organization):
        create_resp = auth_client.post(
            reverse("course-list"),
            {
                "title": "Delete Me",
                "description": "desc",
                "organization": str(organization.id),
                "status": "draft",
            },
            format="json",
        )
        course_id = create_resp.data["id"]
        resp = auth_client.delete(reverse("course-detail", kwargs={"pk": course_id}))
        assert resp.status_code == 204
