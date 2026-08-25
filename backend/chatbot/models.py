from django.db import models
from django.conf import settings

class KnowledgeDocument(models.Model):
    SOURCE_CHOICES = (
        ('manual', 'Manual'),
        ('generated', 'Generated'),
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='chatbot_docs/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    source = models.CharField(
        max_length=20, choices=SOURCE_CHOICES, default='manual',
        help_text="'generated' documents are produced by generate_app_knowledge from live code introspection."
    )
    content_hash = models.CharField(
        max_length=64, blank=True, default='',
        help_text="sha256 of the last-ingested text, used by generate_app_knowledge to skip re-embedding when nothing changed."
    )

    def __str__(self):
        return self.title

class KnowledgeChunk(models.Model):
    document = models.ForeignKey(KnowledgeDocument, related_name='chunks', on_delete=models.CASCADE)
    text = models.TextField()
    page_number = models.IntegerField(help_text="The 1-based page number in the original PDF")
    chunk_index = models.IntegerField()
    embedding = models.JSONField(
        null=True, blank=True,
        help_text="Dense embedding vector (list of floats) for semantic retrieval. NULL until "
                   "computed by the ingestion pipeline or a backfill pass."
    )

    class Meta:
        ordering = ['document', 'chunk_index']

    def __str__(self):
        return f"Chunk {self.chunk_index} of {self.document.title} (Page {self.page_number})"

class ChatSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_sessions'
    )
    title = models.CharField(max_length=255, default="New Chat")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Session {self.id} - {self.title} ({self.user.username})"

class ChatMessage(models.Model):
    SENDER_CHOICES = (
        ('user', 'User'),
        ('bot', 'Bot'),
    )
    session = models.ForeignKey(ChatSession, related_name='messages', on_delete=models.CASCADE)
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    text = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(null=True, blank=True, help_text="Metadata, e.g., source pages and search citations")

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender.capitalize()}: {self.text[:30]}..."


class AgentConfig(models.Model):
    """Singleton row (pk=1) holding admin-editable agent behavior settings."""
    persona_instructions = models.TextField(
        blank=True, default='',
        help_text="Additive persona/tone/instructions. Prepended to (never replaces) the mandatory operating rules."
    )
    enabled_tools = models.JSONField(
        null=True, blank=True, default=None,
        help_text="List of enabled tool names. NULL means all tools are enabled."
    )
    model_override = models.CharField(
        max_length=100, blank=True, default='',
        help_text="Overrides OLLAMA_MODEL env setting when non-empty."
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Agent Configuration"
