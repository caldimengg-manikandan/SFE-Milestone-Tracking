from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RFQMasterViewSet, CustomerViewSet, EstimatorViewSet, MonthlyBidGoalViewSet

router = DefaultRouter()
router.register(r'rfq', RFQMasterViewSet, basename='rfq')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'estimators', EstimatorViewSet, basename='estimator')
router.register(r'goals', MonthlyBidGoalViewSet, basename='goal')

urlpatterns = [
    path('', include(router.urls)),
]
