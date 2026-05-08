from django.contrib import admin
from .models import Project, StructuralScheduleItem

class StructuralScheduleItemInline(admin.TabularInline):
    model = StructuralScheduleItem
    extra = 1

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'customer_name', 'project_manager_name', 'status', 'total_ton']
    list_filter = ['status']
    search_fields = ['name', 'code', 'customer_name']
    inlines = [StructuralScheduleItemInline]

@admin.register(StructuralScheduleItem)
class StructuralScheduleItemAdmin(admin.ModelAdmin):
    list_display = ['project', 'seq_no', 'tons', 'scheduled_erection_date', 'dwg_status']
    list_filter = ['project', 'dwg_status']
    search_fields = ['seq_no', 'item_description']
