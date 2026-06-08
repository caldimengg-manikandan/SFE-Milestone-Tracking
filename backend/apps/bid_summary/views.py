"""Bid Summary views."""
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response

from apps.bid_summary.models import BidSummary, BidMaterialLine, ShopLaborLine
from apps.bid_summary.serializers import (
    BidSummarySerializer,
    BidMaterialLineSerializer,
    BidMaterialLineCreateSerializer,
    ShopLaborLineSerializer,
    ShopLaborLineCreateSerializer,
)
from apps.core.permissions import CanEdit
from rest_framework.permissions import IsAuthenticated


class BidSummaryView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /projects/{project_id}/bid-summary/"""
    serializer_class = BidSummarySerializer

    def get_object(self):
        from projects.models import Project
        project = get_object_or_404(Project, pk=self.kwargs["project_id"])
        bid_summary, created = BidSummary.objects.get_or_create(project=project)
        return bid_summary

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT"):
            return [CanEdit()]
        return [IsAuthenticated()]


class BidMaterialLineListCreateView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_id}/bid-summary/lines/"""

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BidMaterialLineCreateSerializer
        return BidMaterialLineSerializer

    def get_queryset(self):
        return BidMaterialLine.objects.filter(
            bid_summary__project_id=self.kwargs["project_id"]
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["bid_summary"] = get_object_or_404(BidSummary, project_id=self.kwargs["project_id"])
        return ctx

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanEdit()]
        return [IsAuthenticated()]


class BidMaterialLineDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE /projects/{project_id}/bid-summary/lines/{pk}/"""
    serializer_class = BidMaterialLineSerializer

    def get_queryset(self):
        return BidMaterialLine.objects.filter(
            bid_summary__project_id=self.kwargs["project_id"]
        )

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [CanEdit()]
        return [IsAuthenticated()]


class ShopLaborLineListCreateView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_id}/bid-summary/labor-lines/"""

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ShopLaborLineCreateSerializer
        return ShopLaborLineSerializer

    def get_queryset(self):
        return ShopLaborLine.objects.filter(
            bid_summary__project_id=self.kwargs["project_id"]
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["bid_summary"] = get_object_or_404(BidSummary, project_id=self.kwargs["project_id"])
        return ctx

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanEdit()]
        return [IsAuthenticated()]


class ShopLaborLineDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ShopLaborLineSerializer

    def get_queryset(self):
        return ShopLaborLine.objects.filter(
            bid_summary__project_id=self.kwargs["project_id"]
        )

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [CanEdit()]
        return [IsAuthenticated()]


from rest_framework.views import APIView

class BidSummaryClearView(APIView):
    """POST /projects/{project_id}/bid-summary/clear/"""
    permission_classes = [CanEdit]

    def post(self, request, project_id):
        bid_summary = get_object_or_404(BidSummary, project_id=project_id)
        
        # Reset fields
        bid_summary.mill_steel_lbs = 0
        bid_summary.mill_steel_total = 0
        bid_summary.warehouse_steel_lbs = 0
        bid_summary.warehouse_steel_total = 0
        bid_summary.bolt_pieces = 0
        bid_summary.paint_gallons = 0
        bid_summary.galv_lbs = 0
        bid_summary.joist_total = 0
        bid_summary.deck_total = 0
        bid_summary.freight_out_trucks = 0
        bid_summary.freight_out_hours_each = 0
        bid_summary.freight_galv_trucks = 5
        bid_summary.freight_galv_hours_each = 0
        bid_summary.shop_fab_hrs = 0
        bid_summary.draft_lbs = 0
        bid_summary.draft_sub_amount = 0
        bid_summary.pe_stamp_cost = 0
        bid_summary.shop_subcontract_total = 0
        bid_summary.material_date = None
        bid_summary.budget_pricing = False
        bid_summary.steel_on_site = None
        bid_summary.joist_deck_tons = 0
        bid_summary.sublet_erection = 0
        bid_summary.misc_metals = 0
        bid_summary.osha_posts_lf = 0
        bid_summary.safety_ccip = 0
        bid_summary.leed_data = 0
        bid_summary.misc_bid_amount = 0
        bid_summary.save()

        # Delete material lines and labor lines
        bid_summary.material_lines.all().delete()
        bid_summary.labor_lines.all().delete()

        # Return the updated serialized data
        serializer = BidSummarySerializer(bid_summary)
        return Response(serializer.data, status=status.HTTP_200_OK)

