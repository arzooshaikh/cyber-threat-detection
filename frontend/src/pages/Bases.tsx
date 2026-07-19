import { useEffect, useState } from 'react';
import api from '../services/api';
import type { MilitaryBase } from '../types';

const cellStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '8px',
  textAlign: 'left',
};

function Bases() {
  const [bases, setBases] = useState<MilitaryBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<MilitaryBase[]>('/bases/')
      .then((res) => {
        setBases(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch bases. Is your Django server running?');
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Military Bases</h1>
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
    </div>
  );
}

export default Bases;