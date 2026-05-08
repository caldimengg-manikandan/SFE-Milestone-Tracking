from django.db import models

class ProductionSchedule(models.Model):
    schedule_number = models.CharField(max_length=50, unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.schedule_number

class ProductionItem(models.Model):
    schedule = models.ForeignKey(ProductionSchedule, related_name='items', on_delete=models.CASCADE)
    job_number = models.CharField(max_length=100)
    sequence_number = models.CharField(max_length=100)
    weight = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.IntegerField()
    rts_date = models.DateField(null=True, blank=True)
    ship_date = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.job_number} - {self.sequence_number}"

class ProductionPriority(models.Model):
    MODULE_CHOICES = [
        ('PLATE', 'Plate'),
        ('ANGLE', 'Angle'),
        ('STRUCTURAL', 'Structural'),
    ]
    schedule = models.ForeignKey(ProductionSchedule, on_delete=models.CASCADE, related_name='priorities')
    module_type = models.CharField(max_length=20, choices=MODULE_CHOICES, default='PLATE')
    process_type = models.CharField(max_length=100) 
    rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Production Priorities"

    def __str__(self):
        return f"{self.module_type} - {self.process_type}"

class ProductionPriorityItem(models.Model):
    priority = models.ForeignKey(ProductionPriority, on_delete=models.CASCADE, related_name='items')
    job_number = models.CharField(max_length=100, null=True, blank=True)
    sequence_number = models.CharField(max_length=100, null=True, blank=True)
    weight = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rts_date = models.DateField(null=True, blank=True)
    run_days = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    start_run_date = models.DateField(null=True, blank=True)
    complete_run_date = models.DateField(null=True, blank=True)
    is_complete = models.BooleanField(default=False)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.job_number} - {self.sequence_number}"
