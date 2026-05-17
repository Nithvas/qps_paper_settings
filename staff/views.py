from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponseRedirect
from django.db.models import Q
from django.core.paginator import Paginator
from django.contrib import messages
from django.urls import reverse
from urllib.parse import urlencode
from .models import Staff
from .forms import StaffForm
from .services.staff_excel_service import (
    download_sample_staff_excel,
    export_staff_excel, upload_staff_excel
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
    staff = paginator.get_page(page)

    return render(request, 'staff/staff_list.html', {
        'staff': staff,
        'total_count': qs.count(),
        'programs': Staff.objects.values_list('program', flat=True).distinct(),
        'departments': Staff.objects.values_list('department', flat=True).distinct(),
        'colleges': Staff.objects.values_list('college', flat=True).distinct(),
        'names': Staff.objects.values_list('name', flat=True).distinct(),
        'selected_program': program,
        'selected_department': department,
        'selected_college': college,
        'selected_name': name,
        'search': search,
    })


# -------------------------------------------------------------------
# CREATE STAFF
# -------------------------------------------------------------------

def staff_create(request):
    if request.method == "POST":
        form = StaffForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Staff created successfully!")
            return redirect('staff:staff_list')
    else:
        form = StaffForm()

    return render(request, 'staff/staff_form.html', {'form': form})


# -------------------------------------------------------------------
# UPDATE STAFF (USING PHONE PRIMARY KEY)
# -------------------------------------------------------------------

def staff_update(request, phone):
    staff = get_object_or_404(Staff, phone=phone)

    if request.method == "POST":
        form = StaffForm(request.POST, instance=staff)
        if form.is_valid():
            form.save()
            messages.success(request, "Staff updated successfully!")
            return redirect('staff:staff_list')
    else:
        form = StaffForm(instance=staff)

    return render(request, 'staff/staff_form.html', {'form': form})


# -------------------------------------------------------------------
# DELETE STAFF
# -------------------------------------------------------------------

def staff_delete(request, phone):
    staff = get_object_or_404(Staff, phone=phone)

    if request.method == "POST":
        staff.delete()
        messages.success(request, "Staff deleted successfully!")
        return redirect('staff:staff_list')

    return render(request, 'staff/staff_confirm_delete.html', {'staff': staff})


# -------------------------------------------------------------------
# AJAX FILTER
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

    return JsonResponse({
        'departments': list(qs.values_list('department', flat=True).distinct()),
        'colleges': list(qs.values_list('college', flat=True).distinct()),
        'names': list(qs.values_list('name', flat=True).distinct()),
    })

# -------------------------------------------------------------------
# EXCEL DOWNLOAD SAMPLE
# -------------------------------------------------------------------

def staff_sample(request):
    return download_sample_staff_excel()

# -------------------------------------------------------------------
# EXCEL EXPORT
# -------------------------------------------------------------------

def staff_export(request):
    return export_staff_excel()

# -------------------------------------------------------------------
# EXCEL UPLOAD
# -------------------------------------------------------------------

def staff_upload(request):
    if request.method == "POST":
        file = request.FILES.get('file')
        if file:
            try:
                upload_staff_excel(file)
                messages.success(request, "Excel uploaded successfully!")
                base_url = reverse('staff:staff_list')
                query_string = urlencode({'upload_success': '1'})
                return redirect(f'{base_url}?{query_string}')
            except Exception as e:
                messages.error(request, f"Upload failed: {str(e)}")
        else:
            messages.error(request, "Please select a file to upload")
    return redirect('staff:staff_list')