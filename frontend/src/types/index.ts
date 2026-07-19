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
  threat_type: string;
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