from rest_framework import serializers
from django.utils.text import slugify
from .models import (
    Organization,
    OrganizationMember,
    Department,
    Team,
    OrganizationRequest,
    OrganizationJoinRequest,
    OrganizationInviteCode,
)


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'description', 'logo_url', 'plan', 'settings', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class OrganizationMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationMember
        fields = ['id', 'organization', 'user', 'role', 'department', 'team', 'job_title', 'status', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class OrganizationMemberDetailSerializer(serializers.ModelSerializer):
    """Membership detail including user email/name for the current-user memberships endpoint."""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    org_name = serializers.CharField(source='organization.name', read_only=True)
    org_slug = serializers.SlugField(source='organization.slug', read_only=True)

    def get_user_name(self, obj):
        return obj.user.display_name or obj.user.username

    class Meta:
        model = OrganizationMember
        fields = [
            'id', 'organization', 'org_name', 'org_slug',
            'user', 'user_email', 'user_name',
            'role', 'department', 'team', 'job_title', 'status', 'joined_at',
        ]
        read_only_fields = ['id', 'joined_at', 'user_email', 'user_name', 'org_name', 'org_slug']


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'organization', 'name', 'description', 'parent', 'manager', 'created_at']
        read_only_fields = ['id', 'created_at']


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['id', 'organization', 'department', 'name', 'description', 'lead', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrganizationRequestSerializer(serializers.ModelSerializer):
    slug = serializers.CharField(max_length=255)
    requested_by_email = serializers.EmailField(source='requested_by.email', read_only=True)
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True)
    created_org_slug = serializers.CharField(source='created_org.slug', read_only=True)

    def validate_slug(self, value):
        normalized = slugify(value or '')
        if not normalized:
            raise serializers.ValidationError('Use lowercase letters, numbers, and hyphens only.')

        existing_request = OrganizationRequest.objects.filter(slug=normalized)
        if self.instance:
            existing_request = existing_request.exclude(pk=self.instance.pk)
        if existing_request.exists():
            raise serializers.ValidationError('An organization request for this slug already exists.')

        return normalized

    class Meta:
        model = OrganizationRequest
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'plan',
            'status',
            'review_note',
            'requested_by',
            'requested_by_email',
            'reviewed_by',
            'reviewed_by_email',
            'reviewed_at',
            'created_org',
            'created_org_slug',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'status',
            'requested_by',
            'requested_by_email',
            'reviewed_by',
            'reviewed_by_email',
            'reviewed_at',
            'created_org',
            'created_org_slug',
            'created_at',
            'updated_at',
        ]


class OrganizationJoinRequestSerializer(serializers.ModelSerializer):
    requester_email = serializers.EmailField(source='requester.email', read_only=True)
    requester_name = serializers.SerializerMethodField()
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True)

    def get_requester_name(self, obj):
        return obj.requester.display_name or obj.requester.username

    class Meta:
        model = OrganizationJoinRequest
        fields = [
            'id',
            'organization',
            'requester',
            'requester_email',
            'requester_name',
            'note',
            'status',
            'reviewed_by',
            'reviewed_by_email',
            'reviewed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'organization',
            'requester',
            'requester_email',
            'requester_name',
            'status',
            'reviewed_by',
            'reviewed_by_email',
            'reviewed_at',
            'created_at',
            'updated_at',
        ]


class OrganizationInviteCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationInviteCode
        fields = [
            'id',
            'organization',
            'code',
            'role',
            'is_active',
            'max_uses',
            'used_count',
            'expires_at',
            'created_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'organization',
            'code',
            'used_count',
            'created_by',
            'created_at',
            'updated_at',
        ]
