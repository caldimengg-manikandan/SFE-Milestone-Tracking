from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_root(request):
    return JsonResponse({"message": "Welcome to the SFE Milestone Tracking API!", "status": "Running"})

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/employees/', include('employees.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/milestones/', include('milestones.urls')),
    path('api/customers/', include('customers.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
