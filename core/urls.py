from django.urls import path
from . import views
from django.urls import path, include

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('staff/', views.staff_list, name='staff'),
    path('staff/', include('staff.urls')),
    path('course/', views.course_list, name='course'),
    path('course/', include('course.urls')),
]