from django.contrib import admin
from django.urls import path, include
from core import views as core_views

app_name = 'core'

urlpatterns = [

    # Admin and Authentication
    path('admin/', admin.site.urls),
    path('', core_views.login_view, name='login'),
    path('login/', core_views.login_view, name='login'),
    path('dashboard/', core_views.dashboard, name='dashboard'),

    # Apps
    path('staff/', include('staff.urls')),
    path('course/', include('course.urls')),
    
    # Field Reference endpoints 
    path('api/get-field-options/', core_views.get_field_options, name='get_field_options'),
    path('api/save-field-option/', core_views.save_field_option, name='save_field_option'),
    path('api/delete-field-option/', core_views.delete_field_option, name='delete_field_option'),
    
    # Audit endpoints
    path('api/log-audit/', core_views.log_audit, name='log_audit'),
    
    # System Settings endpoints
    path('api/get-settings/', core_views.get_system_settings, name='get_system_settings'),
    path('api/set-setting/', core_views.set_system_setting, name='set_system_setting'),
]