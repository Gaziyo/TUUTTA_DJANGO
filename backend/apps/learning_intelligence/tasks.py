from __future__ import annotations

from datetime import timedelta
import random
from typing import Dict

from celery import shared_task
from django.db.models import Count, Avg
from django.utils import timezone

from apps.accounts.models import User
from apps.assessments.models import AssessmentAttempt
from apps.competencies.models import RoleCompetencyMapping, CompliancePolicy
from apps.courses.models import Course, CourseModule
from apps.enrollments.models import Enrollment
from apps.notifications.services import enqueue_notification
from apps.analytics.models import AuditLog
from apps.organizations.models import Organization, OrganizationMember

from .models import (
    CognitiveProfile,
    GapMatrix,
    AdaptivePolicy,
    AdaptiveRecommendation,
    AdaptiveDecisionLog,
    FailureRiskSnapshot,
    BaselineDiagnostic,
    GNNInsight,
    InterventionLog,
    GapClosureSnapshot,
)
from .services import recalculate_cognitive_profile


_LEVEL_MAP = {
    'novice': 2,
    'intermediate': 3,
    'advanced': 4,
    'expert': 5,
}

_RL_ACTIONS = ['recommend_course', 'nudge_course', 'assign_remediation', 'unlock_module', 'explore_paths']


def _derive_current_bloom_level(profile: CognitiveProfile) -> int:
    mastery = profile.bloom_mastery or {}
    numeric_mastery: Dict[int, float] = {}
    for key, value in mastery.items():
        try:
            numeric_key = int(key)
        except (TypeError, ValueError):
            numeric_key = None
        if numeric_key:
            numeric_mastery[numeric_key] = max(numeric_mastery.get(numeric_key, 0), float(value or 0))

    label_map = {
        1: ['remember'],
        2: ['understand'],
        3: ['apply'],
        4: ['analyze', 'analyse'],
        5: ['evaluate'],
        6: ['create'],
    }
    for level, labels in label_map.items():
        level_score = max([mastery.get(label, 0) for label in labels] + [0])
        numeric_mastery[level] = max(numeric_mastery.get(level, 0), float(level_score or 0))

    current = 0
    for level in range(1, 7):
        if numeric_mastery.get(level, 0) >= 0.6:
            current = level
    return current


def _priority_from_gap(gap_score: float) -> int:
    if gap_score >= 0.66:
        return 1
    if gap_score >= 0.5:
        return 2
    if gap_score >= 0.33:
        return 3
    if gap_score >= 0.15:
        return 4
    return 5


def _initialize_bandit_config(policy: AdaptivePolicy) -> dict:
    bandit = (policy.config or {}).get('bandit', {})
    q_values = bandit.get('q_values') or {action: 0.3 for action in _RL_ACTIONS}
    counts = bandit.get('counts') or {action: 0 for action in _RL_ACTIONS}
    epsilon = float(bandit.get('epsilon', 0.2))
    return {
        'q_values': q_values,
        'counts': counts,
        'epsilon': max(0.01, min(0.5, epsilon)),
    }


def _select_bandit_action(policy: AdaptivePolicy, candidate_actions: list[str], preferred_action: str) -> str:
    bandit = _initialize_bandit_config(policy)
    if random.random() < bandit['epsilon']:
        return preferred_action if preferred_action in candidate_actions else random.choice(candidate_actions)
    ranked = sorted(
        candidate_actions,
        key=lambda action: bandit['q_values'].get(action, 0.0),
        reverse=True,
    )
    return ranked[0]


def _log_ai_decision(org, user_id: str, action: str, target_type: str, target_id: str, metadata: dict | None = None):
    AuditLog.objects.create(
        organization=org,
        actor_id='system',
        actor_name='Cognitive Engine',
        actor_type='system',
        action=action,
        entity_type='ai_decision',
        entity_id=target_id,
        target_type=target_type,
        target_id=target_id,
        metadata=metadata or {},
    )
    try:
        from apps.governance.models import ExplainabilityLog

        ExplainabilityLog.objects.create(
            organization=org,
            user_id=user_id if user_id != 'system' else None,
            model_name='cognitive-engine',
            decision_type=action,
            input_ref=f'{target_type}:{target_id}',
            output_ref=target_id,
            rationale=metadata or {},
        )
    except Exception:
        # Governance logging should not block execution paths.
        pass


