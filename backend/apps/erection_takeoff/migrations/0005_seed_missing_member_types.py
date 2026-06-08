from django.db import migrations

MEMBER_TYPES = [
    ("MSA", "Spandrel Adjustment - (Stiffener attached @ 4'-0 O.C.)", "0.125", "0", "lf", 23),
    ("TSA_CLIPS", "Spandrel Adjustment - (Top Flange Clips @ 4'-0 O.C.)", "0.1", "0", "lf", 24),
    ("BSA", "Spandrel Adjustment - (Shop Bolted/Field Adjust./Weld Bottom Flange @ 4'-0 O.C.)", "0.135", "0", "lf", 25),
    ("MOMENTS", "Moments", "0", "0", "pc", 26),
    ("MISC", "Miscellaneous (Unique Conditions, Items not on Takeoff, Etc.)", "1", "0", "hrs", 27),
    ("BOLTS", "Bolts", "0.05", "qty/500", "pc", 28),
    ("EXP_BOLTS", "Expansion Bolts", "0.25", "0", "pc", 29),
    ("ADH_ANCHORS", "Adhesive Anchors", "0.5", "0", "pc", 30),
    ("SSJ_0_10", "SS Joist 0-10'", "0.5", "qty/3", "pc", 31),
    ("SSJ_10_25", "SS Joist 10-25'", "0.5", "qty/2.25", "pc", 32),
    ("SSJ_25_35", "SS Joist 25-35'", "0.5", "qty/2", "pc", 33),
    ("SSJ_35_50", "SS Joist 35-50'", "0.8", "qty", "pc", 34),
    ("LSJ_30_40", "LS Joist 30-40'", "0.8", "qty", "pc", 35),
    ("LSJ_40_50", "LS Joist 40-50'", "0.8", "qty", "pc", 36),
    ("LSJ_50_60", "LS Joist 50-60'", "0.8", "qty", "pc", 37),
    ("LSJ_60_70", "LS Joist 60-70'", "1", "qty", "pc", 38),
    ("LSJ_70_80", "LS Joist 70-80'", "1", "qty", "pc", 39),
    ("LSJ_80_100", "LS Joist 80-100'", "2", "qty", "pc", 40),
    ("LSJ_GIR", "LS Joist Girders", "1", "qty", "pc", 41),
    ("JOIST_SPLICES", "Joist Splices", "3", "qty*2", "each", 42),
    ("BOLTED_X_BRIDGING", "Bolted X-Bridging", "0.25", "0", "set", 43),
    ("WELDED_X_BRIDGING", "Welded X-Bridging", "0.3", "0", "set", 44),
    ("HORIZ_BRIDGING", "Horizontal Bridging Plan Ft.", "0.05", "qty/200", "lf", 45),
    ("BRIDGING_WALL", "Bridging attached to wall (Vertical Angle)", "0.25", "qty/200", "each", 46),
    ("DECK_15_18_ROOF", "1.5 x 18 Ga Roof Deck", "200", "deck:2.62:3000", "sf", 47),
    ("DECK_15_20_ROOF", "1.5 x 20 Ga Roof Deck", "210", "deck:1.92:3000", "sf", 48),
    ("DECK_15_22_ROOF", "1.5 x 22 Ga Roof Deck", "225", "deck:1.58:3000", "sf", 49),
    ("DECK_3_20_ROOF", "3\"x 20 Ga Roof Deck", "125", "deck:2.9:3000", "sf", 50),
    ("DECK_15_20_COMP", "1.5 x 20 Ga Composite Floor Deck", "100", "deck:2:3000", "sf", 51),
    ("DECK_15_22_COMP", "1.5 x 22 Ga Composite Floor Deck", "125", "deck:1.63:3000", "sf", 52),
    ("DECK_2_20_COMP", "2\"x20 Ga Composite Floor Deck", "125", "deck:1.9:3000", "sf", 53),
    ("DECK_916_26", "9/16 x 26 Ga Floor Deck", "175", "deck:0.9:3000", "sf", 54),
    ("DECK_CEL_15_18_18", "1.5 x 18/18 Ga Cellular Floor Deck", "87.5", "deck:4.77:4500", "sf", 55),
    ("DECK_CEL_15_18_20", "1.5 x 18/20 Ga Cellular Floor Deck", "100", "deck:4.25:4500", "sf", 56),
    ("DECK_CEL_15_20_18", "1.5 x 20/18 Ga Cellular Floor Deck", "87.5", "deck:4.12:4500", "sf", 57),
    ("DECK_CEL_15_20_20", "1.5 x 20/20 Ga Cellular Floor Deck", "100", "deck:3.6:4500", "sf", 58),
    ("DECK_CEL_2_18_18", "2 x 18/18 Ga Cellular Floor Deck", "87.5", "deck:4.7:4500", "sf", 59),
    ("DECK_CEL_2_18_20", "2 x 18/20 Ga Cellular Floor Deck", "100", "deck:4.18:4500", "sf", 60),
    ("DECK_CEL_2_20_18", "2 x 20/18 Ga Cellular Floor Deck", "87.5", "deck:4.07:4500", "sf", 61),
    ("DECK_CEL_2_20_20", "2 x 20/20 Ga Cellular Floor Deck", "100", "deck:3.55:4500", "sf", 62),
]


def seed_missing_member_types(apps, schema_editor):
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


def revert_missing_member_types(apps, schema_editor):
    MemberType = apps.get_model("erection_takeoff", "MemberType")
    codes = [m[0] for m in MEMBER_TYPES]
    MemberType.objects.filter(member_code__in=codes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('erection_takeoff', '0004_erectiontakeoff_crew_size_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_missing_member_types, revert_missing_member_types),
    ]
