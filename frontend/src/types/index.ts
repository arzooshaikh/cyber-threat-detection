export interface FeatureContribution {
  feature: string;
  value: number;
}

export interface DetectAndRespondResult {
  is_anomaly: boolean;
  anomaly_score: number;
  confidence_score: number;
  feature_contributions: FeatureContribution[];
  threat: ThreatDetection | null;
}

export interface MilitaryBase {
  id: number;
  base_id: string;
  base_name: string;
  location: string;
  ip_subnet: string;
  contact_email: string | null;
  is_active: boolean;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreatDetection {
  id: number;
  threat_id: string;
  base: number;
  src_ip: string;
  dest_ip: string;
  src_port: number | null;
  dest_port: number | null;
  threat_type: 'dos' | 'port_scan' | 'brute_force' | 'malware' | 'data_exfil' | 'unknown';
  confidence_score: number;
  anomaly_score: number;
  key_features: Record<string, unknown>;
  threat_indicators: Record<string, unknown> | null;
  is_isolated: boolean;
  isolation_timestamp: string | null;
  status: string;
  notes: string | null;
  detected_at: string;
  resolved_at: string | null;
}

export interface FederatedModelRound {
  id: number;
  round_number: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  global_accuracy: number | null;
  global_precision: number | null;
  global_recall: number | null;
  global_f1: number | null;
  global_auc: number | null;
  communication_bytes: number;
  num_clients: number;
  num_clients_available: number | null;
  model_version: string;
  model_checkpoint: string | null;
  centralized_equivalent_bytes: number;
}

export interface ClientMetrics {
  id: number;
  round: number;
  base: number;
  local_accuracy: number;
  local_precision: number;
  local_recall: number;
  local_f1: number;
  local_auc: number | null;
  training_samples: number;
  anomaly_samples: number | null;
  benign_samples: number | null;
  weight: number | null;
  upload_time_ms: number;
  download_time_ms: number | null;
  local_training_time_sec: number | null;
  timestamp: string;
}