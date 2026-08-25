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
        chatbot_dir = Path(__file__).resolve().parent.parent.parent
        project_root = chatbot_dir.parent.parent

        sources = [
            chatbot_dir / 'seed_data' / 'application_knowledge.md',
            project_root / 'docs' / 'PROJECT_CONTEXT.md',
            project_root / 'docs' / 'ARCHITECTURE.md',
            project_root / 'docs' / 'CURRENT_STATUS.md',
            project_root / 'docs' / 'KNOWN_ISSUES.md',
            project_root / 'sfe_application_workflow.md',
        ]

        combined_content = []
        for src_path in sources:
            if src_path.exists():
                text = src_path.read_text(encoding='utf-8')
                combined_content.append(f"\n\n# --- FILE: {src_path.name} ---\n\n{text}")

        if not combined_content:
            raise CommandError("No knowledge seed files found.")

        full_text = "\n".join(combined_content)

        doc, created = KnowledgeDocument.objects.get_or_create(
            title=SEED_TITLE,
            defaults={'is_active': True},
        )
        doc.is_active = True
        if doc.file:
            # Delete the previous physical file first - FileField.save() otherwise leaves
            # the old upload on disk under a randomly-suffixed name (Django's storage
            # backend never overwrites in place), and re-running this command every time
            # the seed file changes was exactly how media/chatbot_docs/ accumulated
            # duplicate application_knowledge_<random>.md files over time.
            doc.file.delete(save=False)
        doc.file.save('application_knowledge.md', ContentFile(full_text.encode('utf-8')), save=True)

        chunk_count = ingest_text_content(doc, full_text)
        verb = "Seeded" if created else "Refreshed"
        self.stdout.write(self.style.SUCCESS(f"{verb} '{SEED_TITLE}' with {chunk_count} chunk(s) across {len(combined_content)} source file(s)."))
