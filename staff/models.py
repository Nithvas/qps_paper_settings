from django.db import models
import re
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType

class Staff(models.Model):
    
    # =======================================================================
    # Primary Key (Auto-added by Django)
    # =======================================================================
    # id field as auto-incrementing primary key
    
    # =======================================================================
    # Contact Details
    # =======================================================================
    phone = models.CharField(
        max_length=10,
        unique=True,
        db_index=True
    )

    # =======================================================================
    # Basic Details
    # =======================================================================
    staff_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    designation = models.CharField(max_length=100, blank=True, null=True)

    # =======================================================================
    # Staff Classification
    # =======================================================================
    program_type = models.CharField(max_length=100, blank=True, null=True)
    staff_category = models.CharField(max_length=100, blank=True, null=True)
    dept_category = models.CharField(max_length=100, blank=True, null=True)
    examiner_type = models.CharField(max_length=50, blank=True, null=True)

    branch = models.CharField(max_length=100, blank=True, null=True)
    branch_final = models.CharField(max_length=100, blank=True, null=True)

    # =======================================================================
    # Academic Details
    # =======================================================================
    program = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    college = models.CharField(max_length=150, blank=True, null=True)

    qualification = models.CharField(
        max_length=200,
        blank=True,
        null=True
    )

    # =======================================================================
    # Address Details
    # =======================================================================
    place = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)

    # =======================================================================
    # Service Details
    # =======================================================================
    doj = models.DateField(blank=True, null=True)
    dor = models.DateField(blank=True, null=True)

    # =======================================================================
    # Contact Details
    # =======================================================================
    email = models.EmailField(blank=True, null=True)

    # =======================================================================
    # Bank Details
    # =======================================================================
    bank_account = models.CharField(max_length=50, blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    bank_city = models.CharField(max_length=100, blank=True, null=True)
    branch_code = models.CharField(max_length=50, blank=True, null=True)
    ifsc_code = models.CharField(max_length=20, blank=True, null=True)

    # =======================================================================
    # Additional Information
    # =======================================================================
    remark = models.TextField(blank=True, null=True)

    # =======================================================================
    # Audit Fields
    # =======================================================================
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "staff_master"
        verbose_name = "Staff Master"
        verbose_name_plural = "Staff Master"
        ordering = ['-id']  

    def save(self, *args, **kwargs):

        from core.models import FieldReference
        
        fields_to_reference = [
            'designation', 'program_type', 'staff_category', 'dept_category',
            'examiner_type', 'branch', 'branch_final', 'program', 'department',
            'college', 'qualification', 'city', 'district', 'bank_name', 'bank_city'
        ]
        
        for field in fields_to_reference:
            value = getattr(self, field, None)
            if value and value.strip():
                FieldReference.add_option(Staff, field, value.strip())
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.staff_id} - {self.name}"