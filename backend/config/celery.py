import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')

# Read all CELERY_* settings from Django's settings.py (see settings.py's
# CELERY_BROKER_URL / CELERY_RESULT_BACKEND for the actual Redis connection).
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-find any tasks.py file inside each installed app (e.g.
# apps/federated_learning/tasks.py) without having to register them by hand.
app.autodiscover_tasks()
