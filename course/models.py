from django.db import models
import re
from django.core.exceptions import ValidationError

class Course(models.Model):

    # =========================
    # Program Information
    # =========================
    program_type = models.CharField(max_length=100)
    degree = models.CharField(max_length=100)

    # =========================
    # Department Information
    # =========================
    branch = models.CharField(max_length=100)
    branch_final = models.CharField(max_length=100)

    # =========================
    # Course Information
    # =========================
    course_code = models.CharField(
        max_length=100,
        primary_key=True,
        unique=True
    )
    course_id = models.CharField(max_length=100)
    course_category = models.CharField(max_length=100)
    course_title = models.CharField(max_length=200)

    # =========================
    # Academic Information
    # =========================
    semester = models.CharField(max_length=50)
    part = models.CharField(max_length=50)
    hours = models.PositiveIntegerField()
    credit = models.DecimalField(max_digits=4, decimal_places=1)

    # =========================
    # Marks Information
    # =========================
    internal_mark = models.PositiveIntegerField()
    external_mark = models.PositiveIntegerField()
    total_mark = models.PositiveIntegerField()

    # =========================
    # Examiner Information
    # =========================
    examiner_type = models.CharField(max_length=50)
    examiner = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    # =========================
    # Additional Information
    # =========================
    remark = models.TextField(
        blank=True,
        null=True
    )

    # =========================
    # Audit Fields
    # =========================
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "course_master"
        verbose_name = "Course Master"
        verbose_name_plural = "Course Master"

    def __str__(self):
        return f"{self.course_code} - {self.course_title}"        