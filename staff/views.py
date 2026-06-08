# staff/views.py
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
from .models import Staff
from core.models import FieldReference, AuditLog, SystemSetting
import json
import logging

logger = logging.getLogger(__name__)

# -------------------------------------------------------------------------------------------------------------------------

# Display paginated list of staff with search, filters, and sorting
# Uses: SystemSetting (pagination, logging), AuditLog (optional), FieldReference (filters)

@login_required
def staff_list(request):
    
    staff_queryset = Staff.objects.all()

    # Get pagination setting from database
    items_per_page = SystemSetting.get_setting('staff_items_per_page', 20)
    
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

    # Get unique values for filters from FieldReference
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
    paginator = Paginator(staff_queryset, items_per_page)
    page_number = request.GET.get('page', 1)
    staff_page = paginator.get_page(page_number)

    # Audit log for view (optional - can be disabled for performance)
    if SystemSetting.get_setting('log_list_views', False):
        AuditLog.log(
            request=request,
            action='VIEW',
            obj=None,
            object_repr=f"Staff list viewed - Page {page_number}",
            changes={
                'search': search_query,
                'filters': filters,
                'total_count': staff_queryset.count()
            }
        )

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

# -------------------------------------------------------------------------------------------------------------------------

# AJAX endpoint to get field options dynamically from FieldReference
# Uses: FieldReference (read)

