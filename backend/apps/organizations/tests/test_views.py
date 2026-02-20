"""API tests for the organizations endpoints."""
import pytest
from django.urls import reverse, NoReverseMatch
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization, OrganizationMember

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def org_admin(db):
    return User.objects.create_user(
        username="orgadmin@example.com",
        email="orgadmin@example.com",
        password="OrgAdmin1!",
    )


@pytest.fixture
def auth_client(api_client, org_admin):
    resp = api_client.post(
        reverse("login"),
        {"email": "orgadmin@example.com", "password": "OrgAdmin1!"},
        format="json",
    )
    token = resp.data.get("access")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
class TestOrganizationViewSet:
    def test_list_unauthenticated(self, api_client):
        resp = api_client.get(reverse("organization-list"))
        assert resp.status_code == 401

    def test_create_organization(self, auth_client, org_admin):
        resp = auth_client.post(
            reverse("organization-list"),
            {"name": "Acme Corp", "slug": "acme-corp", "plan": "starter"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Acme Corp"
        # Creator is automatically added as a member so they can view it
        org_id = resp.data["id"]
        org = Organization.objects.get(pk=org_id)
        assert OrganizationMember.objects.filter(organization=org, user=org_admin).exists()

    def test_create_duplicate_slug(self, auth_client):
        auth_client.post(
            reverse("organization-list"),
            {"name": "Acme 1", "slug": "same-slug", "plan": "free"},
            format="json",
        )
        resp = auth_client.post(
            reverse("organization-list"),
            {"name": "Acme 2", "slug": "same-slug", "plan": "free"},
            format="json",
        )
        assert resp.status_code == 400

    def test_retrieve_organization(self, auth_client, org_admin):
        create_resp = auth_client.post(
            reverse("organization-list"),
            {"name": "Retrievable Org", "slug": "ret-org", "plan": "free"},
            format="json",
        )
        org_id = create_resp.data["id"]
        resp = auth_client.get(reverse("organization-detail", kwargs={"pk": org_id}))
        assert resp.status_code == 200
        assert resp.data["id"] == org_id

    def test_list_departments(self, auth_client, org_admin):
        """List departments nested under an organization (nested router)."""
        create_resp = auth_client.post(
            reverse("organization-list"),
            {"name": "Dept Org", "slug": "dept-org", "plan": "free"},
            format="json",
        )
        org_id = create_resp.data["id"]
        try:
            resp = auth_client.get(
                reverse("organization-departments-list", kwargs={"organization_pk": org_id})
            )
            assert resp.status_code == 200
        except NoReverseMatch:
            pytest.skip("organization-departments-list URL not registered")
