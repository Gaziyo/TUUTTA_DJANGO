"""API tests for the genie endpoints (GenieSource, GeniePipeline, ELSProject)."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization, OrganizationMember
from apps.genie.models import GenieSource, GeniePipeline, ELSProject

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="genie@example.com",
        email="genie@example.com",
        password="GeniePass1!",
    )


@pytest.fixture
def organization(db, admin_user):
    org = Organization.objects.create(
        name="Genie Org",
        slug="genie-org",
        plan="professional",
        created_by=admin_user,
    )
    OrganizationMember.objects.create(organization=org, user=admin_user, role="org_admin")
    return org


@pytest.fixture
def auth_client(api_client, admin_user):
    resp = api_client.post(
        reverse("login"),
        {"email": "genie@example.com", "password": "GeniePass1!"},
        format="json",
    )
    token = resp.data.get("access")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.fixture
def source(db, organization, admin_user):
    return GenieSource.objects.create(
        organization=organization,
        created_by=admin_user,
        name="Policy Doc",
        source_type="document",
    )


@pytest.fixture
def pipeline(db, organization, admin_user):
    return GeniePipeline.objects.create(
        organization=organization,
        created_by=admin_user,
        name="Onboarding Pipeline",
    )


# ---------------------------------------------------------------------------
# GenieSource
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestGenieSourceViewSet:
    def test_list_unauthenticated(self, api_client):
        resp = api_client.get(reverse("genie-source-list"))
        assert resp.status_code == 401

    def test_list_sources(self, auth_client, source):
        resp = auth_client.get(reverse("genie-source-list"))
        assert resp.status_code == 200
        ids = [s["id"] for s in (resp.data.get("results") or resp.data)]
        assert str(source.id) in ids

    def test_create_source(self, auth_client, organization):
        resp = auth_client.post(
            reverse("genie-source-list"),
            {
                "organization": str(organization.id),
                "name": "Employee Handbook",
                "source_type": "document",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Employee Handbook"
        assert resp.data["status"] == "pending"

    def test_create_source_missing_name(self, auth_client, organization):
        resp = auth_client.post(
            reverse("genie-source-list"),
            {"organization": str(organization.id), "source_type": "document"},
            format="json",
        )
        assert resp.status_code == 400

    def test_retrieve_source(self, auth_client, source):
        resp = auth_client.get(reverse("genie-source-detail", kwargs={"pk": str(source.id)}))
        assert resp.status_code == 200
        assert resp.data["id"] == str(source.id)

    def test_update_source(self, auth_client, source):
        resp = auth_client.patch(
            reverse("genie-source-detail", kwargs={"pk": str(source.id)}),
            {"name": "Updated Doc"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["name"] == "Updated Doc"

    def test_delete_source(self, auth_client, source):
        resp = auth_client.delete(reverse("genie-source-detail", kwargs={"pk": str(source.id)}))
        assert resp.status_code == 204
        assert not GenieSource.objects.filter(id=source.id).exists()


# ---------------------------------------------------------------------------
# GeniePipeline
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestGeniePipelineViewSet:
    def test_list_unauthenticated(self, api_client):
        resp = api_client.get(reverse("genie-pipeline-list"))
        assert resp.status_code == 401

    def test_list_pipelines(self, auth_client, pipeline):
        resp = auth_client.get(reverse("genie-pipeline-list"))
        assert resp.status_code == 200
        ids = [p["id"] for p in (resp.data.get("results") or resp.data)]
        assert str(pipeline.id) in ids

    def test_create_pipeline(self, auth_client, organization):
        resp = auth_client.post(
            reverse("genie-pipeline-list"),
            {
                "organization": str(organization.id),
                "name": "Sales Training Pipeline",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Sales Training Pipeline"
        assert resp.data["status"] == "draft"

    def test_pipeline_with_sources(self, auth_client, organization, source):
        resp = auth_client.post(
            reverse("genie-pipeline-list"),
            {
                "organization": str(organization.id),
                "name": "Linked Pipeline",
                "sources": [str(source.id)],
            },
            format="json",
        )
        assert resp.status_code == 201

    def test_retrieve_pipeline(self, auth_client, pipeline):
        resp = auth_client.get(reverse("genie-pipeline-detail", kwargs={"pk": str(pipeline.id)}))
        assert resp.status_code == 200
        assert resp.data["id"] == str(pipeline.id)

    def test_delete_pipeline(self, auth_client, pipeline):
        resp = auth_client.delete(reverse("genie-pipeline-detail", kwargs={"pk": str(pipeline.id)}))
        assert resp.status_code == 204
        assert not GeniePipeline.objects.filter(id=pipeline.id).exists()


# ---------------------------------------------------------------------------
# ELSProject
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestELSProjectViewSet:
    def test_list_unauthenticated(self, api_client):
        resp = api_client.get(reverse("els-project-list"))
        assert resp.status_code == 401

    def test_create_els_project(self, auth_client, organization):
        resp = auth_client.post(
            reverse("els-project-list"),
            {
                "organization": str(organization.id),
                "name": "New Hire Onboarding",
                "description": "9-phase onboarding program",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "New Hire Onboarding"
        assert resp.data["status"] == "draft"
        assert resp.data["current_phase"] == "ingest"

    def test_create_initialises_all_9_phases(self, auth_client, organization):
        from apps.genie.models import ELSProjectPhase
        resp = auth_client.post(
            reverse("els-project-list"),
            {"organization": str(organization.id), "name": "Phase Init Test"},
            format="json",
        )
        assert resp.status_code == 201
        project_id = resp.data["id"]
        phase_count = ELSProjectPhase.objects.filter(project_id=project_id).count()
        assert phase_count == 9

    def test_list_els_projects(self, auth_client, organization):
        resp_create = auth_client.post(
            reverse("els-project-list"),
            {"organization": str(organization.id), "name": "Listed Project"},
            format="json",
        )
        project_id = resp_create.data["id"]
        resp = auth_client.get(reverse("els-project-list"))
        assert resp.status_code == 200
        ids = [p["id"] for p in (resp.data.get("results") or resp.data)]
        assert project_id in ids

    def test_retrieve_els_project(self, auth_client, organization):
        resp_create = auth_client.post(
            reverse("els-project-list"),
            {"organization": str(organization.id), "name": "Retrieve Me"},
            format="json",
        )
        project_id = resp_create.data["id"]
        resp = auth_client.get(reverse("els-project-detail", kwargs={"pk": project_id}))
        assert resp.status_code == 200
        assert resp.data["id"] == project_id

    def test_start_phase(self, auth_client, organization):
        resp_create = auth_client.post(
            reverse("els-project-list"),
            {"organization": str(organization.id), "name": "Phase Test"},
            format="json",
        )
        project_id = resp_create.data["id"]
        resp = auth_client.post(
            f"/api/v1/genie/els-projects/{project_id}/phases/ingest/start/"
        )
        assert resp.status_code == 200
        assert resp.data["status"] == "in_progress"
        assert resp.data["phase"] == "ingest"

    def test_complete_phase_advances_current(self, auth_client, organization):
        resp_create = auth_client.post(
            reverse("els-project-list"),
            {"organization": str(organization.id), "name": "Advance Phase"},
            format="json",
        )
        project_id = resp_create.data["id"]
        # Start then complete 'ingest'
        auth_client.post(f"/api/v1/genie/els-projects/{project_id}/phases/ingest/start/")
        resp = auth_client.post(
            f"/api/v1/genie/els-projects/{project_id}/phases/ingest/complete/",
            {"output_data": {"summary": "done"}},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["status"] == "completed"
        # Project current_phase should advance to 'analyze'
        project = ELSProject.objects.get(id=project_id)
        assert project.current_phase == "analyze"

    def test_delete_els_project(self, auth_client, organization):
        resp_create = auth_client.post(
            reverse("els-project-list"),
            {"organization": str(organization.id), "name": "Delete Me"},
            format="json",
        )
        project_id = resp_create.data["id"]
        resp = auth_client.delete(reverse("els-project-detail", kwargs={"pk": project_id}))
        assert resp.status_code == 204
        assert not ELSProject.objects.filter(id=project_id).exists()
