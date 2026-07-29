from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_threat_event(event_type: str, threat_data: dict):
    """
    Pushes a real-time update to every connected WebSocket client on the
    Threats page.

    event_type: 'created' | 'updated'
    threat_data: JSON-safe dict (e.g. dict(ThreatDetectionSerializer(threat).data))

    Never raises - a Redis/channel-layer hiccup should never break the
    actual HTTP request that triggered this, it just won't be live-streamed.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(
            'threats',
            {
                'type': 'threat.event',
                'event_type': event_type,
                'threat': threat_data,
            },
        )
    except Exception as exc:
        print(f"[broadcast_threat_event] failed to broadcast: {exc}")
