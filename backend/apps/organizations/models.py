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

    def __str__(self):
        return self.name


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

    def __str__(self):
        return self.name


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

    def __str__(self):
        return self.name
