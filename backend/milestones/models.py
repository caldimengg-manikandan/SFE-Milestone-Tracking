from django.db import models
from projects.models import Project

class Milestone(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='milestones')
    seq_number = models.CharField(max_length=50, blank=True)
    tons = models.FloatField(default=0)
    item_description = models.CharField(max_length=300)
    scheduled_ofa_date = models.DateField(null=True, blank=True)
    actual_ofa_date = models.DateField(null=True, blank=True)
    scheduled_bfa_date = models.DateField(null=True, blank=True)
    actual_bfa_date = models.DateField(null=True, blank=True)
    scheduled_field_measure_date = models.DateField(null=True, blank=True)
    rts_date = models.DateField(null=True, blank=True)
    days = models.CharField(max_length=100, blank=True)
    shop_lead_time_weeks = models.IntegerField(default=0)
    scheduled_start_of_erection = models.DateField(null=True, blank=True)
    shop_hours = models.FloatField(default=0)
    field_hours = models.FloatField(default=0)
    status_location = models.CharField(max_length=100, blank=True)
    material_finish = models.CharField(max_length=100, blank=True)
    detailer_vendor = models.CharField(max_length=100, blank=True)
    dwg_status = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'milestones'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.item_description} - {self.project.job_number}"
