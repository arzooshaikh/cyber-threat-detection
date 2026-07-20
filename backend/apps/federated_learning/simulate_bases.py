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