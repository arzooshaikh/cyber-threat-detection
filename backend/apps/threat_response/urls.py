from django.urls import path
from .views import DetectAndRespondView, IsolateThreatView, ResolveThreatView, ThreatSearchView

urlpatterns = [
    path('detect/', DetectAndRespondView.as_view(), name='detect-and-respond'),
    path('search/', ThreatSearchView.as_view(), name='threat-search'),
    path('<int:threat_id>/isolate/', IsolateThreatView.as_view(), name='isolate-threat'),
    path('<int:threat_id>/resolve/', ResolveThreatView.as_view(), name='resolve-threat'),
]