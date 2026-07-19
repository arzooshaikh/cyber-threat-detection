import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix


class AnomalyDetectionEngine:
    """
    Wraps an Isolation Forest model for network traffic anomaly detection.
    """

    FEATURE_COLUMNS = [
        'packet_size', 'inter_arrival_time', 'payload_entropy',
        'syn_count', 'ack_count', 'fin_count', 'rst_count',
        'duration', 'dest_port',
    ]

    def __init__(self, contamination=0.05, n_estimators=100, random_state=42):
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=random_state,
        )
        self.scaler = StandardScaler()
        self.is_trained = False

    def _prepare_features(self, df: pd.DataFrame) -> np.ndarray:
        """Extract and scale the numeric features used for training/prediction."""
        X = df[self.FEATURE_COLUMNS].copy()
        return X

    def train(self, df: pd.DataFrame):
        """Train the Isolation Forest on traffic data (unsupervised - ignores 'label')."""
        X = self._prepare_features(df)
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        self.is_trained = True
        print(f"Model trained on {len(df)} samples with {len(self.FEATURE_COLUMNS)} features.")

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Predict anomalies. Returns the input df with two new columns:
        - anomaly_score: raw decision function score (lower = more anomalous)
        - is_anomaly: True/False prediction
        """
        if not self.is_trained:
            raise RuntimeError("Model must be trained before predicting.")

        X = self._prepare_features(df)
        X_scaled = self.scaler.transform(X)

        raw_scores = self.model.decision_function(X_scaled)  # higher = more normal
        predictions = self.model.predict(X_scaled)  # 1 = normal, -1 = anomaly

        result = df.copy()
        result['anomaly_score'] = raw_scores
        result['is_anomaly'] = predictions == -1
        return result

    def evaluate(self, df: pd.DataFrame):
        """
        Evaluate against ground-truth 'label' column (only possible since our
        synthetic data has labels - real unlabeled traffic won't have this).
        """
        result = self.predict(df)
        y_true = (df['label'] == 'attack').astype(int)
        y_pred = result['is_anomaly'].astype(int)

        print("Confusion Matrix:")
        print(confusion_matrix(y_true, y_pred))
        print("\nClassification Report:")
        print(classification_report(y_true, y_pred, target_names=['benign', 'attack']))

    def save(self, path='trained_anomaly_model.pkl'):
        joblib.dump({'model': self.model, 'scaler': self.scaler}, path)
        print(f"Model saved to {path}")

    def load(self, path='trained_anomaly_model.pkl'):
        data = joblib.load(path)
        self.model = data['model']
        self.scaler = data['scaler']
        self.is_trained = True
        print(f"Model loaded from {path}")


if __name__ == '__main__':
    from data_generator import generate_synthetic_traffic

    # Generate data
    df = generate_synthetic_traffic(n_samples=1000, attack_ratio=0.05)

    # Train
    engine = AnomalyDetectionEngine(contamination=0.05)
    engine.train(df)

    # Evaluate against known labels (since this is synthetic/labeled data)
    engine.evaluate(df)

    # Save the trained model
    engine.save('trained_anomaly_model.pkl')