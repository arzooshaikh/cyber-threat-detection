import numpy as np
import pandas as pd

from apps.anomaly_detection.data_generator import generate_synthetic_traffic
from apps.anomaly_detection.engine import AnomalyDetectionEngine


def split_data_across_bases(df: pd.DataFrame, num_bases: int = 3, random_state: int = 42):
    """Splits traffic data into roughly equal chunks, one per simulated base."""
    df_shuffled = df.sample(frac=1, random_state=random_state).reset_index(drop=True)
    n = len(df_shuffled)
    chunk_size = n // num_bases
    base_data = {}

    for i in range(num_bases):
        start = i * chunk_size
        end = n if i == num_bases - 1 else (i + 1) * chunk_size
        chunk = df_shuffled.iloc[start:end].reset_index(drop=True)
        base_data[f"BASE00{i+1}"] = chunk

    return base_data


def train_local_models(base_data: dict) -> dict:
    """Trains one AnomalyDetectionEngine per base and computes local metrics."""
    results = {}

    for base_id, data in base_data.items():
        engine = AnomalyDetectionEngine(contamination=0.05)
        engine.train(data)

        pred_df = engine.predict(data)
        y_true = (data['label'] == 'attack').astype(int)
        y_pred = pred_df['is_anomaly'].astype(int)

        tp = int(((y_true == 1) & (y_pred == 1)).sum())
        fp = int(((y_true == 0) & (y_pred == 1)).sum())
        fn = int(((y_true == 1) & (y_pred == 0)).sum())
        tn = int(((y_true == 0) & (y_pred == 0)).sum())

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        accuracy = (tp + tn) / (tp + fp + fn + tn) if (tp + fp + fn + tn) > 0 else 0.0

        local_metrics = {
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'accuracy': accuracy,
            'training_samples': len(data),
            'anomaly_samples': int((data['label'] == 'attack').sum()),
            'benign_samples': int((data['label'] == 'benign').sum()),
        }

        results[base_id] = (engine, local_metrics)

    return results


def federated_voting_predict(trained_bases: dict, sample_df: pd.DataFrame) -> pd.DataFrame:
    """Combines predictions from all bases via F1-weighted voting."""
    all_votes = []
    weights = []

    for base_id, (engine, metrics) in trained_bases.items():
        pred_df = engine.predict(sample_df)
        vote = pred_df['is_anomaly'].astype(int).values
        all_votes.append(vote)
        weights.append(metrics['f1'])

    votes_matrix = np.array(all_votes)
    weights = np.array(weights)
    weights = weights / weights.sum() if weights.sum() > 0 else np.ones(len(weights)) / len(weights)

    weighted_scores = np.average(votes_matrix, axis=0, weights=weights)
    final_prediction = weighted_scores >= 0.5

    result = sample_df.copy()
    result['ensemble_anomaly_score'] = weighted_scores
    result['ensemble_is_anomaly'] = final_prediction
    return result