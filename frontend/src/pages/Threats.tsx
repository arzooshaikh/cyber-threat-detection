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
  const [liveConnected, setLiveConnected] = useState(false);

  // --- Elasticsearch-backed log search (separate from the live table above,
  // which reads straight from the database) ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchThreatType, setSearchThreatType] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchMinConfidence, setSearchMinConfidence] = useState('');
  const [searchResults, setSearchResults] = useState<ThreatDetection[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const runSearch = async () => {
    setSearching(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (searchThreatType) params.set('threat_type', searchThreatType);
      if (searchStatus) params.set('status', searchStatus);
      if (searchMinConfidence) params.set('min_confidence', searchMinConfidence);

      const res = await api.get<{ count: number; results: ThreatDetection[] }>(
        `/threat-response/search/?${params.toString()}`,
      );
      setSearchResults(res.data.results);
    } catch {
      setSearchError('Search failed. Is Elasticsearch running?');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchThreatType('');
    setSearchStatus('');
    setSearchMinConfidence('');
    setSearchResults(null);
    setSearchError(null);
  };

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

  // Real-time updates: new detections and isolate/resolve actions appear
  // instantly, from ANY source (this browser tab, another analyst, etc.),
  // without needing to refresh or re-poll the REST endpoint.
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    // Guards against a React StrictMode quirk: in development, effects run
    // twice on mount (mount -> cleanup -> mount) to help catch bugs. Without
    // this flag, the FIRST (already-replaced) WebSocket's close/error events
    // can fire slightly late and incorrectly stomp on the second, actually-
    // live connection's state. This flag makes stale events from a replaced
    // socket get ignored instead of corrupting the UI.
    let isCurrent = true;

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/threats/?token=${token}`);

    ws.onopen = () => {
      if (isCurrent) setLiveConnected(true);
    };
    ws.onclose = () => {
      if (isCurrent) setLiveConnected(false);
    };
    ws.onerror = () => {
      if (isCurrent) setLiveConnected(false);
    };

    ws.onmessage = (event) => {
      if (!isCurrent) return;
      const payload = JSON.parse(event.data) as { event: 'created' | 'updated'; threat: ThreatDetection };
      const incoming = payload.threat;

      setThreats((prev) => {
        const exists = prev.some((t) => t.id === incoming.id);
        if (exists) {
          // 'updated' event (isolate/resolve) - replace the matching row
          return prev.map((t) => (t.id === incoming.id ? incoming : t));
        }
        // 'created' event - add the new threat to the top of the list
        return [incoming, ...prev];
      });
    };

    return () => {
      isCurrent = false;
      ws.close();
    };
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
      <h1>
        Detected Threats{' '}
        <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: liveConnected ? '#00aa00' : '#999' }}>
          {liveConnected ? '🟢 Live' : '⚪ Connecting...'}
        </span>
      </h1>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Threats logged here are created automatically by the{' '}
        <code>/api/threat-response/detect/</code> pipeline (see the "Threat Response" page)
        whenever the Isolation Forest flags traffic as anomalous. New detections and status
        changes appear instantly via WebSocket, no refresh needed.
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

      <hr style={{ margin: '2.5rem 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <h2>🔍 Search Threat Logs (Elasticsearch)</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Full-text and filtered search across all indexed threats, backed by Elasticsearch -
        separate from the live table above (which reads straight from the database).
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold' }}>Search text</label>
          <input
            type="text"
            placeholder="e.g. 192.168.1.10 or port_scan"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.4rem', minWidth: '220px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold' }}>Threat type</label>
          <select value={searchThreatType} onChange={(e) => setSearchThreatType(e.target.value)} style={{ padding: '0.4rem' }}>
            <option value="">Any</option>
            <option value="dos">dos</option>
            <option value="port_scan">port_scan</option>
            <option value="brute_force">brute_force</option>
            <option value="malware">malware</option>
            <option value="data_exfil">data_exfil</option>
            <option value="unknown">unknown</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold' }}>Status</label>
          <select value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)} style={{ padding: '0.4rem' }}>
            <option value="">Any</option>
            <option value="active">active</option>
            <option value="resolved">resolved</option>
            <option value="false_positive">false_positive</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold' }}>Min confidence</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            placeholder="e.g. 0.75"
            value={searchMinConfidence}
            onChange={(e) => setSearchMinConfidence(e.target.value)}
            style={{ padding: '0.4rem', width: '100px' }}
          />
        </div>
        <button onClick={runSearch} disabled={searching} style={{ padding: '0.5rem 1rem' }}>
          {searching ? 'Searching...' : 'Search'}
        </button>
        {searchResults !== null && (
          <button onClick={clearSearch} style={{ padding: '0.5rem 1rem' }}>
            Clear
          </button>
        )}
      </div>

      {searchError && <p style={{ color: 'red' }}>{searchError}</p>}

      {searchResults !== null && (
        <>
          <p style={{ color: '#555', fontSize: '0.9rem' }}>{searchResults.length} result(s)</p>
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
              {searchResults.map((threat) => (
                <tr key={threat.id}>
                  <td style={cellStyle}>{threat.src_ip}</td>
                  <td style={cellStyle}>{threat.dest_ip}</td>
                  <td style={cellStyle}>{threat.threat_type}</td>
                  <td style={cellStyle}>{(threat.confidence_score * 100).toFixed(0)}%</td>
                  <td style={cellStyle}>{threat.status}</td>
                  <td style={cellStyle}>{threat.is_isolated ? '🔒' : '—'}</td>
                  <td style={cellStyle}>{new Date(threat.detected_at).toLocaleString()}</td>
                </tr>
              ))}
              {searchResults.length === 0 && (
                <tr>
                  <td style={cellStyle} colSpan={7}>No matching threats found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default Threats;
