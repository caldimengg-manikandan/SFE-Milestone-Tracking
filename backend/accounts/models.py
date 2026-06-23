from django.contrib.auth.models import AbstractUser
from django.db import models

def get_default_modules():
    return [
        '/dashboard', '/rfq', '/bids/schedule', '/bids/holidays', '/estimation-summary',
        '/estimation-erection', 'employees', 'customers', 'detailers', 'steel-budget/input',
        'steel-budget/result', 'projects', '/structural/plan-creation', '/structural/plan-tracking',
        '/production/priority-schedule', '/production/process-master', '/production/capacity-mapping/capacity',
        '/production/capacity-mapping/machine', '/production/capacity-mapping/manpower', 'settings', 'announcements'
    ]

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
    initials = models.CharField(max_length=10, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_expiry = models.DateTimeField(blank=True, null=True)
    failed_login_attempts = models.IntegerField(default=0, null=True, blank=True)

    # Soft-lock: set when someone is actively editing a project
    editing_project_id = models.IntegerField(null=True, blank=True)
    editing_since = models.DateTimeField(null=True, blank=True)

    allowed_modules = models.JSONField(default=get_default_modules, blank=True)

    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']

    @property
    def is_admin(self):
        return self.role == 'admin' or self.is_superuser

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

    @property
    def can_annotate(self):
        return self.role in ('admin', 'manager', 'estimator')

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

