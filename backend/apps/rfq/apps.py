import os
import sys
from django.apps import AppConfig

class RfqConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.rfq'
    verbose_name = 'RFQ Master'

    def ready(self):
        # Only start in runserver main process or WSGI (avoid during manage.py migrate/test)
        if 'runserver' in sys.argv or 'gunicorn' in sys.argv or 'daphne' in sys.argv or os.environ.get('RUN_MAIN') == 'true':
            try:
                from .views import start_quote_sync_background_daemon
                start_quote_sync_background_daemon()
            except Exception as e:
                pass

