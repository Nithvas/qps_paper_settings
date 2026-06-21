from django.urls import path
from . import views

app_name = 'syllabus'

urlpatterns = [
    path('', views.syllabus_list, name='syllabus_list'),
    path('add/', views.syllabus_add, name='syllabus_add'),
    path('edit/<int:syllabus_id>/', views.syllabus_edit, name='syllabus_edit'),
    path('delete/<int:syllabus_id>/', views.syllabus_delete, name='syllabus_delete'),
    path('details/<int:syllabus_id>/', views.syllabus_details, name='syllabus_details'),
]