from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductionScheduleViewSet, 
    ProductionItemViewSet, 
    ProductionPriorityViewSet, 
    ProductionPriorityItemViewSet,
    MachineViewSet,
    ManpowerViewSet,
    CapacityViewSet
)

router = DefaultRouter()
router.register(r'schedules', ProductionScheduleViewSet)
router.register(r'items', ProductionItemViewSet)
router.register(r'priorities', ProductionPriorityViewSet)
router.register(r'priority-items', ProductionPriorityItemViewSet)
router.register(r'machines', MachineViewSet)
router.register(r'manpower', ManpowerViewSet)
router.register(r'capacity', CapacityViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
