"""ErectionTakeoff views."""
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.erection_takeoff.models import ErectionTakeoff, ErectionMemberLine, MemberType
from apps.erection_takeoff.serializers import (
    ErectionTakeoffSerializer, ErectionMemberLineSerializer, MemberTypeSerializer
)
from apps.core.permissions import CanEdit


class ErectionTakeoffView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /projects/{project_id}/erection-takeoff/"""
    serializer_class = ErectionTakeoffSerializer

    def get_object(self):
        from projects.models import Project
        project = get_object_or_404(Project, pk=self.kwargs["project_id"])
        takeoff, created = ErectionTakeoff.objects.get_or_create(project=project)
        # Ensure all MemberType records have a corresponding ErectionMemberLine
        from apps.erection_takeoff.models import MemberType, ErectionMemberLine
        from apps.erection_takeoff.services import MEMBER_TO_CATEGORY
        member_types = MemberType.objects.all()
        existing_mts = set(takeoff.member_lines.values_list("member_type_id", flat=True))
        missing_mts = [mt for mt in member_types if mt.id not in existing_mts]
        if missing_mts:
            lines_to_create = []
            for mt in missing_mts:
                category = MEMBER_TO_CATEGORY.get(mt.member_code, "")
                lines_to_create.append(
                    ErectionMemberLine(
                        erection_takeoff=takeoff,
                        member_type=mt,
                        quantity=0,
                        label=mt.label,
                        input_unit=mt.input_unit,
                        mh_per_pc=mt.mh_per_pc,
                        crane_picks_formula=mt.crane_picks_formula,
                        category=category,
                        sort_order=mt.sort_order,
                    )
                )
            ErectionMemberLine.objects.bulk_create(lines_to_create)
            # Clear prefetched cache if it exists
            if hasattr(takeoff, "_prefetched_objects_cache") and "member_lines" in takeoff._prefetched_objects_cache:
                del takeoff._prefetched_objects_cache["member_lines"]
        return takeoff

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT"):
            return [CanEdit()]
        return [IsAuthenticated()]


class ErectionMemberLineListView(generics.ListCreateAPIView):
    """GET/POST /projects/{project_id}/erection-takeoff/lines/"""
    serializer_class = ErectionMemberLineSerializer

    def get_queryset(self):
        return ErectionMemberLine.objects.select_related("member_type").filter(
            erection_takeoff__project_id=self.kwargs["project_id"]
        )

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanEdit()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        takeoff = get_object_or_404(ErectionTakeoff, project_id=self.kwargs["project_id"])
        serializer.save(erection_takeoff=takeoff)


class ErectionMemberLineDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE /projects/{project_id}/erection-takeoff/lines/{pk}/"""
    serializer_class = ErectionMemberLineSerializer

    def get_queryset(self):
        return ErectionMemberLine.objects.filter(
            erection_takeoff__project_id=self.kwargs["project_id"]
        )

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [CanEdit()]
        return [IsAuthenticated()]


class MemberTypeListView(generics.ListAPIView):
    """GET /reference/member-types/ — seeded member type catalogue."""
    serializer_class = MemberTypeSerializer
    queryset = MemberType.objects.all()
    permission_classes = [IsAuthenticated]
