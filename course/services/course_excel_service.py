import openpyxl
from django.http import HttpResponse
from ..models import Course



# ✅ SAMPLE FILE
def download_sample_course_excel():
    wb = openpyxl.Workbook()
    ws = wb.active

    headers = [
        "Slno","Program","Course_id","Department","Semester","Course_code","Course_title","External_mark",
        "Examiner+int_ext"
    ]
    ws.append(headers)

    ws.append([
        "1","UG","UCS","COMPUTER SCIENCE","1","23UCS1CC1","PROGRAMMING IN C","75","EXTERNAL",
    ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=sample_staff.xlsx'

    wb.save(response)
    return response


# ✅ EXPORT
def export_staff_excel():
    wb = openpyxl.Workbook()
    ws = wb.active

    headers = [
        "Slno","Program","Course_id","Department","Semester","Course_code","Course_title","External_mark",
        "Examiner+int_ext"
    ]
    ws.append(headers)

    for s in Course.objects.all():
        ws.append([
            s.slno, s.program, s.course_id, s.department, s.course_code, s.course_title,
            s.external_mark, s.examiner_int_ext,
        ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=course.xlsx'

    wb.save(response)
    return response


# ✅ UPLOAD
def upload_course_excel(file):
    wb = openpyxl.load_workbook(file)
    ws = wb.active

    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue

        Course.objects.create(
            slno=row[0],
            program=row[1],
            course_id=row[2],
            department=row[3],
            semester=row[4],
            course_code=row[5],
            course_title=row[6],
            external_mark=row[7],
            examiner_int_ext=row[8],
            
        )