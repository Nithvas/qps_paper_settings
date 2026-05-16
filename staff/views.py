from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.db.models import Q
from django.core.paginator import Paginator
from django.contrib import messages
from django.http import FileResponse
import os

from .models import Staff
from .forms import StaffForm

from .services.staff_excel_service import (
    download_sample_staff_excel,
    export_staff_excel,
    upload_staff_excel
)

# -------------------------------------------------------------------------------------------------------------------

# Display list of staff with filtering, searching, and pagination

def staff_list(request):

    qs = Staff.objects.all()

    # Get filter parameters from GET request
    program = request.GET.get('program')
    department = request.GET.get('department')
    college = request.GET.get('college')
    name = request.GET.get('name')
    search = request.GET.get('search')

    # DROPDOWN FILTERS
    if program:
        qs = qs.filter(program=program)

    if department:
        qs = qs.filter(department=department)

    if college:
        qs = qs.filter(college=college)

    if name:
        qs = qs.filter(name=name)

    # SEARCH FILTER (across multiple fields)
    if search:
        qs = qs.filter(
            Q(program__icontains=search) |
            Q(staff_id__icontains=search) |
            Q(department__icontains=search) |
            Q(name__icontains=search) |
            Q(designation__icontains=search) |
            Q(college__icontains=search) |
            Q(city__icontains=search) |
            Q(district__icontains=search) |
            Q(doj__icontains=search) |
            Q(dor__icontains=search) |
            Q(phone__icontains=search) |
            Q(email__icontains=search) |
            Q(bank_account__icontains=search) |
            Q(bank_name__icontains=search) |
            Q(ifsc_code__icontains=search)
        )

    # PAGINATION (50 items per page)
    paginator = Paginator(qs, 50)
    page = request.GET.get('page')
    staff = paginator.get_page(page)

    return render(request, 'staff/staff_list.html', {
        'staff': staff,
        'total_count': qs.count(),
        'programs': Staff.objects.values_list('program', flat=True).distinct(),
        'departments': qs.values_list('department', flat=True).distinct(),
        'colleges': qs.values_list('college', flat=True).distinct(),
        'names': qs.values_list('name', flat=True).distinct(),
        'selected_program': program,
        'selected_department': department,
        'selected_college': college,
        'selected_name': name,
        'search': search,
    })

# -------------------------------------------------------------------------------------------------------------------

# Filter options for dropdowns (AJAX)

def ajax_filter(request):
   
    program = request.GET.get('program')
    department = request.GET.get('department')
    college = request.GET.get('college')
    name = request.GET.get('name')

    qs = Staff.objects.all()

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

# -------------------------------------------------------------------------------------------------------------------

# Staff Add 

def staff_add(request, id):

    instance = None if id == 0 else get_object_or_404(Staff, id=id)

    if request.method == 'POST':
        form = StaffForm(request.POST, instance=instance)
        if form.is_valid():
            form.save()
            messages.success(request, "Saved successfully!")
            return redirect('staff:staff_list')
    else:
        form = StaffForm(instance=instance)

    return render(request, 'staff/staff_form.html', {'form': form})

# -------------------------------------------------------------------------------------------------------------------

# Staff Edit

def staff_edit(request, id):
   
    instance = None if id == 0 else get_object_or_404(Staff, id=id)

    if request.method == 'POST':
        form = StaffForm(request.POST, instance=instance)
        if form.is_valid():
            form.save()
            messages.success(request, "Updated successfully!")
            return redirect('staff:staff_list')
    else:
        form = StaffForm(instance=instance)

    return render(request, 'staff/staff_form.html', {'form': form})

# -------------------------------------------------------------------------------------------------------------------

# Staff Delete

def staff_delete(request, id):

    obj = get_object_or_404(Staff, id=id)

    if request.method == 'POST':
        obj.delete()
        messages.success(request, "Deleted successfully!")
        return redirect('staff:staff_list')

# -------------------------------------------------------------------------------------------------------------------

# Sample File Download 

def staff_sample(request):
    return download_sample_staff_excel()


# Download Staff Excel

def staff_export(request):
   return export_staff_excel()

# Upload Staff Excel

def staff_upload(request):
    if request.method == 'POST':
        file = request.FILES.get('file')
        if file:
            upload_staff_excel(file)
            messages.success(request, "Excel uploaded successfully!")
        else:
            messages.error(request, "Please select a file")
    return redirect('staff:staff_list')

# -------------------------------------------------------------------------------------------------------------------

# EDIT STAFF FUNCTION (manual update without Django form)
def add_staff(request, id):

    # GET PARTICULAR STAFF DATA
    staff = get_object_or_404(Staff, id=id)

    # UPDATE FUNCTION
    if request.method == 'POST':
        staff.slno = request.POST.get('slno')
        staff.program = request.POST.get('program')
        staff.department = request.POST.get('department')
        staff.staff_id = request.POST.get('staff_id')
        staff.name = request.POST.get('name')
        staff.designation = request.POST.get('designation')
        staff.college = request.POST.get('college')
        staff.city = request.POST.get('city')
        staff.district = request.POST.get('district')
        staff.doj = request.POST.get('doj')
        staff.dor = request.POST.get('dor')
        staff.phone = request.POST.get('phone')
        staff.email = request.POST.get('email')
        staff.bank_account = request.POST.get('bank_account')
        staff.bank_name = request.POST.get('bank_name')
        staff.ifsc_code = request.POST.get('ifsc_code')
        staff.remark = request.POST.get('remark')

        # SAVE UPDATED DATA
        staff.save()

        return redirect('staff_list')   # Ensure this URL name exists

    # SHOW DATA INSIDE TEMPLATE FOR EDITING
    return render(
        request,
        'staff/edit_staff.html',
        {'staff': staff}
    )