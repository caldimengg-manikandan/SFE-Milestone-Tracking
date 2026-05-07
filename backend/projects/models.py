from django.db import models

class Project(models.Model):
    STATUS_CHOICES = [('Planning', 'Planning'), ('In Progress', 'In Progress'), ('Completed', 'Completed'), ('Delayed', 'Delayed'), ('On Hold', 'On Hold')]

    job_number = models.CharField(max_length=50, unique=True)
    customer = models.CharField(max_length=200)
    detailer = models.CharField(max_length=200, blank=True)
    tons = models.FloatField(default=0)
    start_up_meeting_date = models.DateField(null=True, blank=True)
    mhs = models.FloatField(default=0)
    pm = models.CharField(max_length=200, blank=True)
    mhs_per_ton = models.FloatField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Planning')
    progress = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.job_number} - {self.customer}"
