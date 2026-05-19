from rest_framework import viewsets
from .models import Project, StructuralScheduleItem
from .serializers import ProjectSerializer, StructuralScheduleItemSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    search_fields = ['name', 'code', 'client']
    filterset_fields = ['status']

from django.db.models.functions import Length

class StructuralScheduleItemViewSet(viewsets.ModelViewSet):
    serializer_class = StructuralScheduleItemSerializer
    filterset_fields = ['project']

    def get_queryset(self):
        # Sort by length of seq_no first, then alphabetically — gives numeric order: 1,2,...,9,10,11
        return StructuralScheduleItem.objects.annotate(
            seq_len=Length('seq_no')
        ).order_by('project', 'seq_len', 'seq_no')

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
