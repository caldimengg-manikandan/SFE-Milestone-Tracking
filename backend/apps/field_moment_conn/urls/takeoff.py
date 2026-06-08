"""Field Moment Connection takeoff URL patterns."""
from django.urls import path
from apps.field_moment_conn.views import (
    FMCTakeoffView,
    FMCLineListCreateView,
    FMCLineDetailView,
)

urlpatterns = [
    path("", FMCTakeoffView.as_view(), name="fmc_takeoff"),
    path("lines/", FMCLineListCreateView.as_view(), name="fmc_line_list_create"),
    path("lines/<int:pk>/", FMCLineDetailView.as_view(), name="fmc_line_detail"),
]
