"""Bid Summary admin registrations."""
from django.contrib import admin
from apps.bid_summary.models import BidSummary, BidMaterialLine, ShopLaborLine


class BidMaterialLineInline(admin.TabularInline):
    model = BidMaterialLine
    extra = 1


class ShopLaborLineInline(admin.TabularInline):
    model = ShopLaborLine
    extra = 1


@admin.register(BidSummary)
class BidSummaryAdmin(admin.ModelAdmin):
    list_display = ("project", "updated_at")
    search_fields = ("project__code", "project__name")
    inlines = [BidMaterialLineInline, ShopLaborLineInline]
