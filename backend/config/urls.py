"""SFE RFQ URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from apps.accounts.views import CustomTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Auth — uses CustomTokenObtainPairView so response includes user object
    path('api/auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # App APIs
    path('api/', include('apps.rfq.urls')),
    path('api/dashboards/', include('apps.dashboards.urls')),
    path('api/accounts/', include('apps.accounts.urls')),
]
