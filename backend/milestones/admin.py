from django.contrib import admin
from .models import Milestone

@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ['item_description', 'project', 'seq_number', 'scheduled_start_of_erection']
    search_fields = ['item_description', 'seq_number']
