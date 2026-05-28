from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def root_view(request):
    return JsonResponse({
        "message": "SFE Milestone Tracking API is running",
        "status": "online",
        "endpoints": [
            "/api/auth/",
            "/api/employees/",
            "/api/projects/",
            "/api/milestones/",
            "/api/production/",
            "/api/dashboard/",
            "/api/bids/"
        ]
    })

urlpatterns = [
    path('', root_view),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/employees/', include('employees.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/milestones/', include('milestones.urls')),
    path('api/production/', include('production.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/bids/', include('bids.urls')),
    
    # Integrated RFQ & Dashboards module APIs
    path('api/rfq/', include('apps.rfq.urls')),
    path('api/rfq-dashboard/', include('apps.dashboards.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
