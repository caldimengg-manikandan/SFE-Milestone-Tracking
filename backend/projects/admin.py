from django.contrib import admin
from .models import Project, StructuralSchedule

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'customer_name', 'status', 'progress']
    list_filter = ['status']
    search_fields = ['name', 'code', 'customer_name']

@admin.register(StructuralSchedule)
class StructuralScheduleAdmin(admin.ModelAdmin):
    list_display = ['project', 'seq_no', 'tons', 'rts_date', 'scheduled_erection_date']
    list_filter = ['project']
