from django.db import models
from course.models import Course  

class Syllabus(models.Model):
    
    """
    Stores syllabus information for each course.
    Uses the default 'id' as primary key.
    Foreign key references Course.id (the default primary key).
    """
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,         
        related_name='syllabi',
        help_text="Course to which this syllabus belongs"
    )
    syllabus_file = models.FileField(
        upload_to='syllabi/',
        blank=True,
        null=True,
        help_text="Upload the syllabus PDF or document"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "syllabus_master"
        verbose_name = "Syllabus"
        verbose_name_plural = "Syllabi"
        ordering = ['-created_at']

    def __str__(self):
        return f"Syllabus for {self.course.course_code}"