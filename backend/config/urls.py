from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('api/', include('apps.core.urls')),
    path('api/anomaly/', include('apps.anomaly_detection.urls')),
    path('api/federated/', include('apps.federated_learning.urls')),
    path('api/threat-response/', include('apps.threat_response.urls')),
]