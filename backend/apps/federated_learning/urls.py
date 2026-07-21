from django.urls import path
from .views import RunFederatedRoundView

urlpatterns = [
    path('run-round/', RunFederatedRoundView.as_view(), name='run-federated-round'),
]