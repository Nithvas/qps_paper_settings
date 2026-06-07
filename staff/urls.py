from django.urls import path
from . import views

app_name = 'staff'

urlpatterns = [
    path('', views.staff_list, name='staff_list'),
    path('add/', views.staff_add, name='staff_add'),
    path('edit/<str:phone>/', views.staff_edit, name='staff_edit'),
    path('delete/<str:phone>/', views.staff_delete, name='staff_delete'),
    path('upload/', views.staff_upload, name='staff_upload'),
    path('export/', views.staff_export, name='staff_export'),
    path('sample/', views.staff_sample, name='staff_sample'),
    path('details/<str:phone>/', views.staff_details, name='staff_details'),
]