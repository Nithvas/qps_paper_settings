from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.db.models import Q
from django.core.paginator import Paginator
from django.contrib import messages

import openpyxl

from .models import Course
from .forms import CourseForm


def course_list(request):
    qs = Course.objects.all()

    program = request.GET.get('program')
    course_id = request.GET.get('course_id')
    semester = request.GET.get('semester')
    course_code = request.GET.get('course_code')
    search = request.GET.get('search')

    if program:
        qs = qs.filter(program=program)

    if course_id:
        qs = qs.filter(course_id=course_id)

    if semester:
        qs = qs.filter(semester=semester)

    if course_code:
        qs = qs.filter(course_code=course_code)        

    if search:

        qs = qs.filter(

            Q(program__icontains=search) |
            Q(course_id__icontains=search) |
            Q(department__icontains=search) |
            Q(semester__icontains=search) |
            Q(course_code__icontains=search) |
            Q(course_title__icontains=search) |
            Q(external_mark__icontains=search) |
            Q(examiner_int_ext__icontains=search)
        )

    paginator = Paginator(qs, 50)

    page = request.GET.get('page')

    course = paginator.get_page(page)

    return render(request, 'course/course_list.html', {

        'course': course,
        'total_count': qs.count(),

        'programs': Course.objects.values_list(
    'program',
    flat=True
).distinct().order_by('program'),

'course_ids': qs.values_list(
    'course_id',
    flat=True
).distinct().order_by('course_id'),

'semesters': qs.values_list(
    'semester',
    flat=True
).distinct().order_by('semester'),

'course_codes': qs.values_list(
    'course_code',
    flat=True
).distinct().order_by('course_code'),

        'selected_program': program,
        'selected_course_id': course_id,
        'selected_semester': semester,
        'selected_course_code': course_code,
        'search': search,
    })


def ajax_filter(request):

    program = request.GET.get('program')
    course_id = request.GET.get('course_id')
    semester = request.GET.get('semester')
    course_code = request.GET.get('course_code')

    qs = Course.objects.all()

    if program:
        qs = qs.filter(program=program)

    if course_id:
        qs = qs.filter(course_id=course_id)

    if semester:
        qs = qs.filter(semester=semester)

    if course_code:
        qs = qs.filter(course_code=course_code)

    return JsonResponse({

    'course_ids': list(
        qs.values_list(
            'course_id',
            flat=True
        ).distinct().order_by('course_id')
    ),

    'semesters': list(
        qs.values_list(
            'semester',
            flat=True
        ).distinct().order_by('semester')
    ),

    'course_codes': list(
        qs.values_list(
            'course_code',
            flat=True
        ).distinct().order_by('course_code')
    ),

})


def course_add(request):
    if request.method == 'POST':
        form = CourseForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Course added successfully!")
            return redirect('course:course_list')
    else:
        form = CourseForm()

    return render(request, 'course/course_form.html', {'form': form})
    
def course_edit(request, id):
    instance = get_object_or_404(Course, id=id)

    if request.method == 'POST':
        form = CourseForm(request.POST, instance=instance)
        if form.is_valid():
            form.save()
            messages.success(request, "Updated successfully!")
            return redirect('course:course_list')
    else:
        form = CourseForm(instance=instance)

    return render(request, 'course/course_form.html', {'form': form})

def course_delete(request, id):
    obj = get_object_or_404(Course, id=id)

    if request.method == 'POST':
        obj.delete()
        messages.success(request, "Deleted successfully!")
        return redirect('course:course_list')



# SAMPLE EXCEL DOWNLOAD
def course_sample(request):

    wb = openpyxl.Workbook()

    ws = wb.active

    ws.title = "Course Sample"

    ws.append([
        "Slno",
        "Program",
        "Course_id",
        "Department",
        "Semester",
        "Course_code",
        "Course_title",
        "External_mark",
        "Examiner_int_ext"
    ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    response['Content-Disposition'] = (
        'attachment; filename=course_sample.xlsx'
    )

    wb.save(response)

    return response


# EXPORT EXCEL
def course_export(request):

    wb = openpyxl.Workbook()

    ws = wb.active

    ws.title = "Course Data"

    ws.append([
        "Slno",
        "Program",
        "Course_id",
        "Department",
        "Semester",
        "Course_code",
        "Course_title",
        "External_mark",
        "Examiner_int_ext"
    ])

    data = Course.objects.all()

    for s in data:

        ws.append([
            s.slno,
            s.program,
            s.course_id,
            s.department,
            s.semester,
            s.course_code,
            s.course_title,
            s.external_mark,
            s.examiner_int_ext
        ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    response['Content-Disposition'] = (
        'attachment; filename=course_data.xlsx'
    )

    wb.save(response)

    return response


# UPLOAD EXCEL
def course_upload(request):

    if request.method == 'POST':

        file = request.FILES.get('file')

        if file:

            wb = openpyxl.load_workbook(file)

            ws = wb.active

            rows = list(ws.iter_rows(values_only=True))

            for row in rows[1:]:

                Course.objects.create(

                    slno=row[0],
                    program=row[1],
                    course_id=row[2],
                    department=row[3],
                    semester=row[4],
                    course_code=row[5],
                    course_title=row[6],
                    external_mark=row[7],
                    examiner_int_ext=row[8]

                )

            messages.success(request, "Excel uploaded successfully!")

    return redirect('course:course_list')