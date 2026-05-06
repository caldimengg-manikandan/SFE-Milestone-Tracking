from django.contrib import admin
from .models import Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'client', 'status', 'progress']
    list_filter = ['status']
    search_fields = ['name', 'code', 'client']
