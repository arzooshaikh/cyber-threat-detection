# 🛡️ Cyber Threat Detection for Defence Networks

An AI-based Intrusion Detection System (IDS) for defence networks: real-time network anomaly detection with **explainable AI**, **automatic threat response**, and a **custom federated ensemble learning** framework - so multiple military bases could one day collaboratively train a shared model without ever sharing raw network data.

## What this actually does

- Detects anomalous network traffic using an **Isolation Forest** model
- Explains *why* each detection fired using **SHAP** (feature-level attribution, not a black box)
- Automatically classifies threat type (port scan, brute force, DoS, malware, data exfiltration) and **auto-isolates** high-confidence threats
- Streams new detections to the dashboard **live**, via WebSockets - no refresh needed
- Runs longer background jobs (like training a federated round) **asynchronously**, via Celery, so the UI never freezes
- Indexes every threat into **Elasticsearch** for real full-text and filtered search
- Validated on both synthetic live-demo data **and** real-world CICIDS2018 network capture data (see `RESULTS.md`)

## Quick start (recommended: Docker)

```bash
git clone <this-repo>
cd cyber-threat-detection
cp .env.example .env   # then fill in a real SECRET_KEY - see below
docker compose up -d
docker compose exec backend python manage.py seed_demo_data
docker compose exec backend python manage.py index_existing_threats
```

Then open **http://localhost:5173** and log in with `demo` / `DemoPass123!`
(or whatever `seed_demo_data` prints on first run).

Check everything came up healthy:
```bash
docker compose ps
```
`redis`, `elasticsearch`, and `backend` should all show `(healthy)`.

### ⚠️ Before you run this for real: generate your own SECRET_KEY

Don't reuse any secret key value that may already be sitting in an example
file or old commit. Generate a fresh one:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```
Put it in your own `.env` file (already gitignored - never commit `.env`).

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Django + Django REST Framework, Channels/Daphne (WebSockets) |
| ML | scikit-learn (Isolation Forest), SHAP |
| Federated Learning | Custom ensemble/weighted-voting framework (not FedAvg, not Flower - see `RESULTS.md` for why) |
| Background tasks | Celery + Redis |
| Search / logging | Elasticsearch |
| Frontend | React + TypeScript + Vite |
| Auth | DRF Token Authentication |
| Infra | Docker Compose (backend, frontend, redis, elasticsearch, celery-worker) |

## Project structure

```
cyber-threat-detection/
├── backend/            # Django project
│   └── apps/
│       ├── core/                # models, REST API (bases, traffic, threats, FL rounds)
│       ├── anomaly_detection/    # Isolation Forest + SHAP engine
│       ├── federated_learning/   # custom ensemble-voting FL + Celery task
│       └── threat_response/      # rule-based classification, auto-isolation,
│                                  # WebSocket broadcasting, Elasticsearch indexing
├── frontend/            # React + TypeScript (Vite)
├── docker/              # Dockerfiles
├── docs/                # API.md / ARCHITECTURE.md / SETUP.md (see docs/ for detail)
└── docker-compose.yml
```

## Docs

- [`docs/SETUP.md`](docs/SETUP.md) - setup notes (currently a stub with one important security note - full guide in progress)
- [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md) - step-by-step live demo script
- `RESULTS.md` - full ML methodology, results, and honest limitations (synthetic + CICIDS2018 real-data validation)

## Known limitations (stated up front, on purpose)

- Elasticsearch runs with security disabled (`xpack.security.enabled=false`) - **local development only**, never expose this on a shared or public network.
- The federated learning demo uses synthetic data split across simulated bases, not a real multi-base deployment.
- This is a research/personal project, not a production-hardened security product.