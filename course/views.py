from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.views.decorators.csrf import csrf_exempt
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from datetime import datetime
from .models import Course
from core.models import FieldReference, AuditLog, SystemSetting
import json
import logging

logger = logging.getLogger(__name__)

# -------------------------------------------------------------------------------------------------------------------------

# Display paginated list of courses with search, filters, and sorting
# Uses: SystemSetting (pagination, logging), AuditLog (optional), FieldReference (filters)

@login_required
def course_list(request):
    
    course_queryset = Course.objects.all()

    # Get pagination setting from database
    items_per_page = SystemSetting.get_setting('course_items_per_page', 20)
    
    # Get sorting parameters
    sort_by = request.GET.get('sort', 'id')
    sort_dir = request.GET.get('dir', 'desc')

    # Validate sort field
    valid_sort_fields = [
        'id', 'course_code', 'course_id', 'course_title', 'course_category',
        'program_type', 'degree', 'branch', 'branch_final', 'semester', 'part',
        'hours', 'credit', 'internal_mark', 'external_mark', 'total_mark',
        'examiner_type', 'examiner', 'created_at'
    ]

    if sort_by in valid_sort_fields:
        if sort_dir == 'desc':
            course_queryset = course_queryset.order_by(f'-{sort_by}')
        else:
            course_queryset = course_queryset.order_by(sort_by)
    else:
        course_queryset = course_queryset.order_by('-id')

    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        course_queryset = course_queryset.filter(
            Q(course_code__icontains=search_query) |
            Q(course_id__icontains=search_query) |
            Q(course_title__icontains=search_query) |
            Q(course_category__icontains=search_query) |
            Q(program_type__icontains=search_query) |
            Q(degree__icontains=search_query) |
            Q(branch__icontains=search_query) |
            Q(branch_final__icontains=search_query) |
            Q(semester__icontains=search_query) |
            Q(part__icontains=search_query) |
            Q(examiner_type__icontains=search_query) |
            Q(examiner__icontains=search_query)
        )

    # Filter functionality
    filters = {
        'program_type': request.GET.get('program_type', ''),
        'degree': request.GET.get('degree', ''),
        'branch': request.GET.get('branch', ''),
        'branch_final': request.GET.get('branch_final', ''),
        'course_category': request.GET.get('course_category', ''),
        'semester': request.GET.get('semester', ''),
        'part': request.GET.get('part', ''),
        'examiner_type': request.GET.get('examiner_type', ''),
    }

    for field, value in filters.items():
        if value:
            filter_kwargs = {field: value}
            course_queryset = course_queryset.filter(**filter_kwargs)

    # Get unique values for filters from FieldReference
    filter_options = {
        'program_types': FieldReference.get_options(Course, 'program_type'),
        'degrees': FieldReference.get_options(Course, 'degree'),
        'branches': FieldReference.get_options(Course, 'branch'),
        'branch_finals': FieldReference.get_options(Course, 'branch_final'),
        'course_categories': FieldReference.get_options(Course, 'course_category'),
        'semesters': FieldReference.get_options(Course, 'semester'),
        'parts': FieldReference.get_options(Course, 'part'),
        'examiner_types': FieldReference.get_options(Course, 'examiner_type'),
        'examiners': FieldReference.get_options(Course, 'examiner'),
    }

    # Pagination
    paginator = Paginator(course_queryset, items_per_page)
    page_number = request.GET.get('page', 1)
    course_page = paginator.get_page(page_number)

    # Audit log for view (optional - can be disabled for performance)
    if SystemSetting.get_setting('log_list_views', False):
        AuditLog.log(
            request=request,
            action='VIEW',
            obj=None,
            object_repr=f"Course list viewed - Page {page_number}",
            changes={
                'search': search_query,
                'filters': filters,
                'total_count': course_queryset.count()
            }
        )

    context = {
        'courses': course_page,
        'total_count': course_queryset.count(),
        'search': search_query,
        'filters': filters,
        'filter_options': filter_options,
        'current_sort': sort_by,
        'current_dir': sort_dir,
    }

    return render(request, 'course/course_list.html', context)

