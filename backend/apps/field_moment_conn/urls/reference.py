"""FMC reference URL patterns (AISC sections + member types)."""
from django.urls import path
from apps.field_moment_conn.views import AISCSectionListCreateView
from apps.erection_takeoff.views import MemberTypeListView

urlpatterns = [
    path("aisc-sections/", AISCSectionListCreateView.as_view(), name="aisc_sections"),
    path("member-types/", MemberTypeListView.as_view(), name="member_types"),
]
