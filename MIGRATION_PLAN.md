# TuuttaWebApp Migration Plan
## Firebase → Django + PostgreSQL on Render.com

**Document Version:** 2.0
**Created:** 2026-02-20
**Target Stack:** Django 5.x + React 18 + PostgreSQL 16 on Render.com

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Current vs Target Architecture](#2-current-vs-target-architecture)
3. [Render.com Infrastructure](#3-rendercom-infrastructure)
4. [Phase-by-Phase Migration Plan](#4-phase-by-phase-migration-plan)
5. [New Information Architecture](#5-new-information-architecture)
6. [Complete Database Schema](#6-complete-database-schema)
7. [API Design](#7-api-design)
8. [Deployment on Render](#8-deployment-on-render)
9. [Cost Analysis](#9-cost-analysis)
10. [Risk Mitigation](#10-risk-mitigation)

---

## 1. Executive Summary

### Current Stack (Firebase)
| Layer | Technology | Monthly Cost |
|-------|-----------|--------------|
| Frontend | React 18, Vite, Netlify | ~$0-19 |
| Backend | Firebase Functions | Pay-per-use |
| Database | Firestore (NoSQL) | Pay-per-use |
| Auth | Firebase Auth | Pay-per-use |
| Storage | Firebase Storage | Pay-per-use |
| **Total** | | **Unpredictable** |

### Target Stack (Render.com)
| Layer | Technology | Monthly Cost |
|-------|-----------|--------------|
| Frontend | React 18, Vite (Render Static) | $0 |
| Backend | Django 5.x (Render Web Service) | $7-25 |
| Database | PostgreSQL 16 (Render) | $7-20 |
| Cache/Queue | Redis (Render) | $10 |
| Workers | Celery (Render Background) | $7 |
| Storage | Cloudflare R2 / AWS S3 | ~$5 |
| **Total** | | **$36-67/mo** |

### Why This Migration?

| Firebase Problem | Render Solution |
|-----------------|-----------------|
| Unpredictable costs at scale | Fixed monthly pricing |
| NoSQL limitations (no JOINs) | Full SQL power with PostgreSQL |
| Vendor lock-in | Standard Django, portable anywhere |
| Complex security rules | Django ORM + permissions |
| No admin panel | Django Admin built-in |
| Limited querying | Full SQL, aggregations, CTEs |

---

## 2. Current vs Target Architecture

### Current Architecture (Firebase)
```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (Netlify)                      │
│            React + Vite + Firebase SDK                   │
└───────────────────────┬─────────────────────────────────┘
                        │ Direct SDK calls
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  FIREBASE SERVICES                       │
├─────────────┬─────────────┬─────────────┬───────────────┤
│  Firebase   │  Firestore  │   Cloud     │   Firebase    │
│    Auth     │   (NoSQL)   │  Functions  │   Storage     │
└─────────────┴─────────────┴──────┬──────┴───────────────┘
                                   │
                                   ▼
                            ┌─────────────┐
                            │   OpenAI    │
                            └─────────────┘
```

### Target Architecture (Render.com)
```
┌─────────────────────────────────────────────────────────┐
│              FRONTEND (Render Static Site)               │
│              React + Vite + API Client                   │
│                    tuutta.com                            │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API / WebSocket
                        ▼
┌─────────────────────────────────────────────────────────┐
│              DJANGO API (Render Web Service)             │
│              api.tuutta.com                              │
│         Gunicorn + Django REST Framework                 │
├─────────────────────────────────────────────────────────┤
│  Authentication  │  Business Logic  │  AI Services      │
│     (JWT)        │    (Views)       │   (OpenAI)        │
└────────┬─────────┴────────┬─────────┴─────────┬─────────┘
         │                  │                   │
         ▼                  ▼                   ▼
┌─────────────┐      ┌─────────────┐     ┌─────────────┐
│ PostgreSQL  │      │    Redis    │     │ Cloudflare  │
│  (Render)   │      │  (Render)   │     │     R2      │
│             │      │ Cache+Queue │     │  (Storage)  │
└─────────────┘      └──────┬──────┘     └─────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  Celery Worker  │
                   │ (Render Worker) │
                   │  Async Tasks    │
                   └─────────────────┘
```

---

## 3. Render.com Infrastructure

### 3.1 Services to Create on Render

| Service Type | Name | Purpose |
|-------------|------|---------|
| **Static Site** | `tuutta-frontend` | React SPA |
| **Web Service** | `tuutta-api` | Django REST API |
| **Background Worker** | `tuutta-worker` | Celery async tasks |
| **PostgreSQL** | `tuutta-db` | Primary database |
| **Redis** | `tuutta-redis` | Cache + Celery broker |

### 3.2 Render Blueprint (render.yaml)

```yaml
# render.yaml - Infrastructure as Code for Render.com
services:
  # ============================================
  # DJANGO API SERVER
  # ============================================
  - type: web
    name: tuutta-api
    runtime: python
    region: oregon
    plan: starter  # $7/mo, upgrade to standard ($25) for production
    buildCommand: |
      pip install -r requirements/production.txt
      python manage.py collectstatic --noinput
      python manage.py migrate
    startCommand: gunicorn tuutta_backend.wsgi:application --bind 0.0.0.0:$PORT --workers 2
    healthCheckPath: /api/health/
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: tuutta_backend.settings.production
      - key: SECRET_KEY
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: tuutta-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: tuutta-redis
          type: redis
          property: connectionString
      - key: ALLOWED_HOSTS
        value: tuutta-api.onrender.com,api.tuutta.com
      - key: CORS_ALLOWED_ORIGINS
        value: https://tuutta.com,https://tuutta-frontend.onrender.com
      - key: OPENAI_API_KEY
        sync: false  # Set manually in dashboard
      - key: AWS_ACCESS_KEY_ID
        sync: false
      - key: AWS_SECRET_ACCESS_KEY
        sync: false
      - key: AWS_STORAGE_BUCKET_NAME
        value: tuutta-assets
      - key: AWS_S3_ENDPOINT_URL
        value: https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

  # ============================================
  # CELERY WORKER (Background Tasks)
  # ============================================
  - type: worker
    name: tuutta-worker
    runtime: python
    region: oregon
    plan: starter  # $7/mo
    buildCommand: pip install -r requirements/production.txt
    startCommand: celery -A tuutta_backend worker -l info --concurrency 2
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: tuutta_backend.settings.production
      - key: SECRET_KEY
        fromService:
          name: tuutta-api
          type: web
          envVarKey: SECRET_KEY
      - key: DATABASE_URL
        fromDatabase:
          name: tuutta-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: tuutta-redis
          type: redis
          property: connectionString
      - key: OPENAI_API_KEY
        sync: false

  # ============================================
  # REACT FRONTEND (Static Site)
  # ============================================
  - type: web
    name: tuutta-frontend
    runtime: static
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
    headers:
      - path: /*
        name: Cache-Control
        value: public, max-age=31536000, immutable
      - path: /index.html
        name: Cache-Control
        value: no-cache
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: VITE_API_URL
        value: https://tuutta-api.onrender.com/api/v1
      - key: VITE_WS_URL
        value: wss://tuutta-api.onrender.com

# ============================================
# DATABASES
# ============================================
databases:
  - name: tuutta-db
    plan: starter  # $7/mo (1GB), upgrade to standard ($20) for 10GB
    region: oregon
    postgresMajorVersion: 16
    ipAllowList: []  # Empty = allow only Render services

# ============================================
# REDIS (Render Redis is in beta, use external if needed)
# ============================================
# Note: As of 2024, Render Redis may need to be created manually
# or use Upstash Redis as an alternative
```

### 3.3 Custom Domain Setup

| Service | Render URL | Custom Domain |
|---------|-----------|---------------|
| Frontend | `tuutta-frontend.onrender.com` | `tuutta.com` |
| API | `tuutta-api.onrender.com` | `api.tuutta.com` |

DNS Configuration:
```
tuutta.com        CNAME  tuutta-frontend.onrender.com
api.tuutta.com    CNAME  tuutta-api.onrender.com
```

---

## 4. Phase-by-Phase Migration Plan

### Overview Timeline

```
Phase 1: Setup & Foundation     [Week 1-2]   ████░░░░░░░░░░░░░░░░
Phase 2: Authentication         [Week 3-4]   ░░░░████░░░░░░░░░░░░
Phase 3: Core Models & API      [Week 5-8]   ░░░░░░░░████████░░░░
Phase 4: Frontend Integration   [Week 9-11]  ░░░░░░░░░░░░░░░░████
Phase 5: AI Services            [Week 12]    ░░░░░░░░░░░░░░░░░░██
Phase 6: Data Migration         [Week 13-14] ░░░░░░░░░░░░░░░░░░░░██
Phase 7: Testing & Cutover      [Week 15-16] ░░░░░░░░░░░░░░░░░░░░░░██

Total: ~16 weeks (4 months)
```

---

### Phase 1: Setup & Foundation (Weeks 1-2)

#### 1.1 Create Render Account & Services

```bash
# 1. Sign up at render.com
# 2. Create a new Blueprint from your repo
# 3. Or manually create services:

# PostgreSQL Database
# - Go to Dashboard → New → PostgreSQL
# - Name: tuutta-db
# - Region: Oregon
# - Plan: Starter ($7/mo)

# Redis (if available, otherwise use Upstash)
# - Go to Dashboard → New → Redis
# - Name: tuutta-redis
# - Plan: Starter ($10/mo)
```

#### 1.2 Initialize Django Project

```bash
# Create backend directory structure
mkdir -p backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install django==5.0.2
pip install djangorestframework==3.14.0
pip install djangorestframework-simplejwt==5.3.1
pip install django-cors-headers==4.3.1
pip install psycopg[binary]==3.1.18
pip install celery[redis]==5.3.6
pip install dj-database-url==2.1.0
pip install whitenoise==6.6.0
pip install gunicorn==21.2.0
pip install boto3==1.34.44
pip install django-storages==1.14.2
pip install openai==1.12.0
pip install python-dotenv==1.0.1
pip install drf-spectacular==0.27.1

# Save requirements
pip freeze > requirements/production.txt

# Initialize Django project
django-admin startproject tuutta_backend .
```

#### 1.3 Django Settings for Render

```python
# tuutta_backend/settings/production.py
import os
import dj_database_url
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Security
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

# Redis Cache & Celery
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
    }
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

# Static files - WhiteNoise for Render
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add WhiteNoise
    'corsheaders.middleware.CorsMiddleware',
    # ... rest of middleware
]

# CORS - Allow frontend
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOW_CREDENTIALS = True

# File Storage - Cloudflare R2 (S3-compatible)
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
AWS_S3_ENDPOINT_URL = os.environ.get('AWS_S3_ENDPOINT_URL')  # R2 endpoint
AWS_S3_REGION_NAME = 'auto'
AWS_DEFAULT_ACL = None
AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}

# Security Headers
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

#### 1.4 Create Django Apps

```bash
# Create all apps
cd backend
python manage.py startapp accounts
python manage.py startapp organizations
python manage.py startapp courses
python manage.py startapp assessments
python manage.py startapp enrollments
python manage.py startapp progress
python manage.py startapp gamification
python manage.py startapp ai_services
python manage.py startapp genie
python manage.py startapp certificates
python manage.py startapp notifications
python manage.py startapp analytics

# Move apps to apps/ directory
mkdir apps
mv accounts organizations courses assessments enrollments progress \
   gamification ai_services genie certificates notifications analytics apps/
```

#### 1.5 Deliverables - Phase 1
- [ ] Render account created
- [ ] PostgreSQL database provisioned on Render
- [ ] Redis instance provisioned
- [ ] Django project initialized
- [ ] All apps created
- [ ] Settings configured for Render
- [ ] Initial deploy working (empty Django)

---

### Phase 2: Authentication (Weeks 3-4)

#### 2.1 Custom User Model

```python
# apps/accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Profile
    display_name = models.CharField(max_length=255, blank=True)
    photo_url = models.URLField(blank=True)
    bio = models.TextField(blank=True)

    # Firebase migration field (temporary)
    firebase_uid = models.CharField(max_length=128, unique=True, null=True, blank=True)

    # Settings
    settings = models.JSONField(default=dict)

    # Subscription
    subscription_tier = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('starter', 'Starter'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ],
        default='free'
    )
    stripe_customer_id = models.CharField(max_length=255, blank=True)

    # Timestamps
    last_active_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
```

#### 2.2 JWT Authentication

```python
# tuutta_backend/settings/base.py
from datetime import timedelta

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'UPDATE_LAST_LOGIN': True,
}
```

#### 2.3 Auth API Endpoints

```python
# apps/accounts/views.py
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, RegisterSerializer

class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)

class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]

class LogoutView(generics.GenericAPIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user
```

#### 2.4 Deliverables - Phase 2
- [ ] Custom User model with all fields
- [ ] JWT authentication working
- [ ] Register/Login/Logout endpoints
- [ ] Password reset flow
- [ ] Google OAuth (optional, can add later)
- [ ] User profile endpoints

---

### Phase 3: Core Models & API (Weeks 5-8)

#### 3.1 Organization Models

```python
# apps/organizations/models.py
from django.db import models
from apps.accounts.models import User
import uuid

class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    logo_url = models.URLField(blank=True)

    plan = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('starter', 'Starter'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ],
        default='free'
    )

    settings = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organizations'

class OrganizationMember(models.Model):
    ROLES = [
        ('learner', 'Learner'),
        ('instructor', 'Instructor'),
        ('team_lead', 'Team Lead'),
        ('ld_manager', 'L&D Manager'),
        ('org_admin', 'Org Admin'),
        ('super_admin', 'Super Admin'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=ROLES, default='learner')

    department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True, blank=True)
    team = models.ForeignKey('Team', on_delete=models.SET_NULL, null=True, blank=True)
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='direct_reports')

    job_title = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, default='active')

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'organization_members'
        unique_together = ['organization', 'user']

class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'departments'

class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='teams')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    lead = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teams'
```

#### 3.2 Course Models

```python
# apps/courses/models.py
from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
import uuid

class Course(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('review', 'In Review'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='courses')

    title = models.CharField(max_length=500)
    slug = models.SlugField(max_length=500)
    description = models.TextField(blank=True)
    short_description = models.CharField(max_length=500, blank=True)
    thumbnail_url = models.URLField(blank=True)

    category = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list)
    skill_level = models.CharField(max_length=20, blank=True)

    estimated_duration = models.IntegerField(null=True, blank=True)  # minutes
    learning_objectives = models.JSONField(default=list)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    visibility = models.CharField(max_length=20, default='organization')

    published_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_courses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'courses'
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['category']),
        ]

