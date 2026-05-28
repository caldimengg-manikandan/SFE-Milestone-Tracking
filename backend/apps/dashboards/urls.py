from django.urls import path
from .views import (
    BidPerformanceDashboardView,
    DollarDashboardView,
    JobAnalyticsDashboardView,
    SalesCycleDashboardView,
    FutureCapacityView,
)

urlpatterns = [
    path('bid-performance/', BidPerformanceDashboardView.as_view(), name='bid-performance'),
    path('dollar/', DollarDashboardView.as_view(), name='dollar-dashboard'),
    path('job-analytics/', JobAnalyticsDashboardView.as_view(), name='job-analytics'),
    path('sales-cycle/', SalesCycleDashboardView.as_view(), name='sales-cycle'),
    path('future-capacity/', FutureCapacityView.as_view(), name='future-capacity'),
]
