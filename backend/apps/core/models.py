"""
Core models: CustomUser (with role) and Contact.
"""
from django.db import models
from accounts.models import User



class Contact(models.Model):
    """
    Reusable stakeholder contact.
    Referenced from Project as Customer, Architect, or Engineer.
    """

    class ContactType(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        ARCHITECT = "architect", "Architect"
        ENGINEER = "engineer", "Engineer"
        OTHER = "other", "Other"

    name = models.CharField(max_length=200)
    company = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    contact_type = models.CharField(
        max_length=20,
        choices=ContactType.choices,
        default=ContactType.OTHER,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.company or self.contact_type})"
