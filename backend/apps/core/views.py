from rest_framework import viewsets
from .models import MilitaryBase, NetworkTraffic, ThreatDetection, FederatedModelRound, ClientMetrics
from .serializers import (
    MilitaryBaseSerializer,
    NetworkTrafficSerializer,
    ThreatDetectionSerializer,
    FederatedModelRoundSerializer,
    ClientMetricsSerializer,
)


class MilitaryBaseViewSet(viewsets.ModelViewSet):
    queryset = MilitaryBase.objects.all()
    serializer_class = MilitaryBaseSerializer


class NetworkTrafficViewSet(viewsets.ModelViewSet):
    queryset = NetworkTraffic.objects.all()
    serializer_class = NetworkTrafficSerializer


class ThreatDetectionViewSet(viewsets.ModelViewSet):
    queryset = ThreatDetection.objects.all()
    serializer_class = ThreatDetectionSerializer


class FederatedModelRoundViewSet(viewsets.ModelViewSet):
    queryset = FederatedModelRound.objects.all()
    serializer_class = FederatedModelRoundSerializer


class ClientMetricsViewSet(viewsets.ModelViewSet):
    queryset = ClientMetrics.objects.all()
    serializer_class = ClientMetricsSerializer


from django.shortcuts import render

# Create your views here.
