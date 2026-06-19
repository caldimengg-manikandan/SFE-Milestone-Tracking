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
    path('api/chatbot/', include('chatbot.urls')),
    
    # Integrated RFQ & Dashboards module APIs
    path('api/rfq/', include('apps.rfq.urls')),
    path('api/rfq-dashboard/', include('apps.dashboards.urls')),

    # Erection Estimation Module APIs
    path('api/auth/', include('apps.core.urls.auth')),
    path('api/reference/', include('apps.field_moment_conn.urls.reference')),
    path('api/projects/<int:project_id>/bid-summary/', include('apps.bid_summary.urls')),
    path('api/projects/<int:project_id>/breakdown/', include('apps.breakdown.urls')),
    path('api/projects/<int:project_id>/erection-takeoff/', include('apps.erection_takeoff.urls')),
    path('api/projects/<int:project_id>/estimate-data/', include('apps.estimate_data.urls')),
    path('api/projects/<int:project_id>/fmc/', include('apps.field_moment_conn.urls.takeoff')),
    path('api/projects/<int:project_id>/misc-metals/', include('apps.misc_metals.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
