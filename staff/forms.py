from django import forms
from .models import Staff

class StaffForm(forms.ModelForm):
    class Meta:
        model = Staff
        fields = '__all__'
        widgets = {
            'doj': forms.DateInput(attrs={'type': 'date'}),
            'dor': forms.DateInput(attrs={'type': 'date'}),
        }