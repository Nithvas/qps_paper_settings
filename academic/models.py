from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator


class AcademicYear(models.Model):
    
    """
    Academic Year and Semester Management
    Manages academic years, semesters, and their active status
    """
    
    # =======================================================================
    # Semester Types
    # =======================================================================
    SEMESTER_TYPES = [
        ('ODD', 'Odd Semester'),
        ('EVEN', 'Even Semester'),
    ]
    
    # =======================================================================
    # Academic Year Information
    # =======================================================================
    academic_year = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Academic year (e.g., 2025-2026)"
    )
    
    # =======================================================================
    # Semester Information
    # =======================================================================
    semester = models.CharField(
        max_length=20,
        help_text="Academic semester (e.g., Nov26)"
    )
    semester_type = models.CharField(
        max_length=10,
        choices=SEMESTER_TYPES,
        db_index=True,
        help_text="Semester type (Odd or Even)"
    )
    
    # =======================================================================
    # Status
    # =======================================================================
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this academic year is currently active"
    )
    
    # =======================================================================
    # Audit Fields
    # =======================================================================
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "academic_year"
        verbose_name = "Academic Year"
        verbose_name_plural = "Academic Years"
        ordering = ['-academic_year', '-semester']
        indexes = [
            models.Index(fields=['academic_year', 'is_active']),
            models.Index(fields=['semester_type', 'semester']),
            models.Index(fields=['is_active']),
        ]
        # Ensure unique combination of academic_year and semester
        unique_together = ['academic_year', 'semester']

    def clean(self):
        """Validate academic year data"""
        # Validate semester type
        if self.semester_type not in ['ODD', 'EVEN']:
            raise ValidationError({
                'semester_type': f"Semester type must be 'ODD' or 'EVEN', got '{self.semester_type}'"
            })

    def save(self, *args, **kwargs):
        """Save academic year and update field references"""
        from core.models import FieldReference
        
        # Validate before saving
        self.clean()
        
        # Add fields to field references for dropdowns
        fields_to_reference = ['semester_type']
        
        for field in fields_to_reference:
            value = getattr(self, field, None)
            if value and str(value).strip():
                FieldReference.add_option(AcademicYear, field, str(value).strip())
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.academic_year} - {self.get_semester_type_display()} ({self.semester})"

    @property
    def semester_type_display(self):
        """Get display name for semester type"""
        return dict(self.SEMESTER_TYPES).get(self.semester_type, self.semester_type)

    @property
    def is_current(self):
        """Check if this academic year is currently active"""
        return self.is_active

    @property
    def year_range(self):
        """Get the year range display"""
        return f"{self.academic_year}"

    @classmethod
    def get_active_academic_year(cls):
        """Get the currently active academic year"""
        return cls.objects.filter(is_active=True).first()

    @classmethod
    def get_active_years(cls):
        """Get all active academic years"""
        return cls.objects.filter(is_active=True)

    @classmethod
    def get_by_semester_type(cls, semester_type):
        """Get academic years by semester type"""
        return cls.objects.filter(
            semester_type=semester_type,
            is_active=True
        )

    @classmethod
    def get_odd_semesters(cls):
        """Get all odd semesters"""
        return cls.objects.filter(
            semester_type='ODD',
            is_active=True
        )

    @classmethod
    def get_even_semesters(cls):
        """Get all even semesters"""
        return cls.objects.filter(
            semester_type='EVEN',
            is_active=True
        )