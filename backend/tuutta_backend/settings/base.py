"""
Base Django settings for tuutta_backend project.
"""
import os
from pathlib import Path
from datetime import timedelta
from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'storages',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.organizations',
    'apps.courses',
    'apps.assessments.apps.UassessmentsConfig',
    'apps.enrollments',
    'apps.progress',
    'apps.gamification',
    'apps.ai_services',
    'apps.genie',
    'apps.certificates',
    'apps.notifications',
    'apps.analytics',
    'apps.webhooks',
    # Cognitive OS apps
    'apps.competencies',
    'apps.knowledge',
    'apps.learning_intelligence',
    'apps.governance',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.organizations.middleware.OrgSlugResolutionMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'tuutta_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'tuutta_backend.wsgi.application'
ASGI_APPLICATION = 'tuutta_backend.asgi.application'

# Auth
AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Media
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Email (SendGrid)
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')
SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL', 'no-reply@tuutta.com')

# Webhooks
WEBHOOK_SIGNATURE_HEADER = 'X-Tuutta-Signature'
WEBHOOK_EVENT_HEADER = 'X-Tuutta-Event'
WEBHOOK_TIMESTAMP_HEADER = 'X-Tuutta-Timestamp'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'tuutta_backend.api_errors.api_exception_handler',
}

# Celery beat schedules
CELERY_BEAT_SCHEDULE = {
    'dispatch-notifications': {
        'task': 'apps.notifications.tasks.dispatch_pending_notifications',
        'schedule': 300.0,
    },
    'dispatch-webhooks': {
        'task': 'apps.webhooks.tasks.dispatch_pending_webhooks',
        'schedule': 300.0,
    },
    'deadline-reminders': {
        'task': 'apps.enrollments.tasks.send_deadline_reminders',
        'schedule': crontab(hour=9, minute=0),
    },
    'overdue-enrollments': {
        'task': 'apps.enrollments.tasks.check_overdue_enrollments',
        'schedule': crontab(hour=6, minute=0),
    },
    'archive-old-courses': {
        'task': 'apps.courses.tasks.archive_old_courses',
        'schedule': crontab(hour=3, minute=0, day_of_month=1),
    },
    'retention-policy': {
        'task': 'apps.organizations.tasks.apply_retention_policies',
        'schedule': crontab(hour=4, minute=0, day_of_month=1),
    },
    'competency-snapshots': {
        'task': 'apps.competencies.tasks.refresh_competency_snapshots',
        'schedule': crontab(hour=6, minute=0, day_of_week=1),
    },
    'analytics-refresh': {
        'task': 'apps.analytics.tasks.analytics_refresh_scheduler',
        'schedule': crontab(hour=7, minute=0, day_of_week=1),
    },
    'genie-report-scheduler': {
        'task': 'apps.analytics.tasks.genie_report_scheduler',
        'schedule': 86400.0,
    },
    'manager-digest-scheduler': {
        'task': 'apps.analytics.tasks.manager_digest_scheduler',
        'schedule': crontab(hour=7, minute=0, day_of_week=1),
    },
    'manager-digest-processor': {
        'task': 'apps.analytics.tasks.process_manager_digests_task',
        'schedule': 3600.0,
    },
    'failure-risk-refresh': {
        'task': 'apps.learning_intelligence.tasks.compute_failure_risk_task',
        'schedule': crontab(hour=5, minute=0),
        'args': (),
    },
    'adaptive-recommendations-refresh': {
        'task': 'apps.learning_intelligence.tasks.generate_adaptive_recommendations_task',
        'schedule': crontab(hour=5, minute=30),
        'args': (),
    },
    'org-forecasting-refresh': {
        'task': 'apps.analytics.tasks.compute_org_forecasting_task',
        'schedule': crontab(hour=6, minute=0, day_of_week=1),
        'args': (),
    },
    'adaptive-policy-optimization': {
        'task': 'apps.learning_intelligence.tasks.optimize_adaptive_policy_task',
        'schedule': crontab(hour=6, minute=30, day_of_week=1),
        'args': (),
    },
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# DRF Spectacular (API docs)
SPECTACULAR_SETTINGS = {
    'TITLE': 'Tuutta API',
    'DESCRIPTION': 'Tuutta LMS API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Celery
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes

# CORS
CORS_ALLOW_CREDENTIALS = True
