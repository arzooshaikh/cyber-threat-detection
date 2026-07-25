"""
Rule-based threat response policy.

This is deliberately NOT another ML model. Once the Isolation Forest +
SHAP have already told us (a) something is anomalous and (b) which
features drove that decision, deciding what to DO about it is a policy
question, not a prediction question - so a transparent, explainable
rule set is the right tool here (same philosophy as the CICIDS "hybrid
rule" in the ML results: combine a model score with a simple, human-
readable domain rule).
"""

# Confidence score (0.0-1.0, from the anomaly detection engine) at or
# above which a threat is isolated automatically, with no human step.
AUTO_ISOLATE_CONFIDENCE_THRESHOLD = 0.75


def classify_threat_type(raw_features: dict) -> str:
    """
    Very simple, explainable heuristic classifier that maps raw traffic
    feature values to one of the ThreatDetection.THREAT_TYPES choices.

    This intentionally does NOT use the anomaly detection model itself -
    it's a separate, human-readable rule layer that only runs after the
    Isolation Forest has already flagged something as anomalous. Rules
    are ordered from most to least specific.
    """
    syn = raw_features.get('syn_count', 0)
    ack = raw_features.get('ack_count', 0)
    fin = raw_features.get('fin_count', 0)
    rst = raw_features.get('rst_count', 0)
    duration = raw_features.get('duration', 0)
    entropy = raw_features.get('payload_entropy', 0)
    packet_size = raw_features.get('packet_size', 0)
    dest_port = raw_features.get('dest_port', 0)

    # Port scan: many SYNs, almost no ACK/FIN (connections never complete),
    # very short-lived.
    if syn >= 15 and ack <= 2 and fin <= 1 and duration < 1:
        return 'port_scan'

    # Brute force: repeated attempts against a classic auth port (FTP/SSH/
    # RDP/Telnet), short duration, elevated resets.
    if dest_port in (21, 22, 23, 3389) and rst >= 3 and duration < 5:
        return 'brute_force'

    # DoS/DDoS: very high SYN volume sustained over a longer window.
    if syn >= 30 and duration >= 1:
        return 'dos'

    # Data exfiltration: unusually large packets with high payload entropy
    # (suggests compressed/encrypted data leaving the network).
    if entropy >= 7.0 and packet_size >= 1000:
        return 'data_exfil'

    # Malware C2 traffic: high entropy payload but small, irregular packets.
    if entropy >= 6.5 and packet_size < 300:
        return 'malware'

    return 'unknown'


def decide_isolation(confidence_score: float) -> bool:
    """
    Auto-isolation decision. Kept as its own function (rather than inlined)
    so the policy threshold is one obvious, documented place to tune -
    and so it's independently testable/citable in the report.
    """
    return confidence_score >= AUTO_ISOLATE_CONFIDENCE_THRESHOLD
