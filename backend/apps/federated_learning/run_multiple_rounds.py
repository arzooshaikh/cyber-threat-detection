import requests
import statistics

API_URL = "http://127.0.0.1:8000/api/federated/run-round/"
NUM_ROUNDS = 20

results = {
    'accuracy': [],
    'precision': [],
    'recall': [],
    'f1': [],
}

print(f"Running {NUM_ROUNDS} fresh federated rounds...\n")

for i in range(1, NUM_ROUNDS + 1):
    response = requests.post(API_URL, json={"num_bases": 3})
    if response.status_code == 201:
        data = response.json()
        results['accuracy'].append(data['global_accuracy'])
        results['precision'].append(data['global_precision'])
        results['recall'].append(data['global_recall'])
        results['f1'].append(data['global_f1'])
        print(f"Round {i}: round_number={data['round_number']}, "
              f"acc={data['global_accuracy']:.3f}, "
              f"prec={data['global_precision']:.3f}, "
              f"rec={data['global_recall']:.3f}, "
              f"f1={data['global_f1']:.3f}")
    else:
        print(f"Round {i}: FAILED - status {response.status_code}: {response.text}")

print("\n=== Summary statistics across all rounds (mean ± std) ===")
for metric, values in results.items():
    if values:
        mean = statistics.mean(values)
        std = statistics.stdev(values) if len(values) > 1 else 0.0
        print(f"{metric.capitalize():10s}: {mean:.4f} ± {std:.4f}  (min={min(values):.3f}, max={max(values):.3f}, n={len(values)})")