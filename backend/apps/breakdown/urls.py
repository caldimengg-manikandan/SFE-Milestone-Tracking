"""Breakdown URL patterns."""
from django.urls import path
from apps.breakdown.views import (
    BreakdownView,
    BreakdownAnnotationListCreateView,
    BreakdownAnnotationDetailView,
)

urlpatterns = [
    path("", BreakdownView.as_view(), name="breakdown"),
    path("annotations/", BreakdownAnnotationListCreateView.as_view(), name="breakdown_annotations"),
    path("annotations/<int:pk>/", BreakdownAnnotationDetailView.as_view(), name="breakdown_annotation_detail"),
]
