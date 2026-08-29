import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { MilitaryBase, ThreatDetection, FederatedModelRound } from '../types';
import { IconServer, IconAlertTriangle, IconLock, IconNetwork, IconTarget, IconShieldCheck, IconArrowRight } from '../components/Icons';

interface QuickAction {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const quickActions: QuickAction[] = [
  {
    to: '/threats',
    icon: IconAlertTriangle,
    title: 'Detected Threats',
    description: 'Live feed of every anomaly flagged so far, with isolate/resolve controls and Elasticsearch-backed search.',
  },
  {
    to: '/run-detection',
    icon: IconTarget,
    title: 'Run Live Detection',
    description: 'Feed traffic values straight into the Isolation Forest model and see the SHAP explanation instantly.',
  },
  {
    to: '/threat-response',
    icon: IconShieldCheck,
    title: 'Threat Response',
    description: 'The full pipeline: detect → explain → classify → auto-isolate → log, end to end.',
  },
  {
    to: '/federated',
    icon: IconNetwork,
    title: 'Federated Learning',
    description: 'Trigger a new ensemble-voting round across simulated bases, no raw data ever leaves a base.',
  },
];

function Dashboard() {
  const [bases, setBases] = useState<MilitaryBase[]>([]);
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [latestRound, setLatestRound] = useState<FederatedModelRound | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<MilitaryBase[]>('/bases/'),
      api.get<ThreatDetection[]>('/threats/'),
      api.get<FederatedModelRound[]>('/fl-rounds/'),
    ])
      .then(([basesRes, threatsRes, roundsRes]) => {
        setBases(basesRes.data);
        setThreats(threatsRes.data);
        const rounds = [...roundsRes.data].sort((a, b) => b.round_number - a.round_number);
        setLatestRound(rounds[0] ?? null);
      })
      .finally(() => setLoaded(true));
  }, []);

  const activeThreats = threats.filter((t) => t.status === 'active').length;
  const isolatedThreats = threats.filter((t) => t.is_isolated).length;
  const basesOnline = bases.filter((b) => b.is_active).length;

  return (
    <div className="page">
      <span className="eyebrow">Overview</span>
      <h1>Cyber Threat Detection Console</h1>
      <p className="page-lede">
        Real-time network anomaly detection with explainable AI, automatic threat response,
        and a custom federated ensemble-voting framework across simulated bases.
      </p>

      <div className="stat-grid">
        <div className="stat-card stat-card-hover">
          <div className="stat-icon-row">
            <IconServer className="stat-icon" />
          </div>
          <div className="stat-value">{loaded ? basesOnline : '—'}</div>
          <div className="stat-label">Bases Online</div>
        </div>
        <div className="stat-card stat-card-hover">
          <div className="stat-icon-row">
            <IconAlertTriangle className="stat-icon" style={{ color: 'var(--level-caution)' }} />
          </div>
          <div className="stat-value" style={{ color: 'var(--level-caution)' }}>
            {loaded ? activeThreats : '—'}
          </div>
          <div className="stat-label">Active Threats</div>
        </div>
        <div className="stat-card stat-card-hover">
          <div className="stat-icon-row">
            <IconLock className="stat-icon" style={{ color: 'var(--level-critical)' }} />
          </div>
          <div className="stat-value" style={{ color: 'var(--level-critical)' }}>
            {loaded ? isolatedThreats : '—'}
          </div>
          <div className="stat-label">Isolated</div>
        </div>
        <div className="stat-card stat-card-hover">
          <div className="stat-icon-row">
            <IconNetwork className="stat-icon" />
          </div>
          <div className="stat-value">
            {latestRound?.global_f1 != null ? (latestRound.global_f1 * 100).toFixed(1) + '%' : '—'}
          </div>
          <div className="stat-label">Latest FL Round F1</div>
        </div>
      </div>

      <span className="eyebrow" style={{ marginTop: '0.5rem' }}>Quick Access</span>
      <div className="action-grid">
        {quickActions.map(({ to, icon: Icon, title, description }) => (
          <Link to={to} key={to} className="action-card">
            <Icon className="action-icon" />
            <div className="action-body">
              <div className="action-title">{title}</div>
              <p className="action-description">{description}</p>
            </div>
            <IconArrowRight className="action-arrow" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
