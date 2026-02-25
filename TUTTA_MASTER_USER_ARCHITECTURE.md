# Tutta Master User Architecture Guide
## Django + React + PostgreSQL on Render

Complete implementation guide for Django backend with Master User hierarchy, React frontend, and PostgreSQL on Render.com.

---

## 1. System Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite + TypeScript | SPA with role-based routing |
| **Backend** | Django 5 + Django REST Framework | REST API, business logic |
| **Database** | PostgreSQL 15 | Primary data store (Render) |
| **Cache/Queue** | Redis | Celery broker, session cache |
| **Background** | Celery | Async tasks, ML pipelines |
| **Auth** | JWT (SimpleJWT) | Stateless authentication |
| **Deploy** | Render.com | Web service + PostgreSQL |

### Data Flow

```
REACT FRONTEND (tutta-frontend.onrender.com)
    ↓ HTTPS / Axios + JWT Header
DJANGO REST API (tutta-api.onrender.com)
    ↓ Django ORM
POSTGRESQL (tutta-db.internal.render.com)
```

### Authentication Flow

```
USER LOGIN
    ↓
POST /api/v1/auth/login/
    ↓
Django validates credentials
    ↓
Returns: {access_token, refresh_token, user}
    ↓
React stores tokens in httpOnly cookie or secure storage
    ↓
Subsequent requests: Authorization: Bearer <access_token>
```

---

## 2. Django Models

### 2.1 User Model (`backend/apps/accounts/models.py`)