class CourseModule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    order_index = models.IntegerField(default=0)

    is_required = models.BooleanField(default=True)
    estimated_duration = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_modules'
        ordering = ['order_index']

class Lesson(models.Model):
    LESSON_TYPES = [
        ('video', 'Video'),
        ('text', 'Text'),
        ('audio', 'Audio'),
        ('interactive', 'Interactive'),
        ('exercise', 'Exercise'),
        ('assignment', 'Assignment'),
        ('scorm', 'SCORM'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name='lessons')

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    lesson_type = models.CharField(max_length=20, choices=LESSON_TYPES)
    order_index = models.IntegerField(default=0)

    is_required = models.BooleanField(default=True)
    estimated_duration = models.IntegerField(null=True, blank=True)

    # Content
    content = models.JSONField(default=dict)  # Flexible content storage

    assessment = models.ForeignKey(
        'assessments.Assessment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lessons'
        ordering = ['order_index']
```

#### 3.3 Assessment Models

```python
# apps/assessments/models.py
from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
import uuid

class Assessment(models.Model):
    TYPES = [
        ('quiz', 'Quiz'),
        ('exam', 'Exam'),
        ('survey', 'Survey'),
        ('assignment', 'Assignment'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True)

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    instructions = models.TextField(blank=True)

    assessment_type = models.CharField(max_length=20, choices=TYPES)
    difficulty = models.CharField(max_length=20, blank=True)

    time_limit = models.IntegerField(null=True, blank=True)  # minutes
    passing_score = models.DecimalField(max_digits=5, decimal_places=2, default=70)
    max_attempts = models.IntegerField(default=1)

    shuffle_questions = models.BooleanField(default=False)
    shuffle_options = models.BooleanField(default=False)
    show_correct_answers = models.BooleanField(default=True)

    is_published = models.BooleanField(default=False)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assessments'

class Question(models.Model):
    TYPES = [
        ('mcq', 'Multiple Choice'),
        ('multiple_select', 'Multiple Select'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
        ('essay', 'Essay'),
        ('fill_blank', 'Fill in the Blank'),
        ('matching', 'Matching'),
        ('ordering', 'Ordering'),
        ('drag_drop', 'Drag and Drop'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='questions')

    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=TYPES)
    order_index = models.IntegerField(default=0)

    points = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    explanation = models.TextField(blank=True)
    hint = models.TextField(blank=True)

    media_url = models.URLField(blank=True)
    is_required = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'questions'
        ordering = ['order_index']

class QuestionOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')

    option_text = models.TextField()
    is_correct = models.BooleanField(default=False)
    order_index = models.IntegerField(default=0)
    feedback = models.TextField(blank=True)

    # For matching questions
    match_target = models.TextField(blank=True)

    class Meta:
        db_table = 'question_options'
        ordering = ['order_index']

class AssessmentAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='attempts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assessment_attempts')

    attempt_number = models.IntegerField(default=1)

    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    time_spent = models.IntegerField(null=True, blank=True)  # seconds

    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    max_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    passed = models.BooleanField(null=True, blank=True)

    status = models.CharField(max_length=20, default='in_progress')

    graded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='graded_attempts')
    graded_at = models.DateTimeField(null=True, blank=True)
    grader_feedback = models.TextField(blank=True)

    class Meta:
        db_table = 'assessment_attempts'

class AssessmentResponse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(AssessmentAttempt, on_delete=models.CASCADE, related_name='responses')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)

    response_text = models.TextField(blank=True)
    selected_options = models.JSONField(default=list)  # List of option IDs

    points_earned = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    feedback = models.TextField(blank=True)

    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'assessment_responses'
        unique_together = ['attempt', 'question']
```

#### 3.4 Enrollment & Progress Models

```python
# apps/enrollments/models.py
from django.db import models
from apps.accounts.models import User
from apps.organizations.models import Organization
from apps.courses.models import Course
import uuid

class Enrollment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('enrolled', 'Enrolled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('dropped', 'Dropped'),
        ('expired', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enrolled')
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    enrolled_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)

    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_enrollments')

    class Meta:
        db_table = 'enrollments'
        unique_together = ['user', 'course', 'organization']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['course', 'status']),
            models.Index(fields=['due_date']),
        ]
