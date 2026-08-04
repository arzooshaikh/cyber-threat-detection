from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import MilitaryBase, ThreatDetection


class Command(BaseCommand):
    """
    Seeds a fresh environment with demo-ready data in one command: a login
    user, the 3 military bases, and a handful of realistic sample threats
    covering different threat types, confidence levels, and statuses.

    Safe to run multiple times (idempotent) - re-running it will not create
    duplicate bases or duplicate the demo user, and will skip seeding sample
    threats if the database already has a meaningful number of them (so it
    won't clutter a database you've already been using for real testing).

    Usage (native):
        python manage.py seed_demo_data

    Usage (Docker):
        docker compose exec backend python manage.py seed_demo_data
    """

    help = "Seed demo-ready data (login user, bases, sample threats) for a fresh environment."

    DEMO_USERNAME = 'demo'
    DEMO_PASSWORD = 'DemoPass123!'

    def handle(self, *args, **options):
        self._seed_demo_user()
        bases = self._seed_bases()
        self._seed_sample_threats(bases)

    def _seed_demo_user(self):
        user, created = User.objects.get_or_create(
            username=self.DEMO_USERNAME,
            defaults={'is_staff': True, 'is_superuser': True},
        )
        if created:
            user.set_password(self.DEMO_PASSWORD)
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f"Created demo login user - username: '{self.DEMO_USERNAME}', password: '{self.DEMO_PASSWORD}'"
            ))
        else:
            self.stdout.write(f"Demo user '{self.DEMO_USERNAME}' already exists - left untouched.")

    def _seed_bases(self):
        bases_data = [
            {
                'base_id': 'BASE001', 'base_name': 'Base Alpha', 'location': 'Delhi',
                'ip_subnet': '192.168.1.0/24', 'contact_email': 'alpha@defence.mil',
            },
            {
                'base_id': 'BASE002', 'base_name': 'Base Bravo', 'location': 'Mumbai',
                'ip_subnet': '192.168.2.0/24', 'contact_email': 'bravo@defence.mil',
            },
            {
                'base_id': 'BASE003', 'base_name': 'Base Charlie', 'location': 'Bengaluru',
                'ip_subnet': '192.168.3.0/24', 'contact_email': 'charlie@defence.mil',
            },
        ]

        bases = {}
        for data in bases_data:
            base_id = data.pop('base_id')
            base, created = MilitaryBase.objects.get_or_create(
                base_id=base_id,
                defaults={**data, 'is_active': True},
            )
            bases[base_id] = base
            self.stdout.write(f"Base '{base.base_name}': {'created' if created else 'already existed'}")

        return bases

    def _seed_sample_threats(self, bases):
        existing_count = ThreatDetection.objects.count()
        if existing_count >= 5:
            self.stdout.write(self.style.WARNING(
                f"{existing_count} threat(s) already exist in the database - skipping sample "
                f"threat seeding, to avoid cluttering existing demo/test history. "
                f"Delete existing ThreatDetection rows first if you want a truly fresh demo set."
            ))
            return

        # A deliberately varied mix: different threat types, confidence levels
        # (high/medium/borderline), and statuses (active/isolated/resolved/
        # false_positive) - so a fresh demo immediately has something
        # interesting to show on the Threats and search pages without
        # needing to click through the admin panel live.
        sample_threats = [
            dict(
                base=bases['BASE001'], src_ip='203.0.113.55', dest_ip='192.168.1.10',
                src_port=4444, dest_port=22, threat_type='port_scan',
                confidence_score=0.92, anomaly_score=-0.15,
                key_features={'top_features': ['syn_count', 'rst_count']},
                threat_indicators={'note': 'seeded demo data'},
                status='active', is_isolated=False,
                notes='Repeated SYN packets across multiple ports.',
            ),
            dict(
                base=bases['BASE002'], src_ip='198.51.100.23', dest_ip='192.168.2.15',
                src_port=51820, dest_port=21, threat_type='brute_force',
                confidence_score=0.81, anomaly_score=-0.09,
                key_features={'top_features': ['syn_count', 'duration']},
                threat_indicators={'note': 'seeded demo data'},
                status='active', is_isolated=True,
                isolation_timestamp=timezone.now(),
                notes='Repeated failed FTP login attempts from a single source.',
            ),
            dict(
                base=bases['BASE003'], src_ip='203.0.113.99', dest_ip='192.168.3.20',
                src_port=443, dest_port=443, threat_type='data_exfil',
                confidence_score=0.77, anomaly_score=-0.06,
                key_features={'top_features': ['packet_size', 'duration']},
                threat_indicators={'note': 'seeded demo data'},
                status='active', is_isolated=False,
                notes='Unusually large outbound transfer over HTTPS.',
            ),
            dict(
                base=bases['BASE001'], src_ip='192.0.2.10', dest_ip='192.168.1.25',
                src_port=80, dest_port=80, threat_type='dos',
                confidence_score=0.65, anomaly_score=-0.03,
                key_features={'top_features': ['syn_count', 'inter_arrival_time']},
                threat_indicators={'note': 'seeded demo data'},
                status='resolved', is_isolated=True,
                isolation_timestamp=timezone.now(), resolved_at=timezone.now(),
                notes='Traffic spike consistent with a SYN flood attempt; mitigated.',
            ),
            dict(
                base=bases['BASE002'], src_ip='203.0.113.44', dest_ip='192.168.2.8',
                src_port=6667, dest_port=6667, threat_type='malware',
                confidence_score=0.55, anomaly_score=0.02,
                key_features={'top_features': ['dest_port', 'payload_entropy']},
                threat_indicators={'note': 'seeded demo data'},
                status='false_positive', is_isolated=False,
                resolved_at=timezone.now(),
                notes='Flagged IRC-like traffic pattern; confirmed benign internal tool.',
            ),
        ]

        created_count = 0
        for data in sample_threats:
            _, created = ThreatDetection.objects.get_or_create(
                src_ip=data['src_ip'], dest_ip=data['dest_ip'], base=data['base'],
                threat_type=data['threat_type'],
                defaults=data,
            )
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded {created_count} sample threat(s)."))
        self.stdout.write(self.style.SUCCESS(
            "Demo data ready. Tip: also run 'python manage.py index_existing_threats' "
            "to make these searchable via Elasticsearch."
        ))
