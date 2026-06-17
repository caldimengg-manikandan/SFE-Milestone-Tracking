"""
Bid Summary models — Sheet 2.

Stores material inputs; ALL computed fields (tons, totals, tax) are
computed in the serializer layer (IP §8, key technical decision).

Business rules implemented:
  BID-001: mill_tons = mill_steel_lbs / 2000
  BID-002: warehouse_tons = warehouse_steel_lbs / 2000
  BID-003: scrap_credit = (mill_tons + warehouse_tons) * scrap_rate (default 5%)
  BID-004: bolts_total = bolt_pieces * bolt_unit_price
  BID-005: paint_total = paint_gallons * paint_unit_price
  BID-006: galv_total = galv_lbs * galv_unit_price
  BID-008: total_direct_material = SUM(all material line items)
  BID-009: use_tax = total_direct_material * use_tax_rate
  BID-010: shop_labor_cost = shop_fab_hrs * shop_labor_rate
  BID-011: mh_per_ton = shop_fab_hrs / total_tons (if total_tons > 0)
  BID-014: price_per_lb guard (handled in serializer)
  BID-015 / GAP-001: joist_total + deck_total included
"""
from django.db import models
from projects.models import Project


class BidSummary(models.Model):
    """One-to-one with Project. Stores all raw material inputs."""
    project = models.OneToOneField(
        Project, on_delete=models.CASCADE, related_name="bid_summary"
    )

    # Mill Steel (BID-001)
    mill_steel_lbs = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    mill_steel_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Warehouse Steel (BID-002)
    warehouse_steel_lbs = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    warehouse_steel_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Fixed material inputs (BID-004, BID-005, BID-006)
    bolt_pieces = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paint_gallons = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    galv_lbs = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Joist & Deck (GAP-001 — included per client decision)
    joist_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    deck_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Shipping & Freight inputs (BID-031, BID-032)
    freight_out_trucks = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    freight_out_hours_each = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    freight_galv_trucks = models.DecimalField(max_digits=8, decimal_places=2, default=5)
    freight_galv_hours_each = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    # Shop labor (BID-010)
    shop_fab_hrs = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Draft labor for EstimateData 4.01
    draft_lbs = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    draft_sub_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pe_stamp_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Shop subcontract for EstimateData 1.02
    shop_subcontract_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Metadata fields from Bid Summary sheet
    material_date = models.DateField(null=True, blank=True)
    budget_pricing = models.BooleanField(default=False)
    steel_on_site = models.DateField(null=True, blank=True)

    # Buyout inputs
    joist_deck_tons = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sublet_erection = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    misc_metals = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    osha_posts_lf = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    safety_ccip = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    leed_data = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    misc_bid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Bid Summary"
        verbose_name_plural = "Bid Summaries"

    def __str__(self):
        return f"BidSummary for {self.project.code}"


class BidMaterialLine(models.Model):
    """
    Free-text miscellaneous material lines (BID-007).
    N rows per BidSummary — user adds as many as needed.
    """
    bid_summary = models.ForeignKey(
        BidSummary, on_delete=models.CASCADE, related_name="material_lines"
    )
    description = models.CharField(max_length=300)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.description}: ${self.amount}"


class ShopLaborLine(models.Model):
    """
    Miscellaneous shop labor lines, e.g. Drafting (BID-012).
    Each line: description + hours + rate.
    """
    bid_summary = models.ForeignKey(
        BidSummary, on_delete=models.CASCADE, related_name="labor_lines"
    )
    description = models.CharField(max_length=300)
    hours = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rate = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.description}: {self.hours}hrs @ ${self.rate}"
