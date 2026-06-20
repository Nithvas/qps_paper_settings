import json
import logging
from datetime import datetime

from django.shortcuts import render, get_object_or_404
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.views.decorators.csrf import csrf_exempt

from .models import QuestionPattern, QuestionPatternSection
from core.models import FieldReference, AuditLog, SystemSetting

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# PATTERN VIEWS
# ----------------------------------------------------------------------

@login_required
def pattern_list(request):
    """List all question patterns with search."""
    patterns = QuestionPattern.objects.all().prefetch_related('sections')

    search_query = request.GET.get('search', '')
    if search_query:
        patterns = patterns.filter(
            Q(pattern_code__icontains=search_query) |
            Q(pattern_name__icontains=search_query) |
            Q(total_marks__icontains=search_query)
        )

    if SystemSetting.get_setting('log_list_views', False):
        AuditLog.log(
            request=request,
            action='VIEW',
            obj=None,
            object_repr="Question Pattern list viewed",
            changes={'search': search_query, 'total_count': patterns.count()}
        )

    # Pass question types for the section form (used in modals)
    context = {
        'patterns': patterns,
        'total_count': patterns.count(),
        'search': search_query,
        'question_types': QuestionPatternSection.QUESTION_TYPES,
    }
    return render(request, 'pattern/pattern_list.html', context)


