from django.contrib import admin
from django.urls import path, include
from core import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.login_view),
    path('dashboard/', views.dashboard, name='dashboard'), 
    path('qps/', views.qps_allocations, name='qps_allocations'),
    path('staff/', include('staff.urls')), 
    path('course/', include('course.urls')), 
    path('academic/', include('academic.urls')), 
    path('pattern/', include('pattern.urls')),
]

