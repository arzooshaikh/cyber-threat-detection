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
    <div className="page page-narrow">
      <span className="eyebrow">Detection &rarr; Explanation &rarr; Response</span>
      <h1>Threat Response</h1>
      <p className="page-lede">
        Runs the full pipeline: Isolation Forest detection &rarr; SHAP explanation &rarr;
        rule-based threat classification &rarr; auto-isolation decision &rarr; saves a real
        record to the Threats page (only if traffic is flagged as anomalous).
      </p>

      <div className="btn-row">
        <button type="button" className="btn" onClick={loadBenignExample}>
          Load Benign Example
        </button>
        <button type="button" className="btn" onClick={loadAttackExample}>
          Load Attack Example
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label">Military Base</label>
          <select
            className="input"
            value={selectedBaseId}
            onChange={(e) => setSelectedBaseId(Number(e.target.value))}
          >
            {bases.map((b) => (
              <option key={b.id} value={b.id}>{b.base_name} ({b.location})</option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">src_ip</label>
            <input
              type="text"
              className="input"
              value={formValues.src_ip}
              onChange={(e) => handleChange('src_ip', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">dest_ip</label>
            <input
              type="text"
              className="input"
              value={formValues.dest_ip}
              onChange={(e) => handleChange('dest_ip', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">src_port</label>
            <input
              type="number"
              className="input"
              value={formValues.src_port}
              onChange={(e) => handleChange('src_port', e.target.value)}
            />
          </div>
        </div>

        {numericFields.map((key) => (
          <div key={key} className="field">
            <label className="field-label">{key}</label>
            <input
              type="number"
              step="any"
              className="input"
              value={formValues[key]}
              onChange={(e) => handleChange(key, e.target.value)}
            />
          </div>
        ))}

        <button type="submit" className="btn btn-primary mt-lg" disabled={loading}>
          {loading ? 'Running...' : 'Run Detection & Response'}
        </button>
      </form>

      {error && <p className="text-error mt-lg">{error}</p>}

      {result && (
        <div className={`result-banner ${result.is_anomaly ? 'result-critical' : 'result-clear'}`}>
          <h3>{result.is_anomaly ? '🚨 Anomaly Detected' : '✅ Traffic looks normal'}</h3>
          <p className="result-metric">Anomaly Score: <strong>{result.anomaly_score.toFixed(4)}</strong></p>
          <p className="result-metric">Confidence: <strong>{(result.confidence_score * 100).toFixed(1)}%</strong></p>

          {result.threat && (
            <div className="result-detail">
              <p className="result-metric">
                <strong>Threat Type:</strong>{' '}
                <span className="badge badge-caution">{result.threat.threat_type}</span>
              </p>
              <p className="result-metric mt-lg" style={{ marginTop: '0.5rem' }}>
                <strong>Auto-Isolated:</strong>{' '}
                {result.threat.is_isolated
                  ? <span className="badge badge-critical">Yes &middot; confidence &ge; 75%</span>
                  : <span className="badge badge-neutral">No &middot; below 75% threshold</span>}
              </p>
              <p className="text-muted-small" style={{ marginTop: '0.6rem', marginBottom: 0 }}>
                Saved as Threat #{result.threat.id} — view/manage it on the Threats page.
              </p>
            </div>
          )}

          {!result.is_anomaly && (
            <p className="text-muted-small">
              Nothing saved — this endpoint only logs genuine detections, same as a real IDS would.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ThreatResponse;
