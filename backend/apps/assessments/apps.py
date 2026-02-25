from django.apps import AppConfig


class UassessmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.assessments'

    def ready(self):
        from . import signals  # noqa: F401