@require_http_methods(["GET"])
def get_field_options(request):
  
    field_name = request.GET.get('field')
    search_query = request.GET.get('search', '')
    
    if not field_name:
        return JsonResponse({'success': False, 'error': 'Field name is required'}, status=400)
    
    # Map frontend field names to actual model field names
    field_mapping = {
        'designation': 'designation',
        'program_type': 'program_type',
        'staff_category': 'staff_category',
        'dept_category': 'dept_category',
        'examiner_type': 'examiner_type',
        'branch': 'branch',
        'branch_final': 'branch_final',
        'program': 'program',
        'department': 'department',
        'college': 'college',
        'qualification': 'qualification',
        'city': 'city',
        'district': 'district',
        'bank_name': 'bank_name',
        'bank_city': 'bank_city',
        'place': 'place',
    }
    
    model_field = field_mapping.get(field_name)
    if not model_field:
        return JsonResponse({'success': False, 'error': f'Invalid field name: {field_name}'}, status=400)
    
    try:
        # Get options from FieldReference table
        options = FieldReference.get_options(
            model=Staff,
            field_name=model_field,
            search=search_query
        )
        
        return JsonResponse({
            'success': True,
            'options': options,
            'total_count': len(options)
        })
        
    except Exception as e:
        logger.error(f"Error getting field options: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# -------------------------------------------------------------------------------------------------------------------------

# Add new staff member
# Uses: FieldReference (GET - form options), AuditLog (POST - create log)

@require_http_methods(["GET", "POST"])
@login_required
def staff_add(request):
   
    if request.method == "POST":
        try:
            # Handle both JSON and form data
            if request.content_type == 'application/json':
                data = json.loads(request.body)
            else:
                data = request.POST

            # Check if phone already exists
            phone = data.get('phone')
            if phone and Staff.objects.filter(phone=phone).exists():
                return JsonResponse({'success': False, 'error': 'Phone number already exists'}, status=400)
            
            # Check if staff_id already exists
            staff_id = data.get('staff_id')
            if staff_id and Staff.objects.filter(staff_id=staff_id).exists():
                return JsonResponse({'success': False, 'error': 'Staff ID already exists'}, status=400)

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

            # Store changes for audit
            changes = {}
            
            for form_field, model_field in fields_mapping.items():
                value = data.get(form_field)
                if value and str(value).strip():
                    # Handle date fields
                    if model_field in ['doj', 'dor'] and value:
                        try:
                            date_value = datetime.strptime(str(value), '%Y-%m-%d').date()
                            setattr(staff, model_field, date_value)
                            changes[model_field] = str(date_value)
                        except:
                            setattr(staff, model_field, None)
                    else:
                        str_value = str(value).strip()
                        setattr(staff, model_field, str_value)
                        changes[model_field] = str_value
                else:
                    setattr(staff, model_field, None)

            staff.full_clean()
            staff.save()
            
            # Add audit log
            AuditLog.log(
                request=request,
                action='CREATE',
                obj=staff,
                object_repr=f"{staff.staff_id} - {staff.name}",
                changes=changes
            )
            
            return JsonResponse({
                'success': True, 
                'message': 'Staff added successfully', 
                'id': staff.id
            })

        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            logger.error(f"Error adding staff: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    # GET request - return form with options from FieldReference
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

# -------------------------------------------------------------------------------------------------------------------------

# Edit existing staff member
# Uses: AuditLog (POST - update log)

@require_http_methods(["GET", "POST"])
@login_required
def staff_edit(request, phone):
   
    staff = get_object_or_404(Staff, phone=phone)

    if request.method == "GET":
        # Return staff data as JSON for editing
        data = {
            'success': True,
            'staff': {
                'id': staff.id,
                'staff_id': staff.staff_id,
                'name': staff.name,
                'designation': staff.designation or '',
                'program': staff.program or '',
                'department': staff.department or '',
                'college': staff.college or '',
                'doj': staff.doj.strftime('%Y-%m-%d') if staff.doj else '',
                'dor': staff.dor.strftime('%Y-%m-%d') if staff.dor else '',
                'phone': staff.phone,
                'email': staff.email or '',
                'city': staff.city or '',
                'district': staff.district or '',
                'bank_account': staff.bank_account or '',
                'bank_name': staff.bank_name or '',
                'ifsc_code': staff.ifsc_code or '',
                'remark': staff.remark or '',
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
            # Store old values for audit
            old_values = {
                'staff_id': staff.staff_id,
                'name': staff.name,
                'designation': staff.designation,
                'program': staff.program,
                'department': staff.department,
                'college': staff.college,
                'phone': staff.phone,
                'email': staff.email,
                'city': staff.city,
                'district': staff.district,
                'bank_account': staff.bank_account,
                'bank_name': staff.bank_name,
                'ifsc_code': staff.ifsc_code,
                'program_type': staff.program_type,
                'staff_category': staff.staff_category,
                'dept_category': staff.dept_category,
                'examiner_type': staff.examiner_type,
                'branch': staff.branch,
                'branch_final': staff.branch_final,
                'place': staff.place,
                'qualification': staff.qualification,
                'bank_city': staff.bank_city,
                'branch_code': staff.branch_code,
            }
            
            fields = [
                'staff_id', 'name', 'designation', 'email', 'program',
                'department', 'college', 'doj', 'dor', 'city', 'district',
                'bank_account', 'bank_name', 'ifsc_code', 'remark',
                'program_type', 'staff_category', 'dept_category',
                'examiner_type', 'branch', 'branch_final', 'place',
                'qualification', 'bank_city', 'branch_code'
            ]

            changes = {}
            
            for field in fields:
                value = request.POST.get(field)
                if value and value.strip():
                    if field in ['doj', 'dor'] and value:
                        try:
                            date_value = datetime.strptime(str(value), '%Y-%m-%d').date()
                            setattr(staff, field, date_value)
                            if str(old_values.get(field)) != str(date_value):
                                changes[field] = {'old': str(old_values.get(field)), 'new': str(date_value)}
                        except:
                            setattr(staff, field, None)
                    else:
                        str_value = str(value).strip()
                        setattr(staff, field, str_value)
                        if str(old_values.get(field)) != str_value:
                            changes[field] = {'old': str(old_values.get(field)), 'new': str_value}
                else:
                    setattr(staff, field, None)
                    if old_values.get(field) is not None:
                        changes[field] = {'old': str(old_values.get(field)), 'new': None}

            # FIXED: Check if phone is being changed and if new phone exists
            new_phone = request.POST.get('phone')
            if new_phone and new_phone.strip():
                new_phone = new_phone.strip()
                # Only check if the phone number is actually changing
                if new_phone != old_values['phone']:
                    if Staff.objects.filter(phone=new_phone).exists():
                        return JsonResponse({'success': False, 'error': 'Phone number already exists'}, status=400)
                    staff.phone = new_phone
                    changes['phone'] = {'old': old_values['phone'], 'new': new_phone}
            else:
                # Phone is required, so this should not happen
                return JsonResponse({'success': False, 'error': 'Phone number is required'}, status=400)
            
            # FIXED: Check if staff_id is being changed and if new staff_id exists
            new_staff_id = request.POST.get('staff_id')
            if new_staff_id and new_staff_id.strip():
                new_staff_id = new_staff_id.strip()
                # Only check if the staff_id is actually changing
                if new_staff_id != old_values['staff_id']:
                    if Staff.objects.filter(staff_id=new_staff_id).exists():
                        return JsonResponse({'success': False, 'error': 'Staff ID already exists'}, status=400)
                    staff.staff_id = new_staff_id
                    changes['staff_id'] = {'old': old_values['staff_id'], 'new': new_staff_id}
            else:
                # Staff ID is required
                return JsonResponse({'success': False, 'error': 'Staff ID is required'}, status=400)

            staff.full_clean()
            staff.save()
            
            # Add audit log if there are changes
            if changes:
                AuditLog.log(
                    request=request,
                    action='UPDATE',
                    obj=staff,
                    object_repr=f"{staff.staff_id} - {staff.name}",
                    changes=changes
                )
            
            return JsonResponse({'success': True, 'message': 'Staff updated successfully'})

        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            logger.error(f"Error editing staff: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

# -------------------------------------------------------------------------------------------------------------------------

# Delete staff member
# Uses: SystemSetting (soft_delete setting), AuditLog (delete log)

@require_http_methods(["DELETE", "POST"])
@login_required
def staff_delete(request, phone):
    
    try:
        staff = get_object_or_404(Staff, phone=phone)
        
        # Store staff info before deletion for audit
        staff_info = f"{staff.staff_id} - {staff.name}"
        staff_data = {
            'staff_id': staff.staff_id,
            'name': staff.name,
            'phone': staff.phone,
            'email': staff.email,
            'department': staff.department,
            'designation': staff.designation
        }
        
        # Check if soft delete is enabled
        soft_delete = SystemSetting.get_setting('soft_delete_staff', False)
        
        if soft_delete:
            # Implement soft delete if you have a is_active field
            staff.is_active = False
            staff.save()
            message = 'Staff member soft deleted successfully'
            action = 'UPDATE' 
            
            # Correct way to call log method - pass request as first parameter
            AuditLog.log(
                request=request,
                action=action,
                obj=staff,
                changes=staff_data,
                object_repr=f"Soft deleted: {staff_info}"
            )
        else:
            # Store information before deletion
            staff_id = str(staff.id) 
            staff_app_label = staff._meta.app_label
            staff_model_name = staff.__class__.__name__
            
            # Hard delete
            staff.delete()
            message = 'Staff member deleted successfully'
            action = 'DELETE'
            
            # Create audit log entry manually for hard delete
            # Since the object is deleted, we can't use obj parameter
            audit_data = {
                'action': action,
                'changes': staff_data,
                'app_label': staff_app_label,
                'model_name': staff_model_name,
                'object_id': staff_id,
                'object_repr': staff_info,
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
        logger.error(f"Error deleting staff: {str(e)}")
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
            'designation', 'program', 'department', 'college', 'city', 'district',
            'bank_name', 'program_type', 'staff_category', 'dept_category',
            'examiner_type', 'branch', 'branch_final', 'place', 'qualification', 'bank_city'
        ]
        
        if field_name not in valid_fields:
            return JsonResponse({'success': False, 'error': 'Invalid field name'}, status=400)
        
        obj, created = FieldReference.add_option(
            model=Staff,
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

# Upload staff data from Excel file
# Uses: FieldReference (create new options), AuditLog (bulk upload log)

@require_http_methods(["POST"])
@login_required
def staff_upload(request):
    
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
            created_staff_ids = []
            updated_staff_ids = []

            new_field_options = {
                'designation': set(),
                'program': set(),
                'department': set(),
                'college': set(),
                'city': set(),
                'district': set(),
                'bank_name': set(),
                'program_type': set(),
                'staff_category': set(),
                'dept_category': set(),
                'examiner_type': set(),
                'branch': set(),
                'branch_final': set(),
                'place': set(),
                'qualification': set(),
                'bank_city': set(),
            }

            for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                try:
                    # Skip empty rows
                    if not row or not any(row):
                        continue
                        
                    if not row[6]:  # Phone number is required
                        errors.append(f"Row {row_idx}: Phone number is required")
                        error_count += 1
                        continue

                    # Collect field options for FieldReference
                    if row[2]: new_field_options['designation'].add(str(row[2]).strip())
                    if row[3]: new_field_options['program'].add(str(row[3]).strip())
                    if row[4]: new_field_options['department'].add(str(row[4]).strip())
                    if row[5]: new_field_options['college'].add(str(row[5]).strip())
                    if row[10]: new_field_options['city'].add(str(row[10]).strip())
                    if row[11]: new_field_options['district'].add(str(row[11]).strip())
                    if row[13]: new_field_options['bank_name'].add(str(row[13]).strip())
                    if len(row) > 16 and row[16]: new_field_options['program_type'].add(str(row[16]).strip())
                    if len(row) > 17 and row[17]: new_field_options['staff_category'].add(str(row[17]).strip())
                    if len(row) > 18 and row[18]: new_field_options['dept_category'].add(str(row[18]).strip())
                    if len(row) > 19 and row[19]: new_field_options['examiner_type'].add(str(row[19]).strip())
                    if len(row) > 20 and row[20]: new_field_options['branch'].add(str(row[20]).strip())
                    if len(row) > 21 and row[21]: new_field_options['branch_final'].add(str(row[21]).strip())
                    if len(row) > 22 and row[22]: new_field_options['place'].add(str(row[22]).strip())
                    if len(row) > 23 and row[23]: new_field_options['qualification'].add(str(row[23]).strip())
                    if len(row) > 24 and row[24]: new_field_options['bank_city'].add(str(row[24]).strip())

                    staff_data = {
                        'staff_id': str(row[0]).strip() if row[0] else None,
                        'name': str(row[1]).strip() if row[1] else None,
                        'designation': str(row[2]).strip() if row[2] else None,
                        'program': str(row[3]).strip() if row[3] else None,
                        'department': str(row[4]).strip() if row[4] else None,
                        'college': str(row[5]).strip() if row[5] else None,
                        'phone': str(row[6]).strip() if row[6] else None,
                        'email': str(row[7]).strip() if row[7] else None,
                        'doj': row[8] if isinstance(row[8], datetime) else (datetime.strptime(str(row[8]), '%Y-%m-%d').date() if row[8] else None),
                        'dor': row[9] if isinstance(row[9], datetime) else (datetime.strptime(str(row[9]), '%Y-%m-%d').date() if row[9] else None),
                        'city': str(row[10]).strip() if row[10] else None,
                        'district': str(row[11]).strip() if row[11] else None,
                        'bank_account': str(row[12]).strip() if row[12] else None,
                        'bank_name': str(row[13]).strip() if row[13] else None,
                        'ifsc_code': str(row[14]).strip() if row[14] else None,
                        'remark': str(row[15]).strip() if row[15] else None,
                        'program_type': str(row[16]).strip() if len(row) > 16 and row[16] else None,
                        'staff_category': str(row[17]).strip() if len(row) > 17 and row[17] else None,
                        'dept_category': str(row[18]).strip() if len(row) > 18 and row[18] else None,
                        'examiner_type': str(row[19]).strip() if len(row) > 19 and row[19] else None,
                        'branch': str(row[20]).strip() if len(row) > 20 and row[20] else None,
                        'branch_final': str(row[21]).strip() if len(row) > 21 and row[21] else None,
                        'place': str(row[22]).strip() if len(row) > 22 and row[22] else None,
                        'qualification': str(row[23]).strip() if len(row) > 23 and row[23] else None,
                        'bank_city': str(row[24]).strip() if len(row) > 24 and row[24] else None,
                        'branch_code': str(row[25]).strip() if len(row) > 25 and row[25] else None,
                    }

                    # Validate required fields
                    if not staff_data['staff_id']:
                        errors.append(f"Row {row_idx}: Staff ID is required")
                        error_count += 1
                        continue
                    
                    if not staff_data['name']:
                        errors.append(f"Row {row_idx}: Name is required")
                        error_count += 1
                        continue

                    # Check if record exists
                    existing_staff = Staff.objects.filter(phone=staff_data['phone']).first()
                    
                    if existing_staff:
                        # Update existing record
                        for key, value in staff_data.items():
                            if value is not None:
                                setattr(existing_staff, key, value)
                        existing_staff.save()
                        update_count += 1
                        updated_staff_ids.append(existing_staff.id)
                    else:
                        # Create new record
                        staff = Staff(**staff_data)
                        staff.full_clean()
                        staff.save()
                        success_count += 1
                        created_staff_ids.append(staff.id)

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
                                model=Staff,
                                field_name=field_name,
                                value=value,
                                created_by=request.user.username if request.user.is_authenticated else 'excel_upload'
                            )
                            if created:
                                added_options_count += 1
                        except Exception as e:
                            logger.error(f"Error adding {field_name}={value}: {str(e)}")

            # Add audit log for bulk upload with fully populated fields
            AuditLog.objects.create(
                action='UPLOAD',
                app_label=Staff._meta.app_label, 
                model_name=Staff.__name__,        
                object_repr=f"Bulk upload: {success_count} new, {update_count} updated",
                changes={
                    'filename': file.name,
                    'success_count': success_count,
                    'update_count': update_count,
                    'error_count': error_count,
                    'new_options_added': added_options_count,
                    'created_staff_ids': created_staff_ids[:10],  # First 10 only to avoid huge data
                    'updated_staff_ids': updated_staff_ids[:10]
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
                message_parts.append(f"{success_count} new staff added")
            if update_count > 0:
                message_parts.append(f"{update_count} staff updated")
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
                'errors': errors[:20],  # First 20 errors only
                'new_options_added': added_options_count,
                'created_staff_ids': created_staff_ids,
                'updated_staff_ids': updated_staff_ids
            })

        except Exception as e:
            logger.error(f"Error in staff upload: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    return JsonResponse({'success': False, 'error': 'No file provided'}, status=400)

# -------------------------------------------------------------------------------------------------------------------------

# Export all staff data to Excel
# Uses: AuditLog (export log with model info)

@login_required
def staff_export(request):
    
    try:
        wb = Workbook()
        ws = wb.active
        ws.title = "Staff Data"

        # Style for header
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")

        headers = [
            'Staff ID', 'Name', 'Designation', 'Program', 'Department', 'College',
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
        total_count = staff_members.count()
        
        for row_idx, staff in enumerate(staff_members, start=2):
            ws.cell(row=row_idx, column=1, value=staff.staff_id)
            ws.cell(row=row_idx, column=2, value=staff.name)
            ws.cell(row=row_idx, column=3, value=staff.designation or '')
            ws.cell(row=row_idx, column=4, value=staff.program or '')
            ws.cell(row=row_idx, column=5, value=staff.department or '')
            ws.cell(row=row_idx, column=6, value=staff.college or '')
            ws.cell(row=row_idx, column=7, value=staff.phone or '')
            ws.cell(row=row_idx, column=8, value=staff.email or '')
            ws.cell(row=row_idx, column=9, value=staff.doj.strftime('%Y-%m-%d') if staff.doj else '')
            ws.cell(row=row_idx, column=10, value=staff.dor.strftime('%Y-%m-%d') if staff.dor else '')
            ws.cell(row=row_idx, column=11, value=staff.city or '')
            ws.cell(row=row_idx, column=12, value=staff.district or '')
            ws.cell(row=row_idx, column=13, value=staff.bank_account or '')
            ws.cell(row=row_idx, column=14, value=staff.bank_name or '')
            ws.cell(row=row_idx, column=15, value=staff.ifsc_code or '')
            ws.cell(row=row_idx, column=16, value=staff.remark or '')
            ws.cell(row=row_idx, column=17, value=staff.program_type or '')
            ws.cell(row=row_idx, column=18, value=staff.staff_category or '')
            ws.cell(row=row_idx, column=19, value=staff.dept_category or '')
            ws.cell(row=row_idx, column=20, value=staff.examiner_type or '')
            ws.cell(row=row_idx, column=21, value=staff.branch or '')
            ws.cell(row=row_idx, column=22, value=staff.branch_final or '')
            ws.cell(row=row_idx, column=23, value=staff.place or '')
            ws.cell(row=row_idx, column=24, value=staff.qualification or '')
            ws.cell(row=row_idx, column=25, value=staff.bank_city or '')
            ws.cell(row=row_idx, column=26, value=staff.branch_code or '')

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

        # Add audit log for export with fully populated fields
        AuditLog.objects.create(
            action='EXPORT',
            app_label=Staff._meta.app_label,
            model_name=Staff.__name__,
            object_repr=f"Staff export - {total_count} records",
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
        response['Content-Disposition'] = f'attachment; filename=Staff Data.xlsx'
        wb.save(response)
        return response
        
    except Exception as e:
        logger.error(f"Error exporting staff: {str(e)}")
        messages.error(request, f"Error exporting data: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# -------------------------------------------------------------------------------------------------------------------------

# Download sample Excel template for staff upload
# No core table usage - just template generation

@login_required
def staff_sample(request):
    
    try:
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

        # Sample data row
        sample_data = [
            'STF001', 'John Doe', 'Professor', 'B.Tech', 'Computer Science',
            'Engineering College', '9876543210', 'john@example.com', '2020-01-01',
            '', 'Mumbai', 'Mumbai', '1234567890', 'State Bank of India', 'SBIN0012345',
            'Sample record', 'Regular', 'Teaching', 'Engineering', 'Internal',
            'CSE', 'CSE-Final', 'Mumbai', 'PhD', 'Mumbai', '1234'
        ]

        for col_idx, value in enumerate(sample_data, start=1):
            ws.cell(row=2, column=col_idx, value=value)

        # Add helpful notes
        notes_row = 4
        ws.cell(row=notes_row, column=1, value="Instructions:")
        ws.cell(row=notes_row, column=2, value="* Required fields")
        
        ws.cell(row=notes_row + 1, column=1, value="Date format:")
        ws.cell(row=notes_row + 1, column=2, value="YYYY-MM-DD (e.g., 2024-01-15)")
        
        ws.cell(row=notes_row + 2, column=1, value="Phone:")
        ws.cell(row=notes_row + 2, column=2, value="Must be 10 digits, unique")
        
        ws.cell(row=notes_row + 3, column=1, value="IFSC Code:")
        ws.cell(row=notes_row + 3, column=2, value="11 characters (e.g., SBIN0012345)")
        
        ws.cell(row=notes_row + 4, column=1, value="Note:")
        ws.cell(row=notes_row + 4, column=2, value="Remove the sample row before uploading your data")

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
        response['Content-Disposition'] = 'attachment; filename=Staff Template.xlsx'
        wb.save(response)
        return response
        
    except Exception as e:
        logger.error(f"Error generating sample template: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# -------------------------------------------------------------------------------------------------------------------------

# Get detailed information of a staff member
# Uses: SystemSetting (log_detail_views), AuditLog (optional view log)

@require_http_methods(["GET"])
@login_required
def staff_details(request, phone):
    
    try:
        staff = get_object_or_404(Staff, phone=phone)
        
        # Add audit log for view (optional)
        if SystemSetting.get_setting('log_detail_views', False):
            AuditLog.log(
                request=request,
                action='VIEW',
                obj=staff,
                object_repr=f"Staff details viewed: {staff.staff_id} - {staff.name}"
            )
        
        data = {
            'success': True,
            'staff': {
                'id': staff.id,
                'staff_id': staff.staff_id,
                'name': staff.name,
                'designation': staff.designation or '',
                'program': staff.program or '',
                'department': staff.department or '',
                'college': staff.college or '',
                'doj': staff.doj.strftime('%Y-%m-%d') if staff.doj else '',
                'dor': staff.dor.strftime('%Y-%m-%d') if staff.dor else '',
                'phone': staff.phone,
                'email': staff.email or '',
                'city': staff.city or '',
                'district': staff.district or '',
                'place': staff.place or '',
                'qualification': staff.qualification or '',
                'bank_account': staff.bank_account or '',
                'bank_name': staff.bank_name or '',
                'bank_city': staff.bank_city or '',
                'branch_code': staff.branch_code or '',
                'ifsc_code': staff.ifsc_code or '',
                'remark': staff.remark or '',
                'program_type': staff.program_type or '',
                'staff_category': staff.staff_category or '',
                'dept_category': staff.dept_category or '',
                'examiner_type': staff.examiner_type or '',
                'branch': staff.branch or '',
                'branch_final': staff.branch_final or '',
                'created_at': staff.created_at.strftime('%Y-%m-%d %H:%M:%S') if staff.created_at else '',
                'updated_at': staff.updated_at.strftime('%Y-%m-%d %H:%M:%S') if staff.updated_at else '',
            }
        }
        return JsonResponse(data)
        
    except Exception as e:
        logger.error(f"Error getting staff details: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)