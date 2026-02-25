import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.organizations.models import Organization, OrganizationMember
from apps.competencies.models import Competency
from apps.learning_intelligence.models import (
    CognitiveProfile,
    GapMatrix,
)
from apps.learning_intelligence.tasks import (
    _compute_weighted_gap_components,
    compute_gap_matrix_task,
    compute_gnn_insights_task,
)
from apps.knowledge.models import KnowledgeNode, KnowledgeEdge
from apps.governance.models import ModelVersion


User = get_user_model()


@pytest.fixture
def org(db):
    owner = User.objects.create_user(
        username='owner@test.com',
        email='owner@test.com',
        password='pass12345',
    )
    return Organization.objects.create(
        name='Week1 Org',
        slug='week1-org',
        plan='professional',
        created_by=owner,
    )


def _make_member(org, idx, role='learner'):
    user = User.objects.create_user(
        username=f'user{idx}@test.com',
        email=f'user{idx}@test.com',
        password='pass12345',
    )
    member = OrganizationMember.objects.create(
        organization=org,
        user=user,
        role=role,
    )
    return user, member


def _make_competency(org, idx, bloom_target=3, threshold=0.75, required_modalities=None):
    return Competency.objects.create(
        organization=org,
        name=f'Competency {idx}',
        bloom_level_target=bloom_target,
        threshold_score=threshold,
        required_modalities=required_modalities or ['reading'],
    )


@pytest.mark.django_db
class TestWeightedGapFormula:
    @pytest.mark.parametrize(
        'bloom_level,bloom_score,modality_score,threshold,role,expected_max',
        [
            (1, 0.95, 0.90, 0.70, 'learner', 0.25),
            (2, 0.90, 0.80, 0.72, 'learner', 0.35),
            (3, 0.70, 0.60, 0.75, 'learner', 0.65),
            (4, 0.60, 0.55, 0.80, 'org_admin', 0.80),
            (5, 0.40, 0.50, 0.82, 'instructor', 0.95),
            (6, 0.30, 0.35, 0.85, 'team_lead', 1.00),
            (6, 0.10, 0.20, 0.90, 'ld_manager', 1.00),
            (4, 0.85, 0.90, 0.80, 'super_admin', 0.45),
            (3, 0.50, 0.40, 0.78, 'learner', 0.90),
            (2, 0.99, 0.99, 0.70, 'learner', 0.20),
        ],
    )
    def test_weighted_gap_components_deterministic(
        self,
        org,
        bloom_level,
        bloom_score,
        modality_score,
        threshold,
        role,
        expected_max,
    ):
        _, member = _make_member(org, idx=f'{role}-{bloom_level}-{int(bloom_score*100)}', role=role)
        competency = _make_competency(
            org,
            idx=f'{role}-{bloom_level}',
            bloom_target=bloom_level,
            threshold=threshold,
            required_modalities=['reading'],
        )
        profile = CognitiveProfile.objects.create(
            user=member.user,
            organization=org,
            bloom_mastery={str(bloom_level): bloom_score},
            modality_strengths={'reading': modality_score},
        )

        comp = _compute_weighted_gap_components(member, competency, profile, bloom_level)

        assert 0.0 <= comp['gap_score'] <= 1.0
        assert comp['gap_score'] <= expected_max + 1e-6
        assert comp['bloom_weight'] >= 1.0
        assert comp['threshold_score_target'] == pytest.approx(threshold, rel=1e-3)
        assert comp['gap_details']['source'] == 'weighted-gap-v1'

    def test_compute_gap_matrix_populates_new_fields(self, org):
        user, member = _make_member(org, idx='matrix', role='learner')
        competency = _make_competency(org, idx='matrix', bloom_target=4, threshold=0.8, required_modalities=['writing'])

        from apps.competencies.models import RoleCompetencyMapping

        RoleCompetencyMapping.objects.create(
            organization=org,
            competency=competency,
            role_name=member.role,
            required_level='advanced',
            is_mandatory=True,
        )

        CognitiveProfile.objects.create(
            user=user,
            organization=org,
            bloom_mastery={'4': 0.4},
            modality_strengths={'writing': 0.5},
        )

        processed = compute_gap_matrix_task(str(org.id))
        assert processed == 1

        gap = GapMatrix.objects.get(user=user, organization=org, competency=competency)
        assert gap.bloom_gap_component > 0
        assert gap.modality_gap_component > 0
        assert gap.threshold_gap_component >= 0
        assert gap.role_requirement_component >= 0
        assert gap.weighted_bloom_gap >= gap.bloom_gap_component
        assert gap.weighted_modality_gap >= 0
        assert gap.gap_details.get('source') == 'weighted-gap-v1'

    def test_gap_matrix_api_returns_weighted_fields(self, org):
        user = User.objects.create_user(
            username='api-gap@test.com',
            email='api-gap@test.com',
            password='pass12345',
        )
        member = OrganizationMember.objects.create(
            organization=org,
            user=user,
            role='learner',
        )
        competency = _make_competency(org, idx='api', bloom_target=3, threshold=0.8, required_modalities=['reading'])

        from apps.competencies.models import RoleCompetencyMapping

        RoleCompetencyMapping.objects.create(
            organization=org,
            competency=competency,
            role_name=member.role,
            required_level='intermediate',
            is_mandatory=True,
        )
        CognitiveProfile.objects.create(
            user=user,
            organization=org,
            bloom_mastery={'3': 0.5},
            modality_strengths={'reading': 0.6},
        )
        compute_gap_matrix_task(str(org.id))

        client = APIClient()
        login_resp = client.post('/api/v1/auth/login/', {'email': user.email, 'password': 'pass12345'}, format='json')
        assert login_resp.status_code == 200
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_resp.data['access']}")

        resp = client.get(f'/api/v1/organizations/{org.id}/gap-matrix/')
        assert resp.status_code == 200

        payload = resp.data['results'] if isinstance(resp.data, dict) and 'results' in resp.data else resp.data
        assert len(payload) == 1
        row = payload[0]
        for field in [
            'bloom_gap_component',
            'modality_gap_component',
            'threshold_gap_component',
            'role_requirement_component',
            'weighted_bloom_gap',
            'weighted_modality_gap',
            'bloom_weight',
            'modality_weight',
            'threshold_score_target',
            'learner_score',
            'gap_details',
        ]:
            assert field in row


@pytest.mark.django_db
class TestGNNModelVersioning:
    def test_gnn_insights_use_non_surrogate_version(self, org):
        n1 = KnowledgeNode.objects.create(
            organization=org,
            node_type='competency',
            label='Comp A',
            metadata={},
        )
        n2 = KnowledgeNode.objects.create(
            organization=org,
            node_type='bloom',
            label='Bloom L3',
            metadata={'bloom_level': 3},
        )
        KnowledgeEdge.objects.create(
            organization=org,
            source=n1,
            target=n2,
            weight=0.8,
            relation='classified_as',
        )

        created = compute_gnn_insights_task(str(org.id))
        assert created == 3

        version = ModelVersion.objects.get(organization=org, model_name='gnn-insight')
        assert version.version == 'gnn-centrality-v1'

        models_used = set()
        for insight in org.gnn_insights.all():
            metrics = insight.metrics or {}
            model_name = metrics.get('model')
            if model_name:
                models_used.add(model_name)
        assert models_used == {'gnn-centrality-v1'}
