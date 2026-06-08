from django.urls import path
from . import views

app_name = 'courses'

urlpatterns = [
    # Course views
    path('', views.course_list, name='course_list'),
    path('add/', views.course_add, name='course_add'),
    path('edit/<str:course_code>/', views.course_edit, name='course_edit'),
    path('delete/<str:course_code>/', views.course_delete, name='course_delete'),
    path('details/<str:course_code>/', views.course_details, name='course_details'),
    
    # Bulk operations
    path('upload/', views.course_upload, name='course_upload'),
    path('export/', views.course_export, name='course_export'),
    path('sample/', views.course_sample, name='course_sample'),
    
    # AJAX endpoints
    path('save-field-option/', views.save_field_option, name='save_field_option'),
    path('get-field-options/', views.get_field_options, name='get_field_options'),
]