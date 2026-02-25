from django.apps import AppConfig


class UenrollmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.enrollments'

    def ready(self):
        from . import signals  # noqa: F401
