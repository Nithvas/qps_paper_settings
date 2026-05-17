from django.db import models
import re
from django.core.exceptions import ValidationError

class Staff(models.Model):

    # Primary Key
    phone = models.CharField(
        max_length=10,
        primary_key=True,
        unique=True,
        help_text="Primary key - must be unique and not empty"
    )

    # Basic Details
    staff_id = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    designation = models.CharField(max_length=100)

    # Academic Details
    program = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    college = models.CharField(max_length=150)

    # Dates
    doj = models.DateField(blank=True, null=True)   # Date of Joining
    dor = models.DateField(blank=True, null=True)   # Date of Retirement

    # Contact Details
    email = models.EmailField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)

    # Bank Details
    bank_account = models.CharField(max_length=50, blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    ifsc_code = models.CharField(max_length=20, blank=True, null=True)

    # Additional Information
    remark = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.ifsc_code:
            if not re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', self.ifsc_code):
                raise ValidationError("Invalid IFSC Code")

    def __str__(self):
        return f"{self.phone} - {self.name}"