from rest_framework import serializers


class TrafficInputSerializer(serializers.Serializer):
    """Validates incoming traffic data for prediction."""
    packet_size = serializers.FloatField()
    inter_arrival_time = serializers.FloatField()
    payload_entropy = serializers.FloatField()
    syn_count = serializers.IntegerField()
    ack_count = serializers.IntegerField()
    fin_count = serializers.IntegerField()
    rst_count = serializers.IntegerField()
    duration = serializers.FloatField()
    dest_port = serializers.IntegerField()


class PredictionResponseSerializer(serializers.Serializer):
    """Formats the prediction output."""
    is_anomaly = serializers.BooleanField()
    anomaly_score = serializers.FloatField()
    confidence = serializers.FloatField()