from django.urls import path
from . import views

app_name = 'pattern'

urlpatterns = [
    # Pattern endpoints
    path('', views.pattern_list, name='pattern_list'),
    path('add/', views.pattern_add, name='pattern_add'),
    path('edit/<int:pk>/', views.pattern_edit, name='pattern_edit'),
    path('delete/<int:pk>/', views.pattern_delete, name='pattern_delete'),
    path('details/<int:pk>/', views.pattern_details, name='pattern_details'),
    path('toggle-active/<int:pk>/', views.pattern_toggle_active, name='pattern_toggle_active'),

    # Section endpoints (nested under pattern)
    path('sections/add/<int:pattern_id>/', views.section_add, name='section_add'),
    path('sections/edit/<int:pk>/', views.section_edit, name='section_edit'),
    path('sections/delete/<int:pk>/', views.section_delete, name='section_delete'),
    path('sections/toggle-active/<int:pk>/', views.section_toggle_active, name='section_toggle_active'),

    # Field options (for creatable selects)
    path('get-field-options/', views.get_field_options, name='get_field_options'),
]