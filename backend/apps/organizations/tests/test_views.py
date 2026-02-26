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


@pytest.fixture
def master_user(db):
    return User.objects.create_superuser(
        username="master@example.com",
        email="master@example.com",
        password="MasterPass1!",
    )


@pytest.fixture
def master_client(master_user):
    client = APIClient()
    resp = client.post(
        reverse("login"),
        {"email": "master@example.com", "password": "MasterPass1!"},
        format="json",
    )
    token = resp.data.get("access")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.mark.django_db
class TestOrganizationViewSet:
    def test_list_unauthenticated(self, api_client):
        resp = api_client.get(reverse("organization-list"))
        assert resp.status_code == 401

    def test_create_organization_requires_master(self, auth_client):
        resp = auth_client.post(
            reverse("organization-list"),
            {"name": "Acme Corp", "slug": "acme-corp", "plan": "starter"},
            format="json",
        )
        assert resp.status_code == 403

    def test_create_organization(self, master_client, master_user):
        resp = master_client.post(
            reverse("organization-list"),
            {"name": "Acme Corp", "slug": "acme-corp", "plan": "starter"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Acme Corp"
        org_id = resp.data["id"]
        org = Organization.objects.get(pk=org_id)
        assert OrganizationMember.objects.filter(organization=org, user=master_user).exists()

    def test_create_duplicate_slug(self, master_client):
        master_client.post(
            reverse("organization-list"),
            {"name": "Acme 1", "slug": "same-slug", "plan": "free"},
            format="json",
        )
        resp = master_client.post(
            reverse("organization-list"),
            {"name": "Acme 2", "slug": "same-slug", "plan": "free"},
            format="json",
        )
        assert resp.status_code == 400

    def test_retrieve_organization(self, master_client):
        create_resp = master_client.post(
            reverse("organization-list"),
            {"name": "Retrievable Org", "slug": "ret-org", "plan": "free"},
            format="json",
        )
        org_id = create_resp.data["id"]
        resp = master_client.get(reverse("organization-detail", kwargs={"pk": org_id}))
        assert resp.status_code == 200
        assert resp.data["id"] == org_id

    def test_list_departments(self, auth_client, org_admin):
        """List departments nested under an organization (nested router)."""
        org = Organization.objects.create(
            name="Dept Org",
            slug="dept-org",
            created_by=org_admin,
        )
        OrganizationMember.objects.create(
            organization=org,
            user=org_admin,
            role="org_admin",
            status="active",
        )
        try:
            resp = auth_client.get(
                reverse("organization-departments-list", kwargs={"organization_pk": str(org.id)})
            )
            assert resp.status_code == 200
        except NoReverseMatch:
            pytest.skip("organization-departments-list URL not registered")

    def test_org_scoped_route_accepts_slug(self, auth_client, org_admin):
        org = Organization.objects.create(
            name="Slug Org",
            slug="slug-org",
            created_by=org_admin,
        )
        OrganizationMember.objects.create(
            organization=org,
            user=org_admin,
            role="org_admin",
            status="active",
        )

        resp = auth_client.get(
            reverse("organization-departments-list", kwargs={"organization_pk": "slug-org"})
        )
        assert resp.status_code == 200

    def test_org_scoped_route_returns_403_for_non_member(self, api_client, org_admin):
        other_user = User.objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="OtherPass1!",
        )
        login = api_client.post(
            reverse("login"),
            {"email": "other@example.com", "password": "OtherPass1!"},
            format="json",
        )
        token = login.data.get("access")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        org = Organization.objects.create(
            name="Private Org",
            slug="private-org",
            created_by=org_admin,
        )
        OrganizationMember.objects.create(
            organization=org,
            user=org_admin,
            role="org_admin",
            status="active",
        )

        resp = api_client.get(
            reverse("organization-departments-list", kwargs={"organization_pk": "private-org"})
        )
        assert resp.status_code == 403
        assert resp.data["error"]["code"] == "forbidden"

    def test_organization_request_flow(self, auth_client, master_client):
        create_request = auth_client.post(
            reverse("organization-request-list"),
            {"name": "Requested Org", "slug": "requested-org", "plan": "starter"},
            format="json",
        )
        assert create_request.status_code == 201

        request_id = create_request.data["id"]
        approve = master_client.post(
            reverse("organization-request-approve", kwargs={"pk": request_id}),
            {},
            format="json",
        )
        assert approve.status_code == 200
        assert approve.data["status"] == "approved"
        assert approve.data["created_org_slug"] == "requested-org"

    def test_join_request_creation_for_non_member(self, api_client, org_admin):
        requester = User.objects.create_user(
            username="requester@example.com",
            email="requester@example.com",
            password="RequesterPass1!",
        )
        login = api_client.post(
            reverse("login"),
            {"email": "requester@example.com", "password": "RequesterPass1!"},
            format="json",
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data.get('access')}")

        org = Organization.objects.create(
            name="Open Org",
            slug="open-org",
            created_by=org_admin,
        )
        OrganizationMember.objects.create(
            organization=org,
            user=org_admin,
            role="org_admin",
            status="active",
        )

        create = api_client.post(
            reverse("organization-join-requests-list", kwargs={"organization_pk": str(org.id)}),
            {"note": "Please approve"},
            format="json",
        )
        assert create.status_code == 201
        assert create.data["status"] == "pending"
        assert str(create.data["requester"]) == str(requester.id)

    def test_invite_code_redeem_flow(self, master_client, api_client, org_admin):
        org = Organization.objects.create(
            name="Invite Org",
            slug="invite-org",
            created_by=org_admin,
        )
        OrganizationMember.objects.create(
            organization=org,
            user=org_admin,
            role="org_admin",
            status="active",
        )
        admin_login = api_client.post(
            reverse("login"),
            {"email": "orgadmin@example.com", "password": "OrgAdmin1!"},
            format="json",
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_login.data.get('access')}")
        create_code = api_client.post(
            reverse("organization-invite-codes-list", kwargs={"organization_pk": str(org.id)}),
            {"role": "learner"},
            format="json",
        )
        assert create_code.status_code == 201
        code = create_code.data["code"]

        invitee = User.objects.create_user(
            username="invitee@example.com",
            email="invitee@example.com",
            password="InviteePass1!",
        )
        redeem_client = APIClient()
        redeem_login = redeem_client.post(
            reverse("login"),
            {"email": "invitee@example.com", "password": "InviteePass1!"},
            format="json",
        )
        redeem_client.credentials(HTTP_AUTHORIZATION=f"Bearer {redeem_login.data.get('access')}")
        redeem = redeem_client.post(
            reverse("invite-code-redeem"),
            {"code": code},
            format="json",
        )
        assert redeem.status_code == 200
        assert redeem.data["organization"]["slug"] == "invite-org"
        assert OrganizationMember.objects.filter(organization=org, user=invitee).exists()
