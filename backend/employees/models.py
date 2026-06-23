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

# Django signals for synchronization with User Access Management

from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

@receiver(pre_save, sender=Employee)
def capture_old_email(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = Employee.objects.get(pk=instance.pk)
            instance._old_email = old_instance.email
        except Employee.DoesNotExist:
            instance._old_email = None
    else:
        instance._old_email = None

@receiver(post_save, sender=Employee)
def create_or_update_user_access(sender, instance, created, **kwargs):
    User = get_user_model()
    email = instance.email
    
    # Split name into first and last name
    parts = (instance.name or '').split(' ', 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ''
    
    # Derive initials
    initials = ''.join([p[0] for p in parts if p]).upper()[:5]
    
    old_email = getattr(instance, '_old_email', None)
    
    if created:
        # Create user if not exists
        if not User.objects.filter(email__iexact=email).exists():
            User.objects.create_user(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role='employee',
                phone=instance.phone or '',
                department=instance.department or '',
                initials=initials,
                is_active=(instance.status == 'Active')
            )
    else:
        # Update user (searching by old email if it was updated, otherwise current email)
        search_email = old_email if old_email else email
        try:
            user = User.objects.get(email__iexact=search_email)
            user.email = email
            user.username = email
            user.first_name = first_name
            user.last_name = last_name
            user.phone = instance.phone or ''
            user.department = instance.department or ''
            user.initials = initials
            user.is_active = (instance.status == 'Active')
            user.save()
        except User.DoesNotExist:
            if not User.objects.filter(email__iexact=email).exists():
                User.objects.create_user(
                    username=email,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role='employee',
                    phone=instance.phone or '',
                    department=instance.department or '',
                    initials=initials,
                    is_active=(instance.status == 'Active')
                )

@receiver(post_delete, sender=Employee)
def delete_user_access(sender, instance, **kwargs):
    User = get_user_model()
    try:
        user = User.objects.get(email__iexact=instance.email)
        user.delete()
    except User.DoesNotExist:
        pass

