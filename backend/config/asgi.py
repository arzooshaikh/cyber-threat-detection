"""
ASGI config for config project.

Handles two protocols now:
  - http: the normal Django request/response cycle (unchanged)
  - websocket: real-time threat streaming (apps/threat_response/routing.py)

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# get_asgi_application() must be called (and Django apps loaded) BEFORE
# importing anything that touches models/consumers, or Django raises
# "Apps aren't loaded yet."
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from apps.threat_response.routing import websocket_urlpatterns  # noqa: E402
from apps.threat_response.token_auth_middleware import TokenAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': TokenAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
