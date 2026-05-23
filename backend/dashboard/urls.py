from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardStatsView, AnnouncementViewSet

router = DefaultRouter()
router.register(r'announcements', AnnouncementViewSet, basename='announcement')

urlpatterns = [
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]
