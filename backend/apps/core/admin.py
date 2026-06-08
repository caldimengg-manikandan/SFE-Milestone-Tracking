"""Core admin registrations."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from apps.core.models import User, Contact




@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "contact_type", "email", "phone")
    list_filter = ("contact_type",)
    search_fields = ("name", "company", "email")
