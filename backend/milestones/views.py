from rest_framework import viewsets
from .models import Milestone
from .serializers import MilestoneSerializer

class MilestoneViewSet(viewsets.ModelViewSet):
    queryset = Milestone.objects.all()
    serializer_class = MilestoneSerializer
    search_fields = ['title', 'project', 'assignee']
    filterset_fields = ['status', 'priority']
