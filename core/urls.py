from django.contrib import admin
from django.urls import path, include
from core import views as core_views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication
    path('', core_views.login_view, name='login'),
    path('login/', core_views.login_view, name='login'),

    # Dashboard
    path('dashboard/', core_views.dashboard, name='dashboard'),

    # Apps
    path('staff/', include('staff.urls')),
    path('course/', include('course.urls')),
]