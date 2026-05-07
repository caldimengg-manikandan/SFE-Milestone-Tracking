from django.db import models

class Project(models.Model):
    STATUS_CHOICES = [
        ('Planning', 'Planning'), 
        ('In Progress', 'In Progress'), 
        ('Completed', 'Completed'), 
        ('Delayed', 'Delayed'), 
        ('On Hold', 'On Hold')
    ]

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=300)
    customer_name = models.CharField(max_length=200)
    detailer_name = models.CharField(max_length=200, blank=True)
    project_manager_name = models.CharField(max_length=200, blank=True)
    total_ton = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_manhours = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    manhour_ton = models.DecimalField(max_digits=10, decimal_places=2, default=0, editable=False)
    erection_date = models.DateField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Planning')
    progress = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        ton = self.total_ton or 0
        hours = self.total_manhours or 0
        if ton > 0:
            self.manhour_ton = hours / ton
        else:
            self.manhour_ton = 0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} — {self.name}"

class StructuralSchedule(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='schedules')
    seq_no = models.CharField(max_length=50, blank=True)
    tons = models.DecimalField(max_digits=10, decimal_places=2)
    item_description = models.TextField()
    
    scheduled_ofa_date = models.DateField(null=True, blank=True)
    actual_ofa_date = models.DateField(null=True, blank=True)
    scheduled_bfa_date = models.DateField(null=True, blank=True)
    actual_bfa_date = models.DateField(null=True, blank=True)
    scheduled_field_measure_date = models.DateField(null=True, blank=True)
    rts_date = models.DateField(null=True, blank=True)
    
    num_days = models.IntegerField(default=0) # Column 1
    shop_lead_time_weeks = models.IntegerField(default=0)
    scheduled_erection_date = models.DateField(null=True, blank=True)
    
    shop_hours = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    field_hours = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=200, blank=True)
    material_finish = models.CharField(max_length=200, blank=True)
    detailer_vendor = models.CharField(max_length=200, blank=True)
    dwg_status = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'structural_schedules'
