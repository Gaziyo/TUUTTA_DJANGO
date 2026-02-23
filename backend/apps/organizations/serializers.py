from rest_framework import serializers
from .models import Organization, OrganizationMember, Department, Team


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
