from rest_framework import viewsets, permissions
from .models import Customer
from .serializers import CustomerSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.filter(isActive=True)
    serializer_class = CustomerSerializer
    pagination_class = None
