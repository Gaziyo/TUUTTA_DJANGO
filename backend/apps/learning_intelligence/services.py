from __future__ import annotations

from collections import defaultdict
from typing import Dict

from django.db.models import F
from django.utils import timezone

from apps.assessments.models import AssessmentAttempt, AssessmentResponse

from .models import CognitiveProfile


def _safe_ratio(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return max(0.0, min(1.0, numerator / denominator))


def recalculate_cognitive_profile(user_id: str, org_id: str) -> CognitiveProfile:
    attempts = AssessmentAttempt.objects.filter(
        user_id=user_id,
        assessment__organization_id=org_id,
        submitted_at__isnull=False,
    )
    total_assessments = attempts.count()
    last_assessment = attempts.order_by('-submitted_at').values_list('submitted_at', flat=True).first()

    responses = (AssessmentResponse.objects.filter(
        attempt__user_id=user_id,
        attempt__assessment__organization_id=org_id,
        attempt__submitted_at__isnull=False,
    )
        .select_related('question', 'attempt')
        .annotate(question_points=F('question__points')))

    bloom_totals: Dict[int, Dict[str, float]] = defaultdict(lambda: {'earned': 0.0, 'possible': 0.0})
    modality_totals: Dict[str, Dict[str, float]] = defaultdict(lambda: {'earned': 0.0, 'possible': 0.0})

    total_questions = 0
    for response in responses:
        question = response.question
        if not question:
            continue
        total_questions += 1
        possible = float(response.question_points or 1)
        if response.is_correct is not None:
            earned = possible if response.is_correct else 0.0
        elif response.points_earned is not None:
            earned = float(response.points_earned)
        else:
            earned = 0.0

        if question.bloom_level:
            bloom_totals[int(question.bloom_level)]['earned'] += earned
            bloom_totals[int(question.bloom_level)]['possible'] += possible

        modality = question.modality or 'reading'
        modality_totals[modality]['earned'] += earned
        modality_totals[modality]['possible'] += possible

    bloom_mastery = {}
    for level in range(1, 7):
        totals = bloom_totals.get(level, {'earned': 0.0, 'possible': 0.0})
        bloom_mastery[str(level)] = round(_safe_ratio(totals['earned'], totals['possible']), 2)

    modality_strengths = {}
    preferred_modality = ''
    best_score = -1.0
    for modality, totals in modality_totals.items():
        score = _safe_ratio(totals['earned'], totals['possible'])
        modality_strengths[modality] = round(score, 2)
        if score > best_score:
            best_score = score
            preferred_modality = modality

    profile, _ = CognitiveProfile.objects.get_or_create(user_id=user_id, organization_id=org_id)
    profile.bloom_mastery = bloom_mastery
    profile.modality_strengths = modality_strengths
    profile.preferred_modality = preferred_modality
    profile.total_questions_answered = total_questions
    profile.total_assessments_taken = total_assessments
    profile.last_assessment_at = last_assessment or timezone.now()
    profile.save()
    return profile
