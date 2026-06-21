from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta

from .models import QPSAllocation
from academic.models import AcademicYear
from course.models import Course
from staff.models import Staff
from django.contrib.auth.models import User


@login_required
def allocation_list(request):
    """
    Main listing page for QPS allocations with filters, search, and pagination.
    """
    # Get all allocations with related data
    allocations = QPSAllocation.objects.select_related(
        'academic_sem', 
        'course', 
        'qp_setter', 
        'checker'
    ).all()
    
    # ============================================================
    # FILTERS
    # ============================================================
    
    # Academic Year filter
    academic_year_id = request.GET.get('academic_year')
    if academic_year_id:
        allocations = allocations.filter(academic_sem_id=academic_year_id)
    
    # Status filter
    status = request.GET.get('status')
    if status:
        allocations = allocations.filter(status=status)
    
    # Course filter
    course_id = request.GET.get('course')
    if course_id:
        allocations = allocations.filter(course_id=course_id)
    
    # Setter filter
    setter_id = request.GET.get('setter')
    if setter_id:
        allocations = allocations.filter(qp_setter_id=setter_id)
    
    # Checker filter
    checker_id = request.GET.get('checker')
    if checker_id:
        allocations = allocations.filter(checker_id=checker_id)
    
    # Due date filter
    due_date_filter = request.GET.get('due_date_filter')
    today = timezone.now().date()
    if due_date_filter == 'overdue':
        allocations = allocations.filter(
            due_date__lt=today,
            status__in=['PENDING', 'ASSIGNED', 'IN_PROGRESS']
        )
    elif due_date_filter == 'today':
        allocations = allocations.filter(due_date=today)
    elif due_date_filter == 'this_week':
        end_of_week = today + timedelta(days=7 - today.weekday())
        allocations = allocations.filter(due_date__gte=today, due_date__lte=end_of_week)
    elif due_date_filter == 'next_week':
        start_next_week = today + timedelta(days=7 - today.weekday() + 1)
        end_next_week = start_next_week + timedelta(days=6)
        allocations = allocations.filter(due_date__gte=start_next_week, due_date__lte=end_next_week)
    
    # ============================================================
    # SEARCH
    # ============================================================
    search = request.GET.get('search', '').strip()
    if search:
        allocations = allocations.filter(
            Q(course__course_code__icontains=search) |
            Q(course__course_title__icontains=search) |
            Q(qp_setter__name__icontains=search) |
            Q(qp_setter__staff_id__icontains=search) |
            Q(checker__username__icontains=search) |
            Q(checker__first_name__icontains=search) |
            Q(checker__last_name__icontains=search) |
            Q(academic_sem__academic_year__icontains=search)
        )
    
    # ============================================================
    # ORDERING
    # ============================================================
    sort_by = request.GET.get('sort_by', '-created_at')
    allowed_sort_fields = [
        'academic_sem', '-academic_sem',
        'course', '-course',
        'qp_setter', '-qp_setter',
        'checker', '-checker',
        'status', '-status',
        'mail_send_date', '-mail_send_date',
        'assigned_date', '-assigned_date',
        'due_date', '-due_date',
        'submitted_date', '-submitted_date',
        'approved_date', '-approved_date',
        'created_at', '-created_at',
    ]
    if sort_by in allowed_sort_fields:
        allocations = allocations.order_by(sort_by)
    else:
        allocations = allocations.order_by('-created_at')
    
    # ============================================================
    # STATISTICS
    # ============================================================
    total_count = allocations.count()
    pending_count = allocations.filter(status='PENDING').count()
    in_progress_count = allocations.filter(status='IN_PROGRESS').count()
    submitted_count = allocations.filter(status='SUBMITTED').count()
    approved_count = allocations.filter(status='APPROVED').count()
    
    # ============================================================
    # PAGINATION
    # ============================================================
    page = request.GET.get('page', 1)
    paginator = Paginator(allocations, 20)  # 20 items per page
    page_obj = paginator.get_page(page)
    
    # ============================================================
    # CONTEXT DATA FOR DROPDOWNS
    # ============================================================
    academic_years = AcademicYear.objects.filter(is_active=True).order_by('-academic_year')
    courses = Course.objects.all().order_by('course_code')
    staff_members = Staff.objects.all().order_by('name')
    users = User.objects.filter(is_active=True).order_by('first_name', 'last_name')
    
    # ============================================================
    # RENDER
    # ============================================================
    context = {
        'page_obj': page_obj,
        'total_count': total_count,
        'pending_count': pending_count,
        'in_progress_count': in_progress_count,
        'submitted_count': submitted_count,
        'approved_count': approved_count,
        'search': search,
        'academic_years': academic_years,
        'courses': courses,
        'staff_members': staff_members,
        'users': users,
    }
    
    return render(request, 'allocation/allocation_list.html', context)