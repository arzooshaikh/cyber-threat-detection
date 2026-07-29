from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def get_user_from_token(token_key):
    from rest_framework.authtoken.models import Token
    try:
        token = Token.objects.select_related('user').get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()


class TokenAuthMiddleware:
    """
    Custom Channels middleware that authenticates WebSocket connections using
    the same DRF auth token the React frontend already uses for HTTP requests
    (passed as a query string: ws://.../ws/threats/?token=<token>).

    Browsers can't attach custom Authorization headers to a WebSocket
    handshake request, so a query parameter is the standard workaround for
    token-based (non-session-cookie) auth with Django Channels.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token_key = query_params.get('token', [None])[0]

        if token_key:
            scope['user'] = await get_user_from_token(token_key)
        else:
            scope['user'] = AnonymousUser()

        return await self.app(scope, receive, send)