@require_http_methods(["GET", "POST"])
@login_required
def pattern_add(request):
    """Add a new pattern."""
    if request.method == "POST":
        try:
            data = json.loads(request.body) if request.content_type == 'application/json' else request.POST

            pattern_code = data.get('pattern_code', '').strip()
            if QuestionPattern.objects.filter(pattern_code=pattern_code).exists():
                return JsonResponse({'success': False, 'error': 'Pattern code already exists.'}, status=400)

            pattern = QuestionPattern(
                pattern_code=pattern_code,
                pattern_name=data.get('pattern_name', '').strip(),
                total_marks=int(data.get('total_marks', 0)),
                duration_minutes=int(data.get('duration_minutes')) if data.get('duration_minutes') else None,
                is_active=data.get('is_active', 'true').lower() in ['true', '1', 'on', 'yes'],
            )
            pattern.full_clean()
            pattern.save()

            AuditLog.log(
                request=request,
                action='CREATE',
                obj=pattern,
                object_repr=str(pattern),
                changes={field: getattr(pattern, field) for field in ['pattern_code', 'pattern_name', 'total_marks', 'duration_minutes', 'is_active']}
            )

            return JsonResponse({'success': True, 'message': 'Pattern created successfully.', 'id': pattern.id})

        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            logger.error(f"Error adding pattern: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    # GET – not used (form is in modal), but fallback
    return JsonResponse({'success': False, 'error': 'GET not supported'}, status=405)


@require_http_methods(["GET", "POST"])
@login_required
def pattern_edit(request, pk):
    """Edit an existing pattern."""
    pattern = get_object_or_404(QuestionPattern, pk=pk)

    if request.method == "GET":
        data = {
            'id': pattern.id,
            'pattern_code': pattern.pattern_code,
            'pattern_name': pattern.pattern_name,
            'total_marks': pattern.total_marks,
            'duration_minutes': pattern.duration_minutes,
            'is_active': pattern.is_active,
        }
        return JsonResponse({'success': True, 'pattern': data})

    # POST
    try:
        old_values = {
            'pattern_code': pattern.pattern_code,
            'pattern_name': pattern.pattern_name,
            'total_marks': pattern.total_marks,
            'duration_minutes': pattern.duration_minutes,
            'is_active': pattern.is_active,
        }

        data = request.POST
        pattern.pattern_code = data.get('pattern_code', '').strip()
        pattern.pattern_name = data.get('pattern_name', '').strip()
        pattern.total_marks = int(data.get('total_marks', 0))
        pattern.duration_minutes = int(data.get('duration_minutes')) if data.get('duration_minutes') else None
        pattern.is_active = data.get('is_active', 'false').lower() in ['true', '1', 'on', 'yes']

        if QuestionPattern.objects.filter(pattern_code=pattern.pattern_code).exclude(pk=pk).exists():
            return JsonResponse({'success': False, 'error': 'Pattern code already exists.'}, status=400)

        pattern.full_clean()
        pattern.save()

        changes = {}
        for field in old_values:
            if getattr(pattern, field) != old_values[field]:
                changes[field] = {'old': old_values[field], 'new': getattr(pattern, field)}
        if changes:
            AuditLog.log(
                request=request,
                action='UPDATE',
                obj=pattern,
                object_repr=str(pattern),
                changes=changes
            )

        return JsonResponse({'success': True, 'message': 'Pattern updated successfully.'})

    except ValidationError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error editing pattern: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@require_http_methods(["DELETE", "POST"])
@login_required
def pattern_delete(request, pk):
    """Delete a pattern (hard or soft delete based on setting)."""
    try:
        pattern = get_object_or_404(QuestionPattern, pk=pk)
        pattern_info = str(pattern)
        pattern_data = {
            'pattern_code': pattern.pattern_code,
            'pattern_name': pattern.pattern_name,
            'total_marks': pattern.total_marks,
            'duration_minutes': pattern.duration_minutes,
            'is_active': pattern.is_active,
        }

        soft_delete = SystemSetting.get_setting('soft_delete_pattern', False)

        if soft_delete:
            pattern.is_active = False
            pattern.save()
            message = 'Pattern soft-deleted successfully.'
            action = 'UPDATE'
            AuditLog.log(
                request=request,
                action=action,
                obj=pattern,
                object_repr=f"Soft deleted: {pattern_info}",
                changes=pattern_data
            )
        else:
            pattern.delete()
            message = 'Pattern deleted permanently.'
            action = 'DELETE'
            audit_data = {
                'action': action,
                'changes': pattern_data,
                'app_label': pattern._meta.app_label,
                'model_name': pattern.__class__.__name__,
                'object_id': str(pattern.id),
                'object_repr': pattern_info,
                'ip_address': AuditLog._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'request_path': request.path,
            }
            if request.user.is_authenticated:
                audit_data['user_id'] = str(request.user.id)
                audit_data['user_name'] = request.user.username
            AuditLog.objects.create(**audit_data)

        return JsonResponse({'success': True, 'message': message})

    except Exception as e:
        logger.error(f"Error deleting pattern: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@require_http_methods(["GET"])
@login_required
def pattern_details(request, pk):
    """Get detailed pattern data including its sections."""
    pattern = get_object_or_404(QuestionPattern, pk=pk)
    sections = pattern.sections.filter(is_active=True).order_by('id')

    if SystemSetting.get_setting('log_detail_views', False):
        AuditLog.log(
            request=request,
            action='VIEW',
            obj=pattern,
            object_repr=f"Pattern details viewed: {pattern.pattern_code}"
        )

    data = {
        'id': pattern.id,
        'pattern_code': pattern.pattern_code,
        'pattern_name': pattern.pattern_name,
        'total_marks': pattern.total_marks,
        'duration_minutes': pattern.duration_minutes,
        'is_active': pattern.is_active,
        'created_at': pattern.created_at.strftime('%Y-%m-%d %H:%M:%S') if pattern.created_at else '',
        'updated_at': pattern.updated_at.strftime('%Y-%m-%d %H:%M:%S') if pattern.updated_at else '',
        'sections': [
            {
                'id': s.id,
                'section_name': s.section_name,
                'question_type': s.question_type,
                'question_type_display': s.get_question_type_display(),
                'no_of_questions': s.no_of_questions,
                'questions_to_answer': s.questions_to_answer,
                'internal_choice': s.internal_choice,
                'marks_per_question': float(s.marks_per_question),
                'total_section_marks': float(s.total_section_marks),
                'is_active': s.is_active,
            }
            for s in sections
        ]
    }
    return JsonResponse({'success': True, 'pattern': data})


@require_http_methods(["POST"])
@login_required
def pattern_toggle_active(request, pk):
    """Toggle active status of a pattern."""
    try:
        pattern = get_object_or_404(QuestionPattern, pk=pk)
        pattern.is_active = not pattern.is_active
        pattern.save()

        AuditLog.log(
            request=request,
            action='UPDATE',
            obj=pattern,
            object_repr=str(pattern),
            changes={'is_active': {'old': not pattern.is_active, 'new': pattern.is_active}}
        )

        return JsonResponse({
            'success': True,
            'message': f'Pattern {"activated" if pattern.is_active else "deactivated"}.',
            'is_active': pattern.is_active
        })
    except Exception as e:
        logger.error(f"Error toggling pattern status: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


# ----------------------------------------------------------------------
# SECTION VIEWS
# ----------------------------------------------------------------------

@require_http_methods(["POST"])
@login_required
def section_add(request, pattern_id):
    """Add a new section to a pattern."""
    pattern = get_object_or_404(QuestionPattern, pk=pattern_id)
    try:
        data = json.loads(request.body) if request.content_type == 'application/json' else request.POST

        section = QuestionPatternSection(
            pattern=pattern,
            section_name=data.get('section_name', '').strip(),
            question_type=data.get('question_type', '').strip(),
            no_of_questions=int(data.get('no_of_questions', 0)),
            questions_to_answer=int(data.get('questions_to_answer', 0)),
            internal_choice=data.get('internal_choice', 'false').lower() in ['true', '1', 'on', 'yes'],
            marks_per_question=float(data.get('marks_per_question', 0)),
            is_active=data.get('is_active', 'true').lower() in ['true', '1', 'on', 'yes'],
        )
        section.full_clean()
        section.save()

        AuditLog.log(
            request=request,
            action='CREATE',
            obj=section,
            object_repr=str(section),
            changes={field: getattr(section, field) for field in ['section_name', 'question_type', 'no_of_questions', 'questions_to_answer', 'marks_per_question', 'internal_choice', 'is_active']}
        )

        return JsonResponse({'success': True, 'message': 'Section added successfully.', 'id': section.id})

    except ValidationError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error adding section: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@require_http_methods(["GET", "POST"])
@login_required
def section_edit(request, pk):
    """Edit a section."""
    section = get_object_or_404(QuestionPatternSection, pk=pk)

    if request.method == "GET":
        data = {
            'id': section.id,
            'section_name': section.section_name,
            'question_type': section.question_type,
            'no_of_questions': section.no_of_questions,
            'questions_to_answer': section.questions_to_answer,
            'internal_choice': section.internal_choice,
            'marks_per_question': float(section.marks_per_question),
            'is_active': section.is_active,
            'pattern_id': section.pattern.id,
        }
        return JsonResponse({'success': True, 'section': data})

    # POST
    try:
        old_values = {
            'section_name': section.section_name,
            'question_type': section.question_type,
            'no_of_questions': section.no_of_questions,
            'questions_to_answer': section.questions_to_answer,
            'internal_choice': section.internal_choice,
            'marks_per_question': float(section.marks_per_question),
            'is_active': section.is_active,
        }

        data = request.POST
        section.section_name = data.get('section_name', '').strip()
        section.question_type = data.get('question_type', '').strip()
        section.no_of_questions = int(data.get('no_of_questions', 0))
        section.questions_to_answer = int(data.get('questions_to_answer', 0))
        section.internal_choice = data.get('internal_choice', 'false').lower() in ['true', '1', 'on', 'yes']
        section.marks_per_question = float(data.get('marks_per_question', 0))
        section.is_active = data.get('is_active', 'false').lower() in ['true', '1', 'on', 'yes']

        section.full_clean()
        section.save()

        changes = {}
        for field in old_values:
            current = getattr(section, field) if field != 'marks_per_question' else float(getattr(section, field))
            if current != old_values[field]:
                changes[field] = {'old': old_values[field], 'new': current}
        if changes:
            AuditLog.log(
                request=request,
                action='UPDATE',
                obj=section,
                object_repr=str(section),
                changes=changes
            )

        return JsonResponse({'success': True, 'message': 'Section updated successfully.'})

    except ValidationError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error editing section: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@require_http_methods(["DELETE", "POST"])
@login_required
def section_delete(request, pk):
    """Delete a section."""
    try:
        section = get_object_or_404(QuestionPatternSection, pk=pk)
        section_info = str(section)
        section_data = {
            'section_name': section.section_name,
            'question_type': section.question_type,
            'no_of_questions': section.no_of_questions,
            'questions_to_answer': section.questions_to_answer,
            'internal_choice': section.internal_choice,
            'marks_per_question': float(section.marks_per_question),
            'is_active': section.is_active,
        }

        soft_delete = SystemSetting.get_setting('soft_delete_section', False)

        if soft_delete:
            section.is_active = False
            section.save()
            message = 'Section soft-deleted successfully.'
            action = 'UPDATE'
            AuditLog.log(
                request=request,
                action=action,
                obj=section,
                object_repr=f"Soft deleted: {section_info}",
                changes=section_data
            )
        else:
            section.delete()
            message = 'Section deleted permanently.'
            action = 'DELETE'
            audit_data = {
                'action': action,
                'changes': section_data,
                'app_label': section._meta.app_label,
                'model_name': section.__class__.__name__,
                'object_id': str(section.id),
                'object_repr': section_info,
                'ip_address': AuditLog._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'request_path': request.path,
            }
            if request.user.is_authenticated:
                audit_data['user_id'] = str(request.user.id)
                audit_data['user_name'] = request.user.username
            AuditLog.objects.create(**audit_data)

        return JsonResponse({'success': True, 'message': message})

    except Exception as e:
        logger.error(f"Error deleting section: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@require_http_methods(["POST"])
@login_required
def section_toggle_active(request, pk):
    """Toggle active status of a section."""
    try:
        section = get_object_or_404(QuestionPatternSection, pk=pk)
        section.is_active = not section.is_active
        section.save()

        AuditLog.log(
            request=request,
            action='UPDATE',
            obj=section,
            object_repr=str(section),
            changes={'is_active': {'old': not section.is_active, 'new': section.is_active}}
        )

        return JsonResponse({
            'success': True,
            'message': f'Section {"activated" if section.is_active else "deactivated"}.',
            'is_active': section.is_active
        })
    except Exception as e:
        logger.error(f"Error toggling section status: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


# ----------------------------------------------------------------------
# FIELD OPTIONS (for creatable selects)
# ----------------------------------------------------------------------

@require_http_methods(["GET"])
@login_required
def get_field_options(request):
    """AJAX endpoint to get field options from FieldReference."""
    field_name = request.GET.get('field')
    search_query = request.GET.get('search', '')

    if not field_name:
        return JsonResponse({'success': False, 'error': 'Field name required'}, status=400)

    field_mapping = {
        'pattern_code': ('QuestionPattern', 'pattern_code'),
        'question_type': ('QuestionPatternSection', 'question_type'),
    }

    if field_name not in field_mapping:
        return JsonResponse({'success': False, 'error': f'Invalid field: {field_name}'}, status=400)

    model_name, field = field_mapping[field_name]
    model_cls = QuestionPattern if model_name == 'QuestionPattern' else QuestionPatternSection

    try:
        options = FieldReference.get_options(
            model=model_cls,
            field_name=field,
            search=search_query
        )
        return JsonResponse({'success': True, 'options': options})
    except Exception as e:
        logger.error(f"Error getting field options: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)