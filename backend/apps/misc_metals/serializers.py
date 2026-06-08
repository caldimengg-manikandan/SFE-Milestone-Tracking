"""Misc Metals serializers."""
from rest_framework import serializers
from apps.misc_metals.models import MiscMetalsEstimate, StairFlight, MiscMetalsItem
from apps.misc_metals.services import compute_stair_flight, compute_misc_item, compute_misc_metals_totals


class StairFlightSerializer(serializers.ModelSerializer):
    computed = serializers.SerializerMethodField()

    class Meta:
        model = StairFlight
        fields = [
            "id",
            "stair_type",
            "quantity",
            "num_risers",
            "lf_picket",
            "lf_mesh",
            "lf_grabrail",
            "lf_wallrail",
            "num_landings",
            "description",
            "sort_order",
            "computed",
        ]

    def get_computed(self, obj):
        try:
            rate_config = obj.estimate.project.rate_config
            res = compute_stair_flight(obj, rate_config)
            return res
        except Exception:
            return {}


class MiscMetalsItemSerializer(serializers.ModelSerializer):
    computed = serializers.SerializerMethodField()

    class Meta:
        model = MiscMetalsItem
        fields = [
            "id",
            "category",
            "description",
            "quantity",
            "shop_rate",
            "field_rate",
            "material_rate",
            "unit_weight",
            "is_galvanized",
            "is_anodized",
            "is_powder_coated",
            "is_subcontract",
            "subcontract_amount",
            "sort_order",
            "computed",
        ]

    def get_computed(self, obj):
        try:
            res = compute_misc_item(obj)
            return res
        except Exception:
            return {}


class MiscMetalsEstimateSerializer(serializers.ModelSerializer):
    stair_flights = StairFlightSerializer(many=True, read_only=True)
    items = MiscMetalsItemSerializer(many=True, read_only=True)
    computed = serializers.SerializerMethodField()

    class Meta:
        model = MiscMetalsEstimate
        fields = ["id", "project", "stair_flights", "items", "computed", "updated_at"]
        read_only_fields = ["project", "updated_at"]

    def get_computed(self, obj):
        try:
            rate_config = obj.project.rate_config
            totals = compute_misc_metals_totals(obj, rate_config)
            # Remove detailed list elements to keep metadata clean
            totals.pop("stair_rows", None)
            totals.pop("item_rows", None)
            return totals
        except Exception:
            return {}
