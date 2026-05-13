from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, StructuralScheduleItemViewSet, CustomerViewSet, DetailerViewSet

router = DefaultRouter()
router.register('customers', CustomerViewSet, basename='customers')
router.register('detailers', DetailerViewSet, basename='detailers')
router.register('structural-schedules', StructuralScheduleItemViewSet, basename='structural-schedules')
router.register('', ProjectViewSet, basename='projects')

urlpatterns = [path('', include(router.urls))]

