from django.contrib import admin
from .models import RFQMaster, Estimator, MonthlyBidGoal

@admin.register(Estimator)
class EstimatorAdmin(admin.ModelAdmin):
    list_display = ['id', 'initials', 'full_name', 'is_active']
    list_filter = ['is_active']


@admin.register(MonthlyBidGoal)
class MonthlyBidGoalAdmin(admin.ModelAdmin):
    list_display = ['year', 'month', 'goal']
    ordering = ['year', 'month']


@admin.register(RFQMaster)
class RFQMasterAdmin(admin.ModelAdmin):
    list_display = [
        'quote_no', 'project_name', 'bid_due_date',
        'customer', 'primary_estimator', 'won_lost', 'bid_amount',
    ]
    list_filter = ['won_lost', 'budget_type', 'decision_to_bid', 'quote_date']
    search_fields = ['quote_no', 'project_name', 'bid_reference']
    date_hierarchy = 'bid_due_date'
    raw_id_fields = ['customer', 'primary_estimator']

    fieldsets = (
        ('Identity', {
            'fields': ('quote_no', 'budget_type', 'bid_reference')
        }),
        ('Project', {
            'fields': ('project_name', 'project_comments', 'bid_due_date', 'bid_due_time', 'location', 'distance_travel')
        }),
        ('Project Flags', {
            'classes': ('collapse',),
            'fields': (
                'aisc_fab', 'aisc_erect', 'domestic_steel', 'leed_project',
                'minority_participation', 'prevailing_wage', 'ccip_ocip', 'bonded',
                'paint', 'galvanised', 'professional_engineer', 'third_party_inspection',
                'tax_status',
            ),
        }),
        ('Customer & Team', {
            'fields': ('customer', 'decision_to_bid', 'primary_estimator', 'outsourced_estimator',
                       'sent_to_jd', 'sent_to_detailing', 'sent_to_erection', 'est_sqft_ton')
        }),
        ('Pricing', {
            'fields': ('price_structure', 'price_erection', 'price_misc', 'price_misc_erection',
                       'bid_amount', 'quoted_profit')
        }),
        ('Quantities', {
            'fields': ('ton_steel', 'ton_joist', 'num_main_structural_pcs', 'sq_ft_structural')
        }),
        ('Schedule', {
            'classes': ('collapse',),
            'fields': (
                'struct_fab_hours', 'struct_fab_start_month', 'struct_fab_duration_months',
                'misc_fab_hours', 'misc_fab_start_month', 'misc_fab_duration_months',
                'struct_erect_hours', 'struct_erect_start_month', 'struct_erect_duration_months',
                'misc_erect_hours', 'misc_erect_start_month', 'misc_erect_duration_months',
            ),
        }),
        ('Outcome', {
            'fields': ('estimating_hours', 'quote_date', 'won_lost', 'follow_up_notes',
                       'follow_up_date', 'awarded_amount')
        }),
        ('Post-Award', {
            'fields': ('sfe_job_no', 'awarded_job_date', 'contract_executed_date', 'fabrication_start_date')
        }),
    )
