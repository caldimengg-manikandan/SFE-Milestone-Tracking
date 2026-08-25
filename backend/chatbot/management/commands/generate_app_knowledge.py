from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from chatbot.knowledge_extractors import generate_full_knowledge_text, content_hash
from chatbot.models import KnowledgeDocument
from chatbot.services import ingest_text_content

GENERATED_TITLE = "SFE Code-Derived Knowledge (auto-generated)"


class Command(BaseCommand):
    help = (
        "Regenerates the code-derived portion of the chatbot's knowledge base (model "
        "fields, page routes, tool registry, business-logic formulas) directly from live "
        "introspection instead of hand-typed Markdown. Safe to re-run any time - skips "
        "re-embedding if the generated content hasn't actually changed since last run."
    )

    def handle(self, *args, **options):
        full_text = generate_full_knowledge_text()
        new_hash = content_hash(full_text)

        doc, created = KnowledgeDocument.objects.get_or_create(
            title=GENERATED_TITLE,
            defaults={'is_active': True, 'source': 'generated'},
        )

        if not created and doc.content_hash == new_hash:
            self.stdout.write(self.style.SUCCESS(
                f"'{GENERATED_TITLE}' is already up to date (content unchanged) - skipped re-embedding."
            ))
            return

        doc.is_active = True
        doc.source = 'generated'
        if doc.file:
            doc.file.delete(save=False)
        doc.file.save('sfe_code_derived_knowledge.md', ContentFile(full_text.encode('utf-8')), save=False)
        doc.content_hash = new_hash
        doc.save()

        chunk_count = ingest_text_content(doc, full_text)
        verb = "Generated" if created else "Regenerated"
        self.stdout.write(self.style.SUCCESS(f"{verb} '{GENERATED_TITLE}' with {chunk_count} chunk(s)."))
