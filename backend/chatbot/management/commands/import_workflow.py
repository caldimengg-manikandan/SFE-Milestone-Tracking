import os
import pypdf
from django.core.management.base import BaseCommand, CommandError
from django.core.files import File
from chatbot.models import KnowledgeDocument, KnowledgeChunk
from chatbot.services import ingest_pdf_document

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

        # 1. Deactivate previous active documents to keep search context clean
        KnowledgeDocument.objects.all().update(is_active=False)

        # 2. Save document record to the database
        try:
            with open(file_path, 'rb') as f:
                django_file = File(f, name=os.path.basename(file_path))
                doc = KnowledgeDocument.objects.create(
                    title=title,
                    file=django_file,
                    is_active=True
                )
        except Exception as e:
            raise CommandError(f"Failed to save document record: {str(e)}")

        # 3. Parse and Index the text chunks
        try:
            if ext == '.pdf':
                chunk_count = ingest_pdf_document(doc.id)
            else:
                chunk_count = self.ingest_text_document(doc, file_path)

            self.stdout.write(self.style.SUCCESS(
                f"Successfully ingested and indexed '{title}'!\n"
                f"Created {chunk_count} context chunks in the database."
            ))
        except Exception as e:
            # Clean up document record if ingestion fails
            doc.delete()
            raise CommandError(f"Ingestion failed: {str(e)}")

    def ingest_text_document(self, doc, file_path):
        """
        Parses Markdown or Text files. Splits content by markdown headers ('## ' or '### ')
        to preserve context of entire screens and subheaders together in a single chunk.
        """
        import re
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Split by sections starting with '## ' or '### ' at the beginning of a line
        sections = re.split(r'\n(?=## |### )', content)
        chunks_to_create = []
        chunk_index = 0

        for sec_idx, section in enumerate(sections):
            chunk_content = section.strip()
            if len(chunk_content) > 30:
                chunks_to_create.append(KnowledgeChunk(
                    document=doc,
                    text=chunk_content,
                    page_number=sec_idx + 1,
                    chunk_index=chunk_index
                ))
                chunk_index += 1

        KnowledgeChunk.objects.bulk_create(chunks_to_create)
        return len(chunks_to_create)
