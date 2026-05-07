from django.contrib import admin
from .models import Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['job_number', 'customer', 'status', 'progress']
    list_filter = ['status']
    search_fields = ['job_number', 'customer']
