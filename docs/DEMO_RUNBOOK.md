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

**Before the event: time yourself running Steps A-D against your actual SIH
slot length (usually 5-10 minutes). Decide the cut order below in advance -
don't improvise what to skip while a timer is running in front of judges.**

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

## 3a. If you're running short on time: the cut list (decided NOW, not on stage)

Steps A and B are the core story (detection → explainability → real-time
response) and should almost never be cut. If the clock is against you, cut
in this order:

1. **First cut, if at ~60% of your slot and not yet at Step C:** skip Step C
   (Elasticsearch search) entirely. Mention it exists ("all of this is also
   fully indexed and searchable") without demoing it live.
2. **Second cut, if at ~80% of your slot and not yet at Step D:** skip the
   federated learning demo too. Federated learning training takes visible
   time to complete (even backgrounded) - don't let it eat your closing
   seconds. Summarize instead: "we also have a federated learning layer for
   multi-base collaborative training, evaluated separately - happy to show
   that in Q&A if there's time."
3. **Never cut Step A.** If you truly only have time for one thing, this is
   it - it's the detection + explainability story, which is the project's
   actual differentiator.

Practice saying the "summarized instead of shown" lines above out loud in
advance too - a confident verbal summary of a feature you didn't have time
to click through reads as in-control, not as a gap.

---

## 4. If live network/WiFi fails

**Everything above runs entirely on `localhost`** — Docker containers on your own laptop, no internet required for the demo itself, **except**: the very first `docker compose up --build` needs internet (to pull images), so make sure that's already been done well before the demo, not on-site.

**If your laptop itself has a problem** (crashes, won't boot, etc.) — have a backup ready:
- [ ] A short screen recording of the full flow above (Steps A-D), OR
- [ ] A folder of screenshots of each step, in order

**Record this backup on the EXACT machine and network you'll actually demo
from** - not a personal laptop at home on good WiFi. SIH venues are known
for flaky institutional networks, blocked ports, or proxy weirdness that can
break Docker networking or CORS in ways a home setup never will. If there's
any chance of demoing from a different machine than you developed on, do a
full `git clone` + `docker compose up -d` (cold start) on that actual
machine before the event, not just in theory - watch for `docker compose ps`
showing all services `(healthy)`, same check used during development.

*(Fill this in: place the backup video/screenshots at ______________ before the event.)*

---

## 4a. Rehearse the verbal framing, not just the clicks

If a judge asks **"so this uses federated learning?"** - a near-certain
question - the accurate answer is:

> "We use a custom ensemble/weighted-voting framework across simulated
> bases, not FedAvg-style weight averaging - because our anomaly detector
> (Isolation Forest) is a tree ensemble with no clean mathematical way to
> average tree structures across clients the way you'd average neural
> network weights. Each base trains independently, and predictions are
> combined via F1-weighted voting."

This is more precise than the punchier "yes, federated learning" - and it's
also more defensible under a follow-up question. Say it out loud a few times
before the event so the accurate version comes out naturally under pressure,
not the imprecise one. Same applies to the CICIDS2018 claim: it's an
**offline validation study** on real data, not a live production deployment
- keep that distinction ready too.

---

## 5. Known things NOT to worry about mid-demo

- The "Load Attack Example" button always gives the same ~50% or the specific 92% confidence value depending on which sample - this is expected (same input → same trained model → same output), not a bug.
- If a judge asks "is this connected to a real network" — no, it's synthetic traffic data by design (explain the CICIDS2018 real-data validation separately if asked, from `RESULTS.md`).
- Elasticsearch has no login/password (dev-only setup) — don't expose port 9200 on conference WiFi if it's a shared network.
