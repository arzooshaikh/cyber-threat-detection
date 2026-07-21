import pandas as pd

# Only read the first 1000 rows for now - this file is huge, no need to load it all yet
df = pd.read_csv('datasets/02-14-2018.csv', nrows=1000, low_memory=False)

print("Shape (first 1000 rows):", df.shape)
print("\nColumn names:")
for col in df.columns:
    print(f"  - {col}")

print("\nLabel value counts:")
print(df['Label'].value_counts())

print("\nFirst few rows:")
print(df.head(3))

print("\nData types:")
print(df.dtypes.value_counts())

print("\nAny NaN values in first 1000 rows?")
print(df.isnull().sum().sum())