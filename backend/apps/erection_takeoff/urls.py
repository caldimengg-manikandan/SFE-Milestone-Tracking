"""ErectionTakeoff URL patterns."""
from django.urls import path
from apps.erection_takeoff.views import (
    ErectionTakeoffView,
    ErectionMemberLineListView,
    ErectionMemberLineDetailView,
)

urlpatterns = [
    path("", ErectionTakeoffView.as_view(), name="erection_takeoff"),
    path("lines/", ErectionMemberLineListView.as_view(), name="erection_member_lines"),
    path("lines/<int:pk>/", ErectionMemberLineDetailView.as_view(), name="erection_member_line_detail"),
]
