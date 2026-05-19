from rest_framework import viewsets
from .models import (
    ProductionSchedule, ProductionItem, ProductionPriority, ProductionPriorityItem,
    Machine, Manpower, Capacity
)
from .serializers import (
    ProductionScheduleSerializer, 
    ProductionItemSerializer, 
    ProductionPrioritySerializer, 
    ProductionPriorityItemSerializer,
    MachineSerializer,
    ManpowerSerializer,
    CapacitySerializer
)

class ProductionScheduleViewSet(viewsets.ModelViewSet):
    queryset = ProductionSchedule.objects.all().order_by('-created_at')
    serializer_class = ProductionScheduleSerializer

class ProductionItemViewSet(viewsets.ModelViewSet):
    queryset = ProductionItem.objects.all()
    serializer_class = ProductionItemSerializer

class ProductionPriorityViewSet(viewsets.ModelViewSet):
    queryset = ProductionPriority.objects.all().order_by('-created_at')
    serializer_class = ProductionPrioritySerializer

    def get_queryset(self):
        queryset = ProductionPriority.objects.all().order_by('-created_at')
        module_type = self.request.query_params.get('module_type', None)
        schedule = self.request.query_params.get('schedule', None)
        if module_type is not None:
            queryset = queryset.filter(module_type=module_type)
        if schedule is not None:
            queryset = queryset.filter(schedule=schedule)
        return queryset

class ProductionPriorityItemViewSet(viewsets.ModelViewSet):
    queryset = ProductionPriorityItem.objects.all()
    serializer_class = ProductionPriorityItemSerializer

class MachineViewSet(viewsets.ModelViewSet):
    queryset = Machine.objects.all().order_by('-created_at')
    serializer_class = MachineSerializer

class ManpowerViewSet(viewsets.ModelViewSet):
    queryset = Manpower.objects.all().order_by('-created_at')
    serializer_class = ManpowerSerializer

class CapacityViewSet(viewsets.ModelViewSet):
    queryset = Capacity.objects.all().order_by('-created_at')
    serializer_class = CapacitySerializer
