from django.db import migrations

def migrate_customers(apps, schema_editor):
    RfqCustomer = apps.get_model('rfq', 'Customer')
    ProjCustomer = apps.get_model('projects', 'Customer')
    
    from django.db import connection
    with connection.cursor() as cursor:
        tables = connection.introspection.table_names(cursor)
        
        # Only migrate if rfq_customer exists
        if 'rfq_customer' in tables:
            # Get all existing customer IDs in the projects.Customer table ('customers')
            if 'customers' in tables:
                cursor.execute("SELECT id FROM customers")
                existing_ids = [row[0] for row in cursor.fetchall()]
                
                # If there are existing customers in projects.Customer, move them to ID + 10000 to free up lower IDs
                for old_id in existing_ids:
                    new_id = old_id + 10000
                    # Update customer contacts
                    if 'customer_contacts' in tables:
                        cursor.execute("UPDATE customer_contacts SET customer_id = %s WHERE customer_id = %s", [new_id, old_id])
                    # Update bid enquiries
                    if 'bid_enquiries' in tables:
                        cursor.execute("UPDATE bid_enquiries SET customer_name_id = %s WHERE customer_name_id = %s", [new_id, old_id])
                    # Update customer ID
                    cursor.execute("UPDATE customers SET id = %s WHERE id = %s", [new_id, old_id])

            # 2. Copy all RfqCustomer rows to ProjCustomer preserving IDs
            rfq_customers = RfqCustomer.objects.all()
            proj_customers_to_create = []
            for rc in rfq_customers:
                proj_customers_to_create.append(
                    ProjCustomer(
                        id=rc.id,
                        name=rc.name,
                        created_at=rc.created_at,
                    )
                )
            if proj_customers_to_create:
                ProjCustomer.objects.bulk_create(proj_customers_to_create)
            
        # 3. Update primary key sequence for customers
        if connection.vendor == 'postgresql':
            cursor.execute("SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers))")

def rollback_customers(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('rfq', '0003_rfqmaster_email_sent'),
        ('projects', '0021_customer_address_customer_designation_customer_state_and_more'),
    ]

    operations = [
        migrations.RunPython(migrate_customers, reverse_code=rollback_customers),
    ]
