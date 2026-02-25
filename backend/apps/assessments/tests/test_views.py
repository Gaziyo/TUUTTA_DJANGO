"""API tests for the assessments endpoints (CRUD + nested questions)."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization, OrganizationMember
from apps.assessments.models import Assessment, Question

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
    OrganizationMember.objects.create(organization=org, user=admin_user, role="org_admin")
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


@pytest.fixture
def assessment(db, organization, admin_user):
    return Assessment.objects.create(
        organization=organization,
        title="Sample Quiz",
        assessment_type="quiz",
        created_by=admin_user,
    )


@pytest.mark.django_db
class TestAssessmentViewSet:
    def test_list_unauthenticated(self, api_client):
        resp = api_client.get(reverse("assessment-list"))
        assert resp.status_code == 401

    def test_list_assessments(self, auth_client, assessment):
        resp = auth_client.get(reverse("assessment-list"))
        assert resp.status_code == 200
        ids = [a["id"] for a in (resp.data.get("results") or resp.data)]
        assert str(assessment.id) in ids

    def test_create_assessment(self, auth_client, organization):
        resp = auth_client.post(
            reverse("assessment-list"),
            {
                "title": "New Quiz",
                "assessment_type": "quiz",
                "organization": str(organization.id),
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["title"] == "New Quiz"
        assert resp.data["assessment_type"] == "quiz"

    def test_create_assessment_missing_title(self, auth_client, organization):
        resp = auth_client.post(
            reverse("assessment-list"),
            {"assessment_type": "quiz", "organization": str(organization.id)},
            format="json",
        )
        assert resp.status_code == 400

    def test_retrieve_assessment(self, auth_client, assessment):
        resp = auth_client.get(reverse("assessment-detail", kwargs={"pk": str(assessment.id)}))
        assert resp.status_code == 200
        assert resp.data["id"] == str(assessment.id)

    def test_update_assessment(self, auth_client, assessment):
        resp = auth_client.patch(
            reverse("assessment-detail", kwargs={"pk": str(assessment.id)}),
            {"title": "Updated Quiz", "is_published": True},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["title"] == "Updated Quiz"
        assert resp.data["is_published"] is True

    def test_delete_assessment(self, auth_client, assessment):
        resp = auth_client.delete(reverse("assessment-detail", kwargs={"pk": str(assessment.id)}))
        assert resp.status_code == 204
        assert not Assessment.objects.filter(id=assessment.id).exists()

    def test_created_by_set_automatically(self, auth_client, admin_user, organization):
        resp = auth_client.post(
            reverse("assessment-list"),
            {
                "title": "Auto-author Quiz",
                "assessment_type": "exam",
                "organization": str(organization.id),
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["created_by"] == admin_user.id


@pytest.mark.django_db
class TestQuestionViewSet:
    def test_list_questions(self, auth_client, assessment):
        Question.objects.create(
            assessment=assessment,
            question_text="What is 2+2?",
            question_type="mcq",
        )
        resp = auth_client.get(
            reverse("assessment-questions-list", kwargs={"assessment_pk": str(assessment.id)})
        )
        assert resp.status_code == 200
        data = resp.data.get("results") or resp.data
        assert len(data) == 1
        assert data[0]["question_text"] == "What is 2+2?"

    def test_create_question(self, auth_client, assessment):
        resp = auth_client.post(
            reverse("assessment-questions-list", kwargs={"assessment_pk": str(assessment.id)}),
            {
                "question_text": "What is the capital of France?",
                "question_type": "mcq",
                "points": "1.00",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["question_text"] == "What is the capital of France?"

    def test_delete_question(self, auth_client, assessment):
        question = Question.objects.create(
            assessment=assessment,
            question_text="Delete me",
            question_type="true_false",
        )
        resp = auth_client.delete(
            reverse(
                "assessment-questions-detail",
                kwargs={"assessment_pk": str(assessment.id), "pk": str(question.id)},
            )
        )
        assert resp.status_code == 204
        assert not Question.objects.filter(id=question.id).exists()

    def test_list_questions_unauthenticated(self, api_client, assessment):
        resp = api_client.get(
            reverse("assessment-questions-list", kwargs={"assessment_pk": str(assessment.id)})
        )
        assert resp.status_code == 401
