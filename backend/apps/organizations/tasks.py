from celery import shared_task
from django.utils import timezone

from .models import Organization


@shared_task
def apply_retention_policies() -> int:
    """
    Placeholder retention policy runner.
    Policies are stored in organization.settings['compliance']['retentionPolicies'].
    Implementation is intentionally conservative (no destructive actions).
    """
    processed = 0
    orgs = Organization.objects.all()
    for org in orgs:
        policies = (org.settings or {}).get('compliance', {}).get('retentionPolicies', [])
        if not policies:
            continue
        # Future: map entity types to models and enforce per policy.
        processed += 1
    return processed