```

```python
# apps/progress/models.py
from django.db import models
from apps.accounts.models import User
from apps.courses.models import Course, CourseModule, Lesson
from apps.enrollments.models import Enrollment
import uuid

class ProgressRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress_records')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='progress_records')
    enrollment = models.ForeignKey(Enrollment, on_delete=models.SET_NULL, null=True, blank=True)

    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_time_spent = models.IntegerField(default=0)  # seconds
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'progress_records'
        unique_together = ['user', 'course']

class ModuleProgress(models.Model):
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    progress_record = models.ForeignKey(ProgressRecord, on_delete=models.CASCADE, related_name='module_progress')
    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent = models.IntegerField(default=0)
    last_accessed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'module_progress'
        unique_together = ['progress_record', 'module']

class LessonProgress(models.Model):
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    progress_record = models.ForeignKey(ProgressRecord, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent = models.IntegerField(default=0)
    last_accessed_at = models.DateTimeField(null=True, blank=True)

    # For video/audio
    last_position = models.IntegerField(null=True, blank=True)  # seconds

    class Meta:
        db_table = 'lesson_progress'
        unique_together = ['progress_record', 'lesson']

class ProgressEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)

    event_type = models.CharField(max_length=50)
    data = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'progress_events'
        indexes = [
            models.Index(fields=['user', 'event_type']),
            models.Index(fields=['created_at']),
        ]
