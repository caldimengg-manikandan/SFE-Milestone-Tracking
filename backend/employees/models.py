from django.db import models

class Employee(models.Model):
    objects = models.Manager()
    STATUS_CHOICES = [('Active', 'Active'), ('On Leave', 'On Leave'), ('Inactive', 'Inactive')]

    emp_id = models.CharField(max_length=20, unique=True)
    personnel_number = models.CharField(max_length=50, blank=True, null=True)
    name = models.CharField(max_length=200)
    department = models.CharField(max_length=100)
    designation = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    ssn = models.CharField(max_length=50, blank=True, null=True)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    marital_status = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    join_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'employees'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.emp_id} — {self.name}"
