"""EstimateData views — live cost codes, SOV, finalize, snapshots."""
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated

from apps.estimate_data.models import ScheduleOfValuesLine, EstimateSnapshot
from apps.estimate_data.serializers import (
    SOVLineSerializer, EstimateSnapshotSerializer, FinalizeSerializer
)
from apps.estimate_data.services import compute_cost_codes
from apps.core.permissions import CanEdit
from projects.models import Project


class EstimateDataView(APIView):
    """GET /projects/{project_id}/estimate-data/ — live computed cost codes + SOV."""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project = get_object_or_404(
            Project.objects.select_related(
                "bid_summary",
                "erection_takeoff", "misc_metals_estimate"
            ).prefetch_related(
                "sov_lines",
                "bid_summary__material_lines",
                "bid_summary__labor_lines",
                "erection_takeoff__member_lines__member_type",
                "misc_metals_estimate__stair_flights",
                "misc_metals_estimate__items",
            ),
            pk=project_id,
        )
        cost_data = compute_cost_codes(project)
        sov = SOVLineSerializer(project.sov_lines.all(), many=True).data
        return Response({**cost_data, "sov_lines": sov})


class SOVLineListCreateView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_id}/estimate-data/sov/"""
    serializer_class = SOVLineSerializer

    def get_queryset(self):
        return ScheduleOfValuesLine.objects.filter(project_id=self.kwargs["project_id"])

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanEdit()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(project_id=self.kwargs["project_id"])


class SOVLineDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SOVLineSerializer

    def get_queryset(self):
        return ScheduleOfValuesLine.objects.filter(project_id=self.kwargs["project_id"])

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [CanEdit()]
        return [IsAuthenticated()]


class FinalizeEstimateView(APIView):
    """POST /projects/{project_id}/estimate-data/finalize/ — create immutable snapshot."""
    permission_classes = [CanEdit]

    def post(self, request, project_id):
        project = get_object_or_404(
            Project.objects.select_related("bid_summary", "erection_takeoff", "misc_metals_estimate"),
            pk=project_id,
        )

        if project.is_finalized:
            return Response(
                {"error": True, "detail": "Project is already finalized. Clone to create a new revision."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = FinalizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            # Compute final cost codes snapshot
            cost_data = compute_cost_codes(project)

            snapshot = EstimateSnapshot(
                project=project,
                preparer_name=serializer.validated_data["preparer_name"],
                prevailing_wage=serializer.validated_data["prevailing_wage"],
                out_of_town=serializer.validated_data["out_of_town"],
                data_snapshot=cost_data,
                finalized_by=request.user,
            )
            snapshot.save()

            # Lock the project
            project.status = 'Completed'
            project.save(update_fields=["status", "updated_at"])

        return Response(
            EstimateSnapshotSerializer(snapshot).data,
            status=status.HTTP_201_CREATED,
        )


class SnapshotListView(generics.ListAPIView):
    """GET /projects/{project_id}/estimate-data/snapshots/ — list all versions."""
    serializer_class = EstimateSnapshotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EstimateSnapshot.objects.filter(project_id=self.kwargs["project_id"])


class SnapshotDetailView(generics.RetrieveAPIView):
    serializer_class = EstimateSnapshotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EstimateSnapshot.objects.filter(project_id=self.kwargs["project_id"])
