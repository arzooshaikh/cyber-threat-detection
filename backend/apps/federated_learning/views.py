from celery.result import AsyncResult
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .tasks import run_federated_round_task


class RunFederatedRoundView(APIView):
    """
    POST /api/federated/run-round/

    Kicks off one federated learning round as a background Celery task and
    returns immediately with a task_id - it does NOT wait for training to
    finish. Poll FederatedRoundTaskStatusView with that task_id to find out
    when it's done and get the resulting round data.
    """

    def post(self, request):
        num_bases = int(request.data.get('num_bases', 3))
        task = run_federated_round_task.delay(num_bases)
        return Response(
            {'task_id': task.id, 'status': 'queued'},
            status=status.HTTP_202_ACCEPTED,
        )


class FederatedRoundTaskStatusView(APIView):
    """
    GET /api/federated/task-status/<task_id>/

    Reports the current status of a background federated round task:
      - PENDING / STARTED: still training, nothing to show yet
      - SUCCESS: training finished, `result` contains the serialized round
      - FAILURE: something went wrong, `error` contains the exception message
    """

    def get(self, request, task_id):
        result = AsyncResult(task_id)

        response_data = {'task_id': task_id, 'state': result.state}

        if result.state == 'SUCCESS':
            response_data['result'] = result.result
        elif result.state == 'FAILURE':
            response_data['error'] = str(result.result)

        return Response(response_data, status=status.HTTP_200_OK)
