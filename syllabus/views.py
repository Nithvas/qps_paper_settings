from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.contrib import messages
from .models import Syllabus
from course.models import Course
import json
import logging

logger = logging.getLogger(__name__)

@login_required
def syllabus_list(request):
    """Main listing page for syllabi."""
    syllabi = Syllabus.objects.select_related('course').all()
    total_count = syllabi.count()
    context = {
        'syllabi': syllabi,
        'total_count': total_count,
    }
    return render(request, 'syllabus/syllabus_list.html', context)


@login_required
@require_http_methods(["POST"])
def syllabus_add(request):
    """Add a new syllabus record (via AJAX)."""
    try:
        course_id = request.POST.get('course')
        file = request.FILES.get('syllabus_file')
        is_active = request.POST.get('is_active', 'true') == 'true'

        if not course_id:
            return JsonResponse({'success': False, 'error': 'Course is required'}, status=400)

        course = get_object_or_404(Course, id=course_id)

        if Syllabus.objects.filter(course=course).exists():
            return JsonResponse({'success': False, 'error': 'Syllabus already exists for this course.'}, status=400)

        syllabus = Syllabus(
            course=course,
            syllabus_file=file,
            is_active=is_active
        )
        syllabus.full_clean()
        syllabus.save()

        return JsonResponse({
            'success': True,
            'message': 'Syllabus added successfully',
            'id': syllabus.id,
            'course_code': course.course_code,
            'file_url': syllabus.syllabus_file.url if syllabus.syllabus_file else None,
        })
    except Exception as e:
        logger.error(f"Error adding syllabus: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def syllabus_edit(request, syllabus_id):
    """Update an existing syllabus record."""
    try:
        syllabus = get_object_or_404(Syllabus, id=syllabus_id)
        course_id = request.POST.get('course')
        file = request.FILES.get('syllabus_file')
        is_active = request.POST.get('is_active', 'true') == 'true'

        if course_id:
            course = get_object_or_404(Course, id=course_id)
            if Syllabus.objects.filter(course=course).exclude(id=syllabus.id).exists():
                return JsonResponse({'success': False, 'error': 'Syllabus already exists for this course.'}, status=400)
            syllabus.course = course

        if file:
            syllabus.syllabus_file.delete(save=False)
            syllabus.syllabus_file = file

        syllabus.is_active = is_active
        syllabus.full_clean()
        syllabus.save()

        return JsonResponse({
            'success': True,
            'message': 'Syllabus updated successfully',
            'course_code': syllabus.course.course_code,
            'file_url': syllabus.syllabus_file.url if syllabus.syllabus_file else None,
        })
    except Exception as e:
        logger.error(f"Error editing syllabus: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def syllabus_delete(request, syllabus_id):
    """Delete a syllabus record."""
    try:
        syllabus = get_object_or_404(Syllabus, id=syllabus_id)
        if syllabus.syllabus_file:
            syllabus.syllabus_file.delete(save=False)
        syllabus.delete()
        return JsonResponse({'success': True, 'message': 'Syllabus deleted successfully'})
    except Exception as e:
        logger.error(f"Error deleting syllabus: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@login_required
def syllabus_details(request, syllabus_id):
    """Return syllabus details for editing (JSON)."""
    syllabus = get_object_or_404(Syllabus, id=syllabus_id)
    data = {
        'id': syllabus.id,
        'course_id': syllabus.course.id,
        'course_code': syllabus.course.course_code,
        'course_title': syllabus.course.course_title,
        'file_url': syllabus.syllabus_file.url if syllabus.syllabus_file else None,
        'is_active': syllabus.is_active,
    }
    return JsonResponse({'success': True, 'syllabus': data})