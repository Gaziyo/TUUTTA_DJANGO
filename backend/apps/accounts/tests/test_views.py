"""API tests for the accounts endpoints (register, login, logout, /me)."""
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
def registered_user(db):
    return User.objects.create_user(
        username="existing@example.com",
        email="existing@example.com",
        password="TestPass123!",
        display_name="Existing User",
    )


@pytest.fixture
def auth_client(api_client, registered_user):
    """Return an API client authenticated as registered_user."""
    response = api_client.post(
        reverse("login"),
        {"email": "existing@example.com", "password": "TestPass123!"},
        format="json",
    )
    token = response.data.get("access")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
class TestRegisterView:
    def test_register_success(self, api_client):
        resp = api_client.post(
            reverse("register"),
            {
                "email": "new@example.com",
                "password": "NewPass123!",
                "password2": "NewPass123!",
                "display_name": "New User",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert "access" in resp.data
        assert "refresh" in resp.data
        assert User.objects.filter(email="new@example.com").exists()

    def test_register_password_mismatch(self, api_client):
        resp = api_client.post(
            reverse("register"),
            {
                "email": "fail@example.com",
                "password": "Pass123!",
                "password2": "WrongPass!",
                "display_name": "Fail",
            },
            format="json",
        )
        assert resp.status_code == 400

    def test_register_duplicate_email(self, api_client, registered_user):
        resp = api_client.post(
            reverse("register"),
            {
                "email": "existing@example.com",
                "password": "AnotherPass1!",
                "password2": "AnotherPass1!",
                "display_name": "Dup",
            },
            format="json",
        )
        assert resp.status_code == 400


@pytest.mark.django_db
class TestLoginView:
    def test_login_success(self, api_client, registered_user):
        resp = api_client.post(
            reverse("login"),
            {"email": "existing@example.com", "password": "TestPass123!"},
            format="json",
        )
        assert resp.status_code == 200
        assert "access" in resp.data
        assert "refresh" in resp.data

    def test_login_wrong_password(self, api_client, registered_user):
        resp = api_client.post(
            reverse("login"),
            {"email": "existing@example.com", "password": "WrongPass!"},
            format="json",
        )
        assert resp.status_code == 401

    def test_login_unknown_email(self, api_client):
        resp = api_client.post(
            reverse("login"),
            {"email": "nobody@example.com", "password": "Pass123!"},
            format="json",
        )
        assert resp.status_code == 401


@pytest.mark.django_db
class TestCurrentUserView:
    def test_me_authenticated(self, auth_client, registered_user):
        resp = auth_client.get(reverse("current-user"))
        assert resp.status_code == 200
        assert resp.data["email"] == "existing@example.com"

    def test_me_unauthenticated(self, api_client):
        resp = api_client.get(reverse("current-user"))
        assert resp.status_code == 401


@pytest.mark.django_db
class TestLogoutView:
    def test_logout_blacklists_token(self, api_client, registered_user):
        login_resp = api_client.post(
            reverse("login"),
            {"email": "existing@example.com", "password": "TestPass123!"},
            format="json",
        )
        refresh = login_resp.data["refresh"]
        access = login_resp.data["access"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = api_client.post(reverse("logout"), {"refresh": refresh}, format="json")
        assert resp.status_code == 200


@pytest.mark.django_db
class TestWorkspaceResolverView:
    def test_resolve_personal_workspace_when_no_memberships(self, auth_client):
        resp = auth_client.get(reverse("workspace-resolver"))
        assert resp.status_code == 200
        assert resp.data["activeContext"] == "personal"
        assert resp.data["defaultRoute"] == "/me/home"

    def test_resolve_org_workspace_from_membership(self, auth_client, registered_user):
        org = Organization.objects.create(
            name="Acme",
            slug="acme",
            created_by=registered_user,
        )
        OrganizationMember.objects.create(
            organization=org,
            user=registered_user,
            role="learner",
            status="active",
        )

        resp = auth_client.get(reverse("workspace-resolver"))
        assert resp.status_code == 200
        assert resp.data["activeContext"] == "org"
        assert resp.data["activeOrgSlug"] == "acme"
        assert resp.data["defaultRoute"] == "/org/acme/home"


@pytest.mark.django_db
class TestOnboardingStateView:
    def test_get_default_onboarding_state(self, auth_client):
        resp = auth_client.get(reverse("onboarding-state"))
        assert resp.status_code == 200
        assert resp.data["completed"] is False
        assert resp.data["profile_setup"] is False

    def test_patch_onboarding_state(self, auth_client):
        resp = auth_client.patch(
            reverse("onboarding-state"),
            {
                "profile_setup": True,
                "organization_selection": True,
                "diagnostic_assessment": True,
                "first_recommendation": True,
            },
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["completed"] is True
        assert resp.data["completed_at"] is not None


@pytest.mark.django_db
class TestMasterUsersView:
    def test_master_users_requires_superuser(self, auth_client):
        resp = auth_client.get(reverse("master-users"))
        assert resp.status_code == 403

    def test_master_users_success(self, api_client):
        User.objects.create_superuser(
            username="master@example.com",
            email="master@example.com",
            password="MasterPass1!",
        )
        login_resp = api_client.post(
            reverse("login"),
            {"email": "master@example.com", "password": "MasterPass1!"},
            format="json",
        )
        token = login_resp.data.get("access")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = api_client.get(reverse("master-users"))
        assert resp.status_code == 200
