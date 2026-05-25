from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BidEnquiryViewSet

router = DefaultRouter()
router.register('enquiries', BidEnquiryViewSet, basename='bid-enquiries')

urlpatterns = [
    path('', include(router.urls)),
]
