"""Bid Summary serializers — computed fields via SerializerMethodField."""
from rest_framework import serializers
from apps.bid_summary.models import BidSummary, BidMaterialLine, ShopLaborLine
from apps.bid_summary.services import compute_bid_summary_totals


class BidMaterialLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = BidMaterialLine
        fields = ["id", "description", "amount", "sort_order"]


class ShopLaborLineSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = ShopLaborLine
        fields = ["id", "description", "hours", "rate", "sort_order", "line_total"]

    def get_line_total(self, obj):
        from decimal import Decimal
        return float((Decimal(str(obj.hours or 0)) * Decimal(str(obj.rate or 0))))


class BidSummarySerializer(serializers.ModelSerializer):
    """Full BidSummary with all computed fields appended."""
    material_lines = BidMaterialLineSerializer(many=True, read_only=True)
    labor_lines = ShopLaborLineSerializer(many=True, read_only=True)

    # All computed values (never stored in DB)
    computed = serializers.SerializerMethodField()

    class Meta:
        model = BidSummary
        fields = [
            "id", "project",
            "mill_steel_lbs", "mill_steel_total",
            "warehouse_steel_lbs", "warehouse_steel_total",
            "bolt_pieces", "paint_gallons", "galv_lbs",
            "joist_total", "deck_total",
            "freight_out_trucks", "freight_out_hours_each",
            "freight_galv_trucks", "freight_galv_hours_each",
            "shop_fab_hrs",
            "draft_lbs", "draft_sub_amount", "pe_stamp_cost", "shop_subcontract_total",
            "material_date", "budget_pricing", "steel_on_site",
            "joist_deck_tons", "sublet_erection", "misc_metals",
            "osha_posts_lf", "safety_ccip", "leed_data", "misc_bid_amount",
            "material_lines", "labor_lines",
            "computed", "updated_at",
        ]
        read_only_fields = ["project", "updated_at"]

    def get_computed(self, obj):
        try:
            rate_config = obj.project.rate_config
        except Exception:
            return {}
        # Prefetch related for performance
        obj.material_lines_prefetched = list(obj.material_lines.all())
        obj.labor_lines_prefetched = list(obj.labor_lines.all())
        totals = compute_bid_summary_totals(obj, rate_config)
        return {k: float(v) for k, v in totals.items()}


class BidMaterialLineCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BidMaterialLine
        fields = ["id", "description", "amount", "sort_order"]

    def create(self, validated_data):
        bid_summary = self.context["bid_summary"]
        return BidMaterialLine.objects.create(bid_summary=bid_summary, **validated_data)


class ShopLaborLineCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopLaborLine
        fields = ["id", "description", "hours", "rate", "sort_order"]

    def create(self, validated_data):
        bid_summary = self.context["bid_summary"]
        return ShopLaborLine.objects.create(bid_summary=bid_summary, **validated_data)
