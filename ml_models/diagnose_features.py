import pandas as pd
from cicids_engine import CICIDSAnomalyEngine

USE_COLS = CICIDSAnomalyEngine.FEATURE_COLUMNS + ['Label']

df = pd.read_csv('datasets/02-14-2018.csv', usecols=USE_COLS, low_memory=False)
df['binary_label'] = df['Label'].apply(lambda x: 'benign' if x == 'Benign' else 'attack')

pd.set_option('display.max_columns', None)
pd.set_option('display.width', 200)

print("=== Feature means, grouped by benign vs attack ===")
print(df.groupby('binary_label')[CICIDSAnomalyEngine.FEATURE_COLUMNS].mean().T)

print("\n=== Dst Port value counts for ATTACK rows only ===")
print(df[df['binary_label'] == 'attack']['Dst Port'].value_counts().head(10))

print("\n=== Dst Port value counts for BENIGN rows only ===")
print(df[df['binary_label'] == 'benign']['Dst Port'].value_counts().head(10))