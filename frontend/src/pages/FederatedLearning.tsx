import { useEffect, useState } from 'react';
import api from '../services/api';
import type { FederatedModelRound, ClientMetrics, MilitaryBase } from '../types';

function FederatedLearning() {
  const [rounds, setRounds] = useState<FederatedModelRound[]>([]);
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics[]>([]);
  const [bases, setBases] = useState<MilitaryBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningLabel, setRunningLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get<FederatedModelRound[]>('/fl-rounds/'),
      api.get<ClientMetrics[]>('/client-metrics/'),
      api.get<MilitaryBase[]>('/bases/'),
    ])
      .then(([roundsRes, metricsRes, basesRes]) => {
        // Show newest rounds first
        setRounds([...roundsRes.data].sort((a, b) => b.round_number - a.round_number));
        setClientMetrics(metricsRes.data);
        setBases(basesRes.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch federated learning data.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runNewRound = async () => {
    setRunning(true);
    setRunningLabel('Queuing round...');
    setError(null);
    try {
      // 1. Kick off the round - this returns almost instantly, training now
      // happens in a Celery background worker instead of blocking this request.
      const { data } = await api.post<{ task_id: string; status: string }>(
        '/federated/run-round/',
        { num_bases: 3 },
      );
      const taskId = data.task_id;

      // 2. Poll until the worker finishes (or fails), checking every second.
      setRunningLabel('Training 3 models in the background...');
      const maxAttempts = 60; // ~60 seconds before giving up
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await sleep(1000);
        const statusRes = await api.get<{ state: string; result?: unknown; error?: string }>(
          `/federated/task-status/${taskId}/`,
        );

        if (statusRes.data.state === 'SUCCESS') {
          fetchAll(); // refresh everything now that the round is saved
          return;
        }
        if (statusRes.data.state === 'FAILURE') {
          setError(`Federated round failed: ${statusRes.data.error ?? 'unknown error'}`);
          return;
        }
        // otherwise still PENDING/STARTED - keep polling
      }
      setError('Timed out waiting for the federated round to finish.');
    } catch (err) {
      setError('Failed to run federated round. Check Django server and that a Celery worker is running.');
      console.error(err);
    } finally {
      setRunning(false);
      setRunningLabel('');
    }
  };

  const getBaseName = (baseId: number) => {
    const base = bases.find((b) => b.id === baseId);
    return base ? base.base_name : `Base #${baseId}`;
  };

  const latestRound = rounds[0];
  const latestRoundClients = latestRound
    ? clientMetrics.filter((cm) => cm.round === latestRound.id)
    : [];

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <span className="eyebrow">Custom Ensemble Voting &middot; Not FedAvg</span>
      <h1>Federated Learning</h1>
      <p className="page-lede">
        Each base trains an Isolation Forest locally on its own traffic — no raw data is shared.
        Results are combined via F1-weighted voting to produce the ensemble prediction.
      </p>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={runNewRound} disabled={running}>
          {running ? runningLabel || 'Working...' : '▶ Run New Federated Round'}
        </button>
      </div>

      {error && <p className="text-error">{error}</p>}

      {latestRound && (
        <>
          <span className="eyebrow">Round #{latestRound.round_number}</span>
          <h2 style={{ marginTop: 0 }}>Latest Round</h2>
          <div className="stat-grid">
            <StatCard label="Ensemble Accuracy" value={latestRound.global_accuracy} />
            <StatCard label="Ensemble Precision" value={latestRound.global_precision} />
            <StatCard label="Ensemble Recall" value={latestRound.global_recall} />
            <StatCard label="Ensemble F1" value={latestRound.global_f1} />
          </div>

          <div className="panel">
            <p className="result-metric" style={{ margin: 0 }}>
              <strong>Clients:</strong> {latestRound.num_clients} &nbsp;|&nbsp;
              <strong>Communication:</strong> {latestRound.communication_bytes.toLocaleString()} bytes
              (vs. {latestRound.centralized_equivalent_bytes.toLocaleString()} bytes centralized —{' '}
              {((1 - latestRound.communication_bytes / latestRound.centralized_equivalent_bytes) * 100).toFixed(1)}% reduction)
              &nbsp;|&nbsp;
              <strong>Model:</strong> {latestRound.model_version}
            </p>
          </div>

          <h3>Per-Base Contribution</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Base</th>
                  <th>Local F1</th>
                  <th>Local Precision</th>
                  <th>Local Recall</th>
                  <th>Vote Weight</th>
                  <th>Training Samples</th>
                </tr>
              </thead>
              <tbody>
                {latestRoundClients.map((cm) => (
                  <tr key={cm.id}>
                    <td>{getBaseName(cm.base)}</td>
                    <td className="mono">{cm.local_f1.toFixed(3)}</td>
                    <td className="mono">{cm.local_precision.toFixed(3)}</td>
                    <td className="mono">{cm.local_recall.toFixed(3)}</td>
                    <td className="mono">{cm.weight ? (cm.weight * 100).toFixed(1) + '%' : '—'}</td>
                    <td className="mono">{cm.training_samples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3>All Rounds History</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Status</th>
              <th>Clients</th>
              <th>Accuracy</th>
              <th>F1</th>
              <th>Model Version</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.round_number}</td>
                <td><span className="badge badge-neutral">{r.status}</span></td>
                <td className="mono">{r.num_clients}</td>
                <td className="mono">{r.global_accuracy?.toFixed(3) ?? '—'}</td>
                <td className="mono">{r.global_f1?.toFixed(3) ?? '—'}</td>
                <td className="mono">{r.model_version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="stat-card">
      <div className="stat-value">
        {value !== null ? (value * 100).toFixed(1) + '%' : '—'}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default FederatedLearning;
