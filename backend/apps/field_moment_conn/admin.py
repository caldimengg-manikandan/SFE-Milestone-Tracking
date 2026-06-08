"""Field Moment Connection admin registrations."""
from django.contrib import admin
from apps.field_moment_conn.models import FieldMomentConnTakeoff, AISCSection, FieldMomentConnLine


class FieldMomentConnLineInline(admin.TabularInline):
    model = FieldMomentConnLine
    extra = 1


@admin.register(AISCSection)
class AISCSectionAdmin(admin.ModelAdmin):
    list_display = ("label", "bf", "tf")
    search_fields = ("label",)


@admin.register(FieldMomentConnTakeoff)
class FieldMomentConnTakeoffAdmin(admin.ModelAdmin):
    list_display = ("project", "updated_at")
    search_fields = ("project__code", "project__name")
    inlines = [FieldMomentConnLineInline]
