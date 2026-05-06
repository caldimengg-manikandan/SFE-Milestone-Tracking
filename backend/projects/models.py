from django.db import models

class Project(models.Model):
    STATUS_CHOICES = [('Planning', 'Planning'), ('In Progress', 'In Progress'), ('Completed', 'Completed'), ('Delayed', 'Delayed'), ('On Hold', 'On Hold')]

    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=300)
    client = models.CharField(max_length=200)
    manager = models.CharField(max_length=200, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Planning')
    progress = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} — {self.name}"
