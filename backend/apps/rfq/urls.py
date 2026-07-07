from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RFQMasterViewSet, CustomerViewSet, EstimatorViewSet, MonthlyBidGoalViewSet, SystemSettingViewSet

router = DefaultRouter()
router.register(r'rfq', RFQMasterViewSet, basename='rfq')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'estimators', EstimatorViewSet, basename='estimator')
router.register(r'goals', MonthlyBidGoalViewSet, basename='goal')
router.register(r'settings', SystemSettingViewSet, basename='setting')

urlpatterns = [
    path('', include(router.urls)),
]