```python
"""
Tutta User Model with Master User Hierarchy
"""

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import uuid


class UserManager(BaseUserManager):
    """Custom user manager with email as username."""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('Email is required'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_master_user', True)
        extra_fields.setdefault('user_type', 'master')
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Extended user model with master user hierarchy.
    Django is the sole source of truth for authentication and permissions.
    """
    
    USER_TYPE_CHOICES = [
        ('master', _('Master User')),
        ('org_admin', _('Organization Admin')),
        ('manager', _('Manager')),
        ('learner', _('Learner')),
    ]
    
    STATUS_CHOICES = [
        ('pending', _('Pending Approval')),
        ('active', _('Active')),
        ('suspended', _('Suspended')),
        ('deactivated', _('Deactivated')),
    ]
    
    # Override username - use email instead
    username = None
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True)
    
    # User Hierarchy
    user_type = models.CharField(
        max_length=20,
        choices=USER_TYPE_CHOICES,
        default='learner'
    )
    is_master_user = models.BooleanField(
        default=False,
        help_text=_('Can create and manage organizations at platform level')
    )
    
    # Organization Context
    primary_org = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='primary_members'
    )
    
    # Profile
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    phone = models.CharField(max_length=50, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    language = models.CharField(max_length=10, default='en')
    avatar_url = models.URLField(blank=True)
    
    # Onboarding State
    onboarding_completed = models.BooleanField(default=False)
    onboarding_step = models.CharField(
        max_length=50,
        default='profile',
        help_text=_('Current onboarding step')
    )
    
    # Security
    last_active_at = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    objects = UserManager()
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_type']),
            models.Index(fields=['status']),
            models.Index(fields=['primary_org']),
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        return f"{self.email} ({self.user_type})"
    
    # Permission Properties
    @property
    def can_create_organization(self):
        """Only master users can create orgs."""
        return self.is_master_user or self.is_superuser
    
    @property
    def can_manage_users(self):
        """Can manage users in their org."""
        return self.user_type in ['master', 'org_admin', 'manager']
    
    @property
    def can_access_admin(self):
        """Can access admin portal."""
        return self.user_type in ['master', 'org_admin', 'manager']
    
    @property
    def can_manage_content(self):
        """Can create/edit courses and assessments."""
        return self.user_type in ['master', 'org_admin', 'instructor']
    
    def update_last_active(self):
        """Update last active timestamp."""
        self.last_active_at = timezone.now()
        self.save(update_fields=['last_active_at'])
    
    def get_organizations(self):
        """Get all organizations user belongs to."""
        return OrganizationMember.objects.filter(
            user=self
        ).select_related('organization')
    
    def set_primary_org(self, org):
        """Switch primary organization context."""
        if OrganizationMember.objects.filter(
            user=self, 
            organization=org,
            status='active'
        ).exists():
            self.primary_org = org
            self.save(update_fields=['primary_org'])
            return True
        return False
    
    def get_org_role(self, org):
        """Get user's role in specific organization."""
        try:
            member = OrganizationMember.objects.get(
                user=self,
                organization=org
            )
            return member.role
        except OrganizationMember.DoesNotExist:
            return None


class OrganizationMember(models.Model):
    """Membership linking users to organizations with specific roles."""
    
    ROLE_CHOICES = [
        ('owner', _('Owner')),
        ('admin', _('Admin')),
        ('manager', _('Manager')),
        ('instructor', _('Instructor')),
        ('learner', _('Learner')),
    ]
    
    STATUS_CHOICES = [
        ('invited', _('Invited')),
        ('pending', _('Pending Approval')),
        ('active', _('Active')),
        ('suspended', _('Suspended')),
        ('removed', _('Removed')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='org_memberships'
    )
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='learner')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='invited')
    
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invited_members'
    )
    invited_at = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(null=True, blank=True)
    
    department = models.ForeignKey(
        'organizations.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='members'
    )
    team = models.ForeignKey(
        'organizations.Team',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='members'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'organization_members'
        unique_together = ['organization', 'user']
        indexes = [
            models.Index(fields=['organization', 'role']),
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['user', 'status']),
        ]
    
    def __str__(self):
        return f"{self.user.email} in {self.organization.name} ({self.role})"
    
    def activate(self):
        self.status = 'active'
        self.joined_at = timezone.now()
        self.save(update_fields=['status', 'joined_at'])
    
    def is_active_member(self):
        return self.status == 'active'


class OrgJoinRequest(models.Model):
    """Request to join an organization (for approval workflows)."""
    
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('approved', _('Approved')),
        ('rejected', _('Rejected')),
    ]
    
    TYPE_CHOICES = [
        ('invite_code', _('Invite Code')),
        ('email_domain', _('Email Domain Match')),
        ('manual_request', _('Manual Request')),
        ('sso_auto', _('SSO Auto-Provision')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='join_requests'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='org_join_requests'
    )
    
    request_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    invite_code = models.CharField(max_length=100, blank=True)
    message = models.TextField(blank=True)
    
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_join_requests'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'org_join_requests'
        ordering = ['-created_at']
        unique_together = ['organization', 'user', 'status']
    
    def approve(self, reviewed_by_user, note=''):
        self.status = 'approved'
        self.reviewed_by = reviewed_by_user
        self.reviewed_at = timezone.now()
        self.review_note = note
        self.save()
        
        membership, _ = OrganizationMember.objects.update_or_create(
            organization=self.organization,
            user=self.user,
            defaults={
                'role': 'learner',
                'status': 'active',
                'joined_at': timezone.now()
            }
        )
        
        if not self.user.primary_org:
            self.user.primary_org = self.organization
            self.user.save(update_fields=['primary_org'])
        
        return membership
    
    def reject(self, reviewed_by_user, note=''):
        self.status = 'rejected'
        self.reviewed_by = reviewed_by_user
        self.reviewed_at = timezone.now()
        self.review_note = note
        self.save()


class RefreshToken(models.Model):
    """JWT refresh token tracking for logout functionality."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refresh_tokens')
    token = models.TextField()
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_revoked = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'refresh_tokens'
        indexes = [
            models.Index(fields=['user', 'is_revoked']),
            models.Index(fields=['expires_at']),
        ]
```

### 2.2 Organization Model (`backend/apps/organizations/models.py`)

```python
"""
Organization model with creation restrictions.
Only master users can create organizations.
"""

from django.db import models
from django.conf import settings
from django.utils.text import slugify
import uuid


class Organization(models.Model):
    """Organization/tenant model. Created exclusively by master users."""
    
    STATUS_CHOICES = [
        ('pending', _('Pending Setup')),
        ('active', _('Active')),
        ('suspended', _('Suspended')),
        ('deleted', _('Deleted')),
    ]
    
    PLAN_CHOICES = [
        ('free', _('Free')),
        ('starter', _('Starter')),
        ('professional', _('Professional')),
        ('enterprise', _('Enterprise')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Identification
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=100)
    domain = models.CharField(
        max_length=255,
        blank=True,
        help_text=_('Custom domain for SSO')
    )
    
    # Creation tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_organizations'
    )
    
    # Status & Billing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    
    # Features
    features = models.JSONField(default=dict, help_text=_('Enabled features'))
    settings = models.JSONField(default=dict, help_text=_('Org configuration'))
    
    # Branding
    logo_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default='#4F46E5')
    
    # Onboarding
    setup_completed = models.BooleanField(default=False)
    setup_step = models.CharField(max_length=50, default='profile')
    
    # Invitations
    invite_code = models.CharField(max_length=32, unique=True, blank=True)
    allow_email_domain_join = models.BooleanField(default=False)
    allowed_email_domains = models.JSONField(default=list)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'organizations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status']),
            models.Index(fields=['created_by']),
        ]
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:100]
        if not self.invite_code:
            self.invite_code = uuid.uuid4().hex[:16]
        super().save(*args, **kwargs)
    
    @property
    def member_count(self):
        return self.members.filter(status='active').count()
    
    def can_user_join(self, user):
        """Check if user can auto-join this org."""
        if not self.allow_email_domain_join:
            return False
        domain = user.email.split('@')[1]
        return domain in self.allowed_email_domains
```

