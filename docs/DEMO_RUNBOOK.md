# Demo Runbook — Cyber Threat Detection System

One page. Read this once before walking on stage, not for the first time under pressure.

---

## 1. Before judges arrive (do this first, alone)

```powershell
docker compose down
docker compose up -d
```

Wait ~60-90 seconds (Elasticsearch is the slow one). Confirm everything is actually healthy, not just "started":

```powershell
docker compose ps
```

Every service should show `Up` and, where applicable, `(healthy)` — not `(health: starting)`. If anything still says `starting` after 2 minutes, give it a bit longer before panicking; Elasticsearch is the one most likely to still be warming up.

**Seed demo data (safe to run every time — won't duplicate):**
```powershell
docker compose exec backend python manage.py seed_demo_data
docker compose exec backend python manage.py index_existing_threats
```

**Log in once** at `http://localhost:5173/` with:
- Username: `demo`
- Password: `DemoPass123!`

*(Or your own admin account if you'd rather not show the default demo password on screen.)*

---

## 2. Browser tabs to have open, in this order

1. **Dashboard** — the welcome/overview page. Start here.
2. **Threat Response** — where you'll trigger a live detection.
3. **Threats** — open in a **second tab/window** so judges can watch it update in real time while you trigger things in tab 2.
4. **Federated Learning** — for the background-task demo.

Keep the Django terminal/log window visible too (`docker compose logs -f backend`) if you want to show the technical judges what's actually happening under the hood — SHAP explaining, threats being classified, Celery tasks running.

---

## 3. The actual demo script

**Step A — Detection + Explainability (the headline feature)**
1. On **Threat Response**, click **"Load Attack Example"**.
2. Click **"Run Detection & Response"**.
3. Point out: the anomaly score, the auto-isolation decision, and especially the **SHAP feature contribution bars** — this is the "explainable AI" story, the differentiator over a black-box IDS.

**Step B — Real-time streaming (the "wow" moment)**
4. Switch to the **Threats** tab (already open, already showing 🟢 Live).
5. Point out the new threat appeared **instantly**, no refresh — this is the WebSocket pipeline.
6. Click **Isolate** on it live — watch it update in real time too.

**Step C — Search / log storage**
7. Scroll down to **"Search Threat Logs (Elasticsearch)"**.
8. Search `port_scan` with min confidence `0.9` → show the filtered result.

**Step D — Federated Learning (background processing)**
9. Switch to **Federated Learning**.
10. Click **"Run New Federated Round"** — point out it doesn't freeze the UI (Celery background task), then show the completed round's per-base F1 breakdown and the communication-cost comparison once it finishes.

---

## 4. If live network/WiFi fails

**Everything above runs entirely on `localhost`** — Docker containers on your own laptop, no internet required for the demo itself, **except**: the very first `docker compose up --build` needs internet (to pull images), so make sure that's already been done well before the demo, not on-site.

**If your laptop itself has a problem** (crashes, won't boot, etc.) — have a backup ready:
- [ ] A short screen recording of the full flow above (Steps A-D), OR
- [ ] A folder of screenshots of each step, in order

*(Fill this in: place the backup video/screenshots at ______________ before the event.)*

---

## 5. Known things NOT to worry about mid-demo

- The "Load Attack Example" button always gives the same ~50% or the specific 92% confidence value depending on which sample - this is expected (same input → same trained model → same output), not a bug.
- If a judge asks "is this connected to a real network" — no, it's synthetic traffic data by design (explain the CICIDS2018 real-data validation separately if asked, from `RESULTS.md`).
- Elasticsearch has no login/password (dev-only setup) — don't expose port 9200 on conference WiFi if it's a shared network.
