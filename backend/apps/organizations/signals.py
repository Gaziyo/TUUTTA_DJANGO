from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Organization, OrganizationMember
from apps.analytics.services import create_audit_log
from apps.webhooks.services import enqueue_event
from apps.webhooks.tasks import deliver_webhook_task


@receiver(pre_save, sender=Organization)
def cache_previous_settings(sender, instance: Organization, **kwargs):
    if instance.pk:
        try:
            instance._previous_settings = Organization.objects.get(pk=instance.pk).settings
        except Organization.DoesNotExist:
            instance._previous_settings = None
    else:
        instance._previous_settings = None


@receiver(post_save, sender=Organization)
def handle_policy_updates(sender, instance: Organization, created: bool, **kwargs):
    if created:
        return
    previous_settings = getattr(instance, '_previous_settings', None)
    if previous_settings is None:
        return
    if previous_settings != instance.settings:
        create_audit_log(
            org_id=str(instance.id),
            actor_id='system',
            actor_name='system',
            actor_type='system',
            action='policy.updated',
            entity_type='organization',
            entity_id=str(instance.id),
            target_type='settings',
            target_id=str(instance.id),
            target_name=instance.name,
            changes=[{'field': 'settings', 'before': previous_settings, 'after': instance.settings}],
        )
        deliveries = enqueue_event(str(instance.id), 'policy.updated', {
            'organizationId': str(instance.id),
            'name': instance.name,
        })
        for delivery in deliveries:
            deliver_webhook_task.delay(str(delivery.id))


@receiver(post_save, sender=OrganizationMember)
def handle_member_created(sender, instance: OrganizationMember, created: bool, **kwargs):
    if not created:
        return
    user = instance.user
    create_audit_log(
        org_id=str(instance.organization_id),
        actor_id=str(user.id),
        actor_name=user.get_full_name() or user.username,
        actor_type='admin' if instance.role in ['org_admin', 'super_admin'] else 'user',
        action='member.created',
        entity_type='member',
        entity_id=str(instance.id),
        target_type='user',
        target_id=str(user.id),
        target_name=user.get_full_name() or user.username,
        metadata={'role': instance.role},
    )
    deliveries = enqueue_event(str(instance.organization_id), 'member.created', {
        'memberId': str(instance.id),
        'userId': str(user.id),
        'role': instance.role,
    })
    for delivery in deliveries:
        deliver_webhook_task.delay(str(delivery.id))
