import { useEffect, useState } from 'react';
import api from '../services/api';
import type { DetectAndRespondResult, MilitaryBase } from '../types';

const defaultValues = {
  packet_size: 500,
  inter_arrival_time: 50,
  payload_entropy: 3.5,
  syn_count: 1,
  ack_count: 1,
  fin_count: 1,
  rst_count: 0,
  duration: 2,
  dest_port: 443,
  src_ip: '192.168.1.20',
  dest_ip: '8.8.8.8',
  src_port: 51234,
};

function ThreatResponse() {
  const [formValues, setFormValues] = useState(defaultValues);
  const [bases, setBases] = useState<MilitaryBase[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<number | ''>('');
  const [result, setResult] = useState<DetectAndRespondResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<MilitaryBase[]>('/bases/').then((res) => {
      setBases(res.data);
      if (res.data.length > 0) setSelectedBaseId(res.data[0].id);
    });
  }, []);

  const handleChange = (field: keyof typeof defaultValues, value: string) => {
    const isNumeric = typeof defaultValues[field] === 'number';
    setFormValues((prev) => ({ ...prev, [field]: isNumeric ? Number(value) : value }));
  };

  const loadAttackExample = () => {
    setFormValues({
      packet_size: 61.74,
      inter_arrival_time: 1.51,
      payload_entropy: 7.6,
      syn_count: 49,
      ack_count: 1,
      fin_count: 0,
      rst_count: 9,
      duration: 0.021,
      dest_port: 21,
      src_ip: '203.0.113.55',
      dest_ip: '192.168.1.10',
      src_port: 4444,
    });
  };

  const loadBenignExample = () => setFormValues(defaultValues);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        ...formValues,
        base_id: selectedBaseId === '' ? undefined : selectedBaseId,
      };
      const response = await api.post<DetectAndRespondResult>('/threat-response/detect/', payload);
      setResult(response.data);
    } catch (err) {
      setError('Detection failed. Check that Django is running and the model is trained.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const numericFields: (keyof typeof defaultValues)[] = [
    'packet_size', 'inter_arrival_time', 'payload_entropy', 'syn_count',
    'ack_count', 'fin_count', 'rst_count', 'duration', 'dest_port',
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '650px' }}>
      <h1>Threat Response</h1>
      <p style={{ color: '#555' }}>
        Runs the full pipeline: Isolation Forest detection → SHAP explanation →
        rule-based threat classification → auto-isolation decision → saves a real
        record to the Threats page (only if traffic is flagged as anomalous).
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <button type="button" onClick={loadBenignExample} style={{ marginRight: '0.5rem' }}>
          Load Benign Example
        </button>
        <button type="button" onClick={loadAttackExample}>
          Load Attack Example
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Military Base
          </label>
          <select
            value={selectedBaseId}
            onChange={(e) => setSelectedBaseId(Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            {bases.map((b) => (
              <option key={b.id} value={b.id}>{b.base_name} ({b.location})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>src_ip</label>
            <input
              type="text"
              value={formValues.src_ip}
              onChange={(e) => handleChange('src_ip', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>dest_ip</label>
            <input
              type="text"
              value={formValues.dest_ip}
              onChange={(e) => handleChange('dest_ip', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>src_port</label>
            <input
              type="number"
              value={formValues.src_port}
              onChange={(e) => handleChange('src_port', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        </div>

        {numericFields.map((key) => (
          <div key={key} style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>{key}</label>
            <input
              type="number"
              step="any"
              value={formValues[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        ))}

        <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem', marginTop: '1rem' }}>
          {loading ? 'Running...' : 'Run Detection & Response'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

      {result && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: result.is_anomaly ? '#ffe6e6' : '#e6ffe6',
          border: `2px solid ${result.is_anomaly ? '#cc0000' : '#00aa00'}`,
        }}>
          <h3>{result.is_anomaly ? '🚨 Anomaly Detected!' : '✅ Traffic looks normal'}</h3>
          <p>Anomaly Score: {result.anomaly_score.toFixed(4)}</p>
          <p>Confidence: {(result.confidence_score * 100).toFixed(1)}%</p>

          {result.threat && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'white', borderRadius: '6px' }}>
              <p><strong>Threat Type:</strong> {result.threat.threat_type}</p>
              <p>
                <strong>Auto-Isolated:</strong>{' '}
                {result.threat.is_isolated
                  ? '🔒 Yes (confidence ≥ 75% threshold)'
                  : '— No (below 75% auto-isolate threshold — visible on the Threats page for manual review)'}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#555' }}>
                Saved as Threat #{result.threat.id} — view/manage it on the Threats page.
              </p>
            </div>
          )}

          {!result.is_anomaly && (
            <p style={{ fontSize: '0.85rem', color: '#555' }}>
              Nothing saved — this endpoint only logs genuine detections, same as a real IDS would.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ThreatResponse;
