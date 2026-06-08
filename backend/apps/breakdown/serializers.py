"""Breakdown serializers."""
from rest_framework import serializers
from apps.breakdown.models import BreakdownAnnotation


class BreakdownAnnotationSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BreakdownAnnotation
        fields = [
            "id", "project", "item_ref", "detailer",
            "mat_ordered", "erected", "notes",
            "updated_by", "updated_by_name", "updated_at",
        ]
        read_only_fields = ["project", "updated_by", "updated_at"]

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name() or obj.updated_by.username
        return None
