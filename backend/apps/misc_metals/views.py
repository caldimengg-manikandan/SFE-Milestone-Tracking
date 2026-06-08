"""Misc Metals views."""
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.misc_metals.models import MiscMetalsEstimate, StairFlight, MiscMetalsItem
from apps.misc_metals.serializers import (
    MiscMetalsEstimateSerializer,
    StairFlightSerializer,
    MiscMetalsItemSerializer,
)
from apps.core.permissions import CanEdit


class MiscMetalsEstimateView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /projects/{project_id}/misc-metals/"""
    serializer_class = MiscMetalsEstimateSerializer

    def get_object(self):
        from projects.models import Project
        project = get_object_or_404(Project, pk=self.kwargs["project_id"])
        MiscMetalsEstimate.objects.get_or_create(project=project)
        return get_object_or_404(
            MiscMetalsEstimate.objects.prefetch_related("stair_flights", "items"),
            project_id=self.kwargs["project_id"]
        )

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT"):
            return [CanEdit()]
        return [IsAuthenticated()]


class StairFlightListCreateView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_id}/misc-metals/stairs/"""
    serializer_class = StairFlightSerializer

    def get_queryset(self):
        return StairFlight.objects.filter(
            estimate__project_id=self.kwargs["project_id"]
        )

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanEdit()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        estimate = get_object_or_404(
            MiscMetalsEstimate, project_id=self.kwargs["project_id"]
        )
        # Prevent adding to finalized projects
        if estimate.project.is_finalized:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot modify a finalized estimate.")
        serializer.save(estimate=estimate)


class StairFlightDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE /projects/{project_id}/misc-metals/stairs/{pk}/"""
    serializer_class = StairFlightSerializer

    def get_queryset(self):
        return StairFlight.objects.filter(
            estimate__project_id=self.kwargs["project_id"]
        )

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [CanEdit()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        if serializer.instance.estimate.project.is_finalized:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot modify a finalized estimate.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.estimate.project.is_finalized:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot modify a finalized estimate.")
        instance.delete()


class MiscMetalsItemListCreateView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_id}/misc-metals/items/"""
    serializer_class = MiscMetalsItemSerializer

    def get_queryset(self):
        return MiscMetalsItem.objects.filter(
            estimate__project_id=self.kwargs["project_id"]
        )

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanEdit()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        estimate = get_object_or_404(
            MiscMetalsEstimate, project_id=self.kwargs["project_id"]
        )
        if estimate.project.is_finalized:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot modify a finalized estimate.")
        serializer.save(estimate=estimate)


class MiscMetalsItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE /projects/{project_id}/misc-metals/items/{pk}/"""
    serializer_class = MiscMetalsItemSerializer

    def get_queryset(self):
        return MiscMetalsItem.objects.filter(
            estimate__project_id=self.kwargs["project_id"]
        )

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [CanEdit()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        if serializer.instance.estimate.project.is_finalized:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot modify a finalized estimate.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.estimate.project.is_finalized:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot modify a finalized estimate.")
        instance.delete()
