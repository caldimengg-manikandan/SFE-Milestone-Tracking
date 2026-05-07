from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductionScheduleViewSet, 
    ProductionItemViewSet, 
    ProductionPriorityViewSet, 
    ProductionPriorityItemViewSet
)

router = DefaultRouter()
router.register(r'schedules', ProductionScheduleViewSet)
router.register(r'items', ProductionItemViewSet)
router.register(r'priorities', ProductionPriorityViewSet)
router.register(r'priority-items', ProductionPriorityItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
