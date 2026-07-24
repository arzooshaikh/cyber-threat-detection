import { useEffect, useState } from 'react';
import api from '../services/api';
import type { ThreatDetection } from '../types';

const cellStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '8px',
  textAlign: 'left',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.3rem 0.6rem',
  marginRight: '0.4rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
};

function Threats() {
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchThreats = () => {
    api.get<ThreatDetection[]>('/threats/')
      .then((res) => {
        setThreats(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch threats. Is your Django server running?');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchThreats();
  }, []);

  const handleIsolate = async (id: number) => {
    setBusyId(id);
    setActionError(null);
    try {
      await api.post(`/threat-response/${id}/isolate/`);
      fetchThreats();
    } catch {
      setActionError(`Failed to isolate threat #${id}.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = async (id: number, status: 'resolved' | 'false_positive') => {
    setBusyId(id);
    setActionError(null);
    try {
      await api.post(`/threat-response/${id}/resolve/`, { status, notes: '' });
      fetchThreats();
    } catch {
      setActionError(`Failed to update threat #${id}.`);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Detected Threats</h1>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Threats logged here are created automatically by the{' '}
        <code>/api/threat-response/detect/</code> pipeline (see the "Threat Response" page)
        whenever the Isolation Forest flags traffic as anomalous.
      </p>
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={cellStyle}>Source IP</th>
            <th style={cellStyle}>Destination IP</th>
            <th style={cellStyle}>Threat Type</th>
            <th style={cellStyle}>Confidence</th>
            <th style={cellStyle}>Status</th>
            <th style={cellStyle}>Isolated</th>
            <th style={cellStyle}>Detected At</th>
            <th style={cellStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {threats.map((threat) => (
            <tr key={threat.id} style={{ backgroundColor: threat.confidence_score > 0.9 ? '#ffe6e6' : 'white' }}>
              <td style={cellStyle}>{threat.src_ip}</td>
              <td style={cellStyle}>{threat.dest_ip}</td>
              <td style={cellStyle}>{threat.threat_type}</td>
              <td style={cellStyle}>{(threat.confidence_score * 100).toFixed(0)}%</td>
              <td style={cellStyle}>{threat.status}</td>
              <td style={cellStyle}>{threat.is_isolated ? '🔒' : '—'}</td>
              <td style={cellStyle}>{new Date(threat.detected_at).toLocaleString()}</td>
              <td style={cellStyle}>
                {!threat.is_isolated && (
                  <button
                    style={buttonStyle}
                    disabled={busyId === threat.id}
                    onClick={() => handleIsolate(threat.id)}
                  >
                    🔒 Isolate
                  </button>
                )}
                {threat.status === 'active' && (
                  <>
                    <button
                      style={buttonStyle}
                      disabled={busyId === threat.id}
                      onClick={() => handleResolve(threat.id, 'resolved')}
                    >
                      ✅ Resolve
                    </button>
                    <button
                      style={buttonStyle}
                      disabled={busyId === threat.id}
                      onClick={() => handleResolve(threat.id, 'false_positive')}
                    >
                      🚫 False Positive
                    </button>
                  </>
                )}
                {threat.status !== 'active' && <span style={{ color: '#888' }}>{threat.status}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Threats;
