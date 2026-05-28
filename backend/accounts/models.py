from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """Custom user model for SFE."""
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('employee', 'Employee'),
        ('estimator', 'Estimator'),
        ('detailing', 'Detailing / JF'),
        ('readonly', 'Read-Only'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_expiry = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']

    @property
    def is_manager(self):
        return self.role in ('admin', 'manager')

    @property
    def is_estimator(self):
        return self.role in ('admin', 'manager', 'estimator')

    @property
    def is_detailing(self):
        return self.role in ('admin', 'manager', 'detailing')

    @property
    def can_edit(self):
        return self.role != 'readonly'

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
