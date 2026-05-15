from django.contrib import admin
from django.urls import path, include
from core import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.login_view),
    path('dashboard/', views.dashboard, name='dashboard'), 
    path('staff/', include('staff.urls')), 
    path('course/', include('course.urls')), 
]

