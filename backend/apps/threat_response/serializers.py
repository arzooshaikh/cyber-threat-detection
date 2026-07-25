from rest_framework import serializers


class DetectAndRespondRequestSerializer(serializers.Serializer):
    """
    Same 9 traffic features as TrafficInputSerializer (anomaly_detection app),
    plus optional context fields so a real ThreatDetection row can be saved
    if the traffic turns out to be anomalous.
    """
    packet_size = serializers.FloatField()
    inter_arrival_time = serializers.FloatField()
    payload_entropy = serializers.FloatField()
    syn_count = serializers.IntegerField()
    ack_count = serializers.IntegerField()
    fin_count = serializers.IntegerField()
    rst_count = serializers.IntegerField()
    duration = serializers.FloatField()
    dest_port = serializers.IntegerField()

    # Optional context - sensible defaults are applied in the view if omitted
    base_id = serializers.IntegerField(required=False)
    src_ip = serializers.IPAddressField(required=False, default='0.0.0.0')
    dest_ip = serializers.IPAddressField(required=False, default='0.0.0.0')
    src_port = serializers.IntegerField(required=False, default=0)


class ResolveThreatRequestSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['resolved', 'false_positive'])
    notes = serializers.CharField(required=False, allow_blank=True, default='')
