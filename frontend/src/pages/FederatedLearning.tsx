import { useEffect, useState } from 'react';
import api from '../services/api';
import type { FederatedModelRound, ClientMetrics, MilitaryBase } from '../types';

const cellStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '8px',
  textAlign: 'left',
};

function FederatedLearning() {
  const [rounds, setRounds] = useState<FederatedModelRound[]>([]);
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics[]>([]);
  const [bases, setBases] = useState<MilitaryBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
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

  const runNewRound = async () => {
    setRunning(true);
    setError(null);
    try {
      await api.post('/federated/run-round/', { num_bases: 3 });
      fetchAll(); // refresh everything after the new round completes
    } catch (err) {
      setError('Failed to run federated round. Check Django server.');
      console.error(err);
    } finally {
      setRunning(false);
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

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Federated Learning</h1>
      <p>
        Each base trains an Isolation Forest locally on its own traffic — no raw data is shared.
        Results are combined via F1-weighted voting to produce the ensemble prediction.
      </p>

      <button onClick={runNewRound} disabled={running} style={{ padding: '0.75rem 1.5rem', marginBottom: '1.5rem' }}>
        {running ? 'Running round (training 3 models)...' : '▶ Run New Federated Round'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {latestRound && (
        <>
          <h2>Latest Round: #{latestRound.round_number}</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <StatCard label="Ensemble Accuracy" value={latestRound.global_accuracy} />
            <StatCard label="Ensemble Precision" value={latestRound.global_precision} />
            <StatCard label="Ensemble Recall" value={latestRound.global_recall} />
            <StatCard label="Ensemble F1" value={latestRound.global_f1} />
          </div>

          <p>
            <strong>Clients:</strong> {latestRound.num_clients} &nbsp;|&nbsp;
           <strong>Communication:</strong> {latestRound.communication_bytes.toLocaleString()} bytes
            (vs. {latestRound.centralized_equivalent_bytes.toLocaleString()} bytes centralized —
            {' '}{((1 - latestRound.communication_bytes / latestRound.centralized_equivalent_bytes) * 100).toFixed(1)}% reduction)
            &nbsp;|&nbsp;
            <strong>Model:</strong> {latestRound.model_version}
          </p>

          <h3>Per-Base Contribution</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '2rem' }}>
            <thead>
              <tr>
                <th style={cellStyle}>Base</th>
                <th style={cellStyle}>Local F1</th>
                <th style={cellStyle}>Local Precision</th>
                <th style={cellStyle}>Local Recall</th>
                <th style={cellStyle}>Vote Weight</th>
                <th style={cellStyle}>Training Samples</th>
              </tr>
            </thead>
            <tbody>
              {latestRoundClients.map((cm) => (
                <tr key={cm.id}>
                  <td style={cellStyle}>{getBaseName(cm.base)}</td>
                  <td style={cellStyle}>{cm.local_f1.toFixed(3)}</td>
                  <td style={cellStyle}>{cm.local_precision.toFixed(3)}</td>
                  <td style={cellStyle}>{cm.local_recall.toFixed(3)}</td>
                  <td style={cellStyle}>{cm.weight ? (cm.weight * 100).toFixed(1) + '%' : '—'}</td>
                  <td style={cellStyle}>{cm.training_samples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3>All Rounds History</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={cellStyle}>Round</th>
            <th style={cellStyle}>Status</th>
            <th style={cellStyle}>Clients</th>
            <th style={cellStyle}>Accuracy</th>
            <th style={cellStyle}>F1</th>
            <th style={cellStyle}>Model Version</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => (
            <tr key={r.id}>
              <td style={cellStyle}>{r.round_number}</td>
              <td style={cellStyle}>{r.status}</td>
              <td style={cellStyle}>{r.num_clients}</td>
              <td style={cellStyle}>{r.global_accuracy?.toFixed(3) ?? '—'}</td>
              <td style={cellStyle}>{r.global_f1?.toFixed(3) ?? '—'}</td>
              <td style={cellStyle}>{r.model_version}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '1rem 1.5rem',
      minWidth: '140px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
        {value !== null ? (value * 100).toFixed(1) + '%' : '—'}
      </div>
      <div style={{ color: '#666', fontSize: '0.85rem' }}>{label}</div>
    </div>
  );
}

export default FederatedLearning;