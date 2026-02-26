"""
Production Django settings for Render.com deployment.
"""
import os
import dj_database_url
from .base import *

SECRET_KEY = os.environ.get('SECRET_KEY')
DEBUG = False
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# Database - Render provides DATABASE_URL
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Redis Cache & Celery (optional — falls back to local-mem cache if not configured)
REDIS_URL = os.environ.get('REDIS_URL', '')

if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
        }
    }
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }

# CORS
def _parse_origin_csv(value: str) -> list[str]:
    return [
        item.strip().rstrip('/')
        for item in (value or '').split(',')
        if item.strip()
    ]


default_cors_origins = [
    'https://tuutta.onrender.com',
    'https://tuutta-frontend.onrender.com',
    'https://tuutta.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

env_cors_origins = _parse_origin_csv(os.environ.get('CORS_ALLOWED_ORIGINS', ''))
frontend_origin = os.environ.get('FRONTEND_URL', '').strip().rstrip('/')
if frontend_origin:
    env_cors_origins.append(frontend_origin)

CORS_ALLOWED_ORIGINS = list(dict.fromkeys(env_cors_origins + default_cors_origins))
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(_parse_origin_csv(os.environ.get('CSRF_TRUSTED_ORIGINS', '')) + CORS_ALLOWED_ORIGINS))

# Security Headers
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# File Storage - Cloudflare R2 (S3-compatible), only active when credentials are set
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID', '')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME', '')
AWS_S3_ENDPOINT_URL = os.environ.get('AWS_S3_ENDPOINT_URL', '')
AWS_S3_REGION_NAME = 'auto'
AWS_DEFAULT_ACL = None
AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}

if AWS_ACCESS_KEY_ID and AWS_STORAGE_BUCKET_NAME:
    STORAGES = {
        "default": {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"},
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }

# OpenAI
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# Email (configure SendGrid or similar for production)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@tuutta.com')

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}
