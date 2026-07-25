from django.urls import path
from .views import DetectAndRespondView, IsolateThreatView, ResolveThreatView

urlpatterns = [
    path('detect/', DetectAndRespondView.as_view(), name='detect-and-respond'),
    path('<int:threat_id>/isolate/', IsolateThreatView.as_view(), name='isolate-threat'),
    path('<int:threat_id>/resolve/', ResolveThreatView.as_view(), name='resolve-threat'),
]