```

#### 3.5 API ViewSets

```python
# apps/courses/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Course, CourseModule, Lesson
from .serializers import (
    CourseSerializer, CourseDetailSerializer,
    CourseModuleSerializer, LessonSerializer
)

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    filterset_fields = ['status', 'category', 'visibility']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title', 'published_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        # Filter by user's organizations
        return Course.objects.filter(
            organization__members__user=user
        ).select_related('organization', 'created_by').distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        course = self.get_object()
        course.status = 'published'
        course.published_at = timezone.now()
        course.save()
        return Response({'status': 'published'})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        course = self.get_object()
        course.status = 'archived'
        course.save()
        return Response({'status': 'archived'})

class CourseModuleViewSet(viewsets.ModelViewSet):
    serializer_class = CourseModuleSerializer

    def get_queryset(self):
        return CourseModule.objects.filter(
            course_id=self.kwargs['course_pk']
        ).order_by('order_index')

class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer

    def get_queryset(self):
        return Lesson.objects.filter(
            module_id=self.kwargs['module_pk']
        ).order_by('order_index')
```

#### 3.6 URL Configuration

```python
# tuutta_backend/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from apps.accounts.views import RegisterView, LoginView, LogoutView, CurrentUserView
from apps.organizations.views import OrganizationViewSet, DepartmentViewSet, TeamViewSet
from apps.courses.views import CourseViewSet, CourseModuleViewSet, LessonViewSet
from apps.assessments.views import AssessmentViewSet, QuestionViewSet
from apps.enrollments.views import EnrollmentViewSet
from apps.progress.views import ProgressViewSet
from apps.ai_services.views import ChatCompletionView, TranscribeView
from apps.gamification.views import AchievementViewSet, LeaderboardView

# Main router
router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'assessments', AssessmentViewSet, basename='assessment')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'achievements', AchievementViewSet, basename='achievement')

# Nested routers
courses_router = routers.NestedDefaultRouter(router, r'courses', lookup='course')
courses_router.register(r'modules', CourseModuleViewSet, basename='course-modules')

modules_router = routers.NestedDefaultRouter(courses_router, r'modules', lookup='module')
modules_router.register(r'lessons', LessonViewSet, basename='module-lessons')

assessments_router = routers.NestedDefaultRouter(router, r'assessments', lookup='assessment')
assessments_router.register(r'questions', QuestionViewSet, basename='assessment-questions')

urlpatterns = [
    path('admin/', admin.site.urls),

    # API v1
    path('api/v1/', include([
        # Auth
        path('auth/register/', RegisterView.as_view(), name='register'),
        path('auth/login/', LoginView.as_view(), name='login'),
        path('auth/logout/', LogoutView.as_view(), name='logout'),
        path('auth/me/', CurrentUserView.as_view(), name='current-user'),

        # Main routes
        path('', include(router.urls)),
        path('', include(courses_router.urls)),
        path('', include(modules_router.urls)),
        path('', include(assessments_router.urls)),

        # Progress
        path('progress/', include('apps.progress.urls')),

        # AI Services
        path('ai/chat/', ChatCompletionView.as_view(), name='ai-chat'),
        path('ai/transcribe/', TranscribeView.as_view(), name='ai-transcribe'),

        # Gamification
        path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),

        # Health check
        path('health/', lambda r: Response({'status': 'ok'})),
    ])),
]
```

#### 3.7 Deliverables - Phase 3
- [ ] All models created and migrated
- [ ] Serializers for all models
- [ ] ViewSets with CRUD operations
- [ ] Nested routes working
- [ ] Filtering, search, pagination
- [ ] Permission classes
- [ ] API documentation (drf-spectacular)

---

### Phase 4: Frontend Integration (Weeks 9-11)

#### 4.1 API Client

```typescript
// src/lib/api.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('accessToken', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
```

#### 4.2 React Query Hooks

```typescript
// src/lib/queries/courses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';
import type { Course, CreateCourseData } from '@/types';

export function useCourses(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/courses/', { params: filters });
      return data;
    },
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['courses', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/courses/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseData: CreateCourseData) => {
      const { data } = await apiClient.post('/courses/', courseData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function usePublishCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const { data } = await apiClient.post(`/courses/${courseId}/publish/`);
      return data;
    },
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['courses', courseId] });
    },
  });
}
```

#### 4.3 Auth Store Update

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { apiClient } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.post('/auth/login/', { email, password });

      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);

      // Fetch user data
      const { data: user } = await apiClient.get('/auth/me/');

      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (registerData) => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.post('/auth/register/', registerData);

      localStorage.setItem('accessToken', data.tokens.access);
      localStorage.setItem('refreshToken', data.tokens.refresh);

      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      apiClient.post('/auth/logout/', { refresh: refreshToken }).catch(() => {});
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  fetchCurrentUser: async () => {
    try {
      const { data } = await apiClient.get('/auth/me/');
      set({ user: data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
```

#### 4.4 Remove Firebase Dependencies

```bash
# Remove Firebase packages
npm uninstall firebase firebase-admin

# Remove from imports across all files
# Delete src/lib/firebase.ts
# Update all service files to use apiClient
```

#### 4.5 Deliverables - Phase 4
- [ ] API client configured
- [ ] React Query provider setup
- [ ] All query hooks created
- [ ] Auth store migrated
- [ ] LMS store migrated
- [ ] All Firebase imports removed
- [ ] Environment variables updated

---

### Phase 5: AI Services (Week 12)

#### 5.1 Django AI Service

```python
# apps/ai_services/services.py
import openai
from django.conf import settings

class AIService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    def chat_completion(self, messages: list, model: str = "gpt-4o-mini") -> str:
        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=4096,
        )
        return response.choices[0].message.content

    def transcribe_audio(self, audio_file) -> str:
        transcript = self.client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
        )
        return transcript.text

    def analyze_image(self, image_url: str, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
        )
        return response.choices[0].message.content
```

#### 5.2 AI API Endpoints

