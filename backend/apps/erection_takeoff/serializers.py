"""ErectionTakeoff serializers."""
from rest_framework import serializers
from apps.erection_takeoff.models import ErectionTakeoff, MemberType, ErectionMemberLine


class MemberTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberType
        fields = ["id", "member_code", "label", "mh_per_pc",
                  "crane_picks_formula", "input_unit", "sort_order"]


class ErectionMemberLineSerializer(serializers.ModelSerializer):
    member_type_detail = MemberTypeSerializer(source="member_type", read_only=True)
    computed = serializers.SerializerMethodField()

    class Meta:
        model = ErectionMemberLine
        fields = [
            "id",
            "member_type",
            "member_type_detail",
            "quantity",
            "sort_order",
            "label",
            "input_unit",
            "mh_per_pc",
            "crane_picks_formula",
            "is_custom",
            "category",
            "computed",
        ]

    def get_computed(self, obj):
        from apps.erection_takeoff.services import compute_member_row
        row = compute_member_row(obj, project=obj.erection_takeoff.project)
        return {k: float(v) if hasattr(v, '__float__') else v for k, v in row.items()}


class ErectionTakeoffSerializer(serializers.ModelSerializer):
    member_lines = ErectionMemberLineSerializer(many=True, read_only=True)
    computed = serializers.SerializerMethodField()

    class Meta:
        model = ErectionTakeoff
        fields = [
            "id",
            "project",
            "picks_per_day",
            "efficiency_factor",
            "crew_size",
            "foreman_hours",
            "field_studs_qty",
            "perimeter_cable_qty",
            "equipment_rental",
            "foreman_rate",
            "ironworker_rate",
            "crane_rate",
            "field_studs_rate",
            "perimeter_cable_material_rate",
            "perimeter_cable_shop_rate",
            "perimeter_cable_field_rate",
            "travel_driver_rate",
            "travel_passenger_rate",
            "per_diem_rate",
            "weeks_travel_driver_rate",
            "weeks_travel_passenger_rate",
            "member_lines",
            "computed",
            "updated_at",
        ]
        read_only_fields = ["project", "updated_at"]

    def get_computed(self, obj):
        try:
            from apps.erection_takeoff.services import compute_erection_totals
            try:
                rate = obj.project.rate_config
            except Exception:
                rate = None
            try:
                bid = obj.project.bid_summary
            except Exception:
                bid = None
            totals = compute_erection_totals(obj, rate, bid)
            # Remove the rows — already in member_lines
            totals.pop("rows", None)
            return totals
        except Exception:
            return {}