# -------------------------------------------------------------------------------------------------------------------------

# AJAX endpoint to get field options dynamically from FieldReference
# Uses: FieldReference (read)

@require_http_methods(["GET"])
@login_required
def get_field_options(request):

    field_name = request.GET.get('field')
    search_query = request.GET.get('search', '')
    
    if not field_name:
        return JsonResponse({'success': False, 'error': 'Field name is required'}, status=400)
    
    # Map frontend field names to actual model field names
    field_mapping = {
        'program_type': 'program_type',
        'degree': 'degree',
        'branch': 'branch',
        'branch_final': 'branch_final',
        'course_category': 'course_category',
        'semester': 'semester', 
        'part': 'part',
        'examiner_type': 'examiner_type',
        'examiner': 'examiner',
        'filter_semester': 'semester',  
        'filter_part': 'part',  
        'filter_program_type': 'program_type',
        'filter_degree': 'degree',
        'filter_branch': 'branch',
        'filter_branch_final': 'branch_final',
        'filter_course_category': 'course_category',
        'filter_examiner_type': 'examiner_type',
    }
    
    model_field = field_mapping.get(field_name)
    if not model_field:
        return JsonResponse({'success': False, 'error': f'Invalid field name: {field_name}'}, status=400)
    
    try:
        # Get unique values directly from the database
        options = list(Course.objects.filter(
            **{f"{model_field}__isnull": False}
        ).exclude(
            **{f"{model_field}": ''}
        ).values_list(
            model_field, flat=True
        ).distinct().order_by(model_field))
        
        # Filter by search if provided
        if search_query:
            options = [opt for opt in options if search_query.lower() in opt.lower()]
        
        return JsonResponse({
            'success': True,
            'options': options,
            'total_count': len(options)
        })
        
    except Exception as e:
        logger.error(f"Error getting field options: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
        
# -------------------------------------------------------------------------------------------------------------------------

# Add new course
# Uses: FieldReference (GET - form options), AuditLog (POST - create log)

@require_http_methods(["GET", "POST"])
@login_required
def course_add(request):
    
    if request.method == "POST":
        try:
            # Handle both JSON and form data
            if request.content_type == 'application/json':
                data = json.loads(request.body)
            else:
                data = request.POST

            # Check if course_code already exists
            course_code = data.get('course_code')
            if course_code and Course.objects.filter(course_code=course_code).exists():
                return JsonResponse({'success': False, 'error': 'Course code already exists'}, status=400)
            
            # Check if course_id already exists
            course_id = data.get('course_id')
            if course_id and Course.objects.filter(course_id=course_id).exists():
                return JsonResponse({'success': False, 'error': 'Course ID already exists'}, status=400)

            # Create course
            course = Course()

            # Map form fields to model fields
            fields_mapping = {
                'program_type': 'program_type',
                'degree': 'degree',
                'branch': 'branch',
                'branch_final': 'branch_final',
                'course_code': 'course_code',
                'course_id': 'course_id',
                'course_category': 'course_category',
                'course_title': 'course_title',
                'semester': 'semester',
                'part': 'part',
                'hours': 'hours',
                'credit': 'credit',
                'internal_mark': 'internal_mark',
                'external_mark': 'external_mark',
                'total_mark': 'total_mark',
                'examiner_type': 'examiner_type',
                'examiner': 'examiner',
                'remark': 'remark',
            }

            # Store changes for audit
            changes = {}
            
            for form_field, model_field in fields_mapping.items():
                value = data.get(form_field)
                if value and str(value).strip():
                    # Handle numeric fields
                    if model_field in ['hours', 'internal_mark', 'external_mark', 'total_mark']:
                        try:
                            int_value = int(value)
                            setattr(course, model_field, int_value)
                            changes[model_field] = int_value
                        except ValueError:
                            setattr(course, model_field, None)
                    elif model_field == 'credit':
                        try:
                            float_value = float(value)
                            setattr(course, model_field, float_value)
                            changes[model_field] = float_value
                        except ValueError:
                            setattr(course, model_field, None)
                    else:
                        str_value = str(value).strip()
                        setattr(course, model_field, str_value)
                        changes[model_field] = str_value
                else:
                    setattr(course, model_field, None)

            # Auto-calculate total mark if not provided
            if course.internal_mark and course.external_mark and not course.total_mark:
                course.total_mark = course.internal_mark + course.external_mark
                changes['total_mark'] = course.total_mark

            course.full_clean()
            course.save()
            
            # Add audit log
            AuditLog.log(
                request=request,
                action='CREATE',
                obj=course,
                object_repr=f"{course.course_code} - {course.course_title}",
                changes=changes
            )
            
            return JsonResponse({
                'success': True, 
                'message': 'Course added successfully', 
                'id': course.id
            })

        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            logger.error(f"Error adding course: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    # GET request - return form with options from FieldReference
    context = {
        'field_options': {
            'program_types': FieldReference.get_options(Course, 'program_type'),
            'degrees': FieldReference.get_options(Course, 'degree'),
            'branches': FieldReference.get_options(Course, 'branch'),
            'branch_finals': FieldReference.get_options(Course, 'branch_final'),
            'course_categories': FieldReference.get_options(Course, 'course_category'),
            'semesters': FieldReference.get_options(Course, 'semester'),
            'parts': FieldReference.get_options(Course, 'part'),
            'examiner_types': FieldReference.get_options(Course, 'examiner_type'),
            'examiners': FieldReference.get_options(Course, 'examiner'),
        }
    }
    return render(request, 'course/course_form.html', context)

# -------------------------------------------------------------------------------------------------------------------------

# Edit existing course
# Uses: AuditLog (POST - update log)

@require_http_methods(["GET", "POST"])
@login_required
def course_edit(request, course_code):

    course = get_object_or_404(Course, course_code=course_code)

    if request.method == "GET":
        # Return course data as JSON for editing
        data = {
            'success': True,
            'course': {
                'id': course.id,
                'program_type': course.program_type or '',
                'degree': course.degree or '',
                'branch': course.branch or '',
                'branch_final': course.branch_final or '',
                'course_code': course.course_code,
                'course_id': course.course_id or '',
                'course_category': course.course_category or '',
                'course_title': course.course_title,
                'semester': course.semester or '',
                'part': course.part or '',
                'hours': course.hours or '',
                'credit': str(course.credit) if course.credit else '',
                'internal_mark': course.internal_mark or '',
                'external_mark': course.external_mark or '',
                'total_mark': course.total_mark or '',
                'examiner_type': course.examiner_type or '',
                'examiner': course.examiner or '',
                'remark': course.remark or '',
            }
        }
        return JsonResponse(data)

    elif request.method == "POST":
        try:
            # Store old values for audit
            old_values = {
                'program_type': course.program_type,
                'degree': course.degree,
                'branch': course.branch,
                'branch_final': course.branch_final,
                'course_code': course.course_code,
                'course_id': course.course_id,
                'course_category': course.course_category,
                'course_title': course.course_title,
                'semester': course.semester,
                'part': course.part,
                'hours': course.hours,
                'credit': str(course.credit) if course.credit else None,
                'internal_mark': course.internal_mark,
                'external_mark': course.external_mark,
                'total_mark': course.total_mark,
                'examiner_type': course.examiner_type,
                'examiner': course.examiner,
                'remark': course.remark,
            }
            
            fields = [
                'program_type', 'degree', 'branch', 'branch_final',
                'course_code', 'course_id', 'course_category', 'course_title',
                'semester', 'part', 'hours', 'credit', 'internal_mark',
                'external_mark', 'total_mark', 'examiner_type', 'examiner', 'remark'
            ]

            changes = {}
            
            for field in fields:
                value = request.POST.get(field)
                if value and str(value).strip():
                    if field in ['hours', 'internal_mark', 'external_mark', 'total_mark']:
                        try:
                            int_value = int(value)
                            setattr(course, field, int_value)
                            if str(old_values.get(field)) != str(int_value):
                                changes[field] = {'old': str(old_values.get(field)), 'new': str(int_value)}
                        except ValueError:
                            setattr(course, field, None)
                    elif field == 'credit':
                        try:
                            float_value = float(value)
                            setattr(course, field, float_value)
                            if str(old_values.get(field)) != str(float_value):
                                changes[field] = {'old': str(old_values.get(field)), 'new': str(float_value)}
                        except ValueError:
                            setattr(course, field, None)
                    else:
                        str_value = str(value).strip()
                        setattr(course, field, str_value)
                        if str(old_values.get(field)) != str_value:
                            changes[field] = {'old': str(old_values.get(field)), 'new': str_value}
                else:
                    setattr(course, field, None)
                    if old_values.get(field) is not None and old_values.get(field) != '':
                        changes[field] = {'old': str(old_values.get(field)), 'new': None}

            # Auto-calculate total mark if internal and external are provided
            if course.internal_mark and course.external_mark:
                new_total = course.internal_mark + course.external_mark
                if course.total_mark != new_total:
                    course.total_mark = new_total
                    changes['total_mark'] = {'old': str(old_values.get('total_mark')), 'new': str(new_total)}

            # FIXED: Check if course_code is being changed and if new course_code exists
            new_course_code = request.POST.get('course_code')
            if new_course_code and new_course_code.strip():
                new_course_code = new_course_code.strip()
                # Only check if the course_code is actually changing
                if new_course_code != old_values['course_code']:
                    if Course.objects.filter(course_code=new_course_code).exists():
                        return JsonResponse({'success': False, 'error': 'Course code already exists'}, status=400)
                    course.course_code = new_course_code
                    changes['course_code'] = {'old': old_values['course_code'], 'new': new_course_code}
            
            # FIXED: Check if course_id is being changed and if new course_id exists
            new_course_id = request.POST.get('course_id')
            if new_course_id and new_course_id.strip():
                new_course_id = new_course_id.strip()
                # Only check if the course_id is actually changing
                if new_course_id != old_values['course_id']:
                    if Course.objects.filter(course_id=new_course_id).exists():
                        return JsonResponse({'success': False, 'error': 'Course ID already exists'}, status=400)
                    course.course_id = new_course_id
                    changes['course_id'] = {'old': old_values['course_id'], 'new': new_course_id}

            course.full_clean()
            course.save()
            
            # Add audit log if there are changes
            if changes:
                AuditLog.log(
                    request=request,
                    action='UPDATE',
                    obj=course,
                    object_repr=f"{course.course_code} - {course.course_title}",
                    changes=changes
                )
            
            return JsonResponse({'success': True, 'message': 'Course updated successfully'})

        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            logger.error(f"Error editing course: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

# -------------------------------------------------------------------------------------------------------------------------

# Delete course
# Uses: SystemSetting (soft_delete setting), AuditLog (delete log)

@require_http_methods(["DELETE", "POST"])
@login_required
def course_delete(request, course_code):
    
    try:
        course = get_object_or_404(Course, course_code=course_code)
        
        # Store course info before deletion for audit
        course_info = f"{course.course_code} - {course.course_title}"
        course_data = {
            'course_code': course.course_code,
            'course_id': course.course_id,
            'course_title': course.course_title,
            'program_type': course.program_type,
            'degree': course.degree,
            'branch': course.branch,
            'semester': course.semester
        }
        
        # Check if soft delete is enabled
        soft_delete = SystemSetting.get_setting('soft_delete_course', False)
        
        if soft_delete:
            # Implement soft delete if you have a is_active field
            course.is_active = False
            course.save()
            message = 'Course soft deleted successfully'
            action = 'UPDATE'
            
            AuditLog.log(
                request=request,
                action=action,
                obj=course,
                changes=course_data,
                object_repr=f"Soft deleted: {course_info}"
            )
        else:
            # Store information before deletion
            course_id = str(course.id)
            course_app_label = course._meta.app_label
            course_model_name = course.__class__.__name__
            
            # Hard delete
            course.delete()
            message = 'Course deleted successfully'
            action = 'DELETE'
            
            # Create audit log entry manually for hard delete
            audit_data = {
                'action': action,
                'changes': course_data,
                'app_label': course_app_label,
                'model_name': course_model_name,
                'object_id': course_id,
                'object_repr': course_info,
                'ip_address': AuditLog._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'request_path': request.path,
            }
            
            # Add user information
            if request.user.is_authenticated:
                audit_data['user_id'] = str(request.user.id)
                audit_data['user_name'] = request.user.username
            
            AuditLog.objects.create(**audit_data)
        
        return JsonResponse({'success': True, 'message': message})
        
    except Exception as e:
        logger.error(f"Error deleting course: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

# -------------------------------------------------------------------------------------------------------------------------

# Save a new field option to FieldReference

@require_http_methods(["POST"])
@login_required
def save_field_option(request):

    try:
        data = json.loads(request.body)
        field_name = data.get('field_name')
        value = data.get('value')
        
        if not field_name or not value:
            return JsonResponse({'success': False, 'error': 'Field name and value required'}, status=400)
        
        # Validate field name
        valid_fields = [
            'program_type', 'degree', 'branch', 'branch_final', 'course_category',
            'semester', 'part', 'examiner_type', 'examiner'
        ]
        
        if field_name not in valid_fields:
            return JsonResponse({'success': False, 'error': 'Invalid field name'}, status=400)
        
        obj, created = FieldReference.add_option(
            model=Course,
            field_name=field_name,
            value=value,
            created_by=request.user.username
        )
        
        return JsonResponse({
            'success': True,
            'created': created,
            'message': 'Option saved successfully'
        })
        
    except Exception as e:
        logger.error(f"Error saving field option: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

# -------------------------------------------------------------------------------------------------------------------------

# Upload course data from Excel file
# Uses: FieldReference (create new options), AuditLog (bulk upload log)

@require_http_methods(["POST"])
@login_required
def course_upload(request):
    
    if request.method == "POST" and request.FILES.get('file'):
        try:
            file = request.FILES['file']
            
            # Validate file type
            if not file.name.endswith(('.xlsx', '.xls')):
                return JsonResponse({'success': False, 'error': 'Invalid file format. Please upload Excel file.'}, status=400)
            
            wb = load_workbook(file)
            ws = wb.active

            success_count = 0
            update_count = 0
            error_count = 0
            errors = []
            created_course_codes = []
            updated_course_codes = []

            new_field_options = {
                'program_type': set(),
                'degree': set(),
                'branch': set(),
                'branch_final': set(),
                'course_category': set(),
                'semester': set(),
                'part': set(),
                'examiner_type': set(),
                'examiner': set(),
            }

            # Helper function to safely convert to integer
            def safe_int(value, default=0):
                if value is None or str(value).strip() == '':
                    return default
                try:
                    return int(float(value))
                except (ValueError, TypeError):
                    return default

            # Helper function to safely convert to float
            def safe_float(value, default=0.0):
                if value is None or str(value).strip() == '':
                    return default
                try:
                    return float(value)
                except (ValueError, TypeError):
                    return default

            # Helper function to safely convert to string
            def safe_str(value, default=''):
                if value is None:
                    return default
                return str(value).strip()

            for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                try:
                    # Skip empty rows
                    if not row or not any(row):
                        continue
                    
                    row_list = list(row) if row else []
                    
                    # Validate required fields
                    if len(row_list) <= 5 or not row_list[5]:  # Course code
                        errors.append(f"Row {row_idx}: Course code is required")
                        error_count += 1
                        continue

                    if len(row_list) <= 7 or not row_list[7]:  # Course title
                        errors.append(f"Row {row_idx}: Course title is required")
                        error_count += 1
                        continue

                    # Collect field options for FieldReference
                    if len(row_list) > 0 and row_list[0]: new_field_options['program_type'].add(safe_str(row_list[0]))
                    if len(row_list) > 1 and row_list[1]: new_field_options['degree'].add(safe_str(row_list[1]))
                    if len(row_list) > 2 and row_list[2]: new_field_options['branch'].add(safe_str(row_list[2]))
                    if len(row_list) > 3 and row_list[3]: new_field_options['branch_final'].add(safe_str(row_list[3]))
                    if len(row_list) > 4 and row_list[4]: new_field_options['course_category'].add(safe_str(row_list[4]))
                    if len(row_list) > 8 and row_list[8]: new_field_options['semester'].add(safe_str(row_list[8]))
                    if len(row_list) > 9 and row_list[9]: new_field_options['part'].add(safe_str(row_list[9]))
                    if len(row_list) > 15 and row_list[15]: new_field_options['examiner_type'].add(safe_str(row_list[15]))
                    if len(row_list) > 16 and row_list[16]: new_field_options['examiner'].add(safe_str(row_list[16]))

                    # Calculate total mark if not provided
                    internal_mark = safe_int(row_list[12] if len(row_list) > 12 else None)
                    external_mark = safe_int(row_list[13] if len(row_list) > 13 else None)
                    total_mark = safe_int(row_list[14] if len(row_list) > 14 else None, internal_mark + external_mark)

                    course_data = {
                        'program_type': safe_str(row_list[0] if len(row_list) > 0 else None) or None,
                        'degree': safe_str(row_list[1] if len(row_list) > 1 else None) or None,
                        'branch': safe_str(row_list[2] if len(row_list) > 2 else None) or None,
                        'branch_final': safe_str(row_list[3] if len(row_list) > 3 else None) or None,
                        'course_category': safe_str(row_list[4] if len(row_list) > 4 else None) or None,
                        'course_code': safe_str(row_list[5] if len(row_list) > 5 else None),
                        'course_id': safe_str(row_list[6] if len(row_list) > 6 else None) or None,
                        'course_title': safe_str(row_list[7] if len(row_list) > 7 else None),
                        'semester': safe_str(row_list[8] if len(row_list) > 8 else None) or None,
                        'part': safe_str(row_list[9] if len(row_list) > 9 else None) or None,
                        'hours': safe_int(row_list[10] if len(row_list) > 10 else None),
                        'credit': safe_float(row_list[11] if len(row_list) > 11 else None),
                        'internal_mark': safe_int(row_list[12] if len(row_list) > 12 else None),
                        'external_mark': safe_int(row_list[13] if len(row_list) > 13 else None),
                        'total_mark': total_mark,
                        'examiner_type': safe_str(row_list[15] if len(row_list) > 15 else None) or None,
                        'examiner': safe_str(row_list[16] if len(row_list) > 16 else None) or None,
                        'remark': safe_str(row_list[17] if len(row_list) > 17 else None) or None,
                    }

                    # Check if record exists
                    existing_course = Course.objects.filter(course_code=course_data['course_code']).first()
                    
                    if existing_course:
                        # Update existing record
                        for key, value in course_data.items():
                            if value is not None:
                                setattr(existing_course, key, value)
                        existing_course.save()
                        update_count += 1
                        updated_course_codes.append(existing_course.course_code)
                    else:
                        # Create new record
                        course = Course(**course_data)
                        course.full_clean()
                        course.save()
                        success_count += 1
                        created_course_codes.append(course.course_code)

                except Exception as e:
                    error_count += 1
                    errors.append(f"Row {row_idx}: {str(e)}")
                    logger.error(f"Error uploading row {row_idx}: {str(e)}")

            # Add new options to FieldReference
            added_options_count = 0
            
            for field_name, values in new_field_options.items():
                for value in values:
                    if value:
                        try:
                            obj, created = FieldReference.add_option(
                                model=Course,
                                field_name=field_name,
                                value=value,
                                created_by=request.user.username if request.user.is_authenticated else 'excel_upload'
                            )
                            if created:
                                added_options_count += 1
                        except Exception as e:
                            logger.error(f"Error adding {field_name}={value}: {str(e)}")

            # Add audit log for bulk upload
            AuditLog.objects.create(
                action='UPLOAD',
                app_label=Course._meta.app_label,
                model_name=Course.__name__,
                object_repr=f"Bulk upload: {success_count} new, {update_count} updated",
                changes={
                    'filename': file.name,
                    'success_count': success_count,
                    'update_count': update_count,
                    'error_count': error_count,
                    'new_options_added': added_options_count,
                    'created_course_codes': created_course_codes[:10],
                    'updated_course_codes': updated_course_codes[:10]
                },
                ip_address=AuditLog._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                request_path=request.path,
                user_id=request.user.id if request.user.is_authenticated else None,
                user_name=request.user.username if request.user.is_authenticated else ''
            )

            # Prepare response message
            message_parts = []
            if success_count > 0:
                message_parts.append(f"{success_count} new courses added")
            if update_count > 0:
                message_parts.append(f"{update_count} courses updated")
            if added_options_count > 0:
                message_parts.append(f"{added_options_count} new dropdown options added")
            
            message = f"Successfully processed: {', '.join(message_parts)}"
            if error_count > 0:
                message += f". {error_count} errors occurred."
                messages.warning(request, message)
            else:
                messages.success(request, message)

            return JsonResponse({
                'success': True,
                'success_count': success_count,
                'update_count': update_count,
                'error_count': error_count,
                'errors': errors[:20],
                'new_options_added': added_options_count,
                'created_course_codes': created_course_codes,
                'updated_course_codes': updated_course_codes
            })

        except Exception as e:
            logger.error(f"Error in course upload: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    return JsonResponse({'success': False, 'error': 'No file provided'}, status=400)

# -------------------------------------------------------------------------------------------------------------------------

# Export all course data to Excel
# Uses: AuditLog (export log with model info)

@login_required
def course_export(request):
    
    try:
        wb = Workbook()
        ws = wb.active
        ws.title = "Course Data"

        # Style for header
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")

        headers = [
            'Program Type', 'Degree', 'Branch', 'Branch Final', 'Course Category',
            'Course Code', 'Course ID', 'Course Title', 'Semester', 'Part', 'Hours',
            'Credit', 'Internal Mark', 'External Mark', 'Total Mark', 'Examiner Type',
            'Examiner', 'Remark'
        ]

        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment

        courses = Course.objects.all().order_by('id')
        total_count = courses.count()
        
        for row_idx, course in enumerate(courses, start=2):
            ws.cell(row=row_idx, column=1, value=course.program_type or '')
            ws.cell(row=row_idx, column=2, value=course.degree or '')
            ws.cell(row=row_idx, column=3, value=course.branch or '')
            ws.cell(row=row_idx, column=4, value=course.branch_final or '')
            ws.cell(row=row_idx, column=5, value=course.course_category or '')
            ws.cell(row=row_idx, column=6, value=course.course_code or '')
            ws.cell(row=row_idx, column=7, value=course.course_id or '')
            ws.cell(row=row_idx, column=8, value=course.course_title or '')
            ws.cell(row=row_idx, column=9, value=course.semester or '')
            ws.cell(row=row_idx, column=10, value=course.part or '')
            ws.cell(row=row_idx, column=11, value=course.hours or '')
            ws.cell(row=row_idx, column=12, value=str(course.credit) if course.credit else '')
            ws.cell(row=row_idx, column=13, value=course.internal_mark or '')
            ws.cell(row=row_idx, column=14, value=course.external_mark or '')
            ws.cell(row=row_idx, column=15, value=course.total_mark or '')
            ws.cell(row=row_idx, column=16, value=course.examiner_type or '')
            ws.cell(row=row_idx, column=17, value=course.examiner or '')
            ws.cell(row=row_idx, column=18, value=course.remark or '')

        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width

        # Add audit log for export
        AuditLog.objects.create(
            action='EXPORT',
            app_label=Course._meta.app_label,
            model_name=Course.__name__,
            object_repr=f"Course export - {total_count} records",
            changes={
                'total_records': total_count,
                'file_format': 'xlsx',
                'export_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            },
            ip_address=AuditLog._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_path=request.path,
            user_id=request.user.id if request.user.is_authenticated else None,
            user_name=request.user.username if request.user.is_authenticated else ''
        )

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=Course Data.xlsx'
        wb.save(response)
        return response
        
    except Exception as e:
        logger.error(f"Error exporting courses: {str(e)}")
        messages.error(request, f"Error exporting data: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# -------------------------------------------------------------------------------------------------------------------------

# Download sample Excel template for course upload
# No core table usage - just template generation

@login_required
def course_sample(request):
    
    try:
        wb = Workbook()
        ws = wb.active
        ws.title = "Course Template"

        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")

        headers = [
            'Program Type', 'Degree', 'Branch', 'Branch Final', 'Course Category',
            'Course Code*', 'Course ID', 'Course Title*', 'Semester', 'Part', 'Hours',
            'Credit', 'Internal Mark', 'External Mark', 'Total Mark', 'Examiner Type',
            'Examiner', 'Remark'
        ]

        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment

        # Sample data row
        sample_data = [
            'Regular', 'B.Tech', 'Computer Science', 'CSE Final', 'Core',
            'CS101', 'CS101', 'Introduction to Programming', '1', '1', '4',
            '3.0', '40', '60', '100', 'Internal', 'Dr. John Smith', 'Sample course record'
        ]

        for col_idx, value in enumerate(sample_data, start=1):
            ws.cell(row=2, column=col_idx, value=value)

        # Add helpful notes
        notes_row = 4
        ws.cell(row=notes_row, column=1, value="Instructions:")
        ws.cell(row=notes_row, column=2, value="* Required fields")
        
        ws.cell(row=notes_row + 1, column=1, value="Course Code:")
        ws.cell(row=notes_row + 1, column=2, value="Must be unique")
        
        ws.cell(row=notes_row + 2, column=1, value="Course ID:")
        ws.cell(row=notes_row + 2, column=2, value="Must be unique")
        
        ws.cell(row=notes_row + 3, column=1, value="Credit:")
        ws.cell(row=notes_row + 3, column=2, value="Can be integer or decimal (e.g., 3, 3.5)")
        
        ws.cell(row=notes_row + 4, column=1, value="Marks:")
        ws.cell(row=notes_row + 4, column=2, value="Internal + External = Total Mark (auto-calculated if Total Mark not provided)")
        
        ws.cell(row=notes_row + 5, column=1, value="Note:")
        ws.cell(row=notes_row + 5, column=2, value="Remove the sample row before uploading your data")

        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=Course Template.xlsx'
        wb.save(response)
        return response
        
    except Exception as e:
        logger.error(f"Error generating sample template: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# -------------------------------------------------------------------------------------------------------------------------

# Get detailed information of a course
# Uses: SystemSetting (log_detail_views), AuditLog (optional view log)

@require_http_methods(["GET"])
@login_required
def course_details(request, course_code):
    
    try:
        course = get_object_or_404(Course, course_code=course_code)
        
        # Add audit log for view (optional)
        if SystemSetting.get_setting('log_detail_views', False):
            AuditLog.log(
                request=request,
                action='VIEW',
                obj=course,
                object_repr=f"Course details viewed: {course.course_code} - {course.course_title}"
            )
        
        data = {
            'success': True,
            'course': {
                'id': course.id,
                'program_type': course.program_type or '',
                'degree': course.degree or '',
                'branch': course.branch or '',
                'branch_final': course.branch_final or '',
                'course_code': course.course_code,
                'course_id': course.course_id or '',
                'course_category': course.course_category or '',
                'course_title': course.course_title,
                'semester': course.semester or '',
                'part': course.part or '',
                'hours': course.hours or '',
                'credit': str(course.credit) if course.credit else '',
                'internal_mark': course.internal_mark or '',
                'external_mark': course.external_mark or '',
                'total_mark': course.total_mark or '',
                'examiner_type': course.examiner_type or '',
                'examiner': course.examiner or '',
                'remark': course.remark or '',
                'created_at': course.created_at.strftime('%Y-%m-%d %H:%M:%S') if course.created_at else '',
                'updated_at': course.updated_at.strftime('%Y-%m-%d %H:%M:%S') if course.updated_at else '',
            }
        }
        return JsonResponse(data)
        
    except Exception as e:
        logger.error(f"Error getting course details: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)