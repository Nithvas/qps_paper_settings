from django.db import models
import re
from django.core.exceptions import ValidationError


class Staff(models.Model):
    slno = models.IntegerField(null=True, blank=True)
    program = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    staff_id = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    designation = models.CharField(max_length=100)
    college = models.CharField(max_length=150)

    city = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)

    doj = models.DateField(blank=True, null=True)
    dor = models.DateField(blank=True, null=True)

    phone = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    bank_account = models.CharField(max_length=50, blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)

    # ✅ IFSC CODE
    ifsc_code = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    remark = models.TextField(
        blank=True,
        null=True
    )

    def clean(self):
        if self.ifsc_code:
            if not re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', self.ifsc_code):
                raise ValidationError("Invalid IFSC Code")

    def __str__(self):
        return f"{self.staff_id} - {self.name}"