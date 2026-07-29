import random

from celery import shared_task
from django.utils import timezone

from apps.core.models import MilitaryBase, FederatedModelRound, ClientMetrics
from apps.core.serializers import FederatedModelRoundSerializer

from .fl_engine import (
    generate_synthetic_traffic,
    split_data_across_bases,
    train_local_models,
    federated_voting_predict,
)


@shared_task(bind=True)
def run_federated_round_task(self, num_bases: int = 3):
    """
    Runs one full federated learning round in the background (Celery worker):
    - Splits synthetic traffic across N bases
    - Trains a local Isolation Forest per base
    - Evaluates the federated ensemble (weighted voting) on a fresh validation set
    - Saves a FederatedModelRound + one ClientMetrics row per base

    Returns a JSON-safe dict (the serialized FederatedModelRound) as the task
    result, so the frontend can poll for it and display it once ready.

    This is the exact same logic that used to run synchronously inside
    RunFederatedRoundView - moved here so the HTTP request returns instantly
    instead of blocking for however long training 3 models takes.
    """
    # Randomize seeds each round - otherwise every round regenerates the
    # exact same data and gives the exact same (misleadingly perfect) result
    train_seed = random.randint(1, 1_000_000)
    val_seed = random.randint(1, 1_000_000)

    # 1. Generate and split training data across bases
    full_df = generate_synthetic_traffic(n_samples=3000, attack_ratio=0.05, random_state=train_seed)
    base_data = split_data_across_bases(full_df, num_bases=num_bases, random_state=train_seed)

    # 2. Each base trains its own local model
    trained_bases = train_local_models(base_data)

    # 3. Evaluate the federated ensemble on a fresh, unseen validation set
    validation_df = generate_synthetic_traffic(n_samples=300, attack_ratio=0.05, random_state=val_seed)
    ensemble_result = federated_voting_predict(trained_bases, validation_df)

    y_true = (validation_df['label'] == 'attack').astype(int)
    y_pred = ensemble_result['ensemble_is_anomaly'].astype(int)

    tp = int(((y_true == 1) & (y_pred == 1)).sum())
    fp = int(((y_true == 0) & (y_pred == 1)).sum())
    fn = int(((y_true == 1) & (y_pred == 0)).sum())
    tn = int(((y_true == 0) & (y_pred == 0)).sum())

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / (tp + fp + fn + tn) if (tp + fp + fn + tn) > 0 else 0.0

    # 4. Figure out the next round number
    last_round = FederatedModelRound.objects.order_by('-round_number').first()
    round_number = (last_round.round_number + 1) if last_round else 1

    # Federated approach: each base sends back one prediction score per validation
    # sample (8 bytes per float64) - NOT raw traffic and NOT model weights/trees.
    communication_bytes = num_bases * len(validation_df) * 8

    # Centralized-equivalent comparison: what it would cost if every base instead
    # sent its RAW local traffic feature vectors to a central server for training.
    num_features = len(next(iter(trained_bases.values()))[0].FEATURE_COLUMNS)
    total_training_rows = sum(m['training_samples'] for _, m in trained_bases.values())
    centralized_equivalent_bytes = total_training_rows * num_features * 8

    # 5. Save the round
    fl_round = FederatedModelRound.objects.create(
        round_number=round_number,
        status='completed',
        completed_at=timezone.now(),
        global_accuracy=accuracy,
        global_precision=precision,
        global_recall=recall,
        global_f1=f1,
        communication_bytes=communication_bytes,
        centralized_equivalent_bytes=centralized_equivalent_bytes,
        num_clients=num_bases,
        num_clients_available=num_bases,
        model_version='ensemble-voting-v1',
    )

    # 6. Save per-base client metrics
    weights_sum = sum(m['f1'] for _, m in trained_bases.values())

    for base_id, (engine, metrics) in trained_bases.items():
        base_obj, _ = MilitaryBase.objects.get_or_create(
            base_id=base_id,
            defaults={
                'base_name': f'Simulated {base_id}',
                'location': 'Unknown (simulated)',
                'ip_subnet': '0.0.0.0/24',
                'is_active': True,
            }
        )

        weight = metrics['f1'] / weights_sum if weights_sum > 0 else 1 / num_bases

        ClientMetrics.objects.create(
            round=fl_round,
            base=base_obj,
            local_accuracy=metrics['accuracy'],
            local_precision=metrics['precision'],
            local_recall=metrics['recall'],
            local_f1=metrics['f1'],
            training_samples=metrics['training_samples'],
            anomaly_samples=metrics['anomaly_samples'],
            benign_samples=metrics['benign_samples'],
            weight=weight,
            upload_time_ms=0,  # simulated, no real network transfer happening
        )

    serializer = FederatedModelRoundSerializer(fl_round)
    return dict(serializer.data)
