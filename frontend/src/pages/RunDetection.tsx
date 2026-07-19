import { useState } from 'react';
import api from '../services/api';

interface PredictionResult {
  is_anomaly: boolean;
  anomaly_score: number;
  confidence: number;
}

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
};

function RunDetection() {
  const [formValues, setFormValues] = useState(defaultValues);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof typeof defaultValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: Number(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post<PredictionResult>('/anomaly/predict/', formValues);
      setResult(response.data);
    } catch (err) {
      setError('Prediction failed. Check that Django is running and the model is trained.');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    });
  };

  const loadBenignExample = () => {
    setFormValues(defaultValues);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h1>Run Live Detection</h1>
      <p>Enter traffic feature values and test the trained Isolation Forest model.</p>

      <div style={{ marginBottom: '1rem' }}>
        <button type="button" onClick={loadBenignExample} style={{ marginRight: '0.5rem' }}>
          Load Benign Example
        </button>
        <button type="button" onClick={loadAttackExample}>
          Load Attack Example
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {Object.entries(formValues).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              {key}
            </label>
            <input
              type="number"
              step="any"
              value={value}
              onChange={(e) => handleChange(key as keyof typeof defaultValues, e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        ))}

        <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem', marginTop: '1rem' }}>
          {loading ? 'Running...' : 'Run Detection'}
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
          <p>Confidence: {(result.confidence * 100).toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
}

export default RunDetection;