import openpyxl
from django.http import HttpResponse
from ..models import Staff



# ✅ SAMPLE FILE
def download_sample_staff_excel():
    wb = openpyxl.Workbook()
    ws = wb.active

    headers = [
        "Slno","Program","Department","Staff_id","Name","Designation","College",
        "City","District","DOJ","DOR","Phone","Email",
        "Bank Account","Bank Name","IFSC Code","Remark"
    ]
    ws.append(headers)

    ws.append([
        "1","UG","CS","JMCMTS0001","Karunya","Professor","ABC College",
        "Chennai","Chennai","2020-01-01","2021-01-02",
        "9876543210","test@mail.com",
        "1234567890","SBI","SBIN0001234","GOOD"
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
        "Slno","Program","Department","Staff_id","Name","Designation","College",
        "City","District","DOJ","DOR","Phone","Email",
        "Bank Account","Bank Name","IFSC Code","Remark"
    ]
    ws.append(headers)

    for s in Staff.objects.all():
        ws.append([
            s.slno, s.program, s.department, s.staff_id, s.name, s.designation,
            s.college, s.city, s.district, s.doj, s.dor,
            s.phone, s.email, s.bank_account, s.bank_name,
            s.ifsc_code,s.remark
        ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=staff.xlsx'

    wb.save(response)
    return response


# ✅ UPLOAD
def upload_staff_excel(file):
    wb = openpyxl.load_workbook(file)
    ws = wb.active

    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue

        Staff.objects.create(
            slno=row[0],
            program=row[1],
            department=row[2],
            staff_id=row[3],
            name=row[4],
            designation=row[5],
            college=row[6],
            city=row[7],
            district=row[8],
            doj=row[9],
            dor=row[10],
            phone=row[11],
            email=row[12],
            bank_account=row[13],
            bank_name=row[14],
            ifsc_code=row[15],
            remark=row[16],
        )