@shared_task
def compute_gap_matrix_task(org_id: str) -> int:
    org = Organization.objects.filter(id=org_id).first()
    if not org:
        return 0

    mappings = RoleCompetencyMapping.objects.filter(organization=org).select_related('competency')
    mappings_by_role = {}
    for mapping in mappings:
        mappings_by_role.setdefault(mapping.role_name, []).append(mapping)

    members = OrganizationMember.objects.filter(organization=org).select_related('user')
    processed = 0

    for member in members:
        role_mappings = mappings_by_role.get(member.role, [])
        if not role_mappings:
            continue
        profile, _ = CognitiveProfile.objects.get_or_create(user=member.user, organization=org)
        current_level = _derive_current_bloom_level(profile)

        for mapping in role_mappings:
            competency = mapping.competency
            target_level = competency.bloom_level_target or _LEVEL_MAP.get(mapping.required_level, 0)
            gap_score = 0.0
            if target_level > 0:
                gap_score = max(0.0, (target_level - current_level) / float(target_level))
            status = 'closed' if gap_score <= 0.05 else ('in_progress' if current_level > 0 else 'open')
            recommended_course = Course.objects.filter(
                competency_tag=competency,
                status='published',
            ).first()

            GapMatrix.objects.update_or_create(
                user=member.user,
                organization=org,
                competency=competency,
                defaults={
                    'current_bloom_level': current_level,
                    'target_bloom_level': target_level,
                    'gap_score': gap_score,
                    'priority': _priority_from_gap(gap_score),
                    'recommended_course': recommended_course,
                    'status': status,
                },
            )
            processed += 1

    return processed


def _due_date_for_course(org: Organization, course: Course):
    policy = CompliancePolicy.objects.filter(
        organization=org,
        linked_course=course,
        is_active=True,
    ).order_by('due_days').first()
    if policy:
        return timezone.now() + timedelta(days=policy.due_days)
    return timezone.now() + timedelta(days=30)


@shared_task
def auto_enroll_gap_courses_task(org_id: str) -> int:
    org = Organization.objects.filter(id=org_id).first()
    if not org:
        return 0

    entries = GapMatrix.objects.filter(
        organization=org,
        status__in=['open', 'in_progress'],
        recommended_course__isnull=False,
    ).select_related('recommended_course', 'user')

    created = 0
    for entry in entries:
        enrollment, was_created = Enrollment.objects.get_or_create(
            user=entry.user,
            course=entry.recommended_course,
            organization=org,
            defaults={'due_date': _due_date_for_course(org, entry.recommended_course)},
        )
        if was_created:
            created += 1
            entry.status = 'in_progress'
            entry.save(update_fields=['status', 'updated_at'])
            enqueue_notification(
                user_id=str(entry.user_id),
                org_id=str(org.id),
                notification_type='auto_enrollment',
                title='New training assigned',
                message=f'You have been enrolled in \"{entry.recommended_course.title}\" based on your competency gaps.',
                channels=['in_app', 'email'],
                data={'courseId': str(entry.recommended_course_id), 'gapId': str(entry.id)},
            )
            InterventionLog.objects.create(
                organization=org,
                user=entry.user,
                action_type='auto_enroll',
                status='executed',
                outcome={'course_id': str(entry.recommended_course_id), 'gap_id': str(entry.id)},
            )
            _log_ai_decision(org, str(entry.user_id), 'auto_enroll', 'course', str(entry.recommended_course_id), {
                'gap_id': str(entry.id),
                'reason': 'gap_based_enrollment',
            })
    return created


