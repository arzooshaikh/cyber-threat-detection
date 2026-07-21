import pandas as pd
import numpy as np
from cicids_engine import CICIDSAnomalyEngine

USE_COLS = CICIDSAnomalyEngine.FEATURE_COLUMNS + ['Label']

df = pd.read_csv('datasets/02-14-2018.csv', usecols=USE_COLS, low_memory=False)
df['binary_label'] = df['Label'].apply(lambda x: 'benign' if x == 'Benign' else 'attack')

benign_df = df[df['binary_label'] == 'benign']
attack_df = df[df['binary_label'] == 'attack']
target_attack_count = int(len(benign_df) * 0.04)
attack_sample = attack_df.sample(n=target_attack_count, random_state=42)
realistic_df = pd.concat([benign_df, attack_sample]).sample(frac=1, random_state=42).reset_index(drop=True)

train_df = realistic_df.sample(frac=0.6, random_state=42)
remaining = realistic_df.drop(train_df.index)
val_df = remaining.sample(frac=0.5, random_state=42)
test_df = remaining.drop(val_df.index)

engine = CICIDSAnomalyEngine(contamination=0.04)
engine.train(train_df)

test_pred = engine.predict(test_df)
y_true = (test_df['binary_label'] == 'attack').astype(int).values

# HYBRID RULE: flag as attack only if BOTH conditions hold:
# (1) anomaly score is below the calibrated threshold, AND
# (2) it's a short-lived, low-byte-count flow (typical of brute-force attempts, not long sessions)
threshold = 0.0747
is_low_score = test_pred['anomaly_score'].values < threshold
is_short_flow = test_pred['Flow Duration'].values < test_pred['Flow Duration'].median()

y_pred_hybrid = (is_low_score & is_short_flow).astype(int)

tp = int(((y_true == 1) & (y_pred_hybrid == 1)).sum())
fp = int(((y_true == 0) & (y_pred_hybrid == 1)).sum())
fn = int(((y_true == 1) & (y_pred_hybrid == 0)).sum())
tn = int(((y_true == 0) & (y_pred_hybrid == 0)).sum())

precision = tp / (tp + fp) if (tp + fp) > 0 else 0
recall = tp / (tp + fn) if (tp + fn) > 0 else 0
f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
accuracy = (tp + tn) / (tp + fp + fn + tn) if (tp + fp + fn + tn) > 0 else 0

print("=== Hybrid rule (anomaly score + short flow duration) ===")
print(f"Accuracy:  {accuracy:.3f}")
print(f"Precision: {precision:.3f}")
print(f"Recall:    {recall:.3f}")
print(f"F1:        {f1:.3f}")
print(f"TP={tp}, FP={fp}, FN={fn}, TN={tn}")