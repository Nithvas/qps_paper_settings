from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages

# -------------------------------------------------------------------------------------------------------------------

# User Login Coding

def login_view(request):

    if request.method == "POST":

        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        user_exists = User.objects.filter(username__iexact=username).exists()

        if not user_exists:
            messages.error(request, "Username not found.")
            return render(request, 'login.html')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect('dashboard')

        else:
            messages.error(request, "Incorrect password.")
            return render(request, 'login.html')

    return render(request, 'login.html')

# -------------------------------------------------------------------------------------------------------------------

@login_required
def dashboard(request):
    return render(request, 'dashboard.html')