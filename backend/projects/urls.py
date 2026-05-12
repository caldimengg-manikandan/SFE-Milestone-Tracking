from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, StructuralScheduleItemViewSet

router = DefaultRouter()
router.register('structural-schedules', StructuralScheduleItemViewSet, basename='structural-schedules')
router.register('', ProjectViewSet, basename='projects')

urlpatterns = [path('', include(router.urls))]

