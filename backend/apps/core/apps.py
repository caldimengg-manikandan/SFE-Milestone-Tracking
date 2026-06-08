"""Core app configuration."""
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = "Core"

    def ready(self):
        from rest_framework import serializers

        # Patch IntegerField
        orig_int_to_internal = serializers.IntegerField.to_internal_value
        def int_to_internal(self, data):
            val = orig_int_to_internal(self, data)
            if val is not None and val < 0:
                raise serializers.ValidationError("Negative values are not allowed.")
            return val
        serializers.IntegerField.to_internal_value = int_to_internal

        # Patch DecimalField
        orig_dec_to_internal = serializers.DecimalField.to_internal_value
        def dec_to_internal(self, data):
            val = orig_dec_to_internal(self, data)
            if val is not None and val < 0:
                raise serializers.ValidationError("Negative values are not allowed.")
            return val
        serializers.DecimalField.to_internal_value = dec_to_internal

        # Patch FloatField
        orig_float_to_internal = serializers.FloatField.to_internal_value
        def float_to_internal(self, data):
            val = orig_float_to_internal(self, data)
            if val is not None and val < 0:
                raise serializers.ValidationError("Negative values are not allowed.")
            return val
        serializers.FloatField.to_internal_value = float_to_internal