@shared_task
def remediation_trigger_task(org_id: str) -> int:
    org = Organization.objects.filter(id=org_id).first()
    if not org:
        return 0

    from .models import RemediationTrigger

    triggers = RemediationTrigger.objects.filter(organization=org, is_active=True)
    created = 0

    for trigger in triggers:
        user_ids = set()
        if trigger.assessment_id:
            failed = (AssessmentAttempt.objects.filter(
                assessment_id=trigger.assessment_id,
                passed=False,
                user__memberships__organization=org,
            ).values('user_id')
             .annotate(total=Count('id'))
             .filter(total__gte=trigger.max_attempts))
            user_ids.update(str(row['user_id']) for row in failed)

        if trigger.competency_id:
            gaps = GapMatrix.objects.filter(
                organization=org,
                competency_id=trigger.competency_id,
                gap_score__gte=trigger.min_gap_score,
            ).values_list('user_id', flat=True)
            user_ids.update(str(uid) for uid in gaps)

        for user_id in user_ids:
            user = User.objects.filter(id=user_id).first()
            if not user:
                continue
            enrollment, was_created = Enrollment.objects.get_or_create(
                user=user,
                course=trigger.remediation_course,
                organization=org,
                defaults={'due_date': _due_date_for_course(org, trigger.remediation_course)},
            )
            if was_created:
                created += 1
                enqueue_notification(
                    user_id=str(user.id),
                    org_id=str(org.id),
                    notification_type='remediation_assigned',
                    title='Remediation assigned',
                    message=f'Remediation course \"{trigger.remediation_course.title}\" has been assigned.',
                    channels=['in_app', 'email'],
                    data={'courseId': str(trigger.remediation_course_id)},
                )
                InterventionLog.objects.create(
                    organization=org,
                    user=user,
                    action_type='remediation_assigned',
                    status='executed',
                    outcome={'course_id': str(trigger.remediation_course_id), 'trigger_id': str(trigger.id)},
                )
                _log_ai_decision(org, str(user.id), 'remediation_assigned', 'course', str(trigger.remediation_course_id), {
                    'trigger_id': str(trigger.id),
                    'reason': 'remediation_trigger',
                })
    return created


@shared_task
def recalibrate_gap_matrix_task(org_id: str) -> int:
    return compute_gap_matrix_task(org_id)


@shared_task
def recalculate_cognitive_profile_task(user_id: str, org_id: str) -> str:
    recalculate_cognitive_profile(user_id, org_id)
    compute_gap_matrix_task(org_id)
    return 'updated'


@shared_task
def record_gap_closure_snapshot_task(org_id: str) -> str:
    org = Organization.objects.filter(id=org_id).first()
    if not org:
        return 'missing'
    gaps = GapMatrix.objects.filter(organization=org)
    total_open = gaps.filter(status__in=['open', 'in_progress']).count()
    total_closed = gaps.filter(status='closed').count()
    avg_gap = gaps.aggregate(Avg('gap_score'))['gap_score__avg'] if gaps.exists() else 0.0
    GapClosureSnapshot.objects.create(
        organization=org,
        average_gap_score=round(avg_gap or 0.0, 3),
        total_open=total_open,
        total_closed=total_closed,
        metadata={'note': 'Heuristic gap snapshot'},
    )
    return 'recorded'


def _risk_level(score: float) -> str:
    if score >= 0.6:
        return 'high'
    if score >= 0.3:
        return 'medium'
    return 'low'


