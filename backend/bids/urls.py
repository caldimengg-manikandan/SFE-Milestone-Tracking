from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BidEnquiryViewSet, HolidayViewSet

router = DefaultRouter()
router.register('enquiries', BidEnquiryViewSet, basename='bid-enquiries')
router.register('holidays', HolidayViewSet, basename='holidays')

urlpatterns = [
    path('', include(router.urls)),
]
