import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.organizations.models import Organization, OrganizationMember
from apps.competencies.models import Competency, RoleCompetencyMapping
from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.learning_intelligence.models import AdaptivePolicy, AdaptiveDecisionLog, RemediationTrigger
from apps.learning_intelligence.models import GapMatrix
from apps.learning_intelligence.tasks import optimize_adaptive_policy_task, remediation_trigger_task
from apps.governance.models import ModelVersion


User = get_user_model()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username='week2-admin@test.com',
        email='week2-admin@test.com',
        password='AdminPass1!',
    )


@pytest.fixture
def organization(db, admin_user):
    org = Organization.objects.create(
        name='Week2 Org',
        slug='week2-org',
        plan='professional',
        created_by=admin_user,
    )
    OrganizationMember.objects.create(
        organization=org,
        user=admin_user,
        role='org_admin',
    )
    return org


@pytest.fixture
def auth_client(admin_user):
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/',
        {'email': admin_user.email, 'password': 'AdminPass1!'},
        format='json',
    )
    assert login.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return client


@pytest.mark.django_db
def test_learning_path_endpoints_live(auth_client, organization, admin_user):
    course = Course.objects.create(
        organization=organization,
        title='Security Fundamentals',
        slug='security-fundamentals',
        description='Core security course',
        status='published',
        created_by=admin_user,
    )

    create_resp = auth_client.post(
        f'/api/v1/organizations/{organization.id}/learning-paths/',
        {
            'organization': str(organization.id),
            'title': 'Onboarding Path',
            'description': 'Path for new joiners',
            'status': 'draft',
            'courses': [
                {
                    'course_id': str(course.id),
                    'order_index': 0,
                    'is_required': True,
                }
            ],
        },
        format='json',
    )
    assert create_resp.status_code == 201
    path_id = create_resp.data['id']
    assert str(create_resp.data['path_courses'][0]['course']) == str(course.id)

    list_resp = auth_client.get(f'/api/v1/organizations/{organization.id}/learning-paths/')
    assert list_resp.status_code == 200
    rows = list_resp.data['results'] if isinstance(list_resp.data, dict) and 'results' in list_resp.data else list_resp.data
    assert any(row['id'] == path_id for row in rows)


@pytest.mark.django_db
def test_optimizer_generates_artifact_report_and_guardrails(organization, admin_user):
    policy = AdaptivePolicy.objects.create(
        organization=organization,
        name='Adaptive Bandit Policy',
        status='active',
        current_version='bandit-v1',
        config={},
    )

    for idx in range(12):
        AdaptiveDecisionLog.objects.create(
            organization=organization,
            user=admin_user,
            policy=policy,
            action_type='recommend_course',
            payload={'course_id': 'x'},
            reward=0.7 if idx % 2 == 0 else 0.55,
        )

    updated = optimize_adaptive_policy_task(str(organization.id))
    assert updated == 1

    policy.refresh_from_db()
    report = (policy.config or {}).get('offline_evaluation_report', {})
    guardrails = (policy.config or {}).get('rollout_guardrails', {})
    assert report.get('metrics', {}).get('reward_mean', 0) > 0
    assert 'passes' in guardrails

    model_version = ModelVersion.objects.filter(
        organization=organization,
        model_name='adaptive-policy-bandit',
        version=policy.current_version,
    ).first()
    assert model_version is not None
    assert model_version.metrics.get('guardrails', {}).get('passes') is True


@pytest.mark.django_db
def test_remediation_assignments_endpoint_backed_by_model(auth_client, organization, admin_user):
    learner = User.objects.create_user(
        username='week2-learner@test.com',
        email='week2-learner@test.com',
        password='LearnerPass1!',
    )
    OrganizationMember.objects.create(organization=organization, user=learner, role='learner')

    competency = Competency.objects.create(
        organization=organization,
        name='Policy Application',
        threshold_score=0.8,
        bloom_level_target=3,
    )
    RoleCompetencyMapping.objects.create(
        organization=organization,
        competency=competency,
        role_name='learner',
        required_level='intermediate',
        is_mandatory=True,
    )

    remediation_course = Course.objects.create(
        organization=organization,
        title='Remediation Course',
        slug='remediation-course',
        description='Fix policy gaps',
        status='published',
        created_by=admin_user,
    )

    trigger = RemediationTrigger.objects.create(
        organization=organization,
        competency=competency,
        remediation_course=remediation_course,
        min_gap_score=0.0,
        max_attempts=1,
        is_active=True,
    )
    GapMatrix.objects.create(
        user=learner,
        organization=organization,
        competency=competency,
        current_bloom_level=1,
        target_bloom_level=3,
        gap_score=0.7,
        priority=2,
        status='open',
    )
    Enrollment.objects.filter(
        organization=organization,
        user=learner,
        course=remediation_course,
    ).delete()

    remediation_trigger_task(str(organization.id))

    resp = auth_client.get(f'/api/v1/organizations/{organization.id}/remediation-assignments/')
    assert resp.status_code == 200
    rows = resp.data['results'] if isinstance(resp.data, dict) and 'results' in resp.data else resp.data
    assert len(rows) >= 1
    assert any(str(row['trigger']) == str(trigger.id) for row in rows)
