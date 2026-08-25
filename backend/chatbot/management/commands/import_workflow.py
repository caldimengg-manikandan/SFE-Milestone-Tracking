import os
from django.core.management.base import BaseCommand, CommandError
from django.core.files import File
from chatbot.models import KnowledgeDocument
from chatbot.services import ingest_pdf_document, ingest_text_content

class Command(BaseCommand):
    help = 'Ingests and indexes a workflow PDF, Markdown, or Text file into the local database for the chatbot'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, required=True, help='Absolute or relative path to the workflow document')
        parser.add_argument('--title', type=str, default=None, help='Custom title for the document (optional)')

    def handle(self, *args, **options):
        file_path = options['file']
        title = options['title'] or os.path.basename(file_path)

        if not os.path.exists(file_path):
            raise CommandError(f"File not found at path: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext not in ['.pdf', '.md', '.txt']:
            raise CommandError("Unsupported file format. Please provide a .pdf, .md, or .txt file.")

        self.stdout.write(self.style.WARNING(f"Starting ingestion process for: {title}..."))

        # Multiple knowledge documents (with distinct titles) can be active and retrievable
        # at once (retrieval ranks chunks across all of them) - but re-running this command
        # with the SAME title must update that document in place, not create a new row each
        # time (the old unconditional .create() here is exactly how media/chatbot_docs/
        # ended up with 10+ near-duplicate sfe_application_workflow_<random>.md files, all
        # still is_active=True and all still competing in every retrieval).
        try:
            doc, created = KnowledgeDocument.objects.get_or_create(
                title=title, defaults={'is_active': True}
            )
            doc.is_active = True
            if doc.file:
                doc.file.delete(save=False)
            with open(file_path, 'rb') as f:
                django_file = File(f, name=os.path.basename(file_path))
                doc.file.save(os.path.basename(file_path), django_file, save=True)
        except Exception as e:
            raise CommandError(f"Failed to save document record: {str(e)}")

        # Parse, chunk, embed and index
        try:
            if ext == '.pdf':
                chunk_count = ingest_pdf_document(doc.id)
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                chunk_count = ingest_text_content(doc, content)

            self.stdout.write(self.style.SUCCESS(
                f"Successfully ingested and indexed '{title}'!\n"
                f"Created {chunk_count} context chunks in the database."
            ))
        except Exception as e:
            # Only delete the document record if THIS run created it - if it already
            # existed (re-ingesting the same title) and only this ingestion pass failed,
            # deleting it would destroy a previously-working document over a transient error.
            if created:
                doc.delete()
            raise CommandError(f"Ingestion failed: {str(e)}")
