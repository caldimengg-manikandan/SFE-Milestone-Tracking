"""EstimateData serializers."""
from rest_framework import serializers
from apps.estimate_data.models import ScheduleOfValuesLine, EstimateSnapshot


class SOVLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleOfValuesLine
        fields = ["id", "code", "description", "amount"]


class EstimateSnapshotSerializer(serializers.ModelSerializer):
    finalized_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EstimateSnapshot
        fields = [
            "id", "project", "version_number", "preparer_name",
            "prevailing_wage", "out_of_town", "data_snapshot",
            "finalized_by", "finalized_by_name", "finalized_at",
        ]
        read_only_fields = fields

    def get_finalized_by_name(self, obj):
        if obj.finalized_by:
            return obj.finalized_by.get_full_name() or obj.finalized_by.username
        return None


class FinalizeSerializer(serializers.Serializer):
    """Input for the Finalize Estimate action."""
    preparer_name = serializers.CharField(max_length=200)
    prevailing_wage = serializers.BooleanField(default=False)
    out_of_town = serializers.BooleanField(default=False)
