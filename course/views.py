from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.db.models import Q
from django.core.paginator import Paginator
from django.contrib import messages
from django.urls import reverse
from urllib.parse import urlencode
from .models import Course
from .forms import CourseForm
from .services.course_excel_service import (
    download_sample_course_excel,
    export_course_excel,
    upload_course_excel
)

# -------------------------------------------------------------------
# LIST VIEW (FILTER + SEARCH + PAGINATION)
# -------------------------------------------------------------------

def course_list(request):

    qs = Course.objects.all()
    program = request.GET.get('program')
    course_id = request.GET.get('course_id')
    semester = request.GET.get('semester')
    course_code = request.GET.get('course_code')
    search = request.GET.get('search')

    if program:
        qs = qs.filter(program=program)
    if course_id:
        qs = qs.filter(course_id=course_id)
    if semester:
        qs = qs.filter(semester=semester)
    if course_code:
        qs = qs.filter(course_code=course_code)
    if search:
        qs = qs.filter(
            Q(program__icontains=search) |
            Q(course_id__icontains=search) |
            Q(semester__icontains=search) |
            Q(course_code__icontains=search) |
            Q(course_title__icontains=search) |
            Q(external_mark__icontains=search) |
            Q(examiner__icontains=search)
        )

    paginator = Paginator(qs, 50)
    page = request.GET.get('page')
    course_page = paginator.get_page(page)

    programs = Course.objects.values_list('program', flat=True).distinct().order_by('program')
    course_ids = Course.objects.values_list('course_id', flat=True).distinct().order_by('course_id')
    semesters = Course.objects.values_list('semester', flat=True).distinct().order_by('semester')
    course_codes = Course.objects.values_list('course_code', flat=True).distinct().order_by('course_code')

    return render(request, 'course/course_list.html', {
        'course': course_page,
        'total_count': qs.count(),
        'programs': list(programs),
        'course_ids': list(course_ids),
        'semesters': list(semesters),
        'course_codes': list(course_codes),
        'selected_program': program,
        'selected_course_id': course_id,
        'selected_semester': semester,
        'selected_course_code': course_code,
        'search': search,
    })

# -------------------------------------------------------------------
# AJAX FILTER 
# -------------------------------------------------------------------

def ajax_filter(request):

    qs = Course.objects.all()
    program = request.GET.get('program')
    course_id = request.GET.get('course_id')
    semester = request.GET.get('semester')
    course_code = request.GET.get('course_code')

    if program:
        qs = qs.filter(program=program)
    if course_id:
        qs = qs.filter(course_id=course_id)
    if semester:
        qs = qs.filter(semester=semester)
    if course_code:
        qs = qs.filter(course_code=course_code)

    course_ids = qs.values_list('course_id', flat=True).distinct().order_by('course_id')
    semesters = qs.values_list('semester', flat=True).distinct().order_by('semester')
    course_codes = qs.values_list('course_code', flat=True).distinct().order_by('course_code')

    return JsonResponse({
        'course_ids': list(course_ids),
        'semesters': list(semesters),
        'course_codes': list(course_codes),
    })

# -------------------------------------------------------------------
# ADD / EDIT COURSE
# -------------------------------------------------------------------

def course_add_edit(request, course_code=None):
    
    is_edit = course_code is not None
    if is_edit:
        course = get_object_or_404(Course, course_code=course_code)
    else:
        course = None

    if request.method == 'POST':
        form = CourseForm(request.POST, instance=course)
        if form.is_valid():
            form.save()
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            messages.success(request, 'Course saved successfully.')
            return redirect('course:course_list')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                error_messages = []
                for field, errors in form.errors.items():
                    if field == '__all__':
                        error_messages.extend(errors)
                    else:
                        for err in errors:
                            error_messages.append(f"{field}: {err}")
                clean_error = " ".join(error_messages)
                return JsonResponse({'success': False, 'error': clean_error})
            messages.error(request, 'Please correct the errors below.')
    else:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest' and is_edit:
            data = {
                'success': True,
                'course': {
                    'course_code': course.course_code,
                    'course_title': course.course_title,
                    'course_id': course.course_id,
                    'semester': course.semester,
                    'program': course.program,
                    'external_mark': course.external_mark,
                    'examiner': course.examiner,
                }
            }
            return JsonResponse(data)
        form = CourseForm(instance=course)

    return render(request, 'course/course_form.html', {'form': form, 'is_edit': is_edit})

# -------------------------------------------------------------------
# DELETE COURSE (AJAX) 
# -------------------------------------------------------------------

def course_delete(request, course_code):
    if request.method == 'POST':
        course = get_object_or_404(Course, course_code=course_code)
        course.delete()
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True})
        messages.success(request, 'Course deleted successfully.')
        return redirect('course:course_list')
    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)

# -------------------------------------------------------------------
# EXCEL HANDLERS
# -------------------------------------------------------------------

def course_sample(request):
    return download_sample_course_excel()

def course_export(request):
    return export_course_excel()

def course_upload(request):
    if request.method == 'POST':
        file = request.FILES.get('file')
        if file:
            try:
                upload_course_excel(file)
                messages.success(request, 'Excel uploaded successfully!')
                base_url = reverse('course:course_list')
                query_string = urlencode({'upload_success': '1'})
                return redirect(f'{base_url}?{query_string}')
            except Exception as e:
                messages.error(request, f'Upload failed: {str(e)}')
        else:
            messages.error(request, 'Please select a file to upload')
    return redirect('course:course_list')