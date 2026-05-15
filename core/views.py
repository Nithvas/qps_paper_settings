from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from staff.models import Staff
from course.models import Course

def login_view(request):
    if request.method == "POST":
        user = authenticate(username=request.POST['username'], password=request.POST['password'])
        if user:
            login(request, user)
            return redirect('/dashboard/')
    return render(request,'login.html')

@login_required
def dashboard(request):
    return render(request,'dashboard.html')

def staff_list(request):
    staff = Staff.objects.all()   # 
    return render(request, 'staff/staff_list.html', {'staff': staff})

def course_list(request):
    course = Course.objects.all()   #
    return render(request, 'course/course_list.html', {'course': course})
    

