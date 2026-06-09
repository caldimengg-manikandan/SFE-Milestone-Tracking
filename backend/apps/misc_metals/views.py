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
        misc_est, created = MiscMetalsEstimate.objects.get_or_create(project=project)
        
        # Ensure standard items are pre-seeded if the items set is empty
        if not misc_est.items.exists():
            from apps.misc_metals.models import MiscMetalsItem
            STANDARD_ITEMS = [
                # Access Ladders
                {"description": "Access Ladder 1", "category": "ladder", "quantity": 0, "shop_rate": 0.5, "field_rate": 0.3, "unit_weight": 9.8, "material_rate": 5.39, "is_galvanized": True},
                {"description": "Access Ladder 2", "category": "ladder", "quantity": 0, "shop_rate": 0.5, "field_rate": 0.3, "unit_weight": 9.8, "material_rate": 5.39, "is_galvanized": True},
                {"description": "Roof Ladder 1", "category": "ladder", "quantity": 0, "shop_rate": 0.5, "field_rate": 0.3, "unit_weight": 9.8, "material_rate": 5.39, "is_galvanized": True},
                {"description": "Roof Ladder 2", "category": "ladder", "quantity": 0, "shop_rate": 0.5, "field_rate": 0.3, "unit_weight": 9.8, "material_rate": 5.39, "is_galvanized": True},
                {"description": "Elevator Pit Ladder", "category": "ladder", "quantity": 0, "shop_rate": 0.5, "field_rate": 0.3, "unit_weight": 9.8, "material_rate": 5.39, "is_galvanized": True},
                # Elevator Sill Angles / Sump / Hoist
                {"description": "Elevator Sill Angles", "category": "other", "quantity": 0, "shop_rate": 0.5, "field_rate": 2.0, "unit_weight": 78.4, "material_rate": 43.12},
                {"description": "Elevator Sump Pit Frame & Grate", "category": "grating", "quantity": 0, "shop_rate": 1.5, "field_rate": 2.0, "unit_weight": 40.0, "material_rate": 22.0},
                {"description": "Elevator Hoist Beam", "category": "other", "quantity": 0, "shop_rate": 1.0, "field_rate": 0.0, "unit_weight": 210.0, "material_rate": 115.5},
                # Railings
                {"description": "Wallrail", "category": "railing", "quantity": 0, "shop_rate": 0.2, "field_rate": 0.1, "unit_weight": 2.27, "material_rate": 1.2485, "is_galvanized": True},
                {"description": "Aluminum Anodized Wallrail", "category": "railing", "quantity": 0, "shop_rate": 0.3, "field_rate": 0.15, "unit_weight": 0.7945, "material_rate": 1.4301, "is_anodized": True},
                {"description": "Aluminum Powder Coated Wallrail", "category": "railing", "quantity": 0, "shop_rate": 0.3, "field_rate": 0.15, "unit_weight": 0.7945, "material_rate": 1.4301, "is_powder_coated": True},
                {"description": "SS Wallrail", "category": "railing", "quantity": 0, "shop_rate": 0.35, "field_rate": 0.17, "unit_weight": 2.27, "material_rate": 7.3775},
                {"description": "Picket Rail", "category": "railing", "quantity": 0, "shop_rate": 0.85, "field_rate": 0.40, "unit_weight": 17.0, "material_rate": 9.35, "is_galvanized": True},
                {"description": "Aluminum Anodized Picketrail", "category": "railing", "quantity": 0, "shop_rate": 2.0, "field_rate": 0.40, "unit_weight": 5.95, "material_rate": 10.71, "is_anodized": True},
                {"description": "Aluminum Powder Coated WPicketrail", "category": "railing", "quantity": 0, "shop_rate": 1.0, "field_rate": 0.40, "unit_weight": 0.7945, "material_rate": 1.4301, "is_powder_coated": True},
                {"description": "SS Picketrail", "category": "railing", "quantity": 0, "shop_rate": 2.25, "field_rate": 0.40, "unit_weight": 17.0, "material_rate": 45.05},
                {"description": "1-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.35, "field_rate": 0.30, "unit_weight": 4.54, "material_rate": 2.497, "is_galvanized": True},
                {"description": "Aluminum Anodized 1-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.5, "field_rate": 0.30, "unit_weight": 1.589, "material_rate": 2.8602, "is_anodized": True},
                {"description": "Aluminum Powder Coated 1-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.4, "field_rate": 0.30, "unit_weight": 1.589, "material_rate": 2.8602, "is_powder_coated": True},
                {"description": "SS 1-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.5, "field_rate": 0.30, "unit_weight": 4.54, "material_rate": 12.031},
                {"description": "2-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.5, "field_rate": 0.30, "unit_weight": 6.81, "material_rate": 3.7455, "is_galvanized": True},
                {"description": "Aluminum Anodized 2-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.7, "field_rate": 0.30, "unit_weight": 2.3835, "material_rate": 4.2903, "is_anodized": True},
                {"description": "Aluminum Powder Coated 2-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.6, "field_rate": 0.30, "unit_weight": 2.3835, "material_rate": 4.2903, "is_powder_coated": True},
                {"description": "SS 2-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.75, "field_rate": 0.30, "unit_weight": 6.81, "material_rate": 18.0465},
                {"description": "3-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.58, "field_rate": 0.30, "unit_weight": 9.08, "material_rate": 4.994, "is_galvanized": True},
                {"description": "Aluminum Anodized 3-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.78, "field_rate": 0.30, "unit_weight": 3.178, "material_rate": 5.7204, "is_anodized": True},
                {"description": "Aluminum Powder Coated 3-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.68, "field_rate": 0.30, "unit_weight": 3.178, "material_rate": 5.7204, "is_powder_coated": True},
                {"description": "SS 3-Line Rail", "category": "railing", "quantity": 0, "shop_rate": 0.85, "field_rate": 0.30, "unit_weight": 9.08, "material_rate": 24.062},
                # Brackets, Lintels, Bollards, Nosings
                {"description": "Countertop Support Brackets", "category": "other", "quantity": 0, "shop_rate": 0.5, "field_rate": 0.0, "unit_weight": 12.0, "material_rate": 7.20},
                {"description": "Lintels 1", "category": "other", "quantity": 0, "shop_rate": 0.01, "field_rate": 0.0, "unit_weight": 1.0, "material_rate": 0.52, "is_galvanized": True},
                {"description": "Lintels 2", "category": "other", "quantity": 0, "shop_rate": 0.01, "field_rate": 0.0, "unit_weight": 1.0, "material_rate": 0.52, "is_galvanized": True},
                {"description": "Bollards 6\" sch 40", "category": "bollard", "quantity": 0, "shop_rate": 0.25, "field_rate": 0.0, "unit_weight": 133.0, "material_rate": 77.14, "is_galvanized": True},
                {"description": "Bollards 6\" sch 80", "category": "bollard", "quantity": 0, "shop_rate": 0.25, "field_rate": 0.0, "unit_weight": 200.0, "material_rate": 116.0, "is_galvanized": True},
                {"description": "Bollards 8\" sch 40", "category": "bollard", "quantity": 0, "shop_rate": 0.25, "field_rate": 0.0, "unit_weight": 200.0, "material_rate": 116.0, "is_galvanized": True},
                {"description": "Bollards 8\" sch 80", "category": "bollard", "quantity": 0, "shop_rate": 0.25, "field_rate": 0.0, "unit_weight": 304.0, "material_rate": 176.32, "is_galvanized": True},
                {"description": "Nosings", "category": "other", "quantity": 0, "shop_rate": 0.0, "field_rate": 0.0, "unit_weight": 0.0, "material_rate": 6.50},
            ]
            items_to_create = [
                MiscMetalsItem(estimate=misc_est, sort_order=idx, **item)
                for idx, item in enumerate(STANDARD_ITEMS)
            ]
            MiscMetalsItem.objects.bulk_create(items_to_create)

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
