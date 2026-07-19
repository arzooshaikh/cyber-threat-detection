import { useEffect, useState } from 'react';
import api from '../services/api';
import type { ThreatDetection } from '../types';

const cellStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '8px',
  textAlign: 'left',
};

function Threats() {
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ThreatDetection[]>('/threats/')
      .then((res) => {
        setThreats(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch threats. Is your Django server running?');
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Detected Threats</h1>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Threats;