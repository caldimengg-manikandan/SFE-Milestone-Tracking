"""
Management command: python manage.py seed_data
Seeds all lookup tables with initial data and creates default admin user.
"""
from accounts.models import get_default_modules
from django.contrib.auth import get_user_model
from apps.rfq.models import Estimator, MonthlyBidGoal
from projects.models import Customer

User = get_user_model()

SEED_ESTIMATORS = [
    {'initials': 'TPM', 'full_name': 'T.P. Manager'},
    {'initials': 'CR', 'full_name': 'C. Rodriguez'},
    {'initials': 'DS', 'full_name': 'D. Smith'},
    {'initials': 'TM', 'full_name': 'T. Miller'},
    {'initials': 'CR/DS', 'full_name': 'C. Rodriguez / D. Smith'},
    {'initials': 'TM/CR', 'full_name': 'T. Miller / C. Rodriguez'},
]

SEED_CUSTOMERS = [
    'General Contractor A',
    'General Contractor B',
    'ABC Construction',
    'Steel Erectors Inc.',
    'Metro Construction Group',
]


class Command(BaseCommand):
    help = 'Seeds initial lookup data and creates default admin user'

    def handle(self, *args, **options):
        self.stdout.write('Seeding estimators...')
        for est in SEED_ESTIMATORS:
            obj, created = Estimator.objects.get_or_create(
                initials=est['initials'],
                defaults={'full_name': est['full_name'], 'is_active': True}
            )
            if created:
                self.stdout.write(f'  Created estimator: {obj.initials}')

        self.stdout.write('Seeding customers...')
        for name in SEED_CUSTOMERS:
            obj, created = Customer.objects.get_or_create(name=name)
            if created:
                self.stdout.write(f'  Created customer: {name}')

        self.stdout.write('Seeding monthly goals (current year)...')
        from django.utils import timezone
        year = timezone.now().year
        for month in range(1, 13):
            obj, created = MonthlyBidGoal.objects.get_or_create(
                year=year, month=month,
                defaults={'goal': 2000000}
            )
            if created:
                self.stdout.write(f'  Created goal: {year}-{month:02d}: $2,000,000')

        self.stdout.write('Creating default admin user...')
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@sfe.local',
                password='sfe_admin_2024',
                role='manager',
                first_name='SFE',
                last_name='Admin',
            )
            self.stdout.write(
                self.style.SUCCESS('  Created admin user: admin / sfe_admin_2024')
            )
        else:
            self.stdout.write('  Admin user already exists.')
            User.objects.create_user(
                username='admin1',
                email='admin1@steelfab.com',
                password='defaultPassword123',
                role='admin',
            )
            user = User.objects.get(username='admin1')
            user.allowed_modules = get_default_modules()
            user.save()

        self.stdout.write(self.style.SUCCESS('[SUCCESS] Seed data complete.'))
