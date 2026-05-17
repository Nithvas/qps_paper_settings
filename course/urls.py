from django.urls import path
from . import views

app_name = 'course'

urlpatterns = [

    # IOthers
    path('', views.course_list, name='course_list'),
    path('sample/', views.course_sample, name='course_sample'),
    path('export/', views.course_export, name='course_export'),
    path('upload/', views.course_upload, name='course_upload'),
    path('ajax/filter/', views.ajax_filter, name='ajax_filter'),
    
    # CRUD operations
    path('add/', views.course_add_edit, name='course_add'),
    path('edit/<int:id>/', views.course_add_edit, name='course_edit'),
    path('delete/<int:id>/', views.course_delete, name='course_delete'),
]