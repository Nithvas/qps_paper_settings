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
from .models import Staff
from core.models import FieldReference
import json


def staff_list(request):

    staff_queryset = Staff.objects.all()

    # Get sorting parameters
    sort_by = request.GET.get('sort', 'id')
    sort_dir = request.GET.get('dir', 'desc')

    # Validate sort field
    valid_sort_fields = [
        'id', 'staff_id', 'name', 'designation', 'program',
        'department', 'college', 'city', 'district', 'doj',
        'dor', 'phone', 'email', 'bank_account', 'bank_name',
        'ifsc_code', 'created_at'
    ]

    if sort_by in valid_sort_fields:
        if sort_dir == 'desc':
            staff_queryset = staff_queryset.order_by(f'-{sort_by}')
        else:
            staff_queryset = staff_queryset.order_by(sort_by)
    else:
        staff_queryset = staff_queryset.order_by('-id')

    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        staff_queryset = staff_queryset.filter(
            Q(id__icontains=search_query) |
            Q(staff_id__icontains=search_query) |
            Q(name__icontains=search_query) |
            Q(department__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(ifsc_code__icontains=search_query) |
            Q(phone__icontains=search_query) |
            Q(designation__icontains=search_query) |
            Q(program__icontains=search_query) |
            Q(college__icontains=search_query) |
            Q(city__icontains=search_query) |
            Q(district__icontains=search_query) |
            Q(bank_name__icontains=search_query) |
            Q(program_type__icontains=search_query) |
            Q(staff_category__icontains=search_query) |
            Q(dept_category__icontains=search_query) |
            Q(branch__icontains=search_query)
        )

    # Filter functionality
    filters = {
        'designation': request.GET.get('designation', ''),
        'program_type': request.GET.get('program_type', ''),
        'staff_category': request.GET.get('staff_category', ''),
        'dept_category': request.GET.get('dept_category', ''),
        'branch': request.GET.get('branch', ''),
        'program': request.GET.get('program', ''),
        'department': request.GET.get('department', ''),
        'college': request.GET.get('college', ''),
    }

    for field, value in filters.items():
        if value:
            filter_kwargs = {field: value}
            staff_queryset = staff_queryset.filter(**filter_kwargs)

    # Get unique values for filters
    filter_options = {
        'designations': FieldReference.get_options(Staff, 'designation'),
        'program_types': FieldReference.get_options(Staff, 'program_type'),
        'staff_categories': FieldReference.get_options(Staff, 'staff_category'),
        'dept_categories': FieldReference.get_options(Staff, 'dept_category'),
        'branches': FieldReference.get_options(Staff, 'branch'),
        'programs': FieldReference.get_options(Staff, 'program'),
        'departments': FieldReference.get_options(Staff, 'department'),
        'colleges': FieldReference.get_options(Staff, 'college'),
    }

    # Pagination
    paginator = Paginator(staff_queryset, 20)
    page_number = request.GET.get('page', 1)
    staff_page = paginator.get_page(page_number)

    context = {
        'staff': staff_page,
        'total_count': staff_queryset.count(),
        'search': search_query,
        'filters': filters,
        'filter_options': filter_options,
        'current_sort': sort_by,
        'current_dir': sort_dir,
    }

    return render(request, 'staff/staff_list.html', context)


@require_http_methods(["GET", "POST"])
def staff_add(request):

    if request.method == "POST":
        try:
            # Handle both JSON and form data
            if request.content_type == 'application/json':
                data = json.loads(request.body)
            else:
                data = request.POST

            # Create staff member
            staff = Staff()

            # Map form fields to model fields
            fields_mapping = {
                'staff_id': 'staff_id',
                'name': 'name',
                'designation': 'designation',
                'program': 'program',
                'department': 'department',
                'college': 'college',
                'doj': 'doj',
                'dor': 'dor',
                'phone': 'phone',
                'email': 'email',
                'city': 'city',
                'district': 'district',
                'bank_account': 'bank_account',
                'bank_name': 'bank_name',
                'ifsc_code': 'ifsc_code',
                'remark': 'remark',
                'program_type': 'program_type',
                'staff_category': 'staff_category',
                'dept_category': 'dept_category',
                'examiner_type': 'examiner_type',
                'branch': 'branch',
                'branch_final': 'branch_final',
                'place': 'place',
                'qualification': 'qualification',
                'bank_city': 'bank_city',
                'branch_code': 'branch_code',
            }

            for form_field, model_field in fields_mapping.items():
                value = data.get(form_field)
                if value and str(value).strip():
                    # Handle date fields
                    if model_field in ['doj', 'dor'] and value:
                        try:
                            setattr(staff, model_field, datetime.strptime(str(value), '%Y-%m-%d').date())
                        except:
                            setattr(staff, model_field, None)
                    else:
                        setattr(staff, model_field, str(value).strip())

            staff.full_clean()
            staff.save()

            return JsonResponse({'success': True, 'message': 'Staff added successfully', 'id': staff.id})

        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    # GET request - return form
    context = {
        'field_options': {
            'designations': FieldReference.get_options(Staff, 'designation'),
            'program_types': FieldReference.get_options(Staff, 'program_type'),
            'staff_categories': FieldReference.get_options(Staff, 'staff_category'),
            'dept_categories': FieldReference.get_options(Staff, 'dept_category'),
            'examiner_types': FieldReference.get_options(Staff, 'examiner_type'),
            'branches': FieldReference.get_options(Staff, 'branch'),
            'branch_finals': FieldReference.get_options(Staff, 'branch_final'),
            'programs': FieldReference.get_options(Staff, 'program'),
            'departments': FieldReference.get_options(Staff, 'department'),
            'colleges': FieldReference.get_options(Staff, 'college'),
            'qualifications': FieldReference.get_options(Staff, 'qualification'),
            'cities': FieldReference.get_options(Staff, 'city'),
            'districts': FieldReference.get_options(Staff, 'district'),
            'bank_names': FieldReference.get_options(Staff, 'bank_name'),
            'bank_cities': FieldReference.get_options(Staff, 'bank_city'),
        }
    }
    return render(request, 'staff/staff_form.html', context)


@require_http_methods(["GET", "POST"])
def staff_edit(request, phone):

    staff = get_object_or_404(Staff, phone=phone)

    if request.method == "GET":
        data = {
            'success': True,
            'staff': {
                'id': staff.id,
                'staff_id': staff.staff_id,
                'name': staff.name,
                'designation': staff.designation,
                'program': staff.program,
                'department': staff.department,
                'college': staff.college,
                'doj': staff.doj.strftime('%Y-%m-%d') if staff.doj else '',
                'dor': staff.dor.strftime('%Y-%m-%d') if staff.dor else '',
                'phone': staff.phone,
                'email': staff.email,
                'city': staff.city,
                'district': staff.district,
                'bank_account': staff.bank_account,
                'bank_name': staff.bank_name,
                'ifsc_code': staff.ifsc_code,
                'remark': staff.remark,
                'program_type': staff.program_type or '',
                'staff_category': staff.staff_category or '',
                'dept_category': staff.dept_category or '',
                'examiner_type': staff.examiner_type or '',
                'branch': staff.branch or '',
                'branch_final': staff.branch_final or '',
                'place': staff.place or '',
                'qualification': staff.qualification or '',
                'bank_city': staff.bank_city or '',
                'branch_code': staff.branch_code or '',
            }
        }
        return JsonResponse(data)

    elif request.method == "POST":
        try:
            fields = [
                'staff_id', 'name', 'designation', 'email', 'program',
                'department', 'college', 'doj', 'dor', 'city', 'district',
                'bank_account', 'bank_name', 'ifsc_code', 'remark',
                'program_type', 'staff_category', 'dept_category',
                'examiner_type', 'branch', 'branch_final', 'place',
                'qualification', 'bank_city', 'branch_code'
            ]

            for field in fields:
                value = request.POST.get(field)
                if value and value.strip():
                    if field in ['doj', 'dor'] and value:
                        try:
                            setattr(staff, field, datetime.strptime(str(value), '%Y-%m-%d').date())
                        except:
                            setattr(staff, field, None)
                    else:
                        setattr(staff, field, str(value).strip())
                else:
                    setattr(staff, field, None)

            staff.full_clean()
            staff.save()

            return JsonResponse({'success': True, 'message': 'Staff updated successfully'})

        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)


