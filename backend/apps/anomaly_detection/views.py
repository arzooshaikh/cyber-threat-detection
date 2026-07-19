import os
import pandas as pd
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .engine import AnomalyDetectionEngine
from .serializers import TrafficInputSerializer, PredictionResponseSerializer

# Load the trained model once when the server starts (not on every request)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'trained_anomaly_model.pkl')
engine = AnomalyDetectionEngine()

if os.path.exists(MODEL_PATH):
    engine.load(MODEL_PATH)
else:
    engine.is_trained = False


class PredictAnomalyView(APIView):
    """
    POST /api/anomaly/predict/
    Accepts a single traffic record, returns an anomaly prediction.
    """

    def post(self, request):
        if not engine.is_trained:
            return Response(
                {"error": "Model is not trained yet. Train it first using engine.py."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        input_serializer = TrafficInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        # Convert validated input into a single-row DataFrame
        df = pd.DataFrame([input_serializer.validated_data])

        result_df = engine.predict(df)
        row = result_df.iloc[0]

        # Convert raw anomaly_score into a 0-1 "confidence" for easier frontend display
        # (Isolation Forest scores are roughly in range -0.5 to 0.5; we normalize crudely)
        raw_score = float(row['anomaly_score'])
        confidence = max(0.0, min(1.0, (0.5 - raw_score)))

        response_data = {
            'is_anomaly': bool(row['is_anomaly']),
            'anomaly_score': raw_score,
            'confidence': confidence,
        }

        output_serializer = PredictionResponseSerializer(response_data)
        return Response(output_serializer.data, status=status.HTTP_200_OK)


from django.shortcuts import render

# Create your views here.
