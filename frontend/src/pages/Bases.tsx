import { useEffect, useState } from 'react';
import api from '../services/api';
import type { MilitaryBase } from '../types';

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

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (error) return <div className="page"><p className="text-error">{error}</p></div>;

  return (
    <div className="page">
      <span className="eyebrow">Registered Sites</span>
      <h1>Military Bases</h1>
      <p className="page-lede">
        Federated learning participants - each base trains its own local model on its own traffic.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Base ID</th>
              <th>Name</th>
              <th>Location</th>
              <th>Subnet</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {bases.map((base) => (
              <tr key={base.id}>
                <td className="mono">{base.base_id}</td>
                <td>{base.base_name}</td>
                <td>{base.location}</td>
                <td className="mono">{base.ip_subnet}</td>
                <td>
                  {base.is_active
                    ? <span className="badge badge-info">Active</span>
                    : <span className="badge badge-neutral">Inactive</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Bases;
