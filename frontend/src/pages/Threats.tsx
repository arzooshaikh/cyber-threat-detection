import { useEffect, useState } from 'react';
import api from '../services/api';
import type { ThreatDetection } from '../types';

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

  const confidenceBadge = (score: number) => {
    if (score >= 0.75) return <span className="badge badge-critical">{(score * 100).toFixed(0)}%</span>;
    if (score >= 0.4) return <span className="badge badge-caution">{(score * 100).toFixed(0)}%</span>;
    return <span className="badge badge-info">{(score * 100).toFixed(0)}%</span>;
  };

  const renderThreatRows = (list: ThreatDetection[], withActions: boolean) =>
    list.map((threat) => (
      <tr key={threat.id} className={threat.confidence_score >= 0.75 ? 'row-critical' : ''}>
        <td className="mono">{threat.src_ip}</td>
        <td className="mono">{threat.dest_ip}</td>
        <td><span className="badge badge-neutral">{threat.threat_type}</span></td>
        <td>{confidenceBadge(threat.confidence_score)}</td>
        <td>{threat.status}</td>
        <td>{threat.is_isolated ? <span className="badge badge-critical">Isolated</span> : '—'}</td>
        <td className="mono">{new Date(threat.detected_at).toLocaleString()}</td>
        {withActions && (
          <td>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {!threat.is_isolated && (
                <button
                  className="btn btn-small btn-danger"
                  disabled={busyId === threat.id}
                  onClick={() => handleIsolate(threat.id)}
                >
                  Isolate
                </button>
              )}
              {threat.status === 'active' && (
                <>
                  <button
                    className="btn btn-small"
                    disabled={busyId === threat.id}
                    onClick={() => handleResolve(threat.id, 'resolved')}
                  >
                    Resolve
                  </button>
                  <button
                    className="btn btn-small"
                    disabled={busyId === threat.id}
                    onClick={() => handleResolve(threat.id, 'false_positive')}
                  >
                    False Positive
                  </button>
                </>
              )}
              {threat.status !== 'active' && <span className="text-muted-small">{threat.status}</span>}
            </div>
          </td>
        )}
      </tr>
    ));

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (error) return <div className="page"><p className="text-error">{error}</p></div>;

  return (
    <div className="page">
      <span className="eyebrow">Live Feed</span>
      <h1>
        Detected Threats{' '}
        <span className={`live-indicator ${liveConnected ? 'live' : 'off'}`}>
          <span className={`status-dot ${liveConnected ? 'live' : 'off'}`} />
          {liveConnected ? 'Live' : 'Connecting...'}
        </span>
      </h1>
      <p className="page-lede">
        Threats logged here are created automatically by the{' '}
        <code>/api/threat-response/detect/</code> pipeline (see the "Threat Response" page)
        whenever the Isolation Forest flags traffic as anomalous. New detections and status
        changes appear instantly via WebSocket, no refresh needed.
      </p>
      {actionError && <p className="text-error">{actionError}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Source IP</th>
              <th>Destination IP</th>
              <th>Threat Type</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Isolated</th>
              <th>Detected At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{renderThreatRows(threats, true)}</tbody>
        </table>
      </div>

      <hr />

      <span className="eyebrow">Log Storage &amp; Search</span>
      <h2>🔍 Search Threat Logs (Elasticsearch)</h2>
      <p className="page-lede">
        Full-text and filtered search across all indexed threats, backed by Elasticsearch -
        separate from the live table above (which reads straight from the database).
      </p>

      <div className="field-row" style={{ alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div className="field" style={{ flex: 2, minWidth: '220px' }}>
          <label className="field-label">Search text</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. 192.168.1.10 or port_scan"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">Threat type</label>
          <select className="input" value={searchThreatType} onChange={(e) => setSearchThreatType(e.target.value)}>
            <option value="">Any</option>
            <option value="dos">dos</option>
            <option value="port_scan">port_scan</option>
            <option value="brute_force">brute_force</option>
            <option value="malware">malware</option>
            <option value="data_exfil">data_exfil</option>
            <option value="unknown">unknown</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">Status</label>
          <select className="input" value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)}>
            <option value="">Any</option>
            <option value="active">active</option>
            <option value="resolved">resolved</option>
            <option value="false_positive">false_positive</option>
          </select>
        </div>
        <div className="field" style={{ minWidth: '110px' }}>
          <label className="field-label">Min confidence</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            className="input"
            placeholder="e.g. 0.75"
            value={searchMinConfidence}
            onChange={(e) => setSearchMinConfidence(e.target.value)}
          />
        </div>
        <div className="field" style={{ flex: '0 0 auto', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={runSearch} disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </button>
          {searchResults !== null && (
            <button className="btn" onClick={clearSearch}>
              Clear
            </button>
          )}
        </div>
      </div>

      {searchError && <p className="text-error">{searchError}</p>}

      {searchResults !== null && (
        <>
          <p className="text-muted-small">{searchResults.length} result(s)</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source IP</th>
                  <th>Destination IP</th>
                  <th>Threat Type</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Isolated</th>
                  <th>Detected At</th>
                </tr>
              </thead>
              <tbody>
                {renderThreatRows(searchResults, false)}
                {searchResults.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-muted-small">No matching threats found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default Threats;