@require_http_methods(["POST"])
def staff_delete(request, phone):
    try:
        staff = get_object_or_404(Staff, phone=phone)
        staff.delete()
        return JsonResponse({'success': True, 'message': 'Staff deleted successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@require_http_methods(["POST"])
def staff_upload(request):

    if request.method == "POST" and request.FILES.get('file'):

        try:
            file = request.FILES['file']
            wb = load_workbook(file)
            ws = wb.active

            success_count = 0
            error_count = 0
            errors = []

            for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                try:
                    if not row[6]:  # Phone column index
                        errors.append(f"Row {row_idx}: Phone number is required")
                        error_count += 1
                        continue

                    staff_data = {
                        'staff_id': row[0],
                        'name': row[1],
                        'designation': row[2],
                        'program': row[3],
                        'department': row[4],
                        'college': row[5],
                        'phone': str(row[6]) if row[6] else None,
                        'email': row[7],
                        'doj': row[8] if isinstance(row[8], datetime) else row[8] if row[8] else None,
                        'dor': row[9] if isinstance(row[9], datetime) else row[9] if row[9] else None,
                        'city': row[10],
                        'district': row[11],
                        'bank_account': str(row[12]) if row[12] else None,
                        'bank_name': row[13],
                        'ifsc_code': row[14],
                        'remark': row[15],
                        'program_type': row[16] if len(row) > 16 else None,
                        'staff_category': row[17] if len(row) > 17 else None,
                        'dept_category': row[18] if len(row) > 18 else None,
                        'examiner_type': row[19] if len(row) > 19 else None,
                        'branch': row[20] if len(row) > 20 else None,
                        'branch_final': row[21] if len(row) > 21 else None,
                        'place': row[22] if len(row) > 22 else None,
                        'qualification': row[23] if len(row) > 23 else None,
                        'bank_city': row[24] if len(row) > 24 else None,
                        'branch_code': row[25] if len(row) > 25 else None,
                    }

                    staff, created = Staff.objects.update_or_create(
                        phone=staff_data['phone'],
                        defaults=staff_data
                    )
                    success_count += 1

                except Exception as e:
                    error_count += 1
                    errors.append(f"Row {row_idx}: {str(e)}")

            if error_count > 0:
                messages.warning(request, f"Uploaded {success_count} records with {error_count} errors")
            else:
                messages.success(request, f"Successfully uploaded {success_count} records")

            return JsonResponse({
                'success': True,
                'success_count': success_count,
                'error_count': error_count,
                'errors': errors
            })

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    return JsonResponse({'success': False, 'error': 'No file provided'})


def staff_export(request):

    wb = Workbook()
    ws = wb.active
    ws.title = "Staff Data"

    # Style for header
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")

    headers = [
        'ID', 'Staff ID', 'Name', 'Designation', 'Program', 'Department', 'College',
        'Phone', 'Email', 'DOJ', 'DOR', 'City', 'District', 'Bank Account',
        'Bank Name', 'IFSC Code', 'Remark', 'Program Type', 'Staff Category',
        'Dept Category', 'Examiner Type', 'Branch', 'Branch Final', 'Place',
        'Qualification', 'Bank City', 'Branch Code'
    ]

    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment

    staff_members = Staff.objects.all().order_by('id')
    for row_idx, staff in enumerate(staff_members, start=2):
        ws.cell(row=row_idx, column=1, value=staff.id)
        ws.cell(row=row_idx, column=2, value=staff.staff_id)
        ws.cell(row=row_idx, column=3, value=staff.name)
        ws.cell(row=row_idx, column=4, value=staff.designation or '')
        ws.cell(row=row_idx, column=5, value=staff.program or '')
        ws.cell(row=row_idx, column=6, value=staff.department or '')
        ws.cell(row=row_idx, column=7, value=staff.college or '')
        ws.cell(row=row_idx, column=8, value=staff.phone or '')
        ws.cell(row=row_idx, column=9, value=staff.email or '')
        ws.cell(row=row_idx, column=10, value=staff.doj.strftime('%Y-%m-%d') if staff.doj else '')
        ws.cell(row=row_idx, column=11, value=staff.dor.strftime('%Y-%m-%d') if staff.dor else '')
        ws.cell(row=row_idx, column=12, value=staff.city or '')
        ws.cell(row=row_idx, column=13, value=staff.district or '')
        ws.cell(row=row_idx, column=14, value=staff.bank_account or '')
        ws.cell(row=row_idx, column=15, value=staff.bank_name or '')
        ws.cell(row=row_idx, column=16, value=staff.ifsc_code or '')
        ws.cell(row=row_idx, column=17, value=staff.remark or '')
        ws.cell(row=row_idx, column=18, value=staff.program_type or '')
        ws.cell(row=row_idx, column=19, value=staff.staff_category or '')
        ws.cell(row=row_idx, column=20, value=staff.dept_category or '')
        ws.cell(row=row_idx, column=21, value=staff.examiner_type or '')
        ws.cell(row=row_idx, column=22, value=staff.branch or '')
        ws.cell(row=row_idx, column=23, value=staff.branch_final or '')
        ws.cell(row=row_idx, column=24, value=staff.place or '')
        ws.cell(row=row_idx, column=25, value=staff.qualification or '')
        ws.cell(row=row_idx, column=26, value=staff.bank_city or '')
        ws.cell(row=row_idx, column=27, value=staff.branch_code or '')

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
    response['Content-Disposition'] = 'attachment; filename=Staff Data.xlsx'
    wb.save(response)
    return response


def staff_sample(request):

    wb = Workbook()
    ws = wb.active
    ws.title = "Staff Template"

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")

    headers = [
        'Staff ID*', 'Name*', 'Designation', 'Program', 'Department', 'College',
        'Phone*', 'Email', 'DOJ (YYYY-MM-DD)', 'DOR (YYYY-MM-DD)', 'City', 'District',
        'Bank Account', 'Bank Name', 'IFSC Code', 'Remark', 'Program Type', 'Staff Category',
        'Dept Category', 'Examiner Type', 'Branch', 'Branch Final', 'Place',
        'Qualification', 'Bank City', 'Branch Code'
    ]

    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment

    sample_data = [
        'STF001', 'John Doe', 'Professor', 'B.Tech', 'Computer Science',
        'Engineering College', '9876543210', 'john@example.com', '2020-01-01',
        '', 'Mumbai', 'Mumbai', '1234567890', 'State Bank of India', 'SBIN0012345',
        'Sample record', 'Regular', 'Teaching', 'Engineering', 'Internal',
        'CSE', 'CSE-Final', 'Mumbai', 'PhD', 'Mumbai', '1234'
    ]

    for col_idx, value in enumerate(sample_data, start=1):
        ws.cell(row=2, column=col_idx, value=value)

    # Add helpful comments/notes
    ws.cell(row=4, column=1, value="Note:")
    ws.cell(row=4, column=2, value="* Required fields")
    ws.cell(row=5, column=1, value="Date format:")
    ws.cell(row=5, column=2, value="YYYY-MM-DD (e.g., 2024-01-15)")
    ws.cell(row=6, column=1, value="Phone:")
    ws.cell(row=6, column=2, value="Must be 10 digits, unique")
    ws.cell(row=7, column=1, value="IFSC Code:")
    ws.cell(row=7, column=2, value="11 characters (e.g., SBIN0012345)")

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
    response['Content-Disposition'] = 'attachment; filename=staff_template.xlsx'
    wb.save(response)
    return response


def staff_details(request, phone):

    try:
        staff = get_object_or_404(Staff, phone=phone)
        data = {
            'success': True,
            'staff': {
                'id': staff.id,
                'staff_id': staff.staff_id,
                'name': staff.name,
                'designation': staff.designation,
                'program': staff.program,
                'department': staff.department,
                'college': staff.college,
                'doj': staff.doj.strftime('%Y-%m-%d') if staff.doj else '',
                'dor': staff.dor.strftime('%Y-%m-%d') if staff.dor else '',
                'phone': staff.phone,
                'email': staff.email,
                'city': staff.city,
                'district': staff.district,
                'place': staff.place,
                'qualification': staff.qualification,
                'bank_account': staff.bank_account,
                'bank_name': staff.bank_name,
                'bank_city': staff.bank_city,
                'branch_code': staff.branch_code,
                'ifsc_code': staff.ifsc_code,
                'remark': staff.remark,
                'program_type': staff.program_type,
                'staff_category': staff.staff_category,
                'dept_category': staff.dept_category,
                'examiner_type': staff.examiner_type,
                'branch': staff.branch,
                'branch_final': staff.branch_final,
                'created_at': staff.created_at.strftime('%Y-%m-%d %H:%M:%S') if staff.created_at else '',
                'updated_at': staff.updated_at.strftime('%Y-%m-%d %H:%M:%S') if staff.updated_at else '',
            }
        }
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)