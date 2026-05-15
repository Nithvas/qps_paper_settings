from django.urls import path
from . import views

app_name = 'staff'

urlpatterns = [
    path('', views.staff_list, name='staff_listt'),
    path('add/<int:id>/', views.staff_add, name='staff_add'),
    path('edit/<int:id>/', views.staff_edit, name='staff_edit'),
    path('delete/<int:id>/', views.staff_delete, name='staff_delete'),

    path('sample/', views.staff_sample, name='staff_sample'),
    path('export/', views.staff_export, name='staff_export'),
    path('upload/', views.staff_upload, name='staff_upload'),
    path('ajax/filter/', views.ajax_filter, name='ajax_filter'),
]