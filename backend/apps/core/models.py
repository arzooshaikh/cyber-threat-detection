from django.db import models
from django.utils import timezone


class MilitaryBase(models.Model):
    """Federated learning participant"""
    base_id = models.CharField(max_length=100, unique=True)
    base_name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    ip_subnet = models.CharField(max_length=50)  # e.g., "192.168.1.0/24"
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'military_bases'

    def __str__(self):
        return self.base_name


class NetworkTraffic(models.Model):
    """Raw network traffic records"""
    base = models.ForeignKey(MilitaryBase, on_delete=models.CASCADE)
    src_ip = models.GenericIPAddressField()
    dest_ip = models.GenericIPAddressField()
    src_port = models.IntegerField()
    dest_port = models.IntegerField()
    protocol = models.CharField(max_length=20)  # TCP, UDP, ICMP
    packet_size = models.IntegerField()
    payload_entropy = models.FloatField()
    inter_arrival_time = models.FloatField()  # ms
    syn_count = models.IntegerField(default=0)
    ack_count = models.IntegerField(default=0)
    fin_count = models.IntegerField(default=0)
    rst_count = models.IntegerField(default=0)
    duration = models.FloatField()  # Connection duration
    timestamp = models.DateTimeField(auto_now_add=True)
    label = models.CharField(max_length=20, default='benign')  # benign, attack, unknown

    class Meta:
        db_table = 'network_traffic'
        indexes = [
            models.Index(fields=['base', 'timestamp']),
            models.Index(fields=['src_ip', 'timestamp']),
        ]


class ThreatDetection(models.Model):
    """Detected threats/anomalies"""
    THREAT_TYPES = [
        ('dos', 'DoS/DDoS'),
        ('port_scan', 'Port Scanning'),
        ('brute_force', 'Brute Force'),
        ('malware', 'Malware Traffic'),
        ('data_exfil', 'Data Exfiltration'),
        ('unknown', 'Unknown'),
    ]

    base = models.ForeignKey(MilitaryBase, on_delete=models.CASCADE)
    src_ip = models.GenericIPAddressField()
    dest_ip = models.GenericIPAddressField()
    threat_type = models.CharField(max_length=50, choices=THREAT_TYPES)
    confidence_score = models.FloatField()  # 0.0 to 1.0
    anomaly_score = models.FloatField()
    key_features = models.JSONField()  # Top SHAP features
    is_isolated = models.BooleanField(default=False)
    isolation_timestamp = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='active')  # active, resolved, false_positive
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'threat_detections'
        indexes = [
            models.Index(fields=['base', 'detected_at']),
            models.Index(fields=['confidence_score']),
        ]


class FederatedModelRound(models.Model):
    """Track federated learning rounds"""
    round_number = models.IntegerField()
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    global_accuracy = models.FloatField(null=True, blank=True)
    global_precision = models.FloatField(null=True, blank=True)
    global_recall = models.FloatField(null=True, blank=True)
    global_f1 = models.FloatField(null=True, blank=True)
    communication_bytes = models.BigIntegerField(default=0)
    num_clients = models.IntegerField()
    model_version = models.CharField(max_length=100)

    class Meta:
        db_table = 'federated_model_rounds'


class ClientMetrics(models.Model):
    """Per-base metrics for each FL round"""
    round = models.ForeignKey(FederatedModelRound, on_delete=models.CASCADE)
    base = models.ForeignKey(MilitaryBase, on_delete=models.CASCADE)
    local_accuracy = models.FloatField()
    local_precision = models.FloatField()
    local_recall = models.FloatField()
    local_f1 = models.FloatField()
    training_samples = models.IntegerField()
    upload_time_ms = models.FloatField()

    class Meta:
        db_table = 'client_metrics'
        unique_together = ('round', 'base')


from django.db import models

# Create your models here.
