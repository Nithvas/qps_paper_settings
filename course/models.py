from django.db import models
import re
from django.core.exceptions import ValidationError


class Course(models.Model):

    # Primary Key
    course_code = models.CharField(
        max_length=100,
        primary_key=True,
        unique=True,
        help_text="Primary key - must be unique and not empty"
    )

    # Basic Details
    course_title = models.CharField(max_length=200, default="")
    semester = models.CharField(max_length=50)
    course_id = models.CharField(max_length=100)
    program = models.CharField(max_length=100)

    # Marks & Examiner Details
    external_mark = models.CharField(max_length=50)
    examiner = models.CharField(max_length=100)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.course_code} - {self.course_title}"