```python
# apps/ai_services/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from .services import AIService

class ChatCompletionView(APIView):
    def post(self, request):
        messages = request.data.get('messages', [])
        model = request.data.get('model', 'gpt-4o-mini')

        service = AIService()
        response = service.chat_completion(messages, model)

        return Response({'content': response})

class TranscribeView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        audio_file = request.FILES.get('audio')

        service = AIService()
        transcript = service.transcribe_audio(audio_file)

        return Response({'transcript': transcript})
```

#### 5.3 Celery Task for Async AI

```python
# apps/ai_services/tasks.py
from celery import shared_task
from .services import AIService

@shared_task
def async_chat_completion(messages: list, session_id: str):
    """Process chat completion asynchronously."""
    service = AIService()
    response = service.chat_completion(messages)

    # Store in database or send via WebSocket
    # ...

    return response
```

#### 5.4 Frontend AI Client

```typescript
// src/lib/ai.ts
import { apiClient } from './api';

export async function chatCompletion(messages: Message[]): Promise<string> {
  const { data } = await apiClient.post('/ai/chat/', { messages });
  return data.content;
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const { data } = await apiClient.post('/ai/transcribe/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.transcript;
}
```

#### 5.5 Deliverables - Phase 5
- [ ] AI service layer in Django
- [ ] Chat completion endpoint
- [ ] Audio transcription endpoint
- [ ] Celery tasks for async processing
- [ ] Frontend AI client updated
- [ ] Browser fallback removed

---

### Phase 6: Data Migration (Weeks 13-14)

#### 6.1 Export Firestore Data

```python
# scripts/export_firestore.py
import firebase_admin
from firebase_admin import credentials, firestore
import json
from datetime import datetime

# Initialize Firebase Admin
cred = credentials.Certificate('firebase-service-account.json')
firebase_admin.initialize_app(cred)

db = firestore.client()

def export_collection(collection_name: str) -> list:
    """Export all documents from a Firestore collection."""
    docs = db.collection(collection_name).stream()
    data = []
    for doc in docs:
        item = doc.to_dict()
        item['_id'] = doc.id
        data.append(item)
    return data

def export_all():
    """Export all collections."""
    collections = [
        'users',
        'organizations',
        'courses',
        'assessments',
        'enrollments',
        'progress',
        'genieSources',
        'geniePipelines',
    ]

    export_data = {}
    for collection in collections:
        print(f"Exporting {collection}...")
        export_data[collection] = export_collection(collection)
        print(f"  Exported {len(export_data[collection])} documents")

    # Save to JSON
    with open('firestore_export.json', 'w') as f:
        json.dump(export_data, f, default=str, indent=2)

    print("Export complete!")

if __name__ == '__main__':
    export_all()
```

#### 6.2 Import to PostgreSQL

```python
# scripts/import_to_postgres.py
import json
import django
django.setup()

from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMember
from apps.courses.models import Course, CourseModule, Lesson
# ... other imports

def import_users(data: list):
    """Import users from Firestore export."""
    for item in data:
        User.objects.update_or_create(
            firebase_uid=item['_id'],
            defaults={
                'email': item.get('email', ''),
                'display_name': item.get('displayName', ''),
                'photo_url': item.get('photoUrl', ''),
                'settings': item.get('settings', {}),
            }
        )

def import_organizations(data: list):
    """Import organizations from Firestore export."""
    for item in data:
        Organization.objects.update_or_create(
            id=item['_id'],
            defaults={
                'name': item.get('name', ''),
                'plan': item.get('plan', 'free'),
                'settings': item.get('settings', {}),
            }
        )

def import_courses(data: list):
    """Import courses from Firestore export."""
    for item in data:
        org = Organization.objects.filter(id=item.get('orgId')).first()
        if not org:
            continue

        course = Course.objects.update_or_create(
            id=item['_id'],
            defaults={
                'organization': org,
                'title': item.get('title', ''),
                'description': item.get('description', ''),
                'status': item.get('status', 'draft'),
            }
        )[0]

        # Import modules
        for i, module_data in enumerate(item.get('modules', [])):
            module = CourseModule.objects.update_or_create(
                id=module_data.get('id'),
                defaults={
                    'course': course,
                    'title': module_data.get('title', ''),
                    'order_index': i,
                }
            )[0]

            # Import lessons
            for j, lesson_data in enumerate(module_data.get('lessons', [])):
                Lesson.objects.update_or_create(
                    id=lesson_data.get('id'),
                    defaults={
                        'module': module,
                        'title': lesson_data.get('title', ''),
                        'lesson_type': lesson_data.get('type', 'text'),
                        'order_index': j,
                        'content': lesson_data.get('content', {}),
                    }
                )

def main():
    with open('firestore_export.json', 'r') as f:
        data = json.load(f)

    print("Importing users...")
    import_users(data.get('users', []))

    print("Importing organizations...")
    import_organizations(data.get('organizations', []))

    print("Importing courses...")
    import_courses(data.get('courses', []))

    # ... import other collections

    print("Import complete!")

if __name__ == '__main__':
    main()
```

#### 6.3 Deliverables - Phase 6
- [ ] Firestore export script working
- [ ] All collections exported to JSON
- [ ] Import scripts for each model
- [ ] Data validation checks
- [ ] User password reset flow (users need new passwords)
- [ ] Verification of migrated data

---

### Phase 7: Testing & Cutover (Weeks 15-16)

#### 7.1 Testing Checklist

- [ ] **Unit Tests**: All models, serializers, services
- [ ] **API Tests**: All endpoints with various scenarios
- [ ] **Integration Tests**: Full user journeys
- [ ] **Frontend E2E**: Update Playwright tests
- [ ] **Load Testing**: Verify performance
- [ ] **Security Testing**: OWASP checks

#### 7.2 Cutover Plan

```
Day -7: Final data export rehearsal
Day -3: Feature freeze on Firebase version
Day -1: Final data export
Day 0 (AM):
  - Enable maintenance mode on old site
  - Run data migration
  - Verify data
  - Deploy Django to Render
  - Deploy new frontend to Render
  - DNS cutover
Day 0 (PM):
  - Monitor for issues
  - User acceptance testing
Day +1:
  - Monitor and fix issues
Day +7:
  - Disable old Firebase project
Day +30:
  - Delete Firebase project
```

#### 7.3 Rollback Plan

1. Keep Firebase project active for 30 days
2. DNS can revert to old frontend
3. Feature flag to switch API endpoints
4. Database snapshots before migration

---

## 5. New Information Architecture

