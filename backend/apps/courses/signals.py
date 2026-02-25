from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Course
from apps.analytics.services import create_audit_log
from apps.webhooks.services import enqueue_event
from apps.webhooks.tasks import deliver_webhook_task


@receiver(pre_save, sender=Course)
def cache_previous_status(sender, instance: Course, **kwargs):
    if instance.pk:
        try:
            instance._previous_status = Course.objects.get(pk=instance.pk).status
        except Course.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


@receiver(post_save, sender=Course)
def handle_course_publish(sender, instance: Course, **kwargs):
    previous = getattr(instance, '_previous_status', None)
    if previous != instance.status and instance.status == 'published':
        actor = instance.created_by
        if actor:
            create_audit_log(
                org_id=str(instance.organization_id),
                actor_id=str(actor.id),
                actor_name=actor.get_full_name() or actor.username,
                actor_type='admin',
                action='course.published',
                entity_type='course',
                entity_id=str(instance.id),
                target_type='course',
                target_id=str(instance.id),
                target_name=instance.title,
            )
        deliveries = enqueue_event(str(instance.organization_id), 'course.published', {
            'courseId': str(instance.id),
            'title': instance.title
        })
        for delivery in deliveries:
            deliver_webhook_task.delay(str(delivery.id))
