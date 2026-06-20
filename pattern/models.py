from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


class QuestionPattern(models.Model):

    """Question Paper Pattern Master"""

    # =======================================================================
    # Pattern Identification
    # =======================================================================
    pattern_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Unique pattern code (e.g., PAT-001)"
    )
    pattern_name = models.CharField(
        max_length=100,
        help_text="Pattern name (e.g., UG Standard Pattern)"
    )

    # =======================================================================
    # Marks Configuration
    # =======================================================================
    total_marks = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Total marks for the question paper"
    )
    duration_minutes = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Exam duration in minutes"
    )

    # =======================================================================
    # Pattern Status
    # =======================================================================
    is_active = models.BooleanField(default=True, db_index=True)

    # =======================================================================
    # Audit Fields
    # =======================================================================
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "question_pattern"
        verbose_name = "Question Pattern"
        verbose_name_plural = "Question Patterns"
        ordering = ['-id']
        indexes = [
            models.Index(fields=['pattern_code']),
            models.Index(fields=['is_active']),
        ]

    def save(self, *args, **kwargs):
        """Save pattern and update field references"""
        from core.models import FieldReference

        # Add pattern_code to field references for dropdowns
        fields_to_reference = ['pattern_code']

        for field in fields_to_reference:
            value = getattr(self, field, None)
            if value and str(value).strip():
                FieldReference.add_option(QuestionPattern, field, str(value).strip())

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.pattern_code} - {self.pattern_name} ({self.total_marks} marks)"

    @property
    def total_sections(self):
        """Get total number of active sections"""
        return self.sections.filter(is_active=True).count()

    @property
    def total_questions_available(self):
        """Get total questions available across all sections"""
        return sum(
            section.no_of_questions
            for section in self.sections.filter(is_active=True)
        )

    @property
    def total_questions_to_answer(self):
        """Get total questions to answer across all sections"""
        return sum(
            section.questions_to_answer
            for section in self.sections.filter(is_active=True)
        )


class QuestionPatternSection(models.Model):
    
    """Pattern Section Definition – defines the structure of each section in a pattern"""

    # =======================================================================
    # Question Types
    # =======================================================================
    QUESTION_TYPES = [
        ('MCQ', 'Multiple Choice Questions'),
        ('TRUE_FALSE', 'True/False'),
        ('FITB', 'Fill in the Blanks'),
        ('MATCHING', 'Matching'),
        ('SHORT_ANSWER', 'Short Answer'),
        ('LONG_ANSWER', 'Long Answer'),
        ('NUMERICAL', 'Numerical Problem'),
        ('CASE_STUDY', 'Case Study'),
        ('ASSERTION', 'Assertion & Reasoning'),
        ('DIAGRAM', 'Diagram Based'),
        ('CODE', 'Code Writing'),
        ('PROGRAM', 'Programming Problem'),
    ]

    # =======================================================================
    # Section Identification
    # =======================================================================
    pattern = models.ForeignKey(
        QuestionPattern,
        on_delete=models.CASCADE,
        related_name='sections',
        help_text="Pattern this section belongs to"
    )
    section_name = models.CharField(
        max_length=50,
        help_text="Section name (e.g., Section A, Part I)"
    )

    # =======================================================================
    # Question Configuration
    # =======================================================================
    question_type = models.CharField(
        max_length=30,
        choices=QUESTION_TYPES,
        db_index=True,
        help_text="Type of questions in this section"
    )

    # =======================================================================
    # Question Counts
    # =======================================================================
    no_of_questions = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Total number of questions available"
    )
    questions_to_answer = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of questions student must answer"
    )

    # =======================================================================
    # Choice Configuration
    # =======================================================================
    internal_choice = models.BooleanField(
        default=False,
        help_text="Whether internal choices are available in this section"
    )

    # =======================================================================
    # Marks Configuration
    # =======================================================================
    marks_per_question = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Marks for each question"
    )

    # =======================================================================
    # Section Status
    # =======================================================================
    is_active = models.BooleanField(default=True, db_index=True)

    # =======================================================================
    # Audit Fields
    # =======================================================================
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "question_pattern_section"
        verbose_name = "Question Pattern Section"
        verbose_name_plural = "Question Pattern Sections"
        ordering = ['id']
        indexes = [
            models.Index(fields=['pattern', 'question_type']),
            models.Index(fields=['question_type']),
            models.Index(fields=['is_active']),
        ]

    def save(self, *args, **kwargs):
        """Save section and update field references"""
        from core.models import FieldReference

        # Validate before saving
        self.clean()

        # Add question_type to field references
        fields_to_reference = ['question_type']

        for field in fields_to_reference:
            value = getattr(self, field, None)
            if value and str(value).strip():
                FieldReference.add_option(QuestionPatternSection, field, str(value).strip())

        super().save(*args, **kwargs)

    def clean(self):
        """Validate section data"""
        if self.questions_to_answer > self.no_of_questions:
            raise ValidationError({
                'questions_to_answer': f"Questions to answer ({self.questions_to_answer}) cannot exceed total questions ({self.no_of_questions})"
            })

        if self.no_of_questions <= 0:
            raise ValidationError({
                'no_of_questions': "Number of questions must be greater than 0"
            })

        if self.questions_to_answer <= 0:
            raise ValidationError({
                'questions_to_answer': "Questions to answer must be greater than 0"
            })

        if self.marks_per_question <= 0:
            raise ValidationError({
                'marks_per_question': "Marks per question must be greater than 0"
            })

    def __str__(self):
        return f"{self.pattern.pattern_code} - {self.section_name} ({self.get_question_type_display()})"

    @property
    def total_section_marks(self):
        """Calculate total marks for this section"""
        return self.questions_to_answer * self.marks_per_question

    @property
    def question_type_display(self):
        """Get display name for question type"""
        return dict(self.QUESTION_TYPES).get(self.question_type, self.question_type)

    @property
    def question_count_display(self):
        """Get display string for question counts"""
        return f"{self.no_of_questions} questions (Answer {self.questions_to_answer})"

    @property
    def has_internal_choice(self):
        """Check if section has internal choices"""
        return "Yes" if self.internal_choice else "No"