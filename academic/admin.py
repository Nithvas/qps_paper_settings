from django.contrib import admin
from .models import AcademicYear

@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    
    list_display = ['academic_year', 'semester', 'semester_type', 'is_active', 'created_at']
    list_filter = ['semester_type', 'is_active']
    search_fields = ['academic_year', 'semester']
    ordering = ['-academic_year', '-semester']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Academic Year Information', {
            'fields': ('academic_year', 'semester', 'semester_type')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Audit Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )