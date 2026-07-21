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