from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', obtain_auth_token, name='api-login'),
    path('api/', include('apps.core.urls')),
    path('api/anomaly/', include('apps.anomaly_detection.urls')),
    path('api/federated/', include('apps.federated_learning.urls')),
    path('api/threat-response/', include('apps.threat_response.urls')),
]