```
tuutta/
├── render.yaml                    # Render.com infrastructure
├── docker-compose.yml             # Local development
├── Makefile                       # Common commands
├── README.md
│
├── backend/                       # Django Backend
│   ├── manage.py
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── development.txt
│   │   └── production.txt
│   │
│   ├── tuutta_backend/           # Django Project
│   │   ├── __init__.py
│   │   ├── settings/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   ├── asgi.py
│   │   └── celery.py
│   │
│   ├── apps/
│   │   ├── accounts/             # Users & Auth
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── tests/
│   │   │
│   │   ├── organizations/        # Multi-tenant
│   │   │   ├── models.py         # Org, Member, Dept, Team
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── tests/
│   │   │
│   │   ├── courses/              # Learning Content
│   │   │   ├── models.py         # Course, Module, Lesson
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── tests/
│   │   │
│   │   ├── assessments/          # Quizzes & Tests
│   │   │   ├── models.py         # Assessment, Question
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── services.py       # Grading logic
│   │   │   └── tests/
│   │   │
│   │   ├── enrollments/          # User-Course Relations
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── tests/
│   │   │
│   │   ├── progress/             # Learning Progress
│   │   │   ├── models.py         # Progress, Events
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── services.py
│   │   │   └── tests/
│   │   │
│   │   ├── gamification/         # XP, Badges
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── services.py
│   │   │   └── tests/
│   │   │
│   │   ├── ai_services/          # AI Integration
│   │   │   ├── services.py       # OpenAI client
│   │   │   ├── views.py
│   │   │   ├── tasks.py          # Celery tasks
│   │   │   └── tests/
│   │   │
│   │   ├── genie/                # AI Course Gen
│   │   │   ├── models.py         # Source, Project, Draft
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── services.py
│   │   │   ├── tasks.py
│   │   │   └── tests/
│   │   │
│   │   ├── certificates/         # Cert Generation
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── services.py       # PDF generation
│   │   │   └── tests/
│   │   │
│   │   ├── notifications/        # Announcements
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── tests/
│   │   │
│   │   └── analytics/            # Reporting
│   │       ├── models.py         # AuditLog
│   │       ├── serializers.py
│   │       ├── views.py
│   │       └── tests/
│   │
│   └── scripts/                  # Migration scripts
│       ├── export_firestore.py
│       ├── import_to_postgres.py
│       └── validate_migration.py
│
├── frontend/                     # React Frontend (existing)
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts            # Django API client
│   │   │   ├── queries/          # React Query hooks
│   │   │   └── ai.ts             # AI client
│   │   ├── store/                # Zustand (updated)
│   │   ├── components/           # (existing)
│   │   └── pages/                # (existing)
│   └── e2e/                      # Playwright tests
│
└── docs/
    ├── api.md                    # API documentation
    ├── deployment.md             # Render deployment
    └── migration.md              # Migration guide
```

---

## 6. Complete Database Schema

```sql
-- ============================================================================
-- TUUTTA DATABASE SCHEMA - PostgreSQL 16 on Render.com
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- USERS & AUTH
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    username VARCHAR(150) UNIQUE NOT NULL,

    first_name VARCHAR(150),
    last_name VARCHAR(150),
    display_name VARCHAR(255),
    photo_url TEXT,
    bio TEXT,

    firebase_uid VARCHAR(128) UNIQUE,  -- Migration field

    subscription_tier VARCHAR(20) DEFAULT 'free',
    stripe_customer_id VARCHAR(255),
    settings JSONB DEFAULT '{}',

    is_active BOOLEAN DEFAULT TRUE,
    is_staff BOOLEAN DEFAULT FALSE,
    is_superuser BOOLEAN DEFAULT FALSE,

    date_joined TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    plan VARCHAR(20) DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'learner',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    job_title VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ============================================================================
-- COURSES
-- ============================================================================

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500),
    description TEXT,
    short_description VARCHAR(500),
    thumbnail_url TEXT,
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',
    skill_level VARCHAR(20),
    estimated_duration INTEGER,
    learning_objectives JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'draft',
    visibility VARCHAR(20) DEFAULT 'organization',
    published_at TIMESTAMP WITH TIME ZONE,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_courses_org ON courses(organization_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_title ON courses USING GIN(title gin_trgm_ops);

CREATE TABLE course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    estimated_duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_modules_course ON course_modules(course_id);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    lesson_type VARCHAR(20) NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    estimated_duration INTEGER,
    content JSONB DEFAULT '{}',
    assessment_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lessons_module ON lessons(module_id);

-- ============================================================================
-- ASSESSMENTS
-- ============================================================================

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    instructions TEXT,
    assessment_type VARCHAR(20) NOT NULL,
    difficulty VARCHAR(20),
    time_limit INTEGER,
    passing_score DECIMAL(5,2) DEFAULT 70,
    max_attempts INTEGER DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT FALSE,
    shuffle_options BOOLEAN DEFAULT FALSE,
    show_correct_answers BOOLEAN DEFAULT TRUE,
    is_published BOOLEAN DEFAULT FALSE,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL,
    order_index INTEGER DEFAULT 0,
    points DECIMAL(5,2) DEFAULT 1,
    explanation TEXT,
    hint TEXT,
    media_url TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    feedback TEXT,
    match_target TEXT
);

CREATE TABLE assessment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_number INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    time_spent INTEGER,
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    percentage DECIMAL(5,2),
    passed BOOLEAN,
    status VARCHAR(20) DEFAULT 'in_progress',
    graded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMP WITH TIME ZONE,
    grader_feedback TEXT
);

CREATE TABLE assessment_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    response_text TEXT,
    selected_options JSONB DEFAULT '[]',
    points_earned DECIMAL(5,2),
    is_correct BOOLEAN,
    feedback TEXT,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- ============================================================================
-- ENROLLMENTS & PROGRESS
-- ============================================================================

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'enrolled',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, course_id, organization_id)
);

CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

CREATE TABLE progress_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

CREATE TABLE module_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progress_record_id UUID NOT NULL REFERENCES progress_records(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started',
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent INTEGER DEFAULT 0,
    UNIQUE(progress_record_id, module_id)
);

CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progress_record_id UUID NOT NULL REFERENCES progress_records(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent INTEGER DEFAULT 0,
    last_position INTEGER,
    UNIQUE(progress_record_id, lesson_id)
);

CREATE TABLE progress_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_user ON progress_events(user_id);
CREATE INDEX idx_events_type ON progress_events(event_type);

-- ============================================================================
-- LEARNING PATHS
-- ============================================================================

CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    visibility VARCHAR(20) DEFAULT 'organization',
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE learning_path_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    UNIQUE(learning_path_id, course_id)
);

-- ============================================================================
-- GAMIFICATION
-- ============================================================================

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    achievement_type VARCHAR(50) NOT NULL,
    requirements JSONB DEFAULT '{}',
    xp_reward INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress DECIMAL(5,2) DEFAULT 0,
    unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, achievement_id)
);

CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    badge_type VARCHAR(50) NOT NULL,
    requirements JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    awarded_by_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE xp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    source VARCHAR(100) NOT NULL,
    source_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_gamification_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- ============================================================================
-- CERTIFICATES
-- ============================================================================

CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    verification_code VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500),
    recipient_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'issued',
    certificate_url TEXT,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    issued_by_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_certificates_verification ON certificates(verification_code);

-- ============================================================================
-- AI & CHAT
-- ============================================================================

CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    subject VARCHAR(100),
    context JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);

-- ============================================================================
-- GENIE AI PIPELINE
-- ============================================================================

CREATE TABLE genie_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source_type VARCHAR(50) NOT NULL,
    file_url TEXT,
    file_name VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'uploaded',
    extracted_content TEXT,
    extraction_metadata JSONB DEFAULT '{}',
    uploaded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE genie_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    current_stage VARCHAR(20) DEFAULT 'analyze',
    stage_statuses JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE genie_project_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES genie_projects(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES genie_sources(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    UNIQUE(project_id, source_id)
);

CREATE TABLE genie_course_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES genie_projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    outline JSONB DEFAULT '{}',
    modules JSONB DEFAULT '[]',
    learning_objectives JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'draft',
    published_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS & ANNOUNCEMENTS
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    message TEXT,
    notification_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    target_audience JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft',
    publish_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    actor_ip VARCHAR(45),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================================
-- USER NOTES & FILES
-- ============================================================================

CREATE TABLE user_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES user_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    title VARCHAR(500),
    content TEXT NOT NULL,
    folder_id UUID REFERENCES user_folders(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500),
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    folder_id UUID REFERENCES user_folders(id) ON DELETE SET NULL,
    extracted_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_organizations_timestamp BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_courses_timestamp BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ... add for other tables

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

INSERT INTO achievements (name, description, achievement_type, requirements, xp_reward) VALUES
('First Steps', 'Complete your first lesson', 'lesson_completion', '{"count": 1}', 10),
('Quick Learner', 'Complete 10 lessons', 'lesson_completion', '{"count": 10}', 50),
('Course Master', 'Complete your first course', 'course_completion', '{"count": 1}', 100),
('Assessment Ace', 'Score 100% on an assessment', 'assessment_score', '{"min_score": 100}', 75),
('Streak Starter', '7-day learning streak', 'streak', '{"days": 7}', 50),
('Dedicated Learner', '30-day learning streak', 'streak', '{"days": 30}', 200);
```

