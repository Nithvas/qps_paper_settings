from django.urls import path
from . import views

app_name = 'allocation'

urlpatterns = [
    path('', views.allocation_list, name='allocation_list'),
]