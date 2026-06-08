"""FieldMomentConn serializers."""
from rest_framework import serializers
from apps.field_moment_conn.models import AISCSection, FieldMomentConnTakeoff, FieldMomentConnLine


class AISCSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISCSection
        fields = ["id", "label", "bf", "tf"]


class FMCLineSerializer(serializers.ModelSerializer):
    aisc_section_detail = AISCSectionSerializer(source="aisc_section", read_only=True)
    computed = serializers.SerializerMethodField()

    class Meta:
        model = FieldMomentConnLine
        fields = ["id", "aisc_section", "aisc_section_detail", "quantity", "sort_order", "computed"]

    def get_computed(self, obj):
        try:
            from apps.field_moment_conn.services import compute_fmc_row
            rate = obj.takeout.project.rate_config if hasattr(obj, 'takeout') else obj.takeoff.project.rate_config
            return compute_fmc_row(obj.aisc_section, obj.quantity, rate)
        except Exception:
            try:
                from apps.field_moment_conn.services import compute_fmc_row
                rate = obj.takeoff.project.rate_config
                return compute_fmc_row(obj.aisc_section, obj.quantity, rate)
            except Exception:
                return {}


class FMCTakeoffSerializer(serializers.ModelSerializer):
    lines = FMCLineSerializer(many=True, read_only=True)
    computed = serializers.SerializerMethodField()

    class Meta:
        model = FieldMomentConnTakeoff
        fields = ["id", "project", "lines", "computed", "updated_at"]
        read_only_fields = ["project", "updated_at"]

    def get_computed(self, obj):
        try:
            from apps.field_moment_conn.services import compute_fmc_totals
            rate = obj.project.rate_config
            totals = compute_fmc_totals(obj, rate)
            totals.pop("rows", None)
            return totals
        except Exception:
            return {}