---

## 3. Django REST API

### 3.1 JWT Authentication (`backend/apps/accounts/authentication.py`)

```python
"""
JWT Authentication for Django REST Framework.
Uses SimpleJWT for token generation/validation.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class CustomJWTAuthentication(JWTAuthentication):
    """Custom JWT authentication with user status checks."""
    
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        
        # Check if user is active
        if user.status != 'active':
            raise InvalidToken('User account is not active')
        
        # Check if account is locked
        from django.utils import timezone
        if user.locked_until and user.locked_until > timezone.now():
            raise InvalidToken('Account is temporarily locked')
        
        return user
```

### 3.2 Auth Views (`backend/apps/accounts/views.py`)

```python
"""
Authentication views using Django REST Framework + SimpleJWT.
"""

from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db import transaction

from .models import User, OrganizationMember, OrgJoinRequest
from .permissions import IsMasterUser, IsOrgAdmin


class UserSerializer(serializers.ModelSerializer):
    """User serializer with org context."""
    organizations = serializers.SerializerMethodField()
    primary_org_role = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'user_type',
            'is_master_user', 'primary_org', 'organizations',
            'primary_org_role', 'onboarding_completed', 'onboarding_step',
            'avatar_url', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'email', 'user_type', 'is_master_user']
    
    def get_organizations(self, obj):
        return [
            {
                'id': str(m.organization.id),
                'name': m.organization.name,
                'slug': m.organization.slug,
                'role': m.role,
                'status': m.status
            }
            for m in obj.org_memberships.filter(status='active')
        ]
    
    def get_primary_org_role(self, obj):
        if not obj.primary_org:
            return None
        try:
            member = OrganizationMember.objects.get(
                user=obj, organization=obj.primary_org
            )
            return member.role
        except OrganizationMember.DoesNotExist:
            return None


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class AuthViewSet(viewsets.ViewSet):
    """Authentication endpoints."""
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'], url_path='login')
    def login(self, request):
        """Authenticate user and return JWT tokens."""
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        user = authenticate(request, email=email, password=password)
        
        if not user:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if user.status != 'active':
            return Response(
                {'error': 'Account is not active'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Update last active
        user.update_last_active()
        
        return Response({
            'user': UserSerializer(user).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'expires_in': 3600  # 1 hour
        })
    
    @action(detail=False, methods=['post'], url_path='refresh')
    def refresh(self, request):
        """Refresh access token."""
        refresh_token = request.data.get('refresh_token')
        if not refresh_token:
            return Response(
                {'error': 'Refresh token required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            refresh = RefreshToken(refresh_token)
            return Response({
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'expires_in': 3600
            })
        except Exception as e:
            return Response(
                {'error': 'Invalid refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    @action(detail=False, methods=['post'], url_path='logout')
    def logout(self, request):
        """Blacklist refresh token."""
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        return Response({'message': 'Logged out successfully'})
    
    @action(detail=False, methods=['get'], url_path='me', permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current user profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='switch-org', permission_classes=[IsAuthenticated])
    def switch_org(self, request):
        """Switch user's primary organization."""
        org_id = request.data.get('organization_id')
        if not org_id:
            return Response({'error': 'organization_id required'}, status=400)
        
        from apps.organizations.models import Organization
        try:
            org = Organization.objects.get(id=org_id)
        except Organization.DoesNotExist:
            return Response({'error': 'Organization not found'}, status=404)
        
        if request.user.set_primary_org(org):
            serializer = UserSerializer(request.user)
            return Response({'user': serializer.data})
        
        return Response(
            {'error': 'Not a member of this organization'},
            status=status.HTTP_403_FORBIDDEN
        )
```

