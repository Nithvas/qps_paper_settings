from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.db.models import Q
from django.core.paginator import Paginator
from django.contrib import messages
from django.urls import reverse
from urllib.parse import urlencode
from .models import Staff
from .forms import StaffForm
from .services.staff_excel_service import (
    download_sample_staff_excel,
    export_staff_excel,
    upload_staff_excel
)

# -------------------------------------------------------------------
# LIST VIEW (FILTER + SEARCH + PAGINATION)
# -------------------------------------------------------------------

def staff_list(request):

    qs = Staff.objects.all()
    program = request.GET.get('program')
    department = request.GET.get('department')
    college = request.GET.get('college')
    name = request.GET.get('name')
    search = request.GET.get('search')

    if program:
        qs = qs.filter(program=program)
    if department:
        qs = qs.filter(department=department)
    if college:
        qs = qs.filter(college=college)
    if name:
        qs = qs.filter(name=name)
    if search:
        qs = qs.filter(
            Q(staff_id__icontains=search) |
            Q(name__icontains=search) |
            Q(program__icontains=search) |
            Q(department__icontains=search) |
            Q(designation__icontains=search) |
            Q(college__icontains=search) |
            Q(city__icontains=search) |
            Q(district__icontains=search) |
            Q(email__icontains=search) |
            Q(phone__icontains=search) |
            Q(bank_account__icontains=search) |
            Q(bank_name__icontains=search) |
            Q(ifsc_code__icontains=search)
        )

    paginator = Paginator(qs, 50)
    page = request.GET.get('page')
    staff_page = paginator.get_page(page)

    programs = Staff.objects.values_list('program', flat=True).distinct().order_by('program')
    departments = Staff.objects.values_list('department', flat=True).distinct().order_by('department')
    colleges = Staff.objects.values_list('college', flat=True).distinct().order_by('college')
    names = Staff.objects.values_list('name', flat=True).distinct().order_by('name')

    return render(request, 'staff/staff_list.html', {
        'staff': staff_page,
        'total_count': qs.count(),
        'programs': list(programs),
        'departments': list(departments),
        'colleges': list(colleges),
        'names': list(names),
        'selected_program': program,
        'selected_department': department,
        'selected_college': college,
        'selected_name': name,
        'search': search,
    })

# -------------------------------------------------------------------
# AJAX FILTER (cascading dropdowns)
# -------------------------------------------------------------------

def ajax_filter(request):

    qs = Staff.objects.all()
    program = request.GET.get('program')
    department = request.GET.get('department')
    college = request.GET.get('college')
    name = request.GET.get('name')

    if program:
        qs = qs.filter(program=program)
    if department:
        qs = qs.filter(department=department)
    if college:
        qs = qs.filter(college=college)
    if name:
        qs = qs.filter(name=name)

    departments = qs.values_list('department', flat=True).distinct().order_by('department')
    colleges = qs.values_list('college', flat=True).distinct().order_by('college')
    names = qs.values_list('name', flat=True).distinct().order_by('name')

    return JsonResponse({
        'departments': list(departments),
        'colleges': list(colleges),
        'names': list(names),
    })

# -------------------------------------------------------------------
# ADD / EDIT STAFF 
# -------------------------------------------------------------------

def staff_add_edit(request, phone=None):

    if phone:
        staff = get_object_or_404(Staff, phone=phone)
        is_edit = True
    else:
        staff = None
        is_edit = False

    if request.method == 'POST':
        form = StaffForm(request.POST, instance=staff)
        if form.is_valid():
            form.save()
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            messages.success(request, 'Staff saved successfully.')
            return redirect('staff:staff_list')
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
            data = {field.name: getattr(staff, field.name) for field in staff._meta.fields}
            if data.get('doj'):
                data['doj'] = data['doj'].isoformat()
            if data.get('dor'):
                data['dor'] = data['dor'].isoformat()
            return JsonResponse({'success': True, 'staff': data})
        form = StaffForm(instance=staff)

    return render(request, 'staff/staff_form.html', {'form': form, 'is_edit': is_edit})

# -------------------------------------------------------------------
# DELETE STAFF (AJAX)
# -------------------------------------------------------------------

def staff_delete(request, phone):
    if request.method == 'POST':
        staff = get_object_or_404(Staff, phone=phone)
        staff.delete()
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True})
        messages.success(request, 'Staff deleted successfully.')
        return redirect('staff:staff_list')
    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)

# -------------------------------------------------------------------
# EXCEL HANDLERS
# -------------------------------------------------------------------

def staff_sample(request):
    return download_sample_staff_excel()

def staff_export(request):
    return export_staff_excel()

def staff_upload(request):
    if request.method == 'POST':
        file = request.FILES.get('file')
        if file:
            try:
                upload_staff_excel(file)
                messages.success(request, 'Excel uploaded successfully!')
                base_url = reverse('staff:staff_list')
                query_string = urlencode({'upload_success': '1'})
                return redirect(f'{base_url}?{query_string}')
            except Exception as e:
                messages.error(request, f'Upload failed: {str(e)}')
        else:
            messages.error(request, 'Please select a file to upload')
    return redirect('staff:staff_list')