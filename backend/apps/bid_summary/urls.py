"""Bid Summary URL patterns."""
from django.urls import path
from apps.bid_summary.views import (
    BidSummaryView,
    BidMaterialLineListCreateView,
    BidMaterialLineDetailView,
    ShopLaborLineListCreateView,
    ShopLaborLineDetailView,
    BidSummaryClearView,
)

urlpatterns = [
    path("", BidSummaryView.as_view(), name="bid_summary"),
    path("clear/", BidSummaryClearView.as_view(), name="bid_summary_clear"),
    path("lines/", BidMaterialLineListCreateView.as_view(), name="bid_material_lines"),
    path("lines/<int:pk>/", BidMaterialLineDetailView.as_view(), name="bid_material_line_detail"),
    path("labor-lines/", ShopLaborLineListCreateView.as_view(), name="shop_labor_lines"),
    path("labor-lines/<int:pk>/", ShopLaborLineDetailView.as_view(), name="shop_labor_line_detail"),
]
