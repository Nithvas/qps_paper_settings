from django.urls import path
from . import views

app_name = 'staff'

urlpatterns = [
    # Others
    path('', views.staff_list, name='staff_list'),
    path('sample/', views.staff_sample, name='staff_sample'),
    path('export/', views.staff_export, name='staff_export'),
    path('upload/', views.staff_upload, name='staff_upload'),
    path('ajax/filter/', views.ajax_filter, name='ajax_filter'),
    # CRUD
    path('add/', views.staff_add_edit, name='staff_add'),
    path('edit/<str:phone>/', views.staff_add_edit, name='staff_edit'),
    path('delete/<str:phone>/', views.staff_delete, name='staff_delete'),
]