---

## 7. API Design

### 7.1 Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Auth** |
| POST | `/api/v1/auth/register/` | Register new user |
| POST | `/api/v1/auth/login/` | Login, get tokens |
| POST | `/api/v1/auth/logout/` | Logout, blacklist token |
| POST | `/api/v1/auth/token/refresh/` | Refresh access token |
| GET | `/api/v1/auth/me/` | Get current user |
| **Organizations** |
| GET | `/api/v1/organizations/` | List user's orgs |
| POST | `/api/v1/organizations/` | Create org |
| GET | `/api/v1/organizations/{id}/` | Get org details |
| GET | `/api/v1/organizations/{id}/members/` | List members |
| POST | `/api/v1/organizations/{id}/invite/` | Invite member |
| **Courses** |
| GET | `/api/v1/courses/` | List courses |
| POST | `/api/v1/courses/` | Create course |
| GET | `/api/v1/courses/{id}/` | Get course with modules |
| POST | `/api/v1/courses/{id}/publish/` | Publish course |
| POST | `/api/v1/courses/{id}/archive/` | Archive course |
| GET | `/api/v1/courses/{id}/modules/` | List modules |
| GET | `/api/v1/courses/{id}/modules/{mid}/lessons/` | List lessons |
| **Enrollments** |
| GET | `/api/v1/enrollments/` | List enrollments |
| POST | `/api/v1/enrollments/` | Enroll user |
| POST | `/api/v1/enrollments/bulk/` | Bulk enroll |
| GET | `/api/v1/enrollments/my/` | My enrollments |
| **Progress** |
| GET | `/api/v1/progress/{courseId}/` | Get course progress |
| POST | `/api/v1/progress/lessons/{id}/complete/` | Complete lesson |
| GET | `/api/v1/progress/dashboard/` | Progress dashboard |
| **Assessments** |
| GET | `/api/v1/assessments/` | List assessments |
| POST | `/api/v1/assessments/{id}/start/` | Start attempt |
| POST | `/api/v1/assessments/{id}/submit/` | Submit attempt |
| GET | `/api/v1/assessments/{id}/results/` | Get results |
| **AI** |
| POST | `/api/v1/ai/chat/` | Chat completion |
| POST | `/api/v1/ai/transcribe/` | Audio transcription |
| **Gamification** |
| GET | `/api/v1/achievements/` | List achievements |
| GET | `/api/v1/leaderboard/` | Get leaderboard |

---

## 8. Deployment on Render

### 8.1 Quick Start

1. **Fork/Push your code to GitHub**

