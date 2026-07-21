import pandas as pd
import numpy as np
from cicids_engine import CICIDSAnomalyEngine

USE_COLS = CICIDSAnomalyEngine.FEATURE_COLUMNS + ['Label']

print("Loading full CSV...")
df = pd.read_csv('datasets/02-14-2018.csv', usecols=USE_COLS, low_memory=False)
df['binary_label'] = df['Label'].apply(lambda x: 'benign' if x == 'Benign' else 'attack')

benign_df = df[df['binary_label'] == 'benign']
attack_df = df[df['binary_label'] == 'attack']

target_attack_count = int(len(benign_df) * 0.04)
attack_sample = attack_df.sample(n=target_attack_count, random_state=42)
realistic_df = pd.concat([benign_df, attack_sample]).sample(frac=1, random_state=42).reset_index(drop=True)

# 3-way split: train (60%) / validation (20%) / test (20%)
train_df = realistic_df.sample(frac=0.6, random_state=42)
remaining = realistic_df.drop(train_df.index)
val_df = remaining.sample(frac=0.5, random_state=42)
test_df = remaining.drop(val_df.index)

print(f"Train: {len(train_df)}, Validation: {len(val_df)}, Test: {len(test_df)}")

# Train
engine = CICIDSAnomalyEngine(contamination=0.04)
engine.train(train_df)

# --- Calibrate threshold on validation set ---
val_pred = engine.predict(val_df)
y_val_true = (val_df['binary_label'] == 'attack').astype(int).values
val_scores = val_pred['anomaly_score'].values

best_threshold = None
best_f1 = -1

# Sweep candidate thresholds across the actual range of validation scores
candidates = np.percentile(val_scores, np.arange(1, 50, 1))

for t in candidates:
    y_pred = (val_scores < t).astype(int)  # lower score = more anomalous
    tp = ((y_val_true == 1) & (y_pred == 1)).sum()
    fp = ((y_val_true == 0) & (y_pred == 1)).sum()
    fn = ((y_val_true == 1) & (y_pred == 0)).sum()
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
    if f1 > best_f1:
        best_f1 = f1
        best_threshold = t

print(f"\nBest threshold found on validation set: {best_threshold:.4f} (validation F1: {best_f1:.3f})")

# --- Apply calibrated threshold to untouched test set ---
test_pred = engine.predict(test_df)
y_test_true = (test_df['binary_label'] == 'attack').astype(int).values
test_scores = test_pred['anomaly_score'].values
y_test_pred = (test_scores < best_threshold).astype(int)

tp = int(((y_test_true == 1) & (y_test_pred == 1)).sum())
fp = int(((y_test_true == 0) & (y_test_pred == 1)).sum())
fn = int(((y_test_true == 1) & (y_test_pred == 0)).sum())
tn = int(((y_test_true == 0) & (y_test_pred == 0)).sum())

precision = tp / (tp + fp) if (tp + fp) > 0 else 0
recall = tp / (tp + fn) if (tp + fn) > 0 else 0
f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
accuracy = (tp + tn) / (tp + fp + fn + tn) if (tp + fp + fn + tn) > 0 else 0

print(f"\n=== FINAL Results on held-out TEST set (threshold calibrated on separate validation set) ===")
print(f"Threshold used: {best_threshold:.4f}")
print(f"Accuracy:  {accuracy:.3f}")
print(f"Precision: {precision:.3f}")
print(f"Recall:    {recall:.3f}")
print(f"F1:        {f1:.3f}")
print(f"TP={tp}, FP={fp}, FN={fn}, TN={tn}")

engine.save('cicids_trained_model.pkl')