from django.core.management.base import BaseCommand

from apps.core.models import ThreatDetection
from apps.core.serializers import ThreatDetectionSerializer
from apps.threat_response.es_indexing import ensure_threats_index, index_threat


class Command(BaseCommand):
    """
    Backfills every existing ThreatDetection row (created before Elasticsearch
    was wired in, or added directly via the admin panel) into the 'threats'
    Elasticsearch index, so they become searchable too.

    New threats created from now on are indexed automatically as they happen
    (see threat_response/views.py) - this command only needs to be run once,
    or again if the Elasticsearch index/container is ever wiped and recreated.

    Usage:
        python manage.py index_existing_threats
    """

    help = "Backfill all existing ThreatDetection rows into Elasticsearch."

    def handle(self, *args, **options):
        ensure_threats_index()

        threats = ThreatDetection.objects.all()
        total = threats.count()

        if total == 0:
            self.stdout.write("No ThreatDetection rows found - nothing to index.")
            return

        self.stdout.write(f"Indexing {total} existing threat(s) into Elasticsearch...")

        indexed = 0
        failed = 0
        for threat in threats:
            data = dict(ThreatDetectionSerializer(threat).data)
            if index_threat(data):
                indexed += 1
            else:
                failed += 1

        if failed:
            self.stdout.write(self.style.WARNING(
                f"Indexed {indexed}/{total} threat(s), {failed} failed "
                f"(is Elasticsearch running? check docker compose ps)."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Done. Indexed {indexed}/{total} threat(s). "
                f"Try it: GET /api/threat-response/search/?q=port_scan"
            ))