### 3.3 Organization Views (`backend/apps/organizations/views.py`)

```python
"""
Organization views with master user creation restriction.
"""

from rest_framework import viewsets, serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from apps.accounts.permissions import IsMasterUser, IsOrgAdmin, IsOrgMember, IsOwnerOrAdmin
from apps.accounts.models import OrganizationMember
from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    member_count = serializers.ReadOnlyField()
    my_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'domain', 'status', 'plan',
            'logo_url', 'primary_color', 'member_count',
            'my_role', 'invite_code', 'allow_email_domain_join',
            'setup_completed', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'invite_code', 'created_at', 'slug']
    
    def get_my_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        try:
            member = OrganizationMember.objects.get(
                user=request.user, organization=obj
            )
            return member.role
        except OrganizationMember.DoesNotExist:
            return None


class OrganizationViewSet(viewsets.ModelViewSet):
    """Organization CRUD with master user restriction."""
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    lookup_field = 'slug'
    
    def get_permissions(self):
        if self.action == 'create':
            return [IsMasterUser()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        elif self.action == 'list':
            return [IsAuthenticated()]
        return [IsOrgMember()]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_master_user:
            return Organization.objects.all()
        
        org_ids = OrganizationMember.objects.filter(
            user=user,
            status='active'
        ).values_list('organization_id', flat=True)
        
        return Organization.objects.filter(id__in=org_ids)
    
    def perform_create(self, serializer):
        with transaction.atomic():
            org = serializer.save(
                created_by=self.request.user,
                status='active'
            )
            
            OrganizationMember.objects.create(
                organization=org,
                user=self.request.user,
                role='owner',
                status='active'
            )
            
            if not self.request.user.primary_org:
                self.request.user.primary_org = org
                self.request.user.save(update_fields=['primary_org'])
    
    @action(detail=True, methods=['post'], permission_classes=[IsOrgAdmin])
    def invite(self, request, slug=None):
        """Invite user to organization."""
        org = self.get_object()
        email = request.data.get('email')
        role = request.data.get('role', 'learner')
        
        if not email:
            return Response({'error': 'Email required'}, status=400)
        
        from apps.accounts.models import User
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = User.objects.create(
                email=email,
                status='pending',
                onboarding_step='org_selection'
            )
        
        member, created = OrganizationMember.objects.update_or_create(
            organization=org,
            user=user,
            defaults={
                'role': role,
                'status': 'invited',
                'invited_by': request.user,
                'invited_at': timezone.now()
            }
        )
        
        # TODO: Send invitation email via Celery
        
        return Response({
            'message': f'Invitation sent to {email}',
            'membership_id': str(member.id)
        })
    
    @action(detail=False, methods=['get'])
    def discover(self, request):
        """Discover organizations by email domain."""
        domain = request.user.email.split('@')[1]
        
        orgs = Organization.objects.filter(
            allow_email_domain_join=True,
            allowed_email_domains__contains=[domain],
            status='active'
        )
        
        serializer = self.get_serializer(orgs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def request_join(self, request, slug=None):
        """Request to join an organization."""
        org = self.get_object()
        
        if OrganizationMember.objects.filter(
            organization=org,
            user=request.user
        ).exists():
            return Response(
                {'error': 'Already a member'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        request_type = 'manual_request'
        if org.can_user_join(request.user):
            request_type = 'email_domain'
        
        join_request, created = OrgJoinRequest.objects.get_or_create(
            organization=org,
            user=request.user,
            status='pending',
            defaults={
                'request_type': request_type,
                'message': request.data.get('message', '')
            }
        )
        
        if not created:
            return Response(
                {'error': 'Join request already pending'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if request_type == 'email_domain':
            join_request.approve(
                reviewed_by_user=None,
                note='Auto-approved by email domain match'
            )
            return Response({
                'message': 'Joined organization automatically',
                'auto_approved': True
            })
        
        return Response({
            'message': 'Join request submitted',
            'request_id': str(join_request.id)
        })
```

---

## 4. React Frontend Integration

### 4.1 Auth Context (`frontend/src/context/AuthContext.tsx`)

