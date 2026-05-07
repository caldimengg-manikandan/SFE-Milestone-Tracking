from django.db import models

class Customer(models.Model):
    CATEGORY_CHOICES = [
        ('Domestic', 'Domestic'),
        ('Overseas', 'Overseas'),
    ]

    customerName = models.CharField(max_length=100)
    customerCode = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='Domestic')
    customerEmail = models.JSONField(default=list, blank=True)
    invoiceEmail = models.JSONField(default=list, blank=True)
    billingAddress = models.TextField()
    gstin = models.CharField(max_length=15, blank=True, null=True)
    paymentNormsDays = models.IntegerField(blank=True, null=True)
    phoneNumber = models.CharField(max_length=20, blank=True, null=True)
    
    # Overseas fields
    country = models.CharField(max_length=100, blank=True, null=True)
    einNumber = models.CharField(max_length=50, blank=True, null=True)
    bankAccNo = models.CharField(max_length=50, blank=True, null=True)
    w9Form = models.FileField(upload_to='w9_forms/', blank=True, null=True)
    
    contactPersons = models.JSONField(default=list, blank=True)
    
    isActive = models.BooleanField(default=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.customerName} ({self.customerCode})"

    class Meta:
        ordering = ['-createdAt']
