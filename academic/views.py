from django.shortcuts import render, get_object_or_404
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
from .models import AcademicYear
from core.models import FieldReference, AuditLog, SystemSetting
import json
import logging

logger = logging.getLogger(__name__)

# -------------------------------------------------------------------------------------------------------------------------

# Display list of academic years
# Uses: SystemSetting (logging), AuditLog (optional)

@login_required
def academic_year_list(request):
    
    academic_years = AcademicYear.objects.all()
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        academic_years = academic_years.filter(
            Q(academic_year__icontains=search_query) |
            Q(semester__icontains=search_query) |
            Q(semester_type__icontains=search_query)
        )
    
    # Audit log for view (optional - can be disabled for performance)
    if SystemSetting.get_setting('log_list_views', False):
        AuditLog.log(
            request=request,
            action='VIEW',
            obj=None,
            object_repr=f"Academic Year list viewed",
            changes={
                'search': search_query,
                'total_count': academic_years.count()
            }
        )

    context = {
        'academic_years': academic_years,
        'total_count': academic_years.count(),
        'search': search_query,
    }

    return render(request, 'academic/academic_year_list.html', context)

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
        'semester_type': 'semester_type',
        'academic_year': 'academic_year',
    }
    
    model_field = field_mapping.get(field_name)
    if not model_field:
        return JsonResponse({'success': False, 'error': f'Invalid field name: {field_name}'}, status=400)
    
    try:
        # Get options from FieldReference table
        options = FieldReference.get_options(
            model=AcademicYear,
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

# Add new academic year
# Uses: FieldReference (GET - form options), AuditLog (POST - create log)

@require_http_methods(["GET", "POST"])
@login_required
def academic_year_add(request):

    if request.method == "POST":
        try:
            # Handle both JSON and form data
            if request.content_type == 'application/json':
                data = json.loads(request.body)
            else:
                data = request.POST

            # Check if academic_year already exists
            academic_year = data.get('academic_year')
            semester = data.get('semester')
            
            if academic_year and semester:
                if AcademicYear.objects.filter(academic_year=academic_year, semester=semester).exists():
                    return JsonResponse({'success': False, 'error': 'Academic year with this semester already exists'}, status=400)

            # Create academic year
            academic_year_obj = AcademicYear()
            
            # Map form fields to model fields
            fields_mapping = {
                'academic_year': 'academic_year',
                'semester': 'semester',
                'semester_type': 'semester_type',
                'is_active': 'is_active',
            }

            # Store changes for audit
            changes = {}
            
            for form_field, model_field in fields_mapping.items():
                value = data.get(form_field)
                if value is not None and str(value).strip():
                    if model_field == 'is_active':
                        # Handle boolean field
                        bool_value = str(value).lower() in ['true', '1', 'on', 'yes']
                        setattr(academic_year_obj, model_field, bool_value)
                        changes[model_field] = bool_value
                    else:
                        str_value = str(value).strip()
                        setattr(academic_year_obj, model_field, str_value)
                        changes[model_field] = str_value
                else:
                    if model_field == 'is_active':
                        setattr(academic_year_obj, model_field, False)
                    else:
                        setattr(academic_year_obj, model_field, None)

            academic_year_obj.full_clean()
            academic_year_obj.save()
            
            # Add audit log
            AuditLog.log(
                request=request,
                action='CREATE',
                obj=academic_year_obj,
                object_repr=f"{academic_year_obj.academic_year} - {academic_year_obj.semester}",
                changes=changes
            )
            
            return JsonResponse({
                'success': True, 
                'message': 'Academic year added successfully', 
                'id': academic_year_obj.id
            })

        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            logger.error(f"Error adding academic year: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    # GET request - return form with options from FieldReference
    context = {
        'field_options': {
            'semester_types': FieldReference.get_options(AcademicYear, 'semester_type'),
        }
    }
    return render(request, 'academic/academic_year_form.html', context)

# -------------------------------------------------------------------------------------------------------------------------

# Edit existing academic year
# Uses: AuditLog (POST - update log)

@require_http_methods(["GET", "POST"])
@login_required
def academic_year_edit(request, year_id):

    academic_year_obj = get_object_or_404(AcademicYear, id=year_id)

    if request.method == "GET":
        # Return academic year data as JSON for editing
        data = {
            'success': True,
            'academic_year': {
                'id': academic_year_obj.id,
                'academic_year': academic_year_obj.academic_year,
                'semester': academic_year_obj.semester,
                'semester_type': academic_year_obj.semester_type,
                'is_active': academic_year_obj.is_active,
            }
        }
        return JsonResponse(data)

    elif request.method == "POST":
        try:
            # Store old values for audit
            old_values = {
                'academic_year': academic_year_obj.academic_year,
                'semester': academic_year_obj.semester,
                'semester_type': academic_year_obj.semester_type,
                'is_active': academic_year_obj.is_active,
            }
            
            fields = [
                'academic_year', 'semester', 'semester_type'
            ]

            changes = {}
            
            for field in fields:
                value = request.POST.get(field)
                if value and value.strip():
                    str_value = str(value).strip()
                    setattr(academic_year_obj, field, str_value)
                    if str(old_values.get(field)) != str_value:
                        changes[field] = {'old': str(old_values.get(field)), 'new': str_value}
                else:
                    setattr(academic_year_obj, field, None)
                    if old_values.get(field) is not None:
                        changes[field] = {'old': str(old_values.get(field)), 'new': None}
            
            # Handle is_active checkbox
            is_active = request.POST.get('is_active')
            if is_active and is_active.strip():
                bool_value = str(is_active).lower() in ['true', '1', 'on', 'yes']
                academic_year_obj.is_active = bool_value
                if old_values.get('is_active') != bool_value:
                    changes['is_active'] = {'old': old_values.get('is_active'), 'new': bool_value}
            else:
                academic_year_obj.is_active = False
                if old_values.get('is_active') != False:
                    changes['is_active'] = {'old': old_values.get('is_active'), 'new': False}

            # Check if academic_year+somester combination already exists (excluding current)
            new_academic_year = request.POST.get('academic_year')
            new_semester = request.POST.get('semester')
            if new_academic_year and new_academic_year.strip() and new_semester and new_semester.strip():
                if AcademicYear.objects.filter(
                    academic_year=new_academic_year.strip(), 
                    semester=new_semester.strip()
                ).exclude(id=year_id).exists():
                    return JsonResponse({'success': False, 'error': 'Academic year with this semester already exists'}, status=400)

            academic_year_obj.full_clean()
            academic_year_obj.save()
            
            # Add audit log if there are changes
            if changes:
                AuditLog.log(
                    request=request,
                    action='UPDATE',
                    obj=academic_year_obj,
                    object_repr=f"{academic_year_obj.academic_year} - {academic_year_obj.semester}",
                    changes=changes
                )
            
            return JsonResponse({'success': True, 'message': 'Academic year updated successfully'})

        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            logger.error(f"Error editing academic year: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

# -------------------------------------------------------------------------------------------------------------------------

# Delete academic year
# Uses: SystemSetting (soft_delete setting), AuditLog (delete log)

@require_http_methods(["DELETE", "POST"])
@login_required
def academic_year_delete(request, year_id):
    
    try:
        academic_year_obj = get_object_or_404(AcademicYear, id=year_id)
        
        # Store academic year info before deletion for audit
        year_info = f"{academic_year_obj.academic_year} - {academic_year_obj.semester}"
        year_data = {
            'academic_year': academic_year_obj.academic_year,
            'semester': academic_year_obj.semester,
            'semester_type': academic_year_obj.semester_type,
            'is_active': academic_year_obj.is_active
        }
        
        # Check if soft delete is enabled
        soft_delete = SystemSetting.get_setting('soft_delete_academic_year', False)
        
        if soft_delete:
            # Implement soft delete if you have a is_active field
            academic_year_obj.is_active = False
            academic_year_obj.save()
            message = 'Academic year soft deleted successfully'
            action = 'UPDATE' 
            
            AuditLog.log(
                request=request,
                action=action,
                obj=academic_year_obj,
                changes=year_data,
                object_repr=f"Soft deleted: {year_info}"
            )
        else:
            # Store information before deletion
            year_id_str = str(academic_year_obj.id) 
            year_app_label = academic_year_obj._meta.app_label
            year_model_name = academic_year_obj.__class__.__name__
            
            # Hard delete
            academic_year_obj.delete()
            message = 'Academic year deleted successfully'
            action = 'DELETE'
            
            # Create audit log entry manually for hard delete
            audit_data = {
                'action': action,
                'changes': year_data,
                'app_label': year_app_label,
                'model_name': year_model_name,
                'object_id': year_id_str,
                'object_repr': year_info,
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
        logger.error(f"Error deleting academic year: {str(e)}")
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
            'semester_type'
        ]
        
        if field_name not in valid_fields:
            return JsonResponse({'success': False, 'error': 'Invalid field name'}, status=400)
        
        obj, created = FieldReference.add_option(
            model=AcademicYear,
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

# Get detailed information of an academic year
# Uses: SystemSetting (log_detail_views), AuditLog (optional view log)

@require_http_methods(["GET"])
@login_required
def academic_year_details(request, year_id):
    
    try:
        academic_year_obj = get_object_or_404(AcademicYear, id=year_id)
        
        # Add audit log for view (optional)
        if SystemSetting.get_setting('log_detail_views', False):
            AuditLog.log(
                request=request,
                action='VIEW',
                obj=academic_year_obj,
                object_repr=f"Academic year details viewed: {academic_year_obj.academic_year} - {academic_year_obj.semester}"
            )
        
        data = {
            'success': True,
            'academic_year': {
                'id': academic_year_obj.id,
                'academic_year': academic_year_obj.academic_year,
                'semester': academic_year_obj.semester,
                'semester_type': academic_year_obj.semester_type,
                'semester_type_display': academic_year_obj.get_semester_type_display(),
                'is_active': academic_year_obj.is_active,
                'created_at': academic_year_obj.created_at.strftime('%Y-%m-%d %H:%M:%S') if academic_year_obj.created_at else '',
                'updated_at': academic_year_obj.updated_at.strftime('%Y-%m-%d %H:%M:%S') if academic_year_obj.updated_at else '',
            }
        }
        return JsonResponse(data)
        
    except Exception as e:
        logger.error(f"Error getting academic year details: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

# -------------------------------------------------------------------------------------------------------------------------

# Toggle active status of academic year

@require_http_methods(["POST"])
@login_required
def toggle_active_status(request, year_id):
    
    try:
        academic_year_obj = get_object_or_404(AcademicYear, id=year_id)
        
        # Toggle the active status
        academic_year_obj.is_active = not academic_year_obj.is_active
        academic_year_obj.save()
        
        # Log the action
        AuditLog.log(
            request=request,
            action='UPDATE',
            obj=academic_year_obj,
            object_repr=f"{academic_year_obj.academic_year} - {academic_year_obj.semester}",
            changes={
                'is_active': {'old': not academic_year_obj.is_active, 'new': academic_year_obj.is_active}
            }
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Academic year status changed to {"Active" if academic_year_obj.is_active else "Inactive"}',
            'is_active': academic_year_obj.is_active
        })
        
    except Exception as e:
        logger.error(f"Error toggling active status: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)