import sqlite3
import os

db_path = 'c:/Users/Caldim-15/Desktop/SFE -Milestone/backend/db.sqlite3'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    tables = [
        'production_platepriorityitem', 
        'production_platepriority', 
        'production_productionpriorityitem', 
        'production_productionpriority',
        'production_productionschedule',
        'production_productionitem'
    ]
    for table in tables:
        try:
            cursor.execute(f"DROP TABLE IF EXISTS {table}")
            print(f"Dropped {table}")
        except Exception as e:
            print(f"Error dropping {table}: {e}")
    
    try:
        cursor.execute("DELETE FROM django_migrations WHERE app='production'")
        print("Cleared production migration history")
    except Exception as e:
        print(f"Error clearing migration history: {e}")

    conn.commit()
    conn.close()
else:
    print("DB not found")
