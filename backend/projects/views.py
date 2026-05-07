from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Project, StructuralSchedule
from .serializers import ProjectSerializer, StructuralScheduleSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'customer_name', 'project_manager_name']
    filterset_fields = ['status']
    ordering_fields = ['created_at', 'erection_date', 'total_ton']
    ordering = ['-created_at']

class StructuralScheduleViewSet(viewsets.ModelViewSet):
    queryset = StructuralSchedule.objects.all()
    serializer_class = StructuralScheduleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['seq_no', 'item_description']
    filterset_fields = ['project', 'dwg_status']
    ordering_fields = ['seq_no', 'scheduled_ofa_date']