import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sfe_project.settings')
django.setup()

from projects.models import Project, sync_bid_summary_from_estimation_data
from apps.erection_takeoff.models import ErectionTakeoff
from apps.erection_takeoff.serializers import ErectionTakeoffSerializer
from apps.bid_summary.models import BidSummary

# Retrieve project 10
project = Project.objects.get(id=10)

# Run the sync
sync_bid_summary_from_estimation_data(sender=Project, instance=project)

# Check BidSummary print representation directly
bid = BidSummary.objects.filter(project=project).first()
print("BidSummary after sync:", bid)
if bid:
    print("  joist_deck_tons:", bid.joist_deck_tons)
    print("  freight_out_trucks:", bid.freight_out_trucks)
    print("  freight_out_hours_each:", bid.freight_out_hours_each)

# Get ErectionTakeoff
takeoff, created = ErectionTakeoff.objects.get_or_create(project=project)
serializer = ErectionTakeoffSerializer(takeoff)
print("Serializer computed data:")
print("  joist_deck_tons:", serializer.data['computed'].get('joist_deck_tons'))
print("  freight_out_trucks:", serializer.data['computed'].get('freight_out_trucks'))
print("  travel_hours:", serializer.data['computed'].get('travel_hours'))
