from django.db import models  # type: ignore
from django.conf import settings  # type: ignore

class Announcement(models.Model):
    objects = models.Manager()
    title = models.CharField(max_length=300)
    message = models.TextField()
    from_date = models.DateField()
    to_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='announcements'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-created_at']

    def __str__(self):
        return self.title
