"""API tests for the genie endpoints (GenieSource, GeniePipeline, ELSProject)."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization, OrganizationMember
from apps.genie.models import GenieSource, GeniePipeline, ELSProject
from apps.knowledge.models import KnowledgeDocument
from apps.competencies.models import Competency, RoleCompetencyMapping

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


@pytest.mark.django_db
class TestELSAutonomousPipeline:
    def _create_gap_context(self, organization):
        learner = User.objects.create_user(
            username="learner@example.com",
            email="learner@example.com",
            password="LearnerPass1!",
        )
        OrganizationMember.objects.create(organization=organization, user=learner, role="learner")
        competency = Competency.objects.create(
            organization=organization,
            name="Security Compliance",
            bloom_level_target=3,
            threshold_score=0.8,
            required_modalities=["reading"],
        )
        RoleCompetencyMapping.objects.create(
            organization=organization,
            competency=competency,
            role_name="learner",
            required_level="intermediate",
            is_mandatory=True,
            priority="mandatory",
        )

    def test_run_autonomous_pipeline_completes_and_records_metrics(self, auth_client, organization, admin_user):
        self._create_gap_context(organization)
        long_content = (
            "Policy compliance training requires employees to identify, explain, apply, analyze, "
            "evaluate, and create secure workflows across business scenarios. "
        ) * 140
        doc = KnowledgeDocument.objects.create(
            organization=organization,
            created_by=admin_user,
            title="Compliance Playbook",
            description="Security training playbook for onboarding and recurring compliance.",
            source_type="text",
            content_text=long_content,
            status="pending",
        )
        project_resp = auth_client.post(
            reverse("els-project-list"),
            {
                "organization": str(organization.id),
                "name": "Autonomous Run Project",
                "knowledge_documents": [str(doc.id)],
            },
            format="json",
        )
        assert project_resp.status_code == 201
        project_id = project_resp.data["id"]

        run_resp = auth_client.post(
            f"/api/v1/genie/els-projects/{project_id}/pipeline/run-autonomous/",
            HTTP_IDEMPOTENCY_KEY="run-key-001",
        )
        assert run_resp.status_code == 200
        assert run_resp.data["status"] == "completed"

        project = ELSProject.objects.get(id=project_id)
        assert project.run_state == "completed"
        assert project.run_attempt == 1
        assert project.current_idempotency_key == "run-key-001"
        assert project.last_outcome_package.get("performance_results")

        status_resp = auth_client.get(f"/api/v1/genie/els-projects/{project_id}/pipeline/status/")
        assert status_resp.status_code == 200
        phases = {row["phase"]: row for row in status_resp.data["phases"]}
        for phase in ["ingest", "analyze", "design", "develop", "implement", "evaluate"]:
            assert phases[phase]["status"] == "completed"
            assert phases[phase]["gate_result"] == "pass"

        metric_resp = auth_client.get(f"/api/v1/genie/els-projects/{project_id}/pipeline/metrics/")
        assert metric_resp.status_code == 200
        assert len(metric_resp.data) >= 6

    def test_run_autonomous_pipeline_idempotency_returns_existing(self, auth_client, organization, admin_user):
        self._create_gap_context(organization)
        doc = KnowledgeDocument.objects.create(
            organization=organization,
            created_by=admin_user,
            title="Compliance Handbook",
            description="Detailed handbook for autonomous idempotency validation coverage.",
            source_type="text",
            content_text=("Comprehensive compliance policy guidance. " * 160),
            status="pending",
        )
        project = ELSProject.objects.create(
            organization=organization,
            created_by=admin_user,
            last_modified_by=admin_user,
            name="Idempotent Project",
        )
        project.knowledge_documents.add(doc)

        first = auth_client.post(
            f"/api/v1/genie/els-projects/{project.id}/pipeline/run-autonomous/",
            HTTP_IDEMPOTENCY_KEY="idem-key-1",
        )
        assert first.status_code == 200
        assert first.data["status"] == "completed"
        run_id = first.data["run_id"]

        second = auth_client.post(
            f"/api/v1/genie/els-projects/{project.id}/pipeline/run-autonomous/",
            HTTP_IDEMPOTENCY_KEY="idem-key-1",
        )
        assert second.status_code == 200
        assert second.data["status"] == "existing"
        assert second.data["run_id"] == run_id

        project.refresh_from_db()
        assert project.run_attempt == 1

    def test_run_autonomous_pipeline_routes_exception_and_can_resolve(self, auth_client, organization, admin_user):
        self._create_gap_context(organization)
        short_doc = KnowledgeDocument.objects.create(
            organization=organization,
            created_by=admin_user,
            title="Short Input",
            description="Short",
            source_type="text",
            content_text="Short policy text for testing.",
            status="pending",
        )
        project = ELSProject.objects.create(
            organization=organization,
            created_by=admin_user,
            last_modified_by=admin_user,
            name="Exception Project",
        )
        project.knowledge_documents.add(short_doc)

        run = auth_client.post(
            f"/api/v1/genie/els-projects/{project.id}/pipeline/run-autonomous/",
            HTTP_IDEMPOTENCY_KEY="run-key-exception",
        )
        assert run.status_code == 200
        assert run.data["status"] == "exception_required"
        assert run.data["phase"] == "develop"
        exception_id = run.data["exception_id"]

        exceptions_resp = auth_client.get(f"/api/v1/genie/els-projects/{project.id}/exceptions/")
        assert exceptions_resp.status_code == 200
        assert any(item["id"] == exception_id for item in exceptions_resp.data)

        resolve_resp = auth_client.post(
            f"/api/v1/genie/els-projects/{project.id}/exceptions/{exception_id}/resolve/",
            {"action": "override", "notes": "Accepted for pilot release"},
            format="json",
        )
        assert resolve_resp.status_code == 200
        assert resolve_resp.data["status"] == "overridden"

    def test_pipeline_controls_resume_cancel_retry_and_rollout(self, auth_client, organization, admin_user):
        self._create_gap_context(organization)
        doc = KnowledgeDocument.objects.create(
            organization=organization,
            created_by=admin_user,
            title="Controls Input",
            description="Controls input file for run control and rollout coverage testing.",
            source_type="text",
            content_text=("Autonomous controls and rollout validation content. " * 180),
            status="pending",
        )
        project = ELSProject.objects.create(
            organization=organization,
            created_by=admin_user,
            last_modified_by=admin_user,
            name="Controls Project",
        )
        project.knowledge_documents.add(doc)

        run = auth_client.post(
            f"/api/v1/genie/els-projects/{project.id}/pipeline/run-autonomous/",
            HTTP_IDEMPOTENCY_KEY="run-key-controls",
        )
        assert run.status_code == 200
        assert run.data["status"] == "completed"

        resume = auth_client.post(
            f"/api/v1/genie/els-projects/{project.id}/pipeline/resume/",
            HTTP_IDEMPOTENCY_KEY="resume-key-controls",
        )
        assert resume.status_code == 200
        assert resume.data["status"] == "completed"

        retry_invalid = auth_client.post(
            f"/api/v1/genie/els-projects/{project.id}/pipeline/retry-stage/",
            {"phase": "unknown"},
            format="json",
        )
        assert retry_invalid.status_code == 400

        retry_valid = auth_client.post(
            f"/api/v1/genie/els-projects/{project.id}/pipeline/retry-stage/",
            {"phase": "evaluate"},
            format="json",
        )
        assert retry_valid.status_code == 200
        assert retry_valid.data["status"] == "completed"

        project.refresh_from_db()
        project.run_state = "queued"
        project.current_phase = "design"
        project.save(update_fields=["run_state", "current_phase", "updated_at"])
        cancel = auth_client.post(
            f"/api/v1/genie/els-projects/{project.id}/pipeline/cancel/",
            {"reason": "Operator canceled"},
            format="json",
        )
        assert cancel.status_code == 200
        assert cancel.data["status"] == "canceled"

        rollout = auth_client.post(
            f"/api/v1/genie/els-projects/{project.id}/pipeline/rollout/",
            {
                "mode": "shadow",
                "kill_switch": True,
                "guardrails": {"max_fail_rate": 0.05},
            },
            format="json",
        )
        assert rollout.status_code == 200
        assert rollout.data["autonomous_mode"] is False
        assert rollout.data["rollout_controls"]["mode"] == "shadow"
