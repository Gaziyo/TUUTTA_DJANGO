from datetime import timedelta
from django.utils import timezone
from celery import shared_task

from .models import Course


@shared_task
def archive_old_courses() -> int:
    cutoff = timezone.now() - timedelta(days=365 * 2)
    qs = Course.objects.filter(
        updated_at__lte=cutoff,
        status__in=['draft', 'published'],
    )
    count = qs.count()
    qs.update(status='archived')
    return count
