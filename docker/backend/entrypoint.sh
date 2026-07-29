#!/bin/sh
set -e

# If docker-compose specifies a `command:` for this service (like the
# celery-worker service does), run that instead of the default Django
# server. With no override, fall through to the normal migrate + runserver.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Starting Django development server on 0.0.0.0:8000 ..."
exec python manage.py runserver 0.0.0.0:8000
