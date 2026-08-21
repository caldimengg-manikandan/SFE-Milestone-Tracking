from datetime import datetime, date
from rest_framework import serializers
from .models import RFQMaster, Estimator, MonthlyBidGoal, SystemSetting, QuoteWorkflow
from projects.models import Customer


class SystemSettingSerializer(serializers.ModelSerializer):
    value = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = SystemSetting
        fields = ['id', 'key', 'value', 'description']


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['created_at']


class EstimatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estimator
        fields = ['id', 'initials', 'full_name', 'is_active']


class MonthlyBidGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyBidGoal
        fields = ['id', 'year', 'month', 'goal']
        read_only_fields = ['year', 'month']


class FlexibleDateField(serializers.DateField):
    def to_internal_value(self, value):
        if not value:
            return None
        if isinstance(value, (date, datetime)):
            return value.date() if isinstance(value, datetime) else value
        
        val_str = str(value).strip()
        if not val_str:
            return None
            
        for fmt in (
            '%B %Y',    # September 2026
            '%b %Y',    # Sep 2026
            '%b-%y',    # Sep-26
            '%B-%y',    # September-26
            '%b-%Y',    # Sep-2026
            '%B %y',    # September 26
            '%b %y',    # Sep 26
            '%m/%Y',    # 09/2026
            '%m-%Y',    # 09-2026
            '%m/%y',    # 09/26
            '%m-%y',    # 09-26
            '%Y-%m',    # 2026-09
        ):
            try:
                parsed_dt = datetime.strptime(val_str, fmt)
                return parsed_dt.date().replace(day=1)
            except ValueError:
                pass

        res = super().to_internal_value(val_str)
        if res:
            return res.replace(day=1)
        return res


