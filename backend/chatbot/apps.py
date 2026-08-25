import sys

from django.apps import AppConfig


class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chatbot'

    def ready(self):
        from django.db.models.signals import post_migrate
        post_migrate.connect(_regenerate_app_knowledge, sender=self)


def _regenerate_app_knowledge(sender, **kwargs):
    """
    Auto-refreshes the code-derived knowledge base after every `manage.py migrate`, so
    model/route/tool/formula changes reach the chatbot without a separate manual step.
    Connected with sender=self (this app's own AppConfig), so it fires exactly once per
    migrate invocation regardless of how many apps had pending migrations.

    Skips during `manage.py test` (and pytest-django, which also runs migrate to build the
    test database) - a knowledge-base regen has no business slowing down or network-calling
    during test runs. Never raises: a failure here must not fail someone's `migrate`/deploy.
    """
    if 'test' in sys.argv or 'pytest' in sys.modules:
        return
    try:
        from django.core.management import call_command
        call_command('generate_app_knowledge', verbosity=0)
    except Exception:
        import logging
        logging.getLogger(__name__).warning(
            "generate_app_knowledge failed during post_migrate - chatbot knowledge base "
            "was not regenerated. Run `manage.py generate_app_knowledge` manually to retry.",
            exc_info=True,
        )
