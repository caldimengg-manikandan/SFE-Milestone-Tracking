from django.db import models

class Project(models.Model):
    STATUS_CHOICES = [
        ('Planning', 'Planning'),
        ('In Progress', 'In Progress'),
        ('Yet to Complete', 'Yet to Complete'),
        ('Completed', 'Completed')
    ]
    PRIORITY_CHOICES = [('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High')]

    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=300)
    customer_name = models.CharField(max_length=300, blank=True, null=True)
    project_manager_name = models.CharField(max_length=200, blank=True, null=True)
    detailer_name = models.CharField(max_length=200, blank=True, null=True)
    total_ton = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_manhours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    manhour_ton = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    steel_budget_worksheet = models.JSONField(default=dict, blank=True, null=True)
    erection_date = models.DateField(null=True, blank=True)
    shop_name = models.CharField(max_length=100, blank=True, null=True)
    schedule_field_measure_required = models.CharField(max_length=10, default='Yes')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Yet to Complete')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
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
    category = models.CharField(max_length=100, blank=True)

    scheduled_ofa_date = models.DateField(null=True, blank=True)
    actual_ofa_date = models.DateField(null=True, blank=True)
    scheduled_bfa_date = models.DateField(null=True, blank=True)
    actual_bfa_date = models.DateField(null=True, blank=True)
    scheduled_field_measure_date = models.DateField(null=True, blank=True)
    rts_date = models.DateField(null=True, blank=True)
    ship_date = models.DateField(null=True, blank=True)
    shop_lead_time_weeks = models.IntegerField(default=0)
    scheduled_erection_date = models.DateField(null=True, blank=True)
    budget_shop_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    budget_field_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual_shop_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual_field_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    detailer_vendor = models.CharField(max_length=200, blank=True)
    dwg_status = models.CharField(max_length=100, blank=True)
    tracking_status = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True)
    fabrication_details = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'structural_schedule_items'
        ordering = ['seq_no']

    def __str__(self):
        return f"{self.project.code} - {self.seq_no}"


class Customer(models.Model):
    name = models.CharField(max_length=300)
    code = models.CharField(max_length=100, blank=True)
    category = models.CharField(max_length=100, default='Domestic')
    country = models.CharField(max_length=100, default='India')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customers'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

class CustomerContact(models.Model):
    customer = models.ForeignKey(Customer, related_name='contacts', on_delete=models.CASCADE)
    person = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'customer_contacts'

    def __str__(self):
        return self.person

class Detailer(models.Model):
    name = models.CharField(max_length=300)
    code = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'detailers'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

class DetailerContact(models.Model):
    detailer = models.ForeignKey(Detailer, related_name='contacts', on_delete=models.CASCADE)
    person = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'detailer_contacts'

    def __str__(self):
        return self.person
