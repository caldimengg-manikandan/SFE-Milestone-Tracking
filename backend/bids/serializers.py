from rest_framework import serializers
from .models import BidEnquiry

class BidEnquirySerializer(serializers.ModelSerializer):
    customer_name_str = serializers.CharField(source='customer_name.name', read_only=True)
    primary_estimator_name = serializers.CharField(source='primary_estimator.name', read_only=True)

    class Meta:
        model = BidEnquiry
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            # Read-only calculated fields
            'total_tonnage',
            'struct_pcs_per_ton',
            'struct_ton_per_sqft_no_joist',
            'struct_ton_per_sqft_with_joist',
            'struct_cost_per_ton',
            'struct_erect_cost_per_ton',
            'struct_cost_per_sqft',
            'struct_erect_cost_per_sqft',
            'struct_fab_end_month',
            'avg_monthly_struct_fab_hours',
            'misc_fab_end_month',
            'avg_monthly_misc_fab_hours',
            'struct_erect_end_month',
            'avg_monthly_struct_erect_hours',
            'misc_erect_end_month',
            'avg_monthly_misc_erect_hours'
        ]