class RFQMasterSerializer(serializers.ModelSerializer):
    # Nested read representations
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    primary_estimator_initials = serializers.CharField(
        source='primary_estimator.initials', read_only=True
    )
    scope_of_work = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    # Flexible start month fields
    struct_fab_start_month = FlexibleDateField(required=False, allow_null=True)
    misc_fab_start_month = FlexibleDateField(required=False, allow_null=True)
    struct_erect_start_month = FlexibleDateField(required=False, allow_null=True)
    misc_erect_start_month = FlexibleDateField(required=False, allow_null=True)

    # ── Computed 'No Fill' fields (read-only) ────────────────────────────────
    is_rebid = serializers.SerializerMethodField()
    quote_no_rolled_up = serializers.SerializerMethodField()
    rebid_label = serializers.SerializerMethodField()
    total_tonnage = serializers.SerializerMethodField()
    structural_pieces_per_ton = serializers.SerializerMethodField()
    struct_tonnage_per_sqft_no_joist = serializers.SerializerMethodField()
    struct_tonnage_per_sqft_with_joist = serializers.SerializerMethodField()
    struct_cost_per_ton = serializers.SerializerMethodField()
    struct_erect_cost_per_ton = serializers.SerializerMethodField()
    struct_cost_per_sqft = serializers.SerializerMethodField()
    struct_erect_cost_per_sqft = serializers.SerializerMethodField()
    struct_fab_end_month = serializers.SerializerMethodField()
    avg_monthly_struct_fab = serializers.SerializerMethodField()
    misc_fab_end_month = serializers.SerializerMethodField()
    avg_monthly_misc_fab = serializers.SerializerMethodField()
    struct_erect_end_month = serializers.SerializerMethodField()
    avg_monthly_struct_erect = serializers.SerializerMethodField()
    misc_erect_end_month = serializers.SerializerMethodField()
    avg_monthly_misc_erect = serializers.SerializerMethodField()

    class Meta:
        model = RFQMaster
        fields = [
            # Identity
            'id', 'quote_no', 'quote_no_rolled_up', 'is_rebid', 'rebid_label', 'budget_type',
            # Project Info
            'bid_reference', 'project_name', 'project_comments',
            'bid_due_date', 'bid_due_time', 'location', 'distance_travel',
            # Project Flags
            'aisc_fab', 'aisc_erect', 'domestic_steel', 'leed_project',
            'minority_participation', 'prevailing_wage', 'ccip_ocip', 'bonded',
            'paint', 'galvanised', 'professional_engineer', 'third_party_inspection',
            'tax_status',
            # Customer & Team
            'customer', 'customer_name', 'decision_to_bid',
            'primary_estimator', 'primary_estimator_initials',
            'outsourced_estimator', 'sent_to_jd', 'sent_to_detailing', 'sent_to_erection',
            # Scope
            'scope_of_work', 'email_sent', 'est_sqft_ton',
            # Pricing
            'price_structure', 'price_erection', 'price_misc', 'price_misc_erection',
            'bid_amount', 'quoted_profit',
            # Quantities (user-entered)
            'ton_steel', 'ton_joist', 'num_main_structural_pcs', 'sq_ft_structural',
            # Quantities (computed)
            'total_tonnage', 'structural_pieces_per_ton',
            'struct_tonnage_per_sqft_no_joist', 'struct_tonnage_per_sqft_with_joist',
            'struct_cost_per_ton', 'struct_erect_cost_per_ton',
            'struct_cost_per_sqft', 'struct_erect_cost_per_sqft',
            # Structural Fab Schedule
            'struct_fab_hours', 'struct_fab_start_month', 'struct_fab_duration_months',
            'struct_fab_end_month', 'avg_monthly_struct_fab',
            # Misc Fab Schedule
            'misc_fab_hours', 'misc_fab_start_month', 'misc_fab_duration_months',
            'misc_fab_end_month', 'avg_monthly_misc_fab',
            # Structural Erection Schedule
            'struct_erect_hours', 'struct_erect_start_month', 'struct_erect_duration_months',
            'struct_erect_end_month', 'avg_monthly_struct_erect',
            # Misc Erection Schedule
            'misc_erect_hours', 'misc_erect_start_month', 'misc_erect_duration_months',
            'misc_erect_end_month', 'avg_monthly_misc_erect',
            # Estimating & Outcome
            'estimating_hours', 'quote_date', 'won_lost',
            'follow_up_notes', 'follow_up_date', 'awarded_amount',
            # Post-Award
            'sfe_job_no', 'awarded_job_date', 'contract_executed_date', 'fabrication_start_date',
            # Audit
            'created_at', 'updated_at', 'created_by', 'updated_by',
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'created_by', 'updated_by',
            # All computed 'No Fill' fields
            'is_rebid', 'quote_no_rolled_up', 'rebid_label',
            'total_tonnage', 'structural_pieces_per_ton',
            'struct_tonnage_per_sqft_no_joist', 'struct_tonnage_per_sqft_with_joist',
            'struct_cost_per_ton', 'struct_erect_cost_per_ton',
            'struct_cost_per_sqft', 'struct_erect_cost_per_sqft',
            'struct_fab_end_month', 'avg_monthly_struct_fab',
            'misc_fab_end_month', 'avg_monthly_misc_fab',
            'struct_erect_end_month', 'avg_monthly_struct_erect',
            'misc_erect_end_month', 'avg_monthly_misc_erect',
        ]

    # ── SerializerMethodField handlers ────────────────────────────────────────

    def get_is_rebid(self, obj): return obj.is_rebid
    def get_quote_no_rolled_up(self, obj): return obj.quote_no_rolled_up
    def get_rebid_label(self, obj): return obj.rebid_label
    def get_total_tonnage(self, obj): return self._fmt(obj.total_tonnage)
    def get_structural_pieces_per_ton(self, obj): return self._fmt(obj.structural_pieces_per_ton)
    def get_struct_tonnage_per_sqft_no_joist(self, obj): return self._fmt(obj.struct_tonnage_per_sqft_no_joist)
    def get_struct_tonnage_per_sqft_with_joist(self, obj): return self._fmt(obj.struct_tonnage_per_sqft_with_joist)
    def get_struct_cost_per_ton(self, obj): return self._fmt(obj.struct_cost_per_ton)
    def get_struct_erect_cost_per_ton(self, obj): return self._fmt(obj.struct_erect_cost_per_ton)
    def get_struct_cost_per_sqft(self, obj): return self._fmt(obj.struct_cost_per_sqft)
    def get_struct_erect_cost_per_sqft(self, obj): return self._fmt(obj.struct_erect_cost_per_sqft)
    def get_struct_fab_end_month(self, obj): return obj.struct_fab_end_month
    def get_avg_monthly_struct_fab(self, obj): return self._fmt(obj.avg_monthly_struct_fab)
    def get_misc_fab_end_month(self, obj): return obj.misc_fab_end_month
    def get_avg_monthly_misc_fab(self, obj): return self._fmt(obj.avg_monthly_misc_fab)
    def get_struct_erect_end_month(self, obj): return obj.struct_erect_end_month
    def get_avg_monthly_struct_erect(self, obj): return self._fmt(obj.avg_monthly_struct_erect)
    def get_misc_erect_end_month(self, obj): return obj.misc_erect_end_month
    def get_avg_monthly_misc_erect(self, obj): return self._fmt(obj.avg_monthly_misc_erect)

    def _fmt(self, val):
        """Return None (not NaN/Infinity) for null/zero-division results."""
        if val is None:
            return None
        try:
            f = float(val)
            if f != f:  # NaN check
                return None
            return round(f, 4)
        except (TypeError, ValueError):
            return None

    def validate(self, data):
        """Cross-field validation matching §8 business rules."""
        decision = data.get('decision_to_bid') or getattr(self.instance, 'decision_to_bid', None)
        won_lost = data.get('won_lost') or getattr(self.instance, 'won_lost', 'Pending')
        errors = {}

        # Enforce "Yes/Bid" requirements only when creating OR explicitly updating decision/due date
        if decision in ('Yes', 'Bid'):
            is_decision_changing = 'decision_to_bid' in data or 'bid_due_date' in data
            if not self.instance or is_decision_changing:
                if not data.get('bid_due_date') and not getattr(self.instance, 'bid_due_date', None):
                    errors['bid_due_date'] = 'Required when Decision to Bid is Yes/Bid.'

        # Enforce "Won" requirements only when creating OR explicitly updating status/award amount/job no/award date
        if won_lost == 'Won':
            is_status_changing = 'won_lost' in data or 'awarded_amount' in data or 'sfe_job_no' in data or 'awarded_job_date' in data
            if not self.instance or is_status_changing:
                if data.get('awarded_amount') is None and getattr(self.instance, 'awarded_amount', None) is None:
                    errors['awarded_amount'] = 'Required when status is Won.'
                if not data.get('sfe_job_no') and not getattr(self.instance, 'sfe_job_no', None):
                    errors['sfe_job_no'] = 'Required when status is Won.'
                if not data.get('awarded_job_date') and not getattr(self.instance, 'awarded_job_date', None):
                    errors['awarded_job_date'] = 'Required when status is Won.'

        schedule_pairs = [
            ('struct_fab_hours', 'struct_fab_duration_months'),
            ('misc_fab_hours', 'misc_fab_duration_months'),
            ('struct_erect_hours', 'struct_erect_duration_months'),
            ('misc_erect_hours', 'misc_erect_duration_months'),
        ]
        for hours_f, dur_f in schedule_pairs:
            h = data.get(hours_f) or getattr(self.instance, hours_f, None)
            d = data.get(dur_f) or getattr(self.instance, dur_f, None)
            if h and float(h) > 0:
                if not d or int(d) < 1:
                    errors[dur_f] = 'Must be ≥ 1 when hours are entered.'

        if errors:
            raise serializers.ValidationError(errors)
        return data


class RFQListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for grid list view — fewer fields for performance."""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    primary_estimator_initials = serializers.CharField(
        source='primary_estimator.initials', read_only=True
    )
    is_rebid = serializers.SerializerMethodField()
    total_tonnage = serializers.SerializerMethodField()
    struct_cost_per_ton = serializers.SerializerMethodField()
    struct_cost_per_sqft = serializers.SerializerMethodField()

    def get_is_rebid(self, obj): return obj.is_rebid
    def get_total_tonnage(self, obj):
        t = obj.total_tonnage
        return float(t) if t is not None else None
    def get_struct_cost_per_ton(self, obj):
        v = obj.struct_cost_per_ton
        return round(v, 2) if v else None
    def get_struct_cost_per_sqft(self, obj):
        v = obj.struct_cost_per_sqft
        return round(v, 2) if v else None

    class Meta:
        model = RFQMaster
        fields = [
            'id', 'quote_no', 'is_rebid', 'budget_type',
            'bid_reference', 'project_name', 'bid_due_date', 'bid_due_time',
            'location', 'scope_of_work', 'email_sent', 'customer', 'customer_name', 'decision_to_bid',
            'primary_estimator', 'primary_estimator_initials',
            'tax_status', 'aisc_fab', 'aisc_erect',
            'sent_to_jd', 'sent_to_detailing', 'sent_to_erection',
            'bid_amount', 'quoted_profit', 'ton_steel', 'ton_joist',
            'total_tonnage', 'sq_ft_structural',
            'struct_cost_per_ton', 'struct_cost_per_sqft',
            'won_lost', 'quote_date', 'awarded_amount', 'sfe_job_no',
            'awarded_job_date', 'follow_up_date', 'follow_up_notes',
        ]


class PrintSetupSerializer(serializers.ModelSerializer):
    """Serializer for weekly meeting print view — matches Excel Print Setup cols A-Q."""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    primary_estimator_initials = serializers.CharField(
        source='primary_estimator.initials', read_only=True
    )
    quote_project = serializers.SerializerMethodField()

    def get_quote_project(self, obj):
        return f"{obj.quote_no} {obj.project_name}"

    class Meta:
        model = RFQMaster
        fields = [
            'quote_project', 'quote_no', 'budget_type', 'project_name',
            'bid_due_date', 'bid_due_time', 'location', 'distance_travel',
            'aisc_fab', 'aisc_erect', 'customer_name', 'decision_to_bid',
            'primary_estimator_initials', 'sent_to_jd', 'sent_to_detailing',
            'sent_to_erection', 'scope_of_work', 'est_sqft_ton',
        ]


class QuoteWorkflowSerializer(serializers.ModelSerializer):
    rfq_quote_no = serializers.CharField(source='rfq.quote_no', read_only=True, default='')
    project_name = serializers.CharField(source='rfq.project_name', read_only=True, default='')
    customer_name = serializers.CharField(source='rfq.customer.name', read_only=True, default='')
    clean_sender = serializers.SerializerMethodField()
    is_ready = serializers.SerializerMethodField()

    def get_clean_sender(self, obj):
        if obj.sender:
            import re
            m = re.search(r'<([^>]+)>', obj.sender)
            if m: return m.group(1).strip()
            m = re.search(r'[\w\.\+\-]+@[\w\.\-]+\.[a-zA-Z]{2,}', obj.sender)
            if m: return m.group(0).strip()
            return obj.sender.strip()
        if obj.rfq and obj.rfq.customer:
            contact = obj.rfq.customer.contacts.filter(email__isnull=False).exclude(email='').first()
            if contact and contact.email:
                return contact.email.strip()
        return ""

    def get_is_ready(self, obj):
        return bool(obj.estimator_replied and obj.detailer_replied)

    class Meta:
        model = QuoteWorkflow
        fields = [
            'quote_id', 'rfq', 'rfq_quote_no', 'project_name', 'customer_name',
            'message_id', 'subject', 'sender', 'clean_sender', 'status',
            'estimator_email', 'estimator_replied', 'estimator_reply_body', 'estimator_replied_at',
            'detailer_email', 'detailer_replied', 'detailer_reply_body', 'detailer_replied_at',
            'combined_body', 'sent_to_customer_at', 'is_ready',
            'created_at', 'updated_at',
        ]


