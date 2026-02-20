from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['email', 'username', 'display_name', 'subscription_tier', 'is_staff', 'created_at']
    list_filter = ['subscription_tier', 'is_staff', 'is_active']
    search_fields = ['email', 'username', 'display_name']
    ordering = ['-created_at']
    fieldsets = UserAdmin.fieldsets + (
        ('Profile', {'fields': ('display_name', 'photo_url', 'bio', 'firebase_uid')}),
        ('Subscription', {'fields': ('subscription_tier', 'stripe_customer_id')}),
        ('Activity', {'fields': ('last_active_at', 'settings')}),
    )
