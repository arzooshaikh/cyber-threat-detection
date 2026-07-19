import numpy as np
import pandas as pd


def generate_synthetic_traffic(n_samples=1000, attack_ratio=0.05, random_state=42):
    """
    Generates synthetic network traffic data.
    Most rows are 'benign' (normal), a small percentage are 'attack' (anomalies).
    """
    rng = np.random.RandomState(random_state)
    n_attacks = int(n_samples * attack_ratio)
    n_benign = n_samples - n_attacks

    # Benign traffic: normal, tight distributions
    benign = pd.DataFrame({
        'packet_size': rng.normal(500, 100, n_benign).clip(40, 1500),
        'inter_arrival_time': rng.normal(50, 15, n_benign).clip(1, 500),
        'payload_entropy': rng.normal(3.5, 0.5, n_benign).clip(0, 8),
        'syn_count': rng.poisson(1, n_benign),
        'ack_count': rng.poisson(1, n_benign),
        'fin_count': rng.poisson(1, n_benign),
        'rst_count': rng.poisson(0.1, n_benign),
        'duration': rng.exponential(2, n_benign),
        'dest_port': rng.choice([80, 443, 22, 53, 8080], n_benign),
        'label': 'benign',
    })

    # Attack traffic: extreme values (e.g., port scans have high syn_count, low duration)
    attacks = pd.DataFrame({
        'packet_size': rng.normal(60, 20, n_attacks).clip(20, 200),
        'inter_arrival_time': rng.normal(2, 1, n_attacks).clip(0.1, 10),
        'payload_entropy': rng.normal(7, 0.5, n_attacks).clip(0, 8),
        'syn_count': rng.poisson(50, n_attacks),
        'ack_count': rng.poisson(1, n_attacks),
        'fin_count': rng.poisson(0, n_attacks),
        'rst_count': rng.poisson(10, n_attacks),
        'duration': rng.exponential(0.1, n_attacks),
        'dest_port': rng.choice([21, 23, 3389, 445, 135], n_attacks),
        'label': 'attack',
    })

    df = pd.concat([benign, attacks], ignore_index=True)
    df = df.sample(frac=1, random_state=random_state).reset_index(drop=True)  # shuffle
    return df


if __name__ == '__main__':
    df = generate_synthetic_traffic(n_samples=1000, attack_ratio=0.05)
    print(df.head(10))
    print(f"\nTotal samples: {len(df)}")
    print(f"Benign: {(df['label'] == 'benign').sum()}, Attacks: {(df['label'] == 'attack').sum()}")