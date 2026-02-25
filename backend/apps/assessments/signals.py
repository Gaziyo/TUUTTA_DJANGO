from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import AssessmentAttempt
from apps.learning_intelligence.tasks import recalculate_cognitive_profile_task


@receiver(post_save, sender=AssessmentAttempt)
def update_cognitive_profile_on_submit(sender, instance: AssessmentAttempt, created: bool, **kwargs):
    if not instance.submitted_at:
        return
    update_fields = kwargs.get('update_fields')
    if update_fields and not {'submitted_at', 'score', 'percentage', 'passed', 'status'}.intersection(update_fields):
        return
    if not instance.assessment_id or not instance.assessment.organization_id:
        return
    recalculate_cognitive_profile_task.delay(str(instance.user_id), str(instance.assessment.organization_id))
