"""
Development Django settings for tuutta_backend.
"""
import os
from .base import *
from dotenv import load_dotenv

load_dotenv(BASE_DIR.parent / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production-abc123xyz')
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# SQLite for local development (switch to PostgreSQL if preferred)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Redis (use dummy cache if Redis not available locally)
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

# CORS - allow all in dev
CORS_ALLOW_ALL_ORIGINS = True

# Email (console backend for dev)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Static/Media
MEDIA_ROOT = BASE_DIR / 'media'

# OpenAI
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
