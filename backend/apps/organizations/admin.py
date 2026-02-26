from django.contrib import admin
from .models import (
    Organization,
    OrganizationMember,
    Department,
    Team,
    OrganizationRequest,
    OrganizationJoinRequest,
    OrganizationInviteCode,
)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'plan', 'is_active', 'created_at']
    list_filter = ['plan', 'is_active']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    list_display = ['user', 'organization', 'role', 'status', 'joined_at']
    list_filter = ['role', 'status']


admin.site.register(Department)
admin.site.register(Team)
admin.site.register(OrganizationRequest)
admin.site.register(OrganizationJoinRequest)
admin.site.register(OrganizationInviteCode)