@shared_task
def compute_failure_risk_task(org_id: str | None = None) -> int:
    orgs = Organization.objects.filter(id=org_id) if org_id else Organization.objects.all()
    created = 0
    now = timezone.now()

    for org in orgs:
        FailureRiskSnapshot.objects.filter(organization=org).delete()
        enrollments = Enrollment.objects.filter(
            organization=org,
            status__in=['enrolled', 'in_progress'],
        ).select_related('user', 'course')

        for enrollment in enrollments:
            reasons = []
            risk = 0.0
            progress = float(enrollment.progress_percentage or 0) / 100.0

            if enrollment.due_date:
                delta_days = (enrollment.due_date - now).days
                if delta_days < 0:
                    risk += 0.4
                    reasons.append('Overdue enrollment')
                elif delta_days <= 3:
                    risk += 0.25
                    reasons.append('Due within 3 days')
                elif delta_days <= 7:
                    risk += 0.15
                    reasons.append('Due within 7 days')

            if progress < 0.2:
                risk += 0.2
                reasons.append('Low progress')
            elif progress < 0.5:
                risk += 0.1
                reasons.append('Behind expected progress')

            failed_attempts = AssessmentAttempt.objects.filter(
                user=enrollment.user,
                assessment__course=enrollment.course,
                passed=False,
            ).count()
            if failed_attempts >= 2:
                risk += 0.2
                reasons.append('Multiple failed assessments')

            if enrollment.started_at and (now - enrollment.started_at).days >= 14 and progress < 0.3:
                risk += 0.15
                reasons.append('Stalled after start')

            risk = min(1.0, risk)
            FailureRiskSnapshot.objects.create(
                organization=org,
                user=enrollment.user,
                course=enrollment.course,
                risk_score=round(risk, 2),
                risk_level=_risk_level(risk),
                reasons=reasons,
            )
            if risk >= 0.6:
                _log_ai_decision(org, str(enrollment.user_id), 'failure_risk', 'course', str(enrollment.course_id), {
                    'risk_score': round(risk, 2),
                    'reasons': reasons,
                })
            created += 1

    return created


@shared_task
def generate_adaptive_recommendations_task(org_id: str | None = None) -> int:
    orgs = Organization.objects.filter(id=org_id) if org_id else Organization.objects.all()
    created = 0

    for org in orgs:
        policy, _ = AdaptivePolicy.objects.get_or_create(
            organization=org,
            name='Adaptive Bandit Policy',
            defaults={'status': 'active', 'current_version': 'bandit-v1'},
        )

        members = OrganizationMember.objects.filter(organization=org).select_related('user')
        for member in members:
            gap = GapMatrix.objects.filter(
                organization=org,
                user=member.user,
                status__in=['open', 'in_progress'],
                recommended_course__isnull=False,
            ).order_by('priority', '-gap_score').first()

            if gap:
                preferred_action = 'recommend_course'
                payload = {'course_id': str(gap.recommended_course_id), 'gap_id': str(gap.id)}
                reason = f'High gap in {gap.competency.name}'
                score = gap.gap_score
                candidate_actions = ['recommend_course', 'assign_remediation', 'unlock_module']
            else:
                enrollment = Enrollment.objects.filter(
                    organization=org,
                    user=member.user,
                    status__in=['enrolled', 'in_progress'],
                ).order_by('due_date').first()
                if enrollment and float(enrollment.progress_percentage or 0) < 50:
                    preferred_action = 'nudge_course'
                    payload = {'course_id': str(enrollment.course_id), 'enrollment_id': str(enrollment.id)}
                    reason = 'Course progress below 50%'
                    score = 0.4
                    candidate_actions = ['nudge_course', 'unlock_module', 'explore_paths']
                else:
                    preferred_action = 'explore_paths'
                    payload = {}
                    reason = 'No active gaps or enrollments'
                    score = 0.2
                    candidate_actions = ['explore_paths']

            action_type = _select_bandit_action(policy, candidate_actions, preferred_action)
            if action_type == 'unlock_module':
                enrollment_for_unlock = Enrollment.objects.filter(
                    organization=org,
                    user=member.user,
                    status__in=['enrolled', 'in_progress'],
                ).order_by('due_date').first()
                if enrollment_for_unlock:
                    next_module = CourseModule.objects.filter(course=enrollment_for_unlock.course).order_by('order_index').first()
                    payload = {
                        'course_id': str(enrollment_for_unlock.course_id),
                        'module_id': str(next_module.id) if next_module else '',
                        'scope': 'course',
                    }
                else:
                    payload = {'scope': 'global'}
                reason = 'Adaptive policy selected unlock action'
                score = max(score, 0.6)

            AdaptiveRecommendation.objects.update_or_create(
                organization=org,
                user=member.user,
                action_type=action_type,
                defaults={
                    'policy': policy,
                    'score': score,
                    'reason': reason,
                    'payload': payload,
                },
            )
            AdaptiveDecisionLog.objects.create(
                organization=org,
                user=member.user,
                policy=policy,
                action_type=action_type,
                payload=payload,
            )
            InterventionLog.objects.create(
                organization=org,
                user=member.user,
                action_type=action_type,
                status='executed',
                outcome={'payload': payload},
            )
            _log_ai_decision(org, str(member.user_id), 'adaptive_recommendation', 'user', str(member.user_id), {
                'action_type': action_type,
                'payload': payload,
                'reason': reason,
            })
            created += 1

    return created


