from django.urls import path
from .views import PredictAnomalyView

urlpatterns = [
    path('predict/', PredictAnomalyView.as_view(), name='predict-anomaly'),
]