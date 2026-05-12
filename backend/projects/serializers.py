from rest_framework import serializers
from .models import Project, StructuralScheduleItem

class StructuralScheduleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StructuralScheduleItem
        fields = [
            'id', 'project', 'seq_no', 'tons', 'item_description', 'category',
            'scheduled_ofa_date', 'actual_ofa_date', 'scheduled_bfa_date', 'actual_bfa_date',
            'scheduled_field_measure_date', 'rts_date', 'shop_lead_time_weeks',
            'scheduled_erection_date', 'budget_shop_hours', 'budget_field_hours',
            'actual_shop_hours', 'actual_field_hours', 'detailer_vendor',
            'dwg_status', 'notes', 'fabrication_details', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectSerializer(serializers.ModelSerializer):
    structural_schedules = StructuralScheduleItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

