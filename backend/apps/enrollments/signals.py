from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from apps.enrollments.models import Enrollment
from apps.organizations.models import OrganizationMember
from apps.notifications.services import enqueue_notification
from apps.analytics.services import create_audit_log
from apps.webhooks.services import enqueue_event
from apps.webhooks.tasks import deliver_webhook_task
from apps.certificates.services import issue_certificate


@receiver(pre_save, sender=Enrollment)
def cache_previous_status(sender, instance: Enrollment, **kwargs):
    if instance.pk:
        try:
            instance._previous_status = Enrollment.objects.get(pk=instance.pk).status
        except Enrollment.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


@receiver(post_save, sender=Enrollment)
def handle_enrollment_events(sender, instance: Enrollment, created: bool, **kwargs):
    org_id = str(instance.organization_id)
    user_id = str(instance.user_id)

    if created:
        actor = instance.assigned_by or instance.user
        create_audit_log(
            org_id=org_id,
            actor_id=str(actor.id),
            actor_name=actor.get_full_name() or actor.username,
            actor_type='admin' if instance.assigned_by else 'user',
            action='enrollment.created',
            entity_type='enrollment',
            entity_id=str(instance.id),
            target_type='course',
            target_id=str(instance.course_id),
            target_name=instance.course.title,
            metadata={'userId': user_id},
        )
        enqueue_notification(
            user_id=user_id,
            org_id=org_id,
            notification_type='enrollment_created',
            title='New training assigned',
            message=f'You have been enrolled in "{instance.course.title}".',
            channels=['in_app', 'email'],
            data={'enrollmentId': str(instance.id), 'courseId': str(instance.course_id)},
        )

        deliveries = enqueue_event(org_id, 'enrollment.created', {
            'enrollmentId': str(instance.id),
            'userId': user_id,
            'courseId': str(instance.course_id)
        })
        for delivery in deliveries:
            deliver_webhook_task.delay(str(delivery.id))

    previous = getattr(instance, '_previous_status', None)
    if previous != instance.status and instance.status == 'completed':
        certificate = issue_certificate(
            user=instance.user,
            course=instance.course,
            organization=instance.organization,
            enrollment_id=str(instance.id)
        )
        create_audit_log(
            org_id=org_id,
            actor_id=str(instance.user_id),
            actor_name=instance.user.get_full_name() or instance.user.username,
            actor_type='user',
            action='enrollment.completed',
            entity_type='enrollment',
            entity_id=str(instance.id),
            target_type='course',
            target_id=str(instance.course_id),
            target_name=instance.course.title,
        )
        enqueue_notification(
            user_id=user_id,
            org_id=org_id,
            notification_type='course_completed',
            title='Course completed',
            message=f'You completed "{instance.course.title}".',
            channels=['in_app', 'email'],
            data={'enrollmentId': str(instance.id), 'courseId': str(instance.course_id)}
        )
        if certificate:
            enqueue_notification(
                user_id=user_id,
                org_id=org_id,
                notification_type='certificate_issued',
                title='Certificate issued',
                message=f'Your certificate for "{instance.course.title}" is ready.',
                channels=['in_app', 'email'],
                data={'courseId': str(instance.course_id), 'certificateId': str(certificate.id)}
            )
            deliveries = enqueue_event(org_id, 'certificate.issued', {
                'certificateId': str(certificate.id),
                'userId': user_id,
                'courseId': str(instance.course_id),
            })
            for delivery in deliveries:
                deliver_webhook_task.delay(str(delivery.id))
        deliveries = enqueue_event(org_id, 'enrollment.completed', {
            'enrollmentId': str(instance.id),
            'userId': user_id,
            'courseId': str(instance.course_id)
        })
        for delivery in deliveries:
            deliver_webhook_task.delay(str(delivery.id))
