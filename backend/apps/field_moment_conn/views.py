"""FieldMomentConn views."""
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

from apps.field_moment_conn.models import (
    AISCSection, FieldMomentConnTakeoff, FieldMomentConnLine
)
from apps.field_moment_conn.serializers import (
    AISCSectionSerializer, FMCTakeoffSerializer, FMCLineSerializer
)
from apps.core.permissions import CanEdit


class AISCSectionListCreateView(generics.ListCreateAPIView):
    """GET /reference/aisc-sections/ — search W-shape catalogue. POST to create new custom sections."""
    serializer_class = AISCSectionSerializer
    queryset = AISCSection.objects.all()
    filter_backends = [SearchFilter]
    search_fields = ["label"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanEdit()]
        return [IsAuthenticated()]


class FMCTakeoffView(generics.RetrieveAPIView):
    """GET /projects/{project_id}/field-moment-conn/"""
    serializer_class = FMCTakeoffSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        from projects.models import Project
        project = get_object_or_404(Project, pk=self.kwargs["project_id"])
        FieldMomentConnTakeoff.objects.get_or_create(project=project)
        return get_object_or_404(
            FieldMomentConnTakeoff.objects.prefetch_related(
                "lines__aisc_section"
            ),
            project_id=self.kwargs["project_id"]
        )


class FMCLineListCreateView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_id}/field-moment-conn/lines/"""
    serializer_class = FMCLineSerializer

    def get_queryset(self):
        return FieldMomentConnLine.objects.select_related("aisc_section").filter(
            takeoff__project_id=self.kwargs["project_id"]
        )

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanEdit()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        takeoff = get_object_or_404(
            FieldMomentConnTakeoff, project_id=self.kwargs["project_id"]
        )
        serializer.save(takeoff=takeoff)


class FMCLineDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE /projects/{project_id}/field-moment-conn/lines/{pk}/"""
    serializer_class = FMCLineSerializer

    def get_queryset(self):
        return FieldMomentConnLine.objects.filter(
            takeoff__project_id=self.kwargs["project_id"]
        )

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [CanEdit()]
        return [IsAuthenticated()]
