from django.urls import path
from .views import RunFederatedRoundView, FederatedRoundTaskStatusView

urlpatterns = [
    path('run-round/', RunFederatedRoundView.as_view(), name='run-federated-round'),
    path('task-status/<str:task_id>/', FederatedRoundTaskStatusView.as_view(), name='federated-task-status'),
]