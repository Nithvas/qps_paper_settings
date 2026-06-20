from django.urls import path
from . import views

app_name = 'academic'

urlpatterns = [
    # Academic Year views
    path('', views.academic_year_list, name='academic_year_list'),
    path('add/', views.academic_year_add, name='academic_year_add'),
    path('edit/<int:year_id>/', views.academic_year_edit, name='academic_year_edit'),
    path('delete/<int:year_id>/', views.academic_year_delete, name='academic_year_delete'),
    path('details/<int:year_id>/', views.academic_year_details, name='academic_year_details'),
    
    # Field Options (for creatable selects)
    path('get-field-options/', views.get_field_options, name='get_field_options'),
    path('save-field-option/', views.save_field_option, name='save_field_option'),
    
    # Toggle active status
    path('toggle-active/<int:year_id>/', views.toggle_active_status, name='toggle_active'),
]