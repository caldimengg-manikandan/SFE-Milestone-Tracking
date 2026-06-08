"""Breakdown views — read-only computed endpoint + annotation CRUD."""
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated

from apps.breakdown.models import BreakdownAnnotation
from apps.breakdown.services import assemble_breakdown
from apps.core.permissions import CanAnnotate
from projects.models import Project


class BreakdownView(APIView):
    """GET /projects/{project_id}/breakdown/ — computed, read-only."""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project = get_object_or_404(
            Project.objects.select_related(
                "bid_summary",
                "erection_takeoff", "misc_metals_estimate"
            ).prefetch_related(
                "breakdown_annotations",
                "bid_summary__material_lines",
                "bid_summary__labor_lines",
                "erection_takeoff__member_lines__member_type",
                "misc_metals_estimate__stair_flights",
                "misc_metals_estimate__items",
            ),
            pk=project_id,
        )
        data = assemble_breakdown(project)
        return Response(data)


class BreakdownAnnotationListCreateView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_id}/breakdown/annotations/"""

    def get_queryset(self):
        return BreakdownAnnotation.objects.filter(project_id=self.kwargs["project_id"])

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanAnnotate()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        from apps.breakdown.serializers import BreakdownAnnotationSerializer
        return BreakdownAnnotationSerializer

    def perform_create(self, serializer):
        serializer.save(
            project_id=self.kwargs["project_id"],
            updated_by=self.request.user,
        )


class BreakdownAnnotationDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /projects/{project_id}/breakdown/annotations/{pk}/"""

    def get_queryset(self):
        return BreakdownAnnotation.objects.filter(project_id=self.kwargs["project_id"])

    def get_serializer_class(self):
        from apps.breakdown.serializers import BreakdownAnnotationSerializer
        return BreakdownAnnotationSerializer

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT"):
            return [CanAnnotate()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
