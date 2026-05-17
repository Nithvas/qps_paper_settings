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
# DISTINCT VALUES (for datalists in drawer)
# -------------------------------------------------------------------
def distinct_values(request):
    data = {
        'programs': list(Staff.objects.exclude(program__isnull=True).exclude(program='')
                         .values_list('program', flat=True).distinct().order_by('program')),
        'departments': list(Staff.objects.exclude(department__isnull=True).exclude(department='')
                           .values_list('department', flat=True).distinct().order_by('department')),
        'colleges': list(Staff.objects.exclude(college__isnull=True).exclude(college='')
                        .values_list('college', flat=True).distinct().order_by('college')),
        'designations': list(Staff.objects.exclude(designation__isnull=True).exclude(designation='')
                            .values_list('designation', flat=True).distinct().order_by('designation')),
        'cities': list(Staff.objects.exclude(city__isnull=True).exclude(city='')
                      .values_list('city', flat=True).distinct().order_by('city')),
        'districts': list(Staff.objects.exclude(district__isnull=True).exclude(district='')
                         .values_list('district', flat=True).distinct().order_by('district')),
        'bank_names': list(Staff.objects.exclude(bank_name__isnull=True).exclude(bank_name='')
                          .values_list('bank_name', flat=True).distinct().order_by('bank_name')),
    }
    return JsonResponse(data)

# -------------------------------------------------------------------
# ADD / EDIT STAFF (AJAX + traditional)
# -------------------------------------------------------------------
def staff_add_edit(request, phone=None):
    """Handle both add (phone=None) and edit (phone=value) via AJAX."""
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
                return JsonResponse({'success': False, 'error': form.errors.as_text()})
            messages.error(request, 'Please correct the errors below.')
    else:
        # GET request - return JSON for AJAX edit drawer
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest' and is_edit:
            data = {field.name: getattr(staff, field.name) for field in staff._meta.fields}
            # Convert date fields to string (YYYY-MM-DD)
            if data.get('doj'):
                data['doj'] = data['doj'].isoformat()
            if data.get('dor'):
                data['dor'] = data['dor'].isoformat()
            return JsonResponse({'success': True, 'staff': data})
        form = StaffForm(instance=staff)

    # Non-AJAX fallback (if you have a separate form template)
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