from django.db import models

class Project(models.Model):
    STATUS_CHOICES = [('Planning', 'Planning'), ('In Progress', 'In Progress'), ('Completed', 'Completed'), ('Delayed', 'Delayed'), ('On Hold', 'On Hold')]

    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=300)
    customer_name = models.CharField(max_length=300, blank=True, null=True)
    client = models.CharField(max_length=200)
    manager = models.CharField(max_length=200, blank=True)
    project_manager_name = models.CharField(max_length=200, blank=True, null=True)
    detailer_name = models.CharField(max_length=200, blank=True, null=True)
    total_ton = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_manhours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    manhour_ton = models.DecimalField(max_digits=12, decimal_places=2, default=0)
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

class StructuralScheduleItem(models.Model):
    project = models.ForeignKey(Project, related_name='structural_schedules', on_delete=models.CASCADE)
    seq_no = models.CharField(max_length=50)
    tons = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    item_description = models.CharField(max_length=500)
    scheduled_ofa_date = models.DateField(null=True, blank=True)
    actual_ofa_date = models.DateField(null=True, blank=True)
    scheduled_bfa_date = models.DateField(null=True, blank=True)
    actual_bfa_date = models.DateField(null=True, blank=True)
    scheduled_field_measure_date = models.DateField(null=True, blank=True)
    rts_date = models.DateField(null=True, blank=True)
    num_days = models.IntegerField(default=0)
    shop_lead_time_weeks = models.IntegerField(default=0)
    scheduled_erection_date = models.DateField(null=True, blank=True)
    shop_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    field_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=200, blank=True)
    material_finish = models.CharField(max_length=200, blank=True)
    detailer_vendor = models.CharField(max_length=200, blank=True)
    dwg_status = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'structural_schedule_items'
        ordering = ['seq_no']

    def __str__(self):
        return f"{self.project.code} - {self.seq_no}"