```typescript
"""
Authentication context for React frontend.
Manages JWT tokens, user state, and org context.
"""

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://tutta-api.onrender.com/api/v1';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'master' | 'org_admin' | 'manager' | 'learner';
  is_master_user: boolean;
  primary_org: string | null;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    status: string;
  }>;
  onboarding_completed: boolean;
  onboarding_step: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(localStorage.getItem('refresh_token'));

  // Axios instance with auth header
  const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add auth header to requests
  api.interceptors.request.use((config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  // Handle 401 errors - refresh token
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      if (error.response?.status === 401 && !originalRequest._retry && refreshTokenValue) {
        originalRequest._retry = true;
        
        try {
          const response = await axios.post(`${API_URL}/auth/refresh/`, {
            refresh_token: refreshTokenValue
          });
          
          const { access_token, refresh_token } = response.data;
          setAccessToken(access_token);
          setRefreshTokenValue(refresh_token);
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          logout();
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login/`, {
      email,
      password
    });
    
    const { user, access_token, refresh_token } = response.data;
    
    setUser(user);
    setAccessToken(access_token);
    setRefreshTokenValue(refresh_token);
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
  };

  const logout = async () => {
    if (refreshTokenValue) {
      try {
        await axios.post(`${API_URL}/auth/logout/`, {
          refresh_token: refreshTokenValue
        });
      } catch (e) {
        // Ignore error
      }
    }
    
    setUser(null);
    setAccessToken(null);
    setRefreshTokenValue(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  const switchOrganization = async (orgId: string) => {
    const response = await api.post('/auth/switch-org/', {
      organization_id: orgId
    });
    setUser(response.data.user);
  };

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (!accessToken) {
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await api.get('/auth/me/');
        setUser(response.data);
      } catch (error) {
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      switchOrganization,
      refreshToken: () => Promise.resolve()
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## 5. Render.com Deployment Configuration

### 5.1 Render Settings

```yaml
# render.yaml
services:
  # Django Web Service
  - type: web
    name: tutta-api
    runtime: python
    buildCommand: |
      pip install -r requirements.txt
      python manage.py collectstatic --no-input
      python manage.py migrate
    startCommand: gunicorn tuutta_backend.wsgi:application --bind 0.0.0.0:$PORT
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: tuutta_backend.settings_production
      - key: DATABASE_URL
        fromDatabase:
          name: tutta-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: ALLOWED_HOSTS
        value: tutta-api.onrender.com,api.tutta.app
      - key: CORS_ALLOWED_ORIGINS
        value: https://tutta.onrender.com,https://tutta.app
      - key: REDIS_URL
        fromService:
          type: redis
          name: tutta-redis
          property: connectionString

  # React Frontend (Static Site)
  - type: static
    name: tutta-frontend
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    envVars:
      - key: VITE_API_URL
        value: https://tutta-api.onrender.com/api/v1

databases:
  - name: tutta-db
    databaseName: tutta
    user: tutta
    plan: standard

redis:
  - name: tutta-redis
    plan: free
```

### 5.2 Django Production Settings

```python
# backend/tuutta_backend/settings_production.py

from .settings import *
import dj_database_url

DEBUG = False

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# Database
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600
    )
}

# Security
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# CORS
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')

# Static files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# Celery (using Redis)
CELERY_BROKER_URL = os.environ.get('REDIS_URL')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL')
```

---

## 6. Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://tutta:password@localhost:5432/tutta

# Security
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=tutta-api.onrender.com,localhost

# CORS
CORS_ALLOWED_ORIGINS=https://tutta.onrender.com,http://localhost:5173

# Redis (Celery)
REDIS_URL=redis://localhost:6379/0

# Email (for invitations)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key
```

### Frontend (.env)

```bash
VITE_API_URL=https://tutta-api.onrender.com/api/v1
VITE_APP_NAME=Tutta
VITE_APP_URL=https://tutta.onrender.com
```

---

## Summary

This architecture provides:

1. **Master User Control**: Django enforces `is_master_user` check on org creation
2. **JWT Authentication**: Stateless tokens, refresh token rotation
3. **PostgreSQL on Render**: Managed database with backups
4. **Role-Based Access**: Master → Org Admin → Manager → Learner
5. **React + Vite Frontend**: Modern SPA with axios interceptors
6. **Production Ready**: SSL, secure cookies, CORS, static files

No Firebase - pure Django + React stack on Render.com.
