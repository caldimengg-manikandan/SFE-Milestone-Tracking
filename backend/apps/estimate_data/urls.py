"""EstimateData URL patterns."""
from django.urls import path
from apps.estimate_data.views import (
    EstimateDataView,
    SOVLineListCreateView,
    SOVLineDetailView,
    FinalizeEstimateView,
    SnapshotListView,
    SnapshotDetailView,
)

urlpatterns = [
    path("", EstimateDataView.as_view(), name="estimate_data"),
    path("sov/", SOVLineListCreateView.as_view(), name="sov_lines"),
    path("sov/<int:pk>/", SOVLineDetailView.as_view(), name="sov_line_detail"),
    path("finalize/", FinalizeEstimateView.as_view(), name="finalize_estimate"),
    path("snapshots/", SnapshotListView.as_view(), name="snapshot_list"),
    path("snapshots/<int:pk>/", SnapshotDetailView.as_view(), name="snapshot_detail"),
]
