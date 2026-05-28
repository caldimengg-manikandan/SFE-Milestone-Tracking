"""
Custom User model with role-based access control.
Roles: Manager (MB) | Estimator | Detailing (JF) | ReadOnly
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        MANAGER = 'manager', 'Manager (MB)'
        ESTIMATOR = 'estimator', 'Estimator'
        DETAILING = 'detailing', 'Detailing / JF'
        READ_ONLY = 'readonly', 'Read-Only'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.READ_ONLY,
    )

    @property
    def is_manager(self):
        return self.role == self.Role.MANAGER

    @property
    def is_estimator(self):
        return self.role in (self.Role.MANAGER, self.Role.ESTIMATOR)

    @property
    def is_detailing(self):
        return self.role in (self.Role.MANAGER, self.Role.DETAILING)

    @property
    def can_edit(self):
        return self.role != self.Role.READ_ONLY

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
