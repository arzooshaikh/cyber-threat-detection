import { useEffect, useState } from 'react';
import api from './services/api';
import type { MilitaryBase } from './types';
import './App.css';

function App() {
  const [bases, setBases] = useState<MilitaryBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<MilitaryBase[]>('/bases/')
      .then((response) => {
        setBases(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to fetch bases. Is your Django server running?');
        setLoading(false);
        console.error(err);
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Cyber Threat Detection Dashboard</h1>
      <h2>Military Bases</h2>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
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
      )}
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '8px',
  textAlign: 'left',
};

export default App;