import { useEffect, useState } from 'react';
import api from './services/api';
import type { MilitaryBase, ThreatDetection } from './types';
import './App.css';

function App() {
  const [bases, setBases] = useState<MilitaryBase[]>([]);
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<MilitaryBase[]>('/bases/'),
      api.get<ThreatDetection[]>('/threats/'),
    ])
      .then(([basesRes, threatsRes]) => {
        setBases(basesRes.data);
        setThreats(threatsRes.data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to fetch data. Is your Django server running?');
        setLoading(false);
        console.error(err);
      });
  }, []);

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>;
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Cyber Threat Detection Dashboard</h1>

      <h2>Military Bases</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '2rem' }}>
        <thead>
          <tr>
            <th style={cellStyle}>Base ID</th>
            <th style={cellStyle}>Name</th>
            <th style={cellStyle}>Location</th>
            <th style={cellStyle}>Subnet</th>
            <th style={cellStyle}>Active</th>
          </tr>
        </thead>
        <tbody>
          {bases.map((base) => (
            <tr key={base.id}>
              <td style={cellStyle}>{base.base_id}</td>
              <td style={cellStyle}>{base.base_name}</td>
              <td style={cellStyle}>{base.location}</td>
              <td style={cellStyle}>{base.ip_subnet}</td>
              <td style={cellStyle}>{base.is_active ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Detected Threats</h2>
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

const cellStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '8px',
  textAlign: 'left',
};

export default App;