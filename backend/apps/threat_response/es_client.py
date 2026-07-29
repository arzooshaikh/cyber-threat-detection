import os

from elasticsearch import Elasticsearch

# Defaults to localhost:9200 for running Django natively (assuming
# `docker compose up elasticsearch` - or the full stack - is running, since
# docker-compose publishes Elasticsearch on host port 9200).
# Inside Docker Compose, this is overridden to http://elasticsearch:9200 (the
# service name, resolved on the compose network) - see docker-compose.yml.
ELASTICSEARCH_URL = os.environ.get('ELASTICSEARCH_URL', 'http://localhost:9200')

_client = None


def get_es_client() -> Elasticsearch:
    """
    Returns a shared Elasticsearch client, created once and reused (same
    pattern as the anomaly detection model being loaded once at startup).
    """
    global _client
    if _client is None:
        _client = Elasticsearch(ELASTICSEARCH_URL, request_timeout=5)
    return _client
evrything