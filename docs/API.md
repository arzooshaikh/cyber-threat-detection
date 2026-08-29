# API Reference

All endpoints are prefixed with `/api/`. All endpoints (except login) require
authentication - see [Authentication](#authentication) below.

Base URL for local development: `http://127.0.0.1:8000/api/`

---

## Authentication

The API uses **DRF Token Authentication**. Every request except login must
include an `Authorization` header.

### `POST /api/auth/login/`

Exchange a username/password for an auth token.

**Request body:**
```json
{ "username": "demo", "password": "DemoPass123!" }
```

**Response `200`:**
```json
{ "token": "6c8e98cc4c5fba9daffa0b7f91db056a38f5eb08" }
```

**Using the token on every subsequent request:**
```
Authorization: Token 6c8e98cc4c5fba9daffa0b7f91db056a38f5eb08
```

Requests without a valid token return `401 Unauthorized`.

---

## Core resources

Standard REST CRUD endpoints (`GET` list, `GET` detail, `POST`, `PUT`,
`PATCH`, `DELETE`), backed by Django REST Framework's `ModelViewSet` /
`DefaultRouter`. All support the DRF browsable API in a browser when logged
in via session auth.

### Military Bases — `/api/bases/`

| Field | Type | Notes |
|---|---|---|
| `id` | int | read-only |
| `base_id` | string | unique, e.g. `BASE001` |
| `base_name` | string | |
| `location` | string | |
| `ip_subnet` | string | e.g. `192.168.1.0/24` |
| `contact_email` | string \| null | |
| `is_active` | boolean | |
| `last_sync` | datetime \| null | |
| `created_at` / `updated_at` | datetime | read-only |

### Network Traffic — `/api/traffic/`

Raw traffic records (9 ML feature fields + metadata). Field list:
`base`, `src_ip`, `dest_ip`, `src_port`, `dest_port`, `protocol`,
`packet_size`, `bytes_sent`, `bytes_received`, `packets_sent`,
`packets_received`, `payload_entropy`, `inter_arrival_time`, `syn_count`,
`ack_count`, `fin_count`, `rst_count`, `duration`, `timestamp`, `label`
(`benign` / `attack` / `unknown`).

### Threats — `/api/threats/`

The main threat log. Ordered **newest first** (`-detected_at`) by default.

| Field | Type | Notes |
|---|---|---|
| `id` | int | read-only |
| `threat_id` | UUID | auto-generated |
| `base` | int (FK) | |
| `src_ip` / `dest_ip` | string | |
| `src_port` / `dest_port` | int \| null | |
| `threat_type` | string | `dos`, `port_scan`, `brute_force`, `malware`, `data_exfil`, `unknown` |
| `confidence_score` | float | 0.0-1.0 |
| `anomaly_score` | float | raw Isolation Forest decision function output |
| `key_features` | JSON | top SHAP features for this detection |
| `threat_indicators` | JSON \| null | extra IOC-style data |
| `is_isolated` | boolean | |
| `isolation_timestamp` | datetime \| null | |
| `status` | string | `active`, `resolved`, `false_positive` |
| `notes` | string \| null | |
| `detected_at` / `resolved_at` | datetime | |

Manual create/update via this endpoint is possible (it's a normal
`ModelViewSet`), but in practice threats are created via
`/api/threat-response/detect/` (below), not posted here directly.

### Federated Learning Rounds — `/api/fl-rounds/`

One row per completed (or in-progress) federated round. Key fields:
`round_number`, `status` (`pending`/`running`/`completed`/`failed`),
`global_accuracy`, `global_precision`, `global_recall`, `global_f1`,
`communication_bytes` (actual bytes transferred - prediction scores only),
`centralized_equivalent_bytes` (what raw-data transfer would have cost, for
comparison), `num_clients`, `model_version`.

### Client Metrics — `/api/client-metrics/`

Per-base metrics for a given round. Key fields: `round` (FK),
`base` (FK), `local_accuracy`, `local_precision`, `local_recall`,
`training_samples`, `anomaly_samples`, `benign_samples`, `weight`
(this base's F1-weighted vote share in the ensemble).

---

## Anomaly Detection

### `POST /api/anomaly/predict/`

Runs the trained Isolation Forest model on a single traffic sample and
returns the prediction **with a SHAP explanation** — does not save
anything to the database. This is the "quick test" endpoint used by the
Run Detection page.

**Request body** (all 9 fields required):
```json
{
  "packet_size": 61.74,
  "inter_arrival_time": 1.51,
  "payload_entropy": 7.6,
  "syn_count": 49,
  "ack_count": 1,
  "fin_count": 0,
  "rst_count": 9,
  "duration": 0.021,
  "dest_port": 21
}
```

**Response `200`:**
```json
{
  "is_anomaly": true,
  "anomaly_score": -0.0029,
  "confidence": 0.503,
  "feature_contributions": [
    { "feature": "rst_count", "value": -1.877 },
    { "feature": "syn_count", "value": -1.323 }
  ]
}
```
`feature_contributions` is sorted by strongest influence first. **Negative**
values pushed the sample toward "anomaly"; **positive** values pushed it
toward "normal" (see `engine.py` for the full sign-convention explanation).

---

## Threat Response (detection → classification → auto-isolation)

### `POST /api/threat-response/detect/`

The full pipeline in one call: runs the same Isolation Forest + SHAP
prediction as `/api/anomaly/predict/`, then — **only if the traffic is
flagged as anomalous** — classifies the threat type via rule-based logic,
decides whether to auto-isolate (confidence ≥ 75%), saves a real
`ThreatDetection` row, indexes it into Elasticsearch, and broadcasts it to
any connected WebSocket clients in real time.

**Request body:** same 9 traffic fields as `/predict/`, plus optional
context:
```json
{
  "packet_size": 61.74, "inter_arrival_time": 1.51, "payload_entropy": 7.6,
  "syn_count": 49, "ack_count": 1, "fin_count": 0, "rst_count": 9,
  "duration": 0.021, "dest_port": 21,
  "base_id": 1, "src_ip": "203.0.113.55", "dest_ip": "192.168.1.10", "src_port": 4444
}
```
`base_id`, `src_ip`, `dest_ip`, `src_port` are all optional — sensible
defaults are applied if omitted.

**Response `201`** (anomaly detected):
```json
{
  "is_anomaly": true,
  "anomaly_score": -0.0029,
  "confidence_score": 0.503,
  "feature_contributions": [ ... ],
  "threat": { "id": 5, "threat_type": "port_scan", "is_isolated": false, "...": "full ThreatDetection object" }
}
```

**Response `200`** (not anomalous): same shape, `"threat": null` — nothing
is saved, matching how a real IDS only logs genuine detections.

### `POST /api/threat-response/<id>/isolate/`

Manually isolate a threat (sets `is_isolated=true`,
`isolation_timestamp=now`). Broadcasts an `updated` event over WebSocket
and re-indexes into Elasticsearch. No request body needed.

### `POST /api/threat-response/<id>/resolve/`

Mark a threat resolved or as a false positive.

**Request body:**
```json
{ "status": "resolved", "notes": "Confirmed and mitigated." }
```
`status` must be `resolved` or `false_positive`. `notes` is optional.

### `GET /api/threat-response/search/`

Full-text + filtered search over Elasticsearch-indexed threats (separate
data path from `/api/threats/`, which reads straight from the database).

**Query parameters** (all optional):

| Param | Type | Example |
|---|---|---|
| `q` | string | `port_scan` — matched against `src_ip`, `dest_ip`, `threat_type`, `notes`, `status` |
| `threat_type` | string | `port_scan` |
| `status` | string | `active` |
| `is_isolated` | `true` / `false` | |
| `min_confidence` | float | `0.75` |

**Response `200`:**
```json
{ "count": 1, "results": [ { "...": "matching ThreatDetection documents" } ] }
```
Returns `{"count": 0, "results": []}` (not an error) if Elasticsearch is
unreachable — search degrades gracefully rather than breaking the page.

---

## Federated Learning

### `POST /api/federated/run-round/`

Kicks off one federated learning round as a **background Celery task** and
returns immediately - it does not wait for training to finish.

**Request body:**
```json
{ "num_bases": 3 }
```

**Response `202 Accepted`:**
```json
{ "task_id": "a1b2c3...", "status": "queued" }
```

### `GET /api/federated/task-status/<task_id>/`

Poll this with the `task_id` from above to find out when training finishes.

**Response while running:**
```json
{ "task_id": "a1b2c3...", "state": "STARTED" }
```

**Response on success:**
```json
{ "task_id": "a1b2c3...", "state": "SUCCESS", "result": { "...": "the full serialized FederatedModelRound" } }
```

**Response on failure:**
```json
{ "task_id": "a1b2c3...", "state": "FAILURE", "error": "..." }
```

---

## WebSocket: real-time threat streaming

### `ws://<host>:8000/ws/threats/?token=<auth_token>`

Streams live updates whenever a threat is created (via `/detect/`),
isolated, or resolved. Browsers can't attach custom headers to a WebSocket
handshake, so the auth token is passed as a query parameter instead of an
`Authorization` header.

**Message format** (JSON, sent for every event):
```json
{ "event": "created", "threat": { "...": "full ThreatDetection object" } }
```
`event` is `"created"` or `"updated"`.

Connections without a valid token are closed immediately with close code
`4401`.

---

## Error format

Validation errors return `400` with DRF's standard field-error shape:
```json
{ "dest_port": ["This field is required."] }
```

Authentication failures return `401`:
```json
{ "detail": "Authentication credentials were not provided." }
```

Not-found lookups (e.g. isolating a threat ID that doesn't exist) return
`404` with a clear message.