@shared_task
def optimize_adaptive_policy_task(org_id: str | None = None) -> int:
    orgs = Organization.objects.filter(id=org_id) if org_id else Organization.objects.all()
    updated = 0
    for org in orgs:
        policy = AdaptivePolicy.objects.filter(organization=org).first()
        if not policy:
            continue
        total = AdaptiveDecisionLog.objects.filter(organization=org).count()
        by_action = list(AdaptiveDecisionLog.objects.filter(organization=org).values('action_type').annotate(total=Count('id')))
        bandit = _initialize_bandit_config(policy)
        q_values = dict(bandit['q_values'])
        counts = dict(bandit['counts'])

        for action_data in by_action:
            action = action_data['action_type']
            action_count = action_data['total']
            rewards = list(
                AdaptiveDecisionLog.objects.filter(organization=org, action_type=action)
                .exclude(reward__isnull=True)
                .values_list('reward', flat=True)
            )
            avg_reward = sum(rewards) / len(rewards) if rewards else q_values.get(action, 0.3)
            previous_count = counts.get(action, 0)
            total_count = previous_count + action_count
            if total_count <= 0:
                continue
            # Incremental update (contextual bandit-style running mean)
            q_values[action] = round(((q_values.get(action, 0.3) * previous_count) + (avg_reward * action_count)) / total_count, 3)
            counts[action] = total_count

        policy.config = {
            **(policy.config or {}),
            'decision_count': total,
            'action_distribution': by_action,
            'bandit': {
                'epsilon': max(0.05, bandit['epsilon'] * 0.98),
                'q_values': q_values,
                'counts': counts,
                'optimized_at': timezone.now().isoformat(),
            },
            'optimized_at': timezone.now().isoformat(),
            'note': 'Bandit optimization pass',
        }
        policy.status = 'active'
        policy.save(update_fields=['config', 'status', 'updated_at'])
        updated += 1
    return updated


@shared_task
def run_baseline_diagnostic_task(diagnostic_id: str) -> str:
    diagnostic = BaselineDiagnostic.objects.filter(id=diagnostic_id).select_related('organization').first()
    if not diagnostic:
        return 'missing'

    diagnostic.status = 'running'
    diagnostic.save(update_fields=['status', 'updated_at'])

    # Placeholder: create a diagnostic assessment if missing
    from apps.assessments.models import Assessment

    assessment = diagnostic.assessment
    if not assessment:
        assessment = Assessment.objects.create(
            organization=diagnostic.organization,
            title=f'Baseline Diagnostic: {diagnostic.name}',
            description='Auto-generated baseline diagnostic assessment',
            assessment_type='quiz',
            assessment_subtype='diagnostic',
            is_published=False,
            created_by=diagnostic.created_by,
        )
        diagnostic.assessment = assessment

    diagnostic.status = 'completed'
    diagnostic.completed_at = timezone.now()
    diagnostic.results = {
        'assessment_id': str(assessment.id),
        'status': 'created',
    }
    diagnostic.save(update_fields=['assessment', 'status', 'completed_at', 'results', 'updated_at'])
    return 'completed'


