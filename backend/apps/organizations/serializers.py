from rest_framework import serializers
from .models import Organization, OrganizationMember, Department, Team


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'description', 'logo_url', 'plan', 'settings', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrganizationMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationMember
        fields = ['id', 'organization', 'user', 'role', 'department', 'team', 'job_title', 'status', 'joined_at']
        read_only_fields = ['id', 'joined_at']


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
