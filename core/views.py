from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.http import JsonResponse
from staff.models import Staff
import json
from .models import FieldReference, AuditLog, SystemSetting

# -------------------------------------------------------------------------------------------------------------------
# User Login
# -------------------------------------------------------------------------------------------------------------------

def login_view(request):

    if request.method == "POST":
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        # --- 1. Try standard Django authentication (auth_user) ---
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('dashboard')

        # --- 2. Fallback: Staff model (phone as username, plain password) ---
        try:
            staff = Staff.objects.get(phone=username)
            # Compare plain text password (no hashing)
            if staff.password == password:
                user, created = User.objects.get_or_create(username=staff.phone)
                if created:
                    user.set_unusable_password()
                    user.save()
                login(request, user)
                return redirect('dashboard')
            else:
                messages.error(request, "Incorrect password.")
                return render(request, 'login.html')
        except Staff.DoesNotExist:
            # messages.error(request, "Username not found.")
            return render(request, 'login.html')

    return render(request, 'login.html')

# -------------------------------------------------------------------------------------------------------------------
# Dashboard
# -------------------------------------------------------------------------------------------------------------------

@login_required
def dashboard(request):
    return render(request, 'dashboard.html')

@login_required
def logout_view(request):
    logout(request)
    return redirect('login')

# -------------------------------------------------------------------------------------------------------------------
# Generic Field Reference APIs (Used by all apps)
# -------------------------------------------------------------------------------------------------------------------

@require_http_methods(["GET"])
def get_field_options(request):
    
    app_label = request.GET.get('app_label')
    model_name = request.GET.get('model')
    field_name = request.GET.get('field')
    search = request.GET.get('search', '')
    
    if not all([app_label, model_name, field_name]):
        return JsonResponse({
            'success': False, 
            'error': 'app_label, model, and field parameters are required'
        }, status=400)
    
    try:
        from django.apps import apps
        model = apps.get_model(app_label, model_name)
        
        if not model:
            return JsonResponse({'success': False, 'error': 'Model not found'}, status=404)
        
        # Get unique options from FieldReference only
        options = list(FieldReference.get_options(model, field_name, search))
        
        # Return unique sorted options
        unique_options = sorted(set(options))
        
        return JsonResponse({
            'success': True, 
            'options': unique_options[:50],
            'total_count': len(unique_options)
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@require_http_methods(["POST"])
def save_field_option(request):
   
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON data'}, status=400)
    
    app_label = data.get('app_label')
    model_name = data.get('model')
    field_name = data.get('field_name')
    value = data.get('value')
    created_by = data.get('created_by', request.user.username if request.user.is_authenticated else 'system')
    
    if not all([app_label, model_name, field_name, value]):
        return JsonResponse({
            'success': False, 
            'error': 'Missing required parameters: app_label, model, field_name, value'
        }, status=400)
    
    try:
        from django.apps import apps
        model = apps.get_model(app_label, model_name)
        
        if not model:
            return JsonResponse({'success': False, 'error': 'Model not found'}, status=404)
        
        obj, created = FieldReference.add_option(model, field_name, value.strip(), created_by)
        
        return JsonResponse({
            'success': True, 
            'created': created,
            'message': 'Option saved successfully' if created else 'Option already exists'
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@require_http_methods(["DELETE"])
def delete_field_option(request):
   
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON data'}, status=400)
    
    app_label = data.get('app_label')
    model_name = data.get('model')
    field_name = data.get('field_name')
    value = data.get('value')
    
    if not all([app_label, model_name, field_name, value]):
        return JsonResponse({'success': False, 'error': 'Missing required parameters'}, status=400)
    
    try:
        from django.apps import apps
        model = apps.get_model(app_label, model_name)
        
        if not model:
            return JsonResponse({'success': False, 'error': 'Model not found'}, status=404)
        
        deleted = FieldReference.delete_option(model, field_name, value)
        
        return JsonResponse({
            'success': True,
            'deleted': deleted,
            'message': 'Option deleted successfully' if deleted else 'Option not found'
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


# -------------------------------------------------------------------------------------------------------------------
# Audit Logging
# -------------------------------------------------------------------------------------------------------------------

@require_http_methods(["POST"])
def log_audit(request):
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON data'}, status=400)
    
    try:
        audit = AuditLog.objects.create(
            content_type_id=data.get('content_type_id'),
            object_id=data.get('object_id'),
            object_repr=data.get('object_repr', ''),
            action=data.get('action'),
            changes=data.get('changes', {}),
            user_id=data.get('user_id', request.user.id if request.user.is_authenticated else None),
            user_name=data.get('user_name', request.user.username if request.user.is_authenticated else ''),
            ip_address=data.get('ip_address'),
            user_agent=data.get('user_agent', ''),
        )
        
        return JsonResponse({'success': True, 'id': audit.id})
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


# -------------------------------------------------------------------------------------------------------------------
# System Settings Management
# -------------------------------------------------------------------------------------------------------------------

@require_http_methods(["GET"])
def get_system_settings(request):
    
    include_private = request.GET.get('include_private', 'false').lower() == 'true'
    
    queryset = SystemSetting.objects.all()
    
    if not include_private:
        queryset = queryset.filter(is_public=True)
    
    settings = {}
    for setting in queryset:
        settings[setting.key] = setting.get_value()
    
    return JsonResponse({'success': True, 'settings': settings})


@require_http_methods(["POST"])
def set_system_setting(request):
   
    if not request.user.is_staff and not request.user.is_superuser:
        return JsonResponse({'success': False, 'error': 'Admin access required'}, status=403)
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON data'}, status=400)
    
    key = data.get('key')
    value = data.get('value')
    value_type = data.get('value_type', 'string')
    description = data.get('description', '')
    group = data.get('group', '')
    
    if not key:
        return JsonResponse({'success': False, 'error': 'Key is required'}, status=400)
    
    try:
        setting = SystemSetting.set_setting(key, value, value_type, description, group)
        return JsonResponse({
            'success': True,
            'setting': {
                'key': setting.key,
                'value': setting.get_value(),
                'value_type': setting.value_type,
                'description': setting.description,
                'group': setting.group
            }
        })
    
    except Exception as e:

        return JsonResponse({'success': False, 'error': str(e)}, status=500)