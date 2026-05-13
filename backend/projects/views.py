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

from .models import Customer, Detailer
from .serializers import CustomerSerializer, DetailerSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    search_fields = ['name', 'code']
    filterset_fields = ['category', 'country']

class DetailerViewSet(viewsets.ModelViewSet):
    queryset = Detailer.objects.all()
    serializer_class = DetailerSerializer
    search_fields = ['name', 'code']
