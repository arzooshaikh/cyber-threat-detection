import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'anomaly_detection'))

import numpy as np
import pandas as pd
from data_generator import generate_synthetic_traffic
from engine import AnomalyDetectionEngine


def split_data_across_bases(df: pd.DataFrame, num_bases: int = 3, random_state: int = 42):
    """
    Splits a traffic dataframe into roughly equal chunks, one per simulated base.
    Each base gets a mix of benign and attack traffic (not perfectly IID, but reasonable).
    """
    df_shuffled = df.sample(frac=1, random_state=random_state).reset_index(drop=True)

    n = len(df_shuffled)
    chunk_size = n // num_bases
    base_data = {}

    for i in range(num_bases):
        start = i * chunk_size
        # Last base gets any leftover rows (in case n doesn't divide evenly)
        end = n if i == num_bases - 1 else (i + 1) * chunk_size
        chunk = df_shuffled.iloc[start:end].reset_index(drop=True)
        base_data[f"BASE00{i+1}"] = chunk

    return base_data

if __name__ == '__main__':
    # Generate a larger dataset so each base has enough data to train on
    full_df = generate_synthetic_traffic(n_samples=3000, attack_ratio=0.05, random_state=42)

    base_data = split_data_across_bases(full_df, num_bases=3)

    for base_id, data in base_data.items():
        n_benign = (data['label'] == 'benign').sum()
        n_attack = (data['label'] == 'attack').sum()
        print(f"{base_id}: {len(data)} samples ({n_benign} benign, {n_attack} attack)")

def train_local_models(base_data: dict) -> dict:
    """
    Trains one AnomalyDetectionEngine per base on its own local data.
    Returns a dict of {base_id: (engine, local_metrics)}.
    """
    results = {}

    for base_id, data in base_data.items():
        engine = AnomalyDetectionEngine(contamination=0.05)
        engine.train(data)

        # Evaluate locally (since our synthetic data has ground-truth labels)
        pred_df = engine.predict(data)
        y_true = (data['label'] == 'attack').astype(int)
        y_pred = pred_df['is_anomaly'].astype(int)

        tp = ((y_true == 1) & (y_pred == 1)).sum()
        fp = ((y_true == 0) & (y_pred == 1)).sum()
        fn = ((y_true == 1) & (y_pred == 0)).sum()
        tn = ((y_true == 0) & (y_pred == 0)).sum()

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        local_metrics = {
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'training_samples': len(data),
        }

        results[base_id] = (engine, local_metrics)
        print(f"{base_id} trained — Precision: {precision:.2f}, Recall: {recall:.2f}, F1: {f1:.2f}")

    return results


def federated_voting_predict(trained_bases: dict, sample_df: pd.DataFrame) -> pd.DataFrame:
    """
    For each row in sample_df, gets a prediction from EVERY base's local model,
    then combines them via weighted voting (weight = each base's local F1 score).
    """
    all_votes = []
    weights = []

    for base_id, (engine, metrics) in trained_bases.items():
        pred_df = engine.predict(sample_df)
        vote = pred_df['is_anomaly'].astype(int).values  # 1 = anomaly, 0 = normal
        all_votes.append(vote)
        weights.append(metrics['f1'])

    votes_matrix = np.array(all_votes)  # shape: (num_bases, num_samples)
    weights = np.array(weights)
    weights = weights / weights.sum()  # normalize to sum to 1

    # Weighted vote: sum(vote_i * weight_i) per sample, threshold at 0.5
    weighted_scores = np.average(votes_matrix, axis=0, weights=weights)
    final_prediction = weighted_scores >= 0.5

    result = sample_df.copy()
    result['ensemble_anomaly_score'] = weighted_scores
    result['ensemble_is_anomaly'] = final_prediction
    return result


if __name__ == '__main__':
    full_df = generate_synthetic_traffic(n_samples=3000, attack_ratio=0.05, random_state=42)
    base_data = split_data_across_bases(full_df, num_bases=3)

    print("=== Step 1: Training local models per base ===")
    trained_bases = train_local_models(base_data)

    print("\n=== Step 2: Testing federated voting on a shared validation set ===")
    # Create a fresh validation set (different random_state so it's not identical to training data)
    validation_df = generate_synthetic_traffic(n_samples=300, attack_ratio=0.05, random_state=99)

    ensemble_result = federated_voting_predict(trained_bases, validation_df)

    y_true = (validation_df['label'] == 'attack').astype(int)
    y_pred = ensemble_result['ensemble_is_anomaly'].astype(int)

    tp = ((y_true == 1) & (y_pred == 1)).sum()
    fp = ((y_true == 0) & (y_pred == 1)).sum()
    fn = ((y_true == 1) & (y_pred == 0)).sum()
    tn = ((y_true == 0) & (y_pred == 0)).sum()

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    print(f"\nEnsemble (Federated Voting) Results on Validation Set:")
    print(f"Precision: {precision:.3f}, Recall: {recall:.3f}, F1: {f1:.3f}")
    print(f"TP={tp}, FP={fp}, FN={fn}, TN={tn}")