2. **Create Render Account** at [render.com](https://render.com)

3. **Create PostgreSQL Database**
   - Dashboard → New → PostgreSQL
   - Name: `tuutta-db`
   - Plan: Starter ($7/mo)

4. **Create Redis** (if available, or use Upstash)
   - Dashboard → New → Redis
   - Name: `tuutta-redis`

5. **Create Web Service (Django)**
   - Dashboard → New → Web Service
   - Connect GitHub repo
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements/production.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start Command: `gunicorn tuutta_backend.wsgi:application`

6. **Create Background Worker (Celery)**
   - Dashboard → New → Background Worker
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements/production.txt`
   - Start Command: `celery -A tuutta_backend worker -l info`

7. **Create Static Site (React)**
   - Dashboard → New → Static Site
   - Root Directory: `frontend`
   - Build Command: `npm ci && npm run build`
   - Publish Directory: `dist`

8. **Set Environment Variables**
   - Add all required env vars in each service

### 8.2 Environment Variables

**Django API Service:**
```
DJANGO_SETTINGS_MODULE=tuutta_backend.settings.production
SECRET_KEY=<auto-generated>
DATABASE_URL=<from-database>
REDIS_URL=<from-redis>
ALLOWED_HOSTS=tuutta-api.onrender.com,api.tuutta.com
CORS_ALLOWED_ORIGINS=https://tuutta.com,https://tuutta-frontend.onrender.com
OPENAI_API_KEY=sk-xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_STORAGE_BUCKET_NAME=tuutta-assets
AWS_S3_ENDPOINT_URL=https://xxx.r2.cloudflarestorage.com
```

**React Frontend:**
```
VITE_API_URL=https://tuutta-api.onrender.com/api/v1
VITE_WS_URL=wss://tuutta-api.onrender.com
```

---

## 9. Cost Analysis

### 9.1 Render.com Pricing

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| **Starter Tier** |
| Web Service (Django) | Starter | $7 |
| Background Worker | Starter | $7 |
| PostgreSQL | Starter (1GB) | $7 |
| Redis | Starter | $10 |
| Static Site | Free | $0 |
| **Subtotal** | | **$31/mo** |

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| **Production Tier** |
| Web Service (Django) | Standard | $25 |
| Background Worker | Standard | $25 |
| PostgreSQL | Standard (10GB) | $20 |
| Redis | Standard | $25 |
| Static Site | Free | $0 |
| **Subtotal** | | **$95/mo** |

### 9.2 Additional Services

| Service | Provider | Cost |
|---------|----------|------|
| Object Storage | Cloudflare R2 | ~$5/mo (10GB) |
| Email | SendGrid/Resend | $0-20/mo |
| Domain | Cloudflare | $10/yr |
| SSL | Render (included) | $0 |

### 9.3 Firebase vs Render Comparison

| Metric | Firebase | Render |
|--------|----------|--------|
| Pricing Model | Pay-per-use | Fixed monthly |
| 10K MAU | ~$50-200 | $31 |
| 100K MAU | ~$500-2000 | $95 |
| Database Size | Per-read/write | Per-GB |
| Predictability | Low | High |
| Vendor Lock-in | High | Low |

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Data loss | Full Firestore export, PostgreSQL backups |
| Downtime | Parallel running during transition |
| Performance issues | Load testing before cutover |
| Auth problems | Keep Firebase active 30 days |
| User confusion | Clear communication, same UI |

---

## Summary

This migration moves TuuttaWebApp from Firebase to a modern Django/PostgreSQL stack on Render.com:

- **No Firebase needed** - Completely replaced
- **Predictable costs** - ~$31-95/month vs unpredictable Firebase
- **Full SQL power** - Complex queries, JOINs, transactions
- **Django Admin** - Built-in admin panel
- **Portable** - No vendor lock-in
- **~16 weeks** to complete migration

The React frontend remains largely unchanged, just switching from Firebase SDK to REST API calls.


Django vs Firebase: Key Benefits
1. Cost Predictability
Aspect	Firebase	Django on Render
Pricing	Pay-per-read/write/user	Fixed monthly
10K users	$50-200/mo (variable)	$31/mo (fixed)
100K users	$500-2000/mo	$95/mo
Surprise bills	Common	Never
2. Database Power
Feature	Firestore (NoSQL)	PostgreSQL
JOINs	Not supported	Full support
Transactions	Limited	Full ACID
Complex queries	Very limited	Unlimited
Aggregations	Client-side only	Server-side (fast)
Reporting	Painful	Easy
Data integrity	Manual	Foreign keys, constraints
Example - Get enrollment stats by department:


// Firebase: Multiple queries + client-side processing
const enrollments = await getDocs(collection(db, 'enrollments'));
const users = await getDocs(collection(db, 'users'));
const depts = await getDocs(collection(db, 'departments'));
// Then manually join and aggregate in JavaScript...

-- PostgreSQL: Single query, instant results
SELECT d.name, COUNT(*) as enrollments, AVG(e.progress_percentage)
FROM enrollments e
JOIN organization_members m ON e.user_id = m.user_id
JOIN departments d ON m.department_id = d.id
WHERE e.status = 'completed'
GROUP BY d.name
ORDER BY enrollments DESC;
3. Admin Panel (Free)
Firebase	Django
Build your own admin UI	Built-in Django Admin
Weeks of development	Ready in minutes
No audit trail	Automatic history
Django Admin gives you:

User management
Content editing
Data export/import
Audit logs
Role-based access
Search & filtering
4. No Vendor Lock-in
Firebase	Django
Locked to Google Cloud	Deploy anywhere
Proprietary SDK	Standard Python
Migration = rewrite	Portable code
Django can run on:

Render.com
AWS (EC2, ECS, Lambda)
Google Cloud Run
Azure
DigitalOcean
Heroku
Your own servers
5. Better Testing & Development
Aspect	Firebase	Django
Local dev	Emulator (limited)	Full local stack
Unit tests	Complex mocking	Simple, fast
CI/CD	Needs emulator	Standard pytest
Debugging	Limited	Full Python debugger
6. Security Model
Firebase	Django
Security rules (separate language)	Python code (same language)
Hard to test	Easy to test
Easy to misconfigure	Type-safe permissions
Client has direct DB access	API layer protection

# Django: Clear, testable permissions
class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOrgMember]
    
    def get_queryset(self):
        # Users only see their org's courses
        return Course.objects.filter(
            organization__members__user=self.request.user
        )
7. AI Integration (Your Current Pain Point)
Firebase Functions	Django
Cold starts (slow)	Always warm
Egress issues (your current bug)	Direct outbound
Complex deployment	Simple pip install
Browser fallback needed	No workarounds
Your current issue from MEMORY.md:

genieChatCompletion Cloud Run function cannot make outbound HTTP calls to api.openai.com

With Django on Render: Just works. No VPC issues, no egress configuration.

8. Code Organization
Firebase	Django
Business logic scattered	Organized in apps
No standard structure	Convention over configuration
Services, contexts, stores	Models, Views, Serializers

# Django's clean structure
apps/
├── accounts/      # Users, auth
├── courses/       # Learning content
├── assessments/   # Quizzes
├── enrollments/   # User-course relations
└── ai_services/   # OpenAI integration
9. API Design
Firebase	Django REST Framework
Build everything yourself	Batteries included
Manual serialization	Auto serializers
No documentation	Auto OpenAPI/Swagger
No pagination	Built-in pagination
No filtering	Built-in filtering
10. Real Numbers from Your App
Current Firebase Issue	Django Solution
Firestore reads costly at scale	PostgreSQL: unlimited reads
40+ services, contexts scattered	12 organized Django apps
Browser fallback for AI	Direct OpenAI calls
Complex security rules	Python permission classes
No admin panel	Django Admin free
Summary: Why Migrate?
Benefit	Impact
Predictable costs	No surprise bills
SQL power	Complex queries easy
Free admin panel	Save weeks of dev
No vendor lock-in	Future flexibility
Fix AI issues	No more egress problems
Better testing	Faster development
Cleaner code	Easier maintenance
The main tradeoff: 16 weeks of migration work for long-term benefits in cost, scalability, and developer experience.
