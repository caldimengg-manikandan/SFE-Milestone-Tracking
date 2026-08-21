from django.core.management.base import BaseCommand

from chatbot.models import KnowledgeChunk


class Command(BaseCommand):
    help = "Computes and stores embeddings for any KnowledgeChunk rows that predate the embedding field."

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size', type=int, default=64,
            help='How many chunks to embed per batch (default 64).'
        )

    def handle(self, *args, **options):
        from chatbot.embeddings import embed_texts

        batch_size = options['batch_size']
        pending = list(KnowledgeChunk.objects.filter(embedding__isnull=True))
        if not pending:
            self.stdout.write(self.style.SUCCESS("No chunks are missing embeddings."))
            return

        self.stdout.write(f"Embedding {len(pending)} chunk(s)...")
        updated = 0
        for start in range(0, len(pending), batch_size):
            batch = pending[start:start + batch_size]
            vectors = embed_texts([chunk.text for chunk in batch])
            for chunk, vector in zip(batch, vectors):
                chunk.embedding = vector
            KnowledgeChunk.objects.bulk_update(batch, ['embedding'])
            updated += len(batch)
            self.stdout.write(f"  {updated}/{len(pending)}")

        self.stdout.write(self.style.SUCCESS(f"Backfilled embeddings for {updated} chunk(s)."))
