from django.db import models
import re
from django.core.exceptions import ValidationError


class Course(models.Model):
    slno = models.IntegerField(null=True, blank=True)
    program = models.CharField(max_length=100)
    course_id = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    semester = models.CharField(max_length=50)
    course_code = models.CharField(max_length=100)
    course_title = models.CharField(max_length=200, default="")
    external_mark = models.CharField(max_length=50)
    examiner_int_ext = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.course_id} - {self.course_code}"