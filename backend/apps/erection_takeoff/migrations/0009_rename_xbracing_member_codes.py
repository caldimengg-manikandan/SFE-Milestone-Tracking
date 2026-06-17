from django.db import migrations

def rename_xbracing_member_codes(apps, schema_editor):
    MemberType = apps.get_model("erection_takeoff", "MemberType")
    
    code_mapping = {
        "XBDA_B": "DAB",
        "XBDA_W": "DAW",
        "XBTA_B": "TAB",
        "XBTA_W": "TAW",
        "XBDR_V": "VQR",
        "XBDR_H": "HQR",
    }
    
    for old_code, new_code in code_mapping.items():
        MemberType.objects.filter(member_code=old_code).update(member_code=new_code)

def rename_xbracing_member_codes_reverse(apps, schema_editor):
    MemberType = apps.get_model("erection_takeoff", "MemberType")
    
    code_mapping = {
        "DAB": "XBDA_B",
        "DAW": "XBDA_W",
        "TAB": "XBTA_B",
        "TAW": "XBTA_W",
        "VQR": "XBDR_V",
        "HQR": "XBDR_H",
    }
    
    for old_code, new_code in code_mapping.items():
        MemberType.objects.filter(member_code=old_code).update(member_code=new_code)

class Migration(migrations.Migration):

    dependencies = [
        ("erection_takeoff", "0008_erectiontakeoff_crane_rate_and_more"),
    ]

    operations = [
        migrations.RunPython(rename_xbracing_member_codes, rename_xbracing_member_codes_reverse),
    ]