@shared_task
def compute_gnn_insights_task(org_id: str) -> int:
    from apps.knowledge.models import KnowledgeNode, KnowledgeEdge
    from apps.governance.models import ModelVersion

    GNNInsight.objects.filter(organization_id=org_id).delete()

    nodes_qs = KnowledgeNode.objects.filter(organization_id=org_id)
    edges_qs = KnowledgeEdge.objects.filter(organization_id=org_id)
    node_count = nodes_qs.count()
    edge_count = edges_qs.count()
    metrics = {'node_count': node_count, 'edge_count': edge_count}
    influences = []

    try:
        import networkx as nx

        graph = nx.DiGraph()
        for node in nodes_qs:
            graph.add_node(str(node.id), node_type=node.node_type, label=node.label)
        for edge in edges_qs:
            graph.add_edge(str(edge.source_id), str(edge.target_id), weight=edge.weight)

        pagerank = nx.pagerank(graph, weight='weight') if graph.number_of_nodes() else {}
        top_nodes = sorted(pagerank.items(), key=lambda item: item[1], reverse=True)[:5]
        influences = [{'node_id': node_id, 'influence': round(score, 4)} for node_id, score in top_nodes]
        components = list(nx.weakly_connected_components(graph)) if graph.number_of_nodes() else []
        metrics.update({
            'components': len(components),
            'top_influencers': influences,
        })
    except Exception:
        metrics.update({'note': 'networkx unavailable, fallback metrics only'})

    insights = [
        {
            'name': 'MasteryProbability',
            'insight_type': 'mastery_probability',
            'metrics': {**metrics, 'model': 'gnn-surrogate-v1'},
        },
        {
            'name': 'HiddenPrerequisiteWeakness',
            'insight_type': 'prerequisite_weakness',
            'metrics': {'weakness_clusters': influences[:3], 'model': 'gnn-surrogate-v1'},
        },
        {
            'name': 'CrossCompetencyInfluence',
            'insight_type': 'cross_competency',
            'metrics': {'influences': influences, 'model': 'gnn-surrogate-v1'},
        },
    ]

    for insight in insights:
        GNNInsight.objects.create(
            organization_id=org_id,
            name=insight['name'],
            insight_type=insight['insight_type'],
            metrics=insight['metrics'],
        )

    ModelVersion.objects.update_or_create(
        organization_id=org_id,
        model_name='gnn-insight',
        version='surrogate-v1',
        defaults={'status': 'active', 'metrics': metrics},
    )
    return len(insights)


@shared_task
def run_multi_agent_policy_simulation_task(org_id: str, episodes: int = 30) -> dict:
    org = Organization.objects.filter(id=org_id).first()
    if not org:
        return {'status': 'missing'}

    policy, _ = AdaptivePolicy.objects.get_or_create(
        organization=org,
        name='Adaptive Bandit Policy',
        defaults={'status': 'active', 'current_version': 'bandit-v1'},
    )
    bandit = _initialize_bandit_config(policy)
    rewards = []
    for _ in range(max(5, episodes)):
        for action in _RL_ACTIONS:
            base = bandit['q_values'].get(action, 0.3)
            simulated_reward = max(0.0, min(1.0, base + random.uniform(-0.08, 0.08)))
            rewards.append({'action': action, 'reward': round(simulated_reward, 3)})

    avg_reward = round(sum(item['reward'] for item in rewards) / len(rewards), 3) if rewards else 0.0
    policy.config = {
        **(policy.config or {}),
        'simulation': {
            'episodes': episodes,
            'average_reward': avg_reward,
            'last_run': timezone.now().isoformat(),
        },
    }
    policy.save(update_fields=['config', 'updated_at'])

    _log_ai_decision(org, 'system', 'policy_simulation', 'policy', str(policy.id), {
        'episodes': episodes,
        'average_reward': avg_reward,
    })
    return {'status': 'completed', 'average_reward': avg_reward}
