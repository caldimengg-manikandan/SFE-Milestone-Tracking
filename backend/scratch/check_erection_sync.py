import os
import sys

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sfe_project.settings')
django.setup()

from projects.models import Project

print("Checking synchronization...")
for p in Project.objects.all():
    if not p.estimation_data:
        continue
    est_sec = p.estimation_data.get("estimationSections", {})
    bid_summary = getattr(p, "bid_summary", None)
    
    print(f"Project ID {p.id}: {p.name[:30]}")
    print(f"  Estimation Data:")
    print(f"    steelJoistTons:      {repr(est_sec.get('steelJoistTons'))}")
    print(f"    numTrucks:           {repr(est_sec.get('numTrucks'))}")
    print(f"    hoursPerTruck:       {repr(est_sec.get('hoursPerTruck'))}")
    if bid_summary:
        print(f"  BidSummary:")
        print(f"    joist_deck_tons:     {repr(bid_summary.joist_deck_tons)}")
        print(f"    freight_out_trucks:  {repr(bid_summary.freight_out_trucks)}")
        print(f"    freight_out_hours:   {repr(bid_summary.freight_out_hours_each)}")
    else:
        print(f"  BidSummary: **NOT FOUND**")
    print("-" * 50)
