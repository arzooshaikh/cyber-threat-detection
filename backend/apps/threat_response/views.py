from django.shortcuts import render
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.core.models import MilitaryBase, ThreatDetection
from apps.core.serializers import ThreatDetectionSerializer
from apps.anomaly_detection.views import engine  # already-loaded model + SHAP explainer
from .serializers import DetectAndRespondRequestSerializer, ResolveThreatRequestSerializer
from . import engine as policy  # rule-based threat_type + isolation policy
from .broadcast import broadcast_threat_event
from .es_indexing import ensure_threats_index, index_threat, search_threats

import pandas as pd

# Make sure the Elasticsearch index exists as soon as this app loads (same
# "do it once at startup" pattern as loading the trained ML model). Harmless
# if Elasticsearch isn't reachable yet - just logs a warning and moves on.
ensure_threats_index()


class DetectAndRespondView(APIView):
    """
    POST /api/threat-response/detect/

    The full pipeline in one call:
      1. Run the traffic through the trained Isolation Forest (same model
         used by /api/anomaly/predict/).
      2. If it's flagged as anomalous, explain WHY using SHAP.
      3. Classify a threat_type using a transparent rule layer.
      4. Decide whether to auto-isolate based on confidence score.
      5. Save a real ThreatDetection row to the database.

    If the traffic is NOT anomalous, nothing is saved - this endpoint only
    creates records for genuine detections, same as a real IDS would.
    """

    def post(self, request):
        if not engine.is_trained:
            return Response(
                {"error": "Model is not trained yet. Train it first using engine.py."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        input_serializer = DetectAndRespondRequestSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        feature_keys = [
            'packet_size', 'inter_arrival_time', 'payload_entropy',
            'syn_count', 'ack_count', 'fin_count', 'rst_count',
            'duration', 'dest_port',
        ]
        raw_features = {k: data[k] for k in feature_keys}

        df = pd.DataFrame([raw_features])
        result_df = engine.predict(df)
        row = result_df.iloc[0]

        raw_score = float(row['anomaly_score'])
        confidence = max(0.0, min(1.0, (0.5 - raw_score)))
        is_anomaly = bool(row['is_anomaly'])

        feature_contributions = engine.explain(df)[0]

        response_data = {
            'is_anomaly': is_anomaly,
            'anomaly_score': raw_score,
            'confidence_score': confidence,
            'feature_contributions': feature_contributions,
            'threat': None,
        }

        if not is_anomaly:
            # Nothing to save or respond to - traffic looks normal.
            return Response(response_data, status=status.HTTP_200_OK)

        # --- Anomaly confirmed: figure out the base, classify, decide, save ---
        base_id = data.get('base_id')
        if base_id is not None:
            try:
                base = MilitaryBase.objects.get(id=base_id)
            except MilitaryBase.DoesNotExist:
                return Response(
                    {"error": f"MilitaryBase with id={base_id} does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            base = MilitaryBase.objects.filter(is_active=True).first()
            if base is None:
                return Response(
                    {"error": "No active MilitaryBase exists to attribute this detection to."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        threat_type = policy.classify_threat_type(raw_features)
        should_isolate = policy.decide_isolation(confidence)

        # Keep only the top 3 SHAP features in key_features (JSON) - a
        # concise explanation rather than dumping all 9 every time.
        top_features = feature_contributions[:3]

        threat = ThreatDetection.objects.create(
            base=base,
            src_ip=data['src_ip'],
            dest_ip=data['dest_ip'],
            src_port=data['src_port'],
            dest_port=data['dest_port'],
            threat_type=threat_type,
            confidence_score=confidence,
            anomaly_score=raw_score,
            key_features=top_features,
            threat_indicators={'raw_features': raw_features},
            is_isolated=should_isolate,
            isolation_timestamp=timezone.now() if should_isolate else None,
            status='active',
        )

        response_data['threat'] = ThreatDetectionSerializer(threat).data
        broadcast_threat_event('created', dict(response_data['threat']))
        index_threat(dict(response_data['threat']))
        return Response(response_data, status=status.HTTP_201_CREATED)


class IsolateThreatView(APIView):
    """
    POST /api/threat-response/<id>/isolate/
    Manually isolate a threat that wasn't auto-isolated (e.g. an analyst
    reviewing a lower-confidence detection decides to act on it anyway).
    """

    def post(self, request, threat_id):
        try:
            threat = ThreatDetection.objects.get(id=threat_id)
        except ThreatDetection.DoesNotExist:
            return Response({"error": "Threat not found."}, status=status.HTTP_404_NOT_FOUND)

        threat.is_isolated = True
        threat.isolation_timestamp = timezone.now()
        threat.save()

        serialized = ThreatDetectionSerializer(threat).data
        broadcast_threat_event('updated', dict(serialized))
        index_threat(dict(serialized))
        return Response(serialized, status=status.HTTP_200_OK)


class ResolveThreatView(APIView):
    """
    POST /api/threat-response/<id>/resolve/
    Body: {"status": "resolved" | "false_positive", "notes": "..."}
    Marks a threat as reviewed and closed out by an analyst.
    """

    def post(self, request, threat_id):
        try:
            threat = ThreatDetection.objects.get(id=threat_id)
        except ThreatDetection.DoesNotExist:
            return Response({"error": "Threat not found."}, status=status.HTTP_404_NOT_FOUND)

        input_serializer = ResolveThreatRequestSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        threat.status = data['status']
        threat.notes = data['notes']
        threat.resolved_at = timezone.now()
        threat.save()

        serialized = ThreatDetectionSerializer(threat).data
        broadcast_threat_event('updated', dict(serialized))
        index_threat(dict(serialized))
        return Response(serialized, status=status.HTTP_200_OK)


class ThreatSearchView(APIView):
    """
    GET /api/threat-response/search/?q=...&threat_type=...&status=...&is_isolated=...&min_confidence=...

    Full-text + filtered search across all indexed threat logs, backed by
    Elasticsearch (separate from the plain /api/threats/ CRUD endpoint, which
    reads directly from the SQLite database instead).

    Query params (all optional):
      q             - free text, matched against src_ip/dest_ip/threat_type/notes/status
      threat_type   - exact match, e.g. 'port_scan'
      status        - exact match, e.g. 'active' | 'resolved' | 'false_positive'
      is_isolated   - 'true' | 'false'
      min_confidence - float 0-1, e.g. 0.75
    """

    def get(self, request):
        q = request.query_params.get('q') or None
        threat_type = request.query_params.get('threat_type') or None
        status_param = request.query_params.get('status') or None

        is_isolated_param = request.query_params.get('is_isolated')
        is_isolated = None
        if is_isolated_param is not None:
            is_isolated = is_isolated_param.lower() == 'true'

        min_confidence_param = request.query_params.get('min_confidence')
        min_confidence = float(min_confidence_param) if min_confidence_param else None

        results = search_threats(
            query_text=q,
            threat_type=threat_type,
            status=status_param,
            is_isolated=is_isolated,
            min_confidence=min_confidence,
        )
        return Response({'count': len(results), 'results': results}, status=status.HTTP_200_OK)


# Create your views here.
