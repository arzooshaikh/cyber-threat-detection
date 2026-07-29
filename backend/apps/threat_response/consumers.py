import json

from channels.generic.websocket import AsyncWebsocketConsumer


class ThreatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket endpoint: ws://<host>/ws/threats/?token=<auth_token>

    Streams real-time threat events to any connected, authenticated client:
      - 'created' - a brand new detection was saved (from /detect/)
      - 'updated' - an existing threat was isolated or resolved

    Broadcasting is triggered from threat_response/broadcast.py, called by
    the views whenever a ThreatDetection row is created or changed.
    """

    GROUP_NAME = 'threats'

    async def connect(self):
        user = self.scope.get('user')
        if user is None or not user.is_authenticated:
            await self.close(code=4401)  # custom close code: unauthenticated
            return

        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    async def threat_event(self, event):
        """
        Handler for messages sent via group_send(type='threat.event', ...) -
        Channels maps the dot in 'threat.event' to this threat_event method.
        """
        await self.send(text_data=json.dumps({
            'event': event['event_type'],
            'threat': event['threat'],
        }))
