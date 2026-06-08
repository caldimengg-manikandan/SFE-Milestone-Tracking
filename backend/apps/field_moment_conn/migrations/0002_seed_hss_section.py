from django.db import migrations
from decimal import Decimal

def seed_hss_section(apps, schema_editor):
    AISCSection = apps.get_model("field_moment_conn", "AISCSection")
    AISCSection.objects.get_or_create(
        label="HSS",
        defaults={
            "bf": Decimal("4.06"),
            "tf": Decimal("0.345"),
        }
    )

def remove_hss_section(apps, schema_editor):
    AISCSection = apps.get_model("field_moment_conn", "AISCSection")
    AISCSection.objects.filter(label="HSS").delete()

class Migration(migrations.Migration):
    dependencies = [
        ('field_moment_conn', '0001_initial'),
    ]
    operations = [
        migrations.RunPython(seed_hss_section, remove_hss_section),
    ]
