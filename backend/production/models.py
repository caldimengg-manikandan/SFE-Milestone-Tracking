from django.db import models  # type: ignore

class ProductionSchedule(models.Model):
    objects = models.Manager()
    schedule_number = models.CharField(max_length=50, unique=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    projects = models.ManyToManyField('projects.Project', related_name='production_schedules', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.schedule_number

class ProductionItem(models.Model):
    objects = models.Manager()
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
    objects = models.Manager()
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
    objects = models.Manager()
    priority = models.ForeignKey(ProductionPriority, on_delete=models.CASCADE, related_name='items')
    job_number = models.CharField(max_length=100, null=True, blank=True)
    sequence_number = models.CharField(max_length=100, null=True, blank=True)
    weight = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rts_date = models.DateField(null=True, blank=True)
    actual_ofa = models.DateField(null=True, blank=True)
    actual_bfa = models.DateField(null=True, blank=True)
    run_days = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    start_run_date = models.DateField(null=True, blank=True)
    complete_run_date = models.DateField(null=True, blank=True)
    is_complete = models.BooleanField(default=False)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.job_number} - {self.sequence_number}"

class Machine(models.Model):
    objects = models.Manager()
    name = models.CharField(max_length=200)
    machine_id = models.CharField(max_length=100, null=True, blank=True)
    make = models.CharField(max_length=200)
    capacity_per_day = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    model_no = models.CharField(max_length=100, null=True, blank=True)
    serial_no = models.CharField(max_length=100, null=True, blank=True)
    shop = models.CharField(max_length=200, null=True, blank=True)
    commissioned_date = models.DateField(null=True, blank=True)
    validity_year = models.CharField(max_length=20, null=True, blank=True)
    other_fields = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Manpower(models.Model):
    objects = models.Manager()
    SKILL_CHOICES = [
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]
    MONTH_CHOICES = [
        ('January', 'January'),
        ('February', 'February'),
        ('March', 'March'),
        ('April', 'April'),
        ('May', 'May'),
        ('June', 'June'),
        ('July', 'July'),
        ('August', 'August'),
        ('September', 'September'),
        ('October', 'October'),
        ('November', 'November'),
        ('December', 'December'),
    ]
    employee_name = models.CharField(max_length=200)
    skill_level = models.CharField(max_length=20, choices=SKILL_CHOICES)
    process = models.CharField(max_length=200)
    productivity_rate_per_day = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rate_per_day = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    manhours = models.DecimalField(max_digits=5, decimal_places=2, default=8.00)
    overtime = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    month = models.CharField(max_length=20, choices=MONTH_CHOICES, default='June')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee_name} ({self.skill_level})"

class Capacity(models.Model):
    objects = models.Manager()
    CATEGORY_CHOICES = [
        ('Machine', 'Machine'),
        ('Manual', 'Manual'),
    ]
    shop = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='Machine')
    machine = models.ForeignKey(Machine, on_delete=models.SET_NULL, null=True, blank=True)
    machine_assigned = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    manpower_assigned = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    process = models.CharField(max_length=200, blank=True, null=True)
    capacity_per_day = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    capacity_per_month = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    capacity_per_year = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    rate_per_day = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def rate_per_month(self):
        # Use stored capacity_per_month if set, else compute from rate_per_day
        if self.capacity_per_month and float(str(self.capacity_per_month)) > 0:
            return float(str(self.capacity_per_month))
        return float(str(self.rate_per_day)) * 30

    @property
    def rate_per_year(self):
        # Use stored capacity_per_year if set, else compute from rate_per_day
        if self.capacity_per_year and float(str(self.capacity_per_year)) > 0:
            return float(str(self.capacity_per_year))
        return float(str(self.rate_per_day)) * 360

    def __str__(self):
        return f"{self.shop} - {self.category} Capacity"
