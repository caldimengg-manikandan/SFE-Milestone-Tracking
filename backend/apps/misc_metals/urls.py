"""Misc Metals URL patterns."""
from django.urls import path
from apps.misc_metals.views import (
    MiscMetalsEstimateView,
    StairFlightListCreateView,
    StairFlightDetailView,
    MiscMetalsItemListCreateView,
    MiscMetalsItemDetailView,
)

urlpatterns = [
    path("", MiscMetalsEstimateView.as_view(), name="misc_metals_estimate"),
    path("stairs/", StairFlightListCreateView.as_view(), name="stair_flight_list_create"),
    path("stairs/<int:pk>/", StairFlightDetailView.as_view(), name="stair_flight_detail"),
    path("items/", MiscMetalsItemListCreateView.as_view(), name="misc_metals_item_list_create"),
    path("items/<int:pk>/", MiscMetalsItemDetailView.as_view(), name="misc_metals_item_detail"),
]
