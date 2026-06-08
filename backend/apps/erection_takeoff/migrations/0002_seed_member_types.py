# Generated data migration to seed MemberType values.
from django.db import migrations

MEMBER_TYPES = [
    ("COL", "Columns (incl. plumbing)", "2.0", "qty", "pc", 1),
    ("BEAM", "Beams", "1.0", "qty", "pc", 2),
    ("GIRT", "Girts (Channel)", "1.0", "qty", "pc", 3),
    ("SAG", "Sagrods", "0.35", "qty/10", "pc", 4),
    ("RF", "Roof Frames", "2.0", "qty", "pc", 5),
    ("CA", "Curb Angles", "0.6", "qty/6", "pc", 6),
    ("CR", "Crane Rail (bolted)", "2.0", "qty", "pc", 7),
    ("XBDA_B", "X-Brace Double Angle Bay", "1.0", "qty*2", "pc", 8),
    ("XBDA_W", "X-Brace Double Angle Wall", "1.5", "qty*2", "pc", 9),
    ("XBTA_B", "X-Brace Triple Angle Bay", "1.5", "qty*3", "pc", 10),
    ("XBTA_W", "X-Brace Triple Angle Wall", "2.0", "qty*3", "pc", 11),
    ("XBDR_V", "X-Brace Double Rod Vertical", "2.0", "qty*2", "pc", 12),
    ("XBDR_H", "X-Brace Double Rod Horizontal", "3.0", "qty*3", "pc", 13),
    ("PA", "Perimeter Bent Plate (LF)", "0.05", "0", "lf", 14),
    ("PAL", "Perimeter Angle Loose (LF)", "0.10", "qty/20", "lf", 15),
    ("PAL2", "Perimeter Angle Perp Roof (LF)", "0.15", "qty/20", "lf", 16),
    ("PAL5", "Perimeter Angle RPR (LF)", "0.10", "qty/20", "lf", 17),
    ("WAL_L", "Wall Bolted Angle Light (LF)", "0.07", "qty/20", "lf", 18),
    ("WAL_M", "Wall Bolted Angle Medium (LF)", "0.09", "qty/15", "lf", 19),
    ("WAL_H", "Wall Bolted Angle Heavy (LF)", "0.11", "qty/15", "lf", 20),
    ("HAS", "Spandrel Hanger (LF)", "0.35", "qty/20", "lf", 21),
    ("SBFC", "Spandrel Bottom Flange Clips (LF)", "0.15", "0", "lf", 22),
]


def seed_member_types(apps, schema_editor):
    MemberType = apps.get_model("erection_takeoff", "MemberType")
    for code, label, mh, picks, unit, sort in MEMBER_TYPES:
        MemberType.objects.get_or_create(
            member_code=code,
            defaults={
                "label": label,
                "mh_per_pc": mh,
                "crane_picks_formula": picks,
                "input_unit": unit,
                "sort_order": sort,
            }
        )


def revert_member_types(apps, schema_editor):
    MemberType = apps.get_model("erection_takeoff", "MemberType")
    MemberType.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('erection_takeoff', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_member_types, revert_member_types),
    ]
