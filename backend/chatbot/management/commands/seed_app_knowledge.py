from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError

from chatbot.models import KnowledgeDocument
from chatbot.services import ingest_text_content

SEED_TITLE = "SFE Application Knowledge (built-in)"


class Command(BaseCommand):
    help = (
        "Seeds or refreshes the built-in application-knowledge document from "
        "chatbot/seed_data/application_knowledge.md into the retrievable knowledge base. "
        "Safe to re-run any time the seed file changes - it updates the existing document "
        "in place rather than creating a duplicate."
    )

    def handle(self, *args, **options):
        seed_path = Path(__file__).resolve().parent.parent.parent / 'seed_data' / 'application_knowledge.md'
        if not seed_path.exists():
            raise CommandError(f"Seed file not found at {seed_path}")
        content = seed_path.read_text(encoding='utf-8')

        doc, created = KnowledgeDocument.objects.get_or_create(
            title=SEED_TITLE,
            defaults={'is_active': True},
        )
        doc.is_active = True
        doc.file.save('application_knowledge.md', ContentFile(content.encode('utf-8')), save=True)

        chunk_count = ingest_text_content(doc, content)
        verb = "Seeded" if created else "Refreshed"
        self.stdout.write(self.style.SUCCESS(f"{verb} '{SEED_TITLE}' with {chunk_count} chunk(s)."))
