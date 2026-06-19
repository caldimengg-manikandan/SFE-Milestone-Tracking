from django.db import models
from django.conf import settings

class KnowledgeDocument(models.Model):
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='chatbot_docs/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title

class KnowledgeChunk(models.Model):
    document = models.ForeignKey(KnowledgeDocument, related_name='chunks', on_delete=models.CASCADE)
    text = models.TextField()
    page_number = models.IntegerField(help_text="The 1-based page number in the original PDF")
    chunk_index = models.IntegerField()

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
