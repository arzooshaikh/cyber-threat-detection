from rest_framework import serializers
from .models import MilitaryBase, NetworkTraffic, ThreatDetection, FederatedModelRound, ClientMetrics


class MilitaryBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilitaryBase
        fields = '__all__'


class NetworkTrafficSerializer(serializers.ModelSerializer):
    class Meta:
        model = NetworkTraffic
        fields = '__all__'


class ThreatDetectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThreatDetection
        fields = '__all__'


class FederatedModelRoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = FederatedModelRound
        fields = '__all__'


class ClientMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientMetrics
        fields = '__all__'

