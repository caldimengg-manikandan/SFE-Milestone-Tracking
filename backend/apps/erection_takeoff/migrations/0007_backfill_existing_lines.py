from django.db import migrations

def backfill_existing_lines(apps, schema_editor):
    ErectionMemberLine = apps.get_model("erection_takeoff", "ErectionMemberLine")
    
    MEMBER_TO_CATEGORY = {
        # Structural Steel
        "COL": "Structural Steel",
        "BEAM": "Structural Steel",
        "GIRT": "Structural Steel",
        "SAG": "Structural Steel",
        "RF": "Structural Steel",
        "CA": "Structural Steel",
        "CR": "Structural Steel",
        # X-Bracing
        "XBDA_B": "X-Bracing",
        "XBDA_W": "X-Bracing",
        "XBTA_B": "X-Bracing",
        "XBTA_W": "X-Bracing",
        "XBDR_V": "X-Bracing",
        "XBDR_H": "X-Bracing",
        # Perimeter Plates & Angles
        "PA": "Perimeter Plates & Angles",
        "PAL": "Perimeter Plates & Angles",
        "PAL2": "Perimeter Plates & Angles",
        "PAL5": "Perimeter Plates & Angles",
        "WAL_L": "Perimeter Plates & Angles",
        "WAL_M": "Perimeter Plates & Angles",
        "WAL_H": "Perimeter Plates & Angles",
        "HAS": "Perimeter Plates & Angles",
        "SBFC": "Perimeter Plates & Angles",
        "MSA": "Perimeter Plates & Angles",
        "TSA_CLIPS": "Perimeter Plates & Angles",
        "BSA": "Perimeter Plates & Angles",
        # Moments & Miscellaneous
        "MOMENTS": "Moments & Miscellaneous",
        "MISC": "Moments & Miscellaneous",
        # Bolts & Anchors
        "BOLTS": "Bolts & Anchors",
        "EXP_BOLTS": "Bolts & Anchors",
        "ADH_ANCHORS": "Bolts & Anchors",
        # Joist Take-off
        "SSJ_0_10": "Joist Take-off",
        "SSJ_10_25": "Joist Take-off",
        "SSJ_25_35": "Joist Take-off",
        "SSJ_35_50": "Joist Take-off",
        "LSJ_30_40": "Joist Take-off",
        "LSJ_40_50": "Joist Take-off",
        "LSJ_50_60": "Joist Take-off",
        "LSJ_60_70": "Joist Take-off",
        "LSJ_70_80": "Joist Take-off",
        "LSJ_80_100": "Joist Take-off",
        "LSJ_GIR": "Joist Take-off",
        "JOIST_SPLICES": "Joist Take-off",
        "BOLTED_X_BRIDGING": "Joist Take-off",
        "WELDED_X_BRIDGING": "Joist Take-off",
        "HORIZ_BRIDGING": "Joist Take-off",
        "BRIDGING_WALL": "Joist Take-off",
        # Decking Take-off
        "DECK_15_18_ROOF": "Decking Take-off",
        "DECK_15_20_ROOF": "Decking Take-off",
        "DECK_15_22_ROOF": "Decking Take-off",
        "DECK_3_20_ROOF": "Decking Take-off",
        "DECK_15_20_COMP": "Decking Take-off",
        "DECK_15_22_COMP": "Decking Take-off",
        "DECK_2_20_COMP": "Decking Take-off",
        "DECK_916_26": "Decking Take-off",
        "DECK_CEL_15_18_18": "Decking Take-off",
        "DECK_CEL_15_18_20": "Decking Take-off",
        "DECK_CEL_15_20_18": "Decking Take-off",
        "DECK_CEL_15_20_20": "Decking Take-off",
        "DECK_CEL_2_18_18": "Decking Take-off",
        "DECK_CEL_2_18_20": "Decking Take-off",
        "DECK_CEL_2_20_18": "Decking Take-off",
        "DECK_CEL_2_20_20": "Decking Take-off",
    }

    for line in ErectionMemberLine.objects.filter(member_type__isnull=False):
        mt = line.member_type
        if not line.label:
            line.label = mt.label
        if not line.input_unit:
            line.input_unit = mt.input_unit
        if line.mh_per_pc is None:
            line.mh_per_pc = mt.mh_per_pc
        if not line.crane_picks_formula:
            line.crane_picks_formula = mt.crane_picks_formula
        if not line.category:
            line.category = MEMBER_TO_CATEGORY.get(mt.member_code, "")
        if not line.sort_order:
            line.sort_order = mt.sort_order
        line.save()


class Migration(migrations.Migration):

    dependencies = [
        ('erection_takeoff', '0006_alter_erectionmemberline_options_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_existing_lines, migrations.RunPython.noop),
    ]
