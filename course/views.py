from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.core.exceptions import ValidationError
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from datetime import datetime
from .models import Course
from core.models import FieldReference, AuditLog, SystemSetting
import json

def course_list(request):
    
    course_queryset = Course.objects.all()

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

    # Get unique values for filters
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
    paginator = Paginator(course_queryset, 20)
    page_number = request.GET.get('page', 1)
    course_page = paginator.get_page(page_number)

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

@require_http_methods(["GET"])
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
    }
    
    model_field = field_mapping.get(field_name)
    if not model_field:
        return JsonResponse({'success': False, 'error': f'Invalid field name: {field_name}'}, status=400)
    
    try:
        options = FieldReference.get_options(
            model=Course,
            field_name=model_field,
            search=search_query
        )
        
        return JsonResponse({
            'success': True,
            'options': options,
            'total_count': len(options)
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@require_http_methods(["GET", "POST"])
def course_add(request):
    
    if request.method == "POST":
        try:
            # Handle both JSON and form data
            if request.content_type == 'application/json':
                data = json.loads(request.body)
            else:
                data = request.POST

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

            for form_field, model_field in fields_mapping.items():
                value = data.get(form_field)
                if value and str(value).strip():
                    # Handle numeric fields
                    if model_field in ['hours', 'internal_mark', 'external_mark', 'total_mark']:
                        try:
                            setattr(course, model_field, int(value))
                        except ValueError:
                            setattr(course, model_field, None)
                    elif model_field == 'credit':
                        try:
                            setattr(course, model_field, float(value))
                        except ValueError:
                            setattr(course, model_field, None)
                    else:
                        setattr(course, model_field, str(value).strip())

            course.full_clean()
            course.save()

            return JsonResponse({'success': True, 'message': 'Course added successfully', 'id': course.id})

        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    # GET request - return form
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
    return render(request, 'courses/course_form.html', context)

@require_http_methods(["GET", "POST"])
def course_edit(request, course_code):

    course = get_object_or_404(Course, course_code=course_code)

    if request.method == "GET":
        data = {
            'success': True,
            'course': {
                'id': course.id,
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
                'credit': str(course.credit) if course.credit else '',
                'internal_mark': course.internal_mark,
                'external_mark': course.external_mark,
                'total_mark': course.total_mark,
                'examiner_type': course.examiner_type,
                'examiner': course.examiner or '',
                'remark': course.remark or '',
            }
        }
        return JsonResponse(data)

    elif request.method == "POST":
        try:
            fields = [
                'program_type', 'degree', 'branch', 'branch_final',
                'course_code', 'course_id', 'course_category', 'course_title',
                'semester', 'part', 'hours', 'credit', 'internal_mark',
                'external_mark', 'total_mark', 'examiner_type', 'examiner', 'remark'
            ]

            for field in fields:
                value = request.POST.get(field)
                if value and str(value).strip():
                    if field in ['hours', 'internal_mark', 'external_mark', 'total_mark']:
                        try:
                            setattr(course, field, int(value))
                        except ValueError:
                            setattr(course, field, None)
                    elif field == 'credit':
                        try:
                            setattr(course, field, float(value))
                        except ValueError:
                            setattr(course, field, None)
                    else:
                        setattr(course, field, str(value).strip())
                else:
                    if field not in ['remark', 'examiner']:  # These can be null
                        setattr(course, field, None)
                    else:
                        setattr(course, field, None)

            course.full_clean()
            course.save()

            return JsonResponse({'success': True, 'message': 'Course updated successfully'})

        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

@require_http_methods(["POST"])
def course_delete(request, course_code):
    try:
        course = get_object_or_404(Course, course_code=course_code)
        course.delete()
        return JsonResponse({'success': True, 'message': 'Course deleted successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@require_http_methods(["POST"])
def course_upload(request):
    
    if request.method == "POST" and request.FILES.get('file'):

        try:
            file = request.FILES['file']
            wb = load_workbook(file)
            ws = wb.active

            success_count = 0
            error_count = 0
            errors = []

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

            # Helper function to safely convert to integer (handles decimals)
            def safe_int(value, default=0):
                if value is None or str(value).strip() == '':
                    return default
                try:
                    return int(float(value))
                except (ValueError, TypeError):
                    return default

            # Helper function to safely convert to float (for credit)
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

                    row_list = list(row) if row else []
                    
                    if len(row_list) <= 5 or not row_list[5]:
                        errors.append(f"Row {row_idx}: Course code is required")
                        error_count += 1
                        continue

                    if len(row_list) <= 7 or not row_list[7]:
                        errors.append(f"Row {row_idx}: Course title is required")
                        error_count += 1
                        continue

                    # Collect field options 
                    if len(row_list) > 0 and row_list[0]: 
                        new_field_options['program_type'].add(safe_str(row_list[0]))
                    if len(row_list) > 1 and row_list[1]: 
                        new_field_options['degree'].add(safe_str(row_list[1]))
                    if len(row_list) > 2 and row_list[2]: 
                        new_field_options['branch'].add(safe_str(row_list[2]))
                    if len(row_list) > 3 and row_list[3]: 
                        new_field_options['branch_final'].add(safe_str(row_list[3]))
                    if len(row_list) > 4 and row_list[4]: 
                        new_field_options['course_category'].add(safe_str(row_list[4]))
                    if len(row_list) > 8 and row_list[8]: 
                        new_field_options['semester'].add(safe_str(row_list[8]))
                    if len(row_list) > 9 and row_list[9]: 
                        new_field_options['part'].add(safe_str(row_list[9]))
                    if len(row_list) > 15 and row_list[15]: 
                        new_field_options['examiner_type'].add(safe_str(row_list[15]))
                    if len(row_list) > 16 and row_list[16]: 
                        new_field_options['examiner'].add(safe_str(row_list[16]))

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
                        'total_mark': safe_int(row_list[14] if len(row_list) > 14 else None),
                        'examiner_type': safe_str(row_list[15] if len(row_list) > 15 else None) or None,
                        'examiner': safe_str(row_list[16] if len(row_list) > 16 else None) or None,
                        'remark': safe_str(row_list[17] if len(row_list) > 17 else None) or None,   
                    }

                    # Update or create course
                    course, created = Course.objects.update_or_create(
                        course_code=course_data['course_code'],
                        defaults=course_data
                    )
                    success_count += 1

                except Exception as e:
                    error_count += 1
                    errors.append(f"Row {row_idx}: {str(e)}")
                    print(f"Error on row {row_idx}: {str(e)}")  

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
                            print(f"Error adding {field_name}={value}: {str(e)}")

            if error_count > 0:
                messages.warning(request, f"Uploaded {success_count} records with {error_count} errors")
            else:
                messages.success(request, f"Successfully uploaded {success_count} records")

            return JsonResponse({
                'success': True,
                'success_count': success_count,
                'error_count': error_count,
                'errors': errors[:50],  
                'new_options_added': added_options_count
            })

        except Exception as e:
            import traceback
            return JsonResponse({
                'success': False, 
                'error': str(e),
                'traceback': traceback.format_exc()
            })

    return JsonResponse({'success': False, 'error': 'No file provided'})

def course_export(request):
    
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

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=Course Data.xlsx'
    wb.save(response)
    return response

def course_sample(request):
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Course Template"

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

    sample_data = [
        'Regular', 'B.Tech', 'Computer Science', 'CSE Final', 'Core',
        'CS101', 'CS101', 'Introduction to Programming', '1', '1', '4',
        '3.0', '40', '60', '100', 'Internal', 'Dr. John Smith', 'Sample course record'
    ]

    for col_idx, value in enumerate(sample_data, start=1):
        ws.cell(row=2, column=col_idx, value=value)

    # Add helpful comments/notes
    ws.cell(row=4, column=1, value="Note:")
    ws.cell(row=4, column=2, value="* Required fields")
    ws.cell(row=5, column=1, value="Course Code:")
    ws.cell(row=5, column=2, value="Must be unique")
    ws.cell(row=6, column=1, value="Credit:")
    ws.cell(row=6, column=2, value="Can be integer or decimal (e.g., 3, 3.5)")
    ws.cell(row=7, column=1, value="Marks:")
    ws.cell(row=7, column=2, value="Internal + External = Total Mark")

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

def course_details(request, course_code):
    """Get detailed information of a specific course"""
    
    try:
        course = get_object_or_404(Course, course_code=course_code)
        data = {
            'success': True,
            'course': {
                'id': course.id,
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
                'credit': str(course.credit) if course.credit else '',
                'internal_mark': course.internal_mark,
                'external_mark': course.external_mark,
                'total_mark': course.total_mark,
                'examiner_type': course.examiner_type,
                'examiner': course.examiner or '',
                'remark': course.remark or '',
                'created_at': course.created_at.strftime('%Y-%m-%d %H:%M:%S') if course.created_at else '',
                'updated_at': course.updated_at.strftime('%Y-%m-%d %H:%M:%S') if course.updated_at else '',
            }
        }
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)