import shap
import numpy as np
from data_generator import generate_synthetic_traffic
from engine import AnomalyDetectionEngine

# Load your existing trained model
engine = AnomalyDetectionEngine()
engine.load('trained_anomaly_model.pkl')

# Get a small test sample
df = generate_synthetic_traffic(n_samples=100, attack_ratio=0.05, random_state=123)
X = df[engine.FEATURE_COLUMNS]
X_scaled = engine.scaler.transform(X)

print("=== Attempt 1: TreeExplainer ===")
try:
    explainer = shap.TreeExplainer(engine.model)
    shap_values = explainer.shap_values(X_scaled[:5])
    print("TreeExplainer SUCCEEDED")
    print("Shape:", np.array(shap_values).shape)
    print(shap_values)
except Exception as e:
    print(f"TreeExplainer FAILED: {e}")

print("\n=== Attempt 2: KernelExplainer (fallback) ===")
try:
    background = shap.sample(X_scaled, 20)  # small background sample
    explainer = shap.KernelExplainer(engine.model.decision_function, background)
    shap_values = explainer.shap_values(X_scaled[:5])
    print("KernelExplainer SUCCEEDED")
    print("Shape:", np.array(shap_values).shape)
    print(shap_values)
except Exception as e:
    print(f"KernelExplainer FAILED: {e}")