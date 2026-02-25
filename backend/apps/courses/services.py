from __future__ import annotations

from typing import List, Tuple

from django.db.models import Q

from apps.assessments.models import AssessmentAttempt
from apps.governance.models import HumanOverride
from apps.learning_intelligence.models import CognitiveProfile
from apps.learning_intelligence.models import AdaptiveRecommendation
from apps.progress.models import ModuleProgress

from .models import AdaptiveReleaseRule, CourseModule


def _current_bloom_level(profile: CognitiveProfile) -> int:
    mastery = profile.bloom_mastery or {}
    mapping = {
        1: ['remember'],
        2: ['understand'],
        3: ['apply'],
        4: ['analyze', 'analyse'],
        5: ['evaluate'],
        6: ['create'],
    }
    current = 0
    for level, keys in mapping.items():
        score = max([mastery.get(key, 0) for key in keys] + [0])
        if score >= 0.6:
            current = level
    return current


def get_module_unlock_status(user, module: CourseModule) -> Tuple[bool, List[str]]:
    reasons: List[str] = []

    forced_unlock = HumanOverride.objects.filter(
        organization=module.course.organization,
        target_type='module',
        target_id=str(module.id),
        action='force_unlock',
    )
    if forced_unlock.exists():
        return True, ['Human override: module force-unlocked.']

    rl_unlock = AdaptiveRecommendation.objects.filter(
        organization=module.course.organization,
        user=user,
        action_type='unlock_module',
    ).order_by('-updated_at').first()
    if rl_unlock:
        payload = rl_unlock.payload or {}
        payload_module_id = str(payload.get('module_id') or '')
        payload_course_id = str(payload.get('course_id') or '')
        payload_scope = str(payload.get('scope') or '')
        if payload_scope == 'global' or payload_module_id == str(module.id) or payload_course_id == str(module.course_id):
            score = float(rl_unlock.score or 0)
            if score >= 0.5:
                return True, [f'Adaptive policy unlock (score {score:.2f}).']

    if module.unlock_requires_id:
        prereq_progress = ModuleProgress.objects.filter(
            progress_record__user=user,
            module_id=module.unlock_requires_id,
            status='completed',
        ).exists()
        if not prereq_progress:
            reasons.append('Prerequisite module not completed.')

    rules = AdaptiveReleaseRule.objects.filter(module=module, is_active=True)
    for rule in rules:
        if rule.rule_type == 'prerequisite_module' and rule.prerequisite_module_id:
            completed = ModuleProgress.objects.filter(
                progress_record__user=user,
                module_id=rule.prerequisite_module_id,
                status='completed',
            ).exists()
            if not completed:
                reasons.append('Adaptive rule: prerequisite module incomplete.')

        if rule.rule_type == 'assessment_passed' and rule.assessment_id:
            attempts = AssessmentAttempt.objects.filter(
                assessment_id=rule.assessment_id,
                user=user,
                passed=True,
            )
            if rule.min_score is not None:
                attempts = attempts.filter(percentage__gte=rule.min_score)
            if not attempts.exists():
                reasons.append('Adaptive rule: assessment pass required.')

        if rule.rule_type == 'bloom_mastery' and rule.min_bloom_level:
            profile = CognitiveProfile.objects.filter(user=user, organization=module.course.organization).first()
            current_level = _current_bloom_level(profile) if profile else 0
            if current_level < rule.min_bloom_level:
                reasons.append('Adaptive rule: Bloom mastery threshold not met.')

    return (len(reasons) == 0, reasons)
