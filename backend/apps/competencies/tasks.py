from celery import shared_task
from django.db.models import Avg, Count

from .models import CompetencyScore, CompetencySnapshot


@shared_task
def refresh_competency_snapshots() -> int:
    """
    Aggregate competency scores by org + competency_tag.
    """
    aggregates = (
        CompetencyScore.objects
        .values('organization_id', 'competency_tag')
        .annotate(avg_score=Avg('score'), count=Count('id'))
    )
    created = 0
    for row in aggregates:
        if not row.get('competency_tag'):
            continue
        CompetencySnapshot.objects.create(
            organization_id=row['organization_id'],
            competency_tag=row['competency_tag'],
            average_score=float(row['avg_score'] or 0),
            count=row['count'] or 0,
        )
        created += 1
    return created
