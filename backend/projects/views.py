from rest_framework import viewsets
from .models import Project, StructuralScheduleItem
from .serializers import ProjectSerializer, StructuralScheduleItemSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    search_fields = ['name', 'code', 'client']
    filterset_fields = ['status']

class StructuralScheduleItemViewSet(viewsets.ModelViewSet):
    queryset = StructuralScheduleItem.objects.all()
    serializer_class = StructuralScheduleItemSerializer
    filterset_fields = ['project']

