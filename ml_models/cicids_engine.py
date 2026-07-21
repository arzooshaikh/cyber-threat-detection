import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler


class CICIDSAnomalyEngine:
    FEATURE_COLUMNS = [
        'Dst Port', 'Protocol', 'Flow Duration', 'Tot Fwd Pkts', 'Tot Bwd Pkts',
        'TotLen Fwd Pkts', 'TotLen Bwd Pkts', 'Flow Byts/s', 'Flow Pkts/s',
        'Flow IAT Mean', 'Fwd IAT Mean', 'Bwd IAT Mean',
        'SYN Flag Cnt', 'ACK Flag Cnt', 'FIN Flag Cnt', 'RST Flag Cnt',
        'Pkt Len Mean', 'Pkt Len Std', 'Down/Up Ratio',
    ]

    # These are heavily right-skewed (rates, durations, counts) - log-transform helps a lot
    LOG_TRANSFORM_COLUMNS = [
        'Flow Duration', 'TotLen Fwd Pkts', 'TotLen Bwd Pkts',
        'Flow Byts/s', 'Flow Pkts/s', 'Flow IAT Mean', 'Fwd IAT Mean', 'Bwd IAT Mean',
    ]

    def __init__(self, contamination=0.04, n_estimators=100, random_state=42):
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=random_state,
            n_jobs=-1,
        )
        self.scaler = RobustScaler()
        self.is_trained = False

    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        X = df[self.FEATURE_COLUMNS].copy()
        X = X.replace([np.inf, -np.inf], np.nan)

        for col in self.LOG_TRANSFORM_COLUMNS:
            X[col] = X[col].fillna(0)
            X[col] = np.log1p(X[col].clip(lower=0))  # log(1+x), clip negatives just in case

        X = X.fillna(X.median(numeric_only=True))
        return X

    def train(self, df: pd.DataFrame):
        X = self._prepare_features(df)
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        self.is_trained = True
        print(f"CICIDS model trained on {len(df)} samples with {len(self.FEATURE_COLUMNS)} features.")

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self.is_trained:
            raise RuntimeError("Model must be trained before predicting.")

        X = self._prepare_features(df)
        X_scaled = self.scaler.transform(X)

        raw_scores = self.model.decision_function(X_scaled)
        predictions = self.model.predict(X_scaled)

        result = df.copy()
        result['anomaly_score'] = raw_scores
        result['is_anomaly'] = predictions == -1
        return result

    def save(self, path='cicids_trained_model.pkl'):
        joblib.dump({'model': self.model, 'scaler': self.scaler}, path)
        print(f"Model saved to {path}")

    def load(self, path='cicids_trained_model.pkl'):
        data = joblib.load(path)
        self.model = data['model']
        self.scaler = data['scaler']
        self.is_trained = True
        print(f"Model loaded from {path}")