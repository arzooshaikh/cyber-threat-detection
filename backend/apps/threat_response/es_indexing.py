import logging

from .es_client import get_es_client

logger = logging.getLogger(__name__)

THREATS_INDEX = 'threats'

THREATS_INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "id": {"type": "integer"},
            "threat_id": {"type": "keyword"},
            "base": {"type": "integer"},
            "src_ip": {"type": "ip"},
            "dest_ip": {"type": "ip"},
            "src_port": {"type": "integer"},
            "dest_port": {"type": "integer"},
            "threat_type": {"type": "keyword"},
            "confidence_score": {"type": "float"},
            "anomaly_score": {"type": "float"},
            "status": {"type": "keyword"},
            "is_isolated": {"type": "boolean"},
            "notes": {"type": "text"},
            "detected_at": {"type": "date"},
            "resolved_at": {"type": "date"},
        }
    }
}


def ensure_threats_index():
    """
    Creates the 'threats' Elasticsearch index with proper field mappings, if
    it doesn't already exist. Safe to call repeatedly (idempotent).

    Never raises - if Elasticsearch isn't reachable yet (e.g. still starting
    up), this just logs a warning instead of crashing Django on startup.
    """
    try:
        client = get_es_client()
        if not client.indices.exists(index=THREATS_INDEX):
            client.indices.create(index=THREATS_INDEX, body=THREATS_INDEX_MAPPING)
            logger.info(f"Created Elasticsearch index '{THREATS_INDEX}'")
    except Exception as exc:
        logger.warning(f"Could not ensure Elasticsearch index (is Elasticsearch up yet?): {exc}")


def index_threat(threat_data: dict) -> bool:
    """
    Indexes (or re-indexes) one threat document into Elasticsearch, keyed by
    its Django primary key - so re-indexing the same threat after an
    isolate/resolve action updates the existing document instead of creating
    a duplicate.

    Never raises - a search/log-storage hiccup should never break the actual
    detect/isolate/resolve HTTP request that triggered this. Returns True on
    success, False if indexing failed (e.g. Elasticsearch unreachable) - the
    caller can ignore this (existing behavior) or check it (e.g. the backfill
    management command reports an accurate success count).
    """
    try:
        client = get_es_client()
        doc_id = threat_data.get('id')
        # 'base' comes through as a nested object from the serializer in some
        # contexts - normalize to just the FK id, which is all we index/search on.
        doc = dict(threat_data)
        if isinstance(doc.get('base'), dict):
            doc['base'] = doc['base'].get('id')
        client.index(index=THREATS_INDEX, id=doc_id, document=doc)
        return True
    except Exception as exc:
        logger.warning(f"Failed to index threat {threat_data.get('id')} into Elasticsearch: {exc}")
        return False


def search_threats(query_text=None, threat_type=None, status=None, is_isolated=None,
                    min_confidence=None, size=50):
    """
    Full-text + filtered search across indexed threats. Returns a list of
    matched documents (plain dicts), newest first.

    Returns an empty list (rather than raising) if Elasticsearch is
    unreachable or the index doesn't exist yet.
    """
    try:
        client = get_es_client()

        must_clauses = []
        filter_clauses = []

        if query_text:
            must_clauses.append({
                "multi_match": {
                    "query": query_text,
                    "fields": ["src_ip", "dest_ip", "threat_type", "notes", "status"],
                }
            })

        if threat_type:
            filter_clauses.append({"term": {"threat_type": threat_type}})
        if status:
            filter_clauses.append({"term": {"status": status}})
        if is_isolated is not None:
            filter_clauses.append({"term": {"is_isolated": is_isolated}})
        if min_confidence is not None:
            filter_clauses.append({"range": {"confidence_score": {"gte": min_confidence}}})

        if must_clauses or filter_clauses:
            query = {"bool": {}}
            if must_clauses:
                query["bool"]["must"] = must_clauses
            if filter_clauses:
                query["bool"]["filter"] = filter_clauses
        else:
            query = {"match_all": {}}

        response = client.search(
            index=THREATS_INDEX,
            query=query,
            sort=[{"detected_at": {"order": "desc"}}],
            size=size,
        )
        return [hit["_source"] for hit in response["hits"]["hits"]]
    except Exception as exc:
        logger.warning(f"Elasticsearch search failed: {exc}")
        return []
