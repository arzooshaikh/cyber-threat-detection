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

train_df = realistic_df.sample(frac=0.7, random_state=42)
test_df = realistic_df.drop(train_df.index)

engine = CICIDSAnomalyEngine(contamination=0.04)
engine.train(train_df)

pred_df = engine.predict(test_df)

# Compare anomaly_score DISTRIBUTIONS between true benign and true attack rows in the test set
attack_scores = pred_df[pred_df['binary_label'] == 'attack']['anomaly_score']
benign_scores = pred_df[pred_df['binary_label'] == 'benign']['anomaly_score']

print("=== Anomaly score distribution: ATTACK rows ===")
print(attack_scores.describe())

print("\n=== Anomaly score distribution: BENIGN rows ===")
print(benign_scores.describe())

# What does the model actually flag as anomalies? Check THEIR Dst Port distribution
flagged = pred_df[pred_df['is_anomaly'] == True]
print(f"\n=== Total flagged as anomaly: {len(flagged)} ===")
print("Dst Port distribution of FLAGGED rows:")
print(flagged['Dst Port'].value_counts().head(10))

print("\nTrue label breakdown of flagged rows:")
print(flagged['binary_label'].value_counts())

# Lowest (most anomalous) scores overall - what are they?
print("\n=== 10 LOWEST (most anomalous) scores in test set - are these attacks? ===")
lowest = pred_df.nsmallest(10, 'anomaly_score')[['Dst Port', 'Flow Duration', 'binary_label', 'anomaly_score']]
print(lowest)