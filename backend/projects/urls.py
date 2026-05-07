from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, StructuralScheduleViewSet

router = DefaultRouter()
router.register('schedules', StructuralScheduleViewSet, basename='schedules')
router.register('', ProjectViewSet, basename='projects')

urlpatterns = [path('', include(router.urls))]

