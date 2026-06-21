from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from django.utils import timezone
from academic.models import AcademicYear
from course.models import Course
from staff.models import Staff


class QPSAllocation(models.Model):
    """
    QPS (Question Paper Setting) Allocation Table
    Tracks the assignment of question paper setters and checkers for courses
    """
    
    # =======================================================================
    # Status Choices
    # =======================================================================
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ASSIGNED', 'Assigned'),
        ('IN_PROGRESS', 'In Progress'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('COMPLETED', 'Completed'),
    ]
    
    # =======================================================================
    # Core Fields
    # =======================================================================
    academic_sem = models.ForeignKey(
        AcademicYear,
        on_delete=models.PROTECT,
        related_name='qps_allocations',
        help_text="Academic year and semester"
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name='qps_allocations',
        help_text="Course for which QPS is being set"
    )
    
    # =======================================================================
    # QP Setter (Staff)
    # =======================================================================
    qp_setter = models.ForeignKey(
        Staff,
        on_delete=models.PROTECT,
        related_name='qps_setter_allocations',
        help_text="Staff member assigned as Question Paper Setter",
        null=True,
        blank=True
    )
    
    # =======================================================================
    # Checker (User)
    # =======================================================================
    checker = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='qps_checker_allocations',
        help_text="User assigned as Checker",
        null=True,
        blank=True
    )
    
    # =======================================================================
    # Status
    # =======================================================================
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        db_index=True,
        help_text="Current status of the QPS allocation"
    )
    
    # =======================================================================
    # Date Fields
    # =======================================================================
    mail_send_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when notification email was sent to QP setter"
    )
    assigned_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when QPS was officially assigned"
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        help_text="Deadline for QPS submission"
    )
    submitted_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when QPS was submitted by setter"
    )
    approved_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when QPS was approved by checker"
    )
    
    # =======================================================================
    # Additional Information
    # =======================================================================
    remarks = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes or remarks"
    )
    
    # =======================================================================
    # Audit Fields
    # =======================================================================
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "qps_allocation"
        verbose_name = "QPS Allocation"
        verbose_name_plural = "QPS Allocations"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['academic_sem', 'course']),
            models.Index(fields=['qp_setter', 'status']),
            models.Index(fields=['checker', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['assigned_date']),
            models.Index(fields=['due_date']),
        ]
        # Ensure one allocation per course per academic semester
        unique_together = ['academic_sem', 'course']

    def clean(self):
        """Validate the allocation data"""
        # Validate dates
        if self.assigned_date and self.due_date:
            if self.assigned_date > self.due_date:
                raise ValidationError({
                    'due_date': 'Due date must be after assigned date'
                })
        
        if self.mail_send_date and self.assigned_date:
            if self.mail_send_date > self.assigned_date:
                raise ValidationError({
                    'assigned_date': 'Assigned date must be after mail send date'
                })
        
        if self.submitted_date and self.approved_date:
            if self.submitted_date > self.approved_date:
                raise ValidationError({
                    'approved_date': 'Approved date must be after submitted date'
                })

        # Validate status transitions
        if self.pk:  # Existing record
            old_status = QPSAllocation.objects.get(pk=self.pk).status
            valid_transitions = {
                'PENDING': ['ASSIGNED', 'IN_PROGRESS'],
                'ASSIGNED': ['IN_PROGRESS', 'SUBMITTED'],
                'IN_PROGRESS': ['SUBMITTED', 'ASSIGNED'],
                'SUBMITTED': ['APPROVED', 'REJECTED'],
                'APPROVED': ['COMPLETED', 'REJECTED'],
                'REJECTED': ['PENDING', 'ASSIGNED'],
                'COMPLETED': [],
            }
            if self.status != old_status:
                if old_status not in valid_transitions:
                    raise ValidationError({
                        'status': f'Invalid status transition from {old_status} to {self.status}'
                    })
                if self.status not in valid_transitions.get(old_status, []):
                    raise ValidationError({
                        'status': f'Cannot transition from {old_status} to {self.status}'
                    })

    def save(self, *args, **kwargs):
        """Save the allocation with validation"""
        # Auto-set dates based on status (only if not already set)
        if self.status == 'ASSIGNED' and not self.assigned_date:
            self.assigned_date = timezone.now().date()
        elif self.status == 'SUBMITTED' and not self.submitted_date:
            self.submitted_date = timezone.now().date()
        elif self.status == 'APPROVED' and not self.approved_date:
            self.approved_date = timezone.now().date()
        
        # Full validation
        self.full_clean()
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.academic_sem} - {self.course.course_code} - {self.get_status_display()}"

    # =======================================================================
    # Properties
    # =======================================================================
    @property
    def is_overdue(self):
        """Check if the allocation is overdue"""
        if self.due_date and self.status not in ['SUBMITTED', 'APPROVED', 'COMPLETED']:
            from datetime import date
            return date.today() > self.due_date
        return False

    @property
    def is_completed(self):
        """Check if the allocation is completed"""
        return self.status in ['APPROVED', 'COMPLETED']

    @property
    def days_remaining(self):
        """Calculate days remaining until due date"""
        if self.due_date:
            from datetime import date
            days = (self.due_date - date.today()).days
            return max(0, days)
        return None

    @property
    def days_overdue(self):
        """Calculate days overdue"""
        if self.due_date and self.is_overdue:
            from datetime import date
            return (date.today() - self.due_date).days
        return 0

    @property
    def progress_percentage(self):
        """Calculate progress percentage based on status"""
        status_progress = {
            'PENDING': 0,
            'ASSIGNED': 20,
            'IN_PROGRESS': 40,
            'SUBMITTED': 60,
            'APPROVED': 80,
            'REJECTED': 0,
            'COMPLETED': 100,
        }
        return status_progress.get(self.status, 0)

    @property
    def status_color(self):
        """Get color for status display"""
        colors = {
            'PENDING': 'yellow',
            'ASSIGNED': 'blue',
            'IN_PROGRESS': 'indigo',
            'SUBMITTED': 'purple',
            'APPROVED': 'green',
            'REJECTED': 'red',
            'COMPLETED': 'emerald',
        }
        return colors.get(self.status, 'gray')

    # =======================================================================
    # Class Methods
    # =======================================================================
    @classmethod
    def get_by_academic_year(cls, academic_year):
        """Get all allocations for a specific academic year"""
        return cls.objects.filter(academic_sem=academic_year)

    @classmethod
    def get_by_course(cls, course):
        """Get all allocations for a specific course"""
        return cls.objects.filter(course=course)

    @classmethod
    def get_by_setter(cls, staff):
        """Get all allocations where the staff is the QP setter"""
        return cls.objects.filter(qp_setter=staff)

    @classmethod
    def get_by_checker(cls, user):
        """Get all allocations where the user is the checker"""
        return cls.objects.filter(checker=user)

    @classmethod
    def get_pending_allocations(cls):
        """Get all pending allocations"""
        return cls.objects.filter(status='PENDING')

    @classmethod
    def get_active_allocations(cls):
        """Get all active (non-completed) allocations"""
        return cls.objects.exclude(status__in=['COMPLETED', 'REJECTED'])

    @classmethod
    def get_overdue_allocations(cls):
        """Get all overdue allocations"""
        from datetime import date
        return cls.objects.filter(
            due_date__lt=date.today(),
            status__in=['PENDING', 'ASSIGNED', 'IN_PROGRESS']
        )

    @classmethod
    def get_by_status(cls, status):
        """Get all allocations by status"""
        return cls.objects.filter(status=status)

    @classmethod
    def get_allocations_summary(cls):
        """Get summary of allocations by status"""
        from django.db.models import Count
        return cls.objects.values('status').annotate(
            count=Count('id')
        ).order_by('status')