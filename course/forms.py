from django import forms
from .models import Course


class CourseForm(forms.ModelForm):

    class Meta:
        model = Course
        fields = '__all__'

        widgets = {
            field: forms.TextInput(attrs={
                'class': 'form-control'
            })

            for field in [
                'slno',
                'program',
                'course_id',
                'department',
                'semester',
                'course_code',
                'external_mark',
                'examiner_int_ext'
            ]
        }