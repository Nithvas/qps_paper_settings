from django.db import models
from django.core.cache import cache
import json
import logging

logger = logging.getLogger(__name__)


class FieldReference(models.Model):
    
    """
    Generic reference table for storing dropdown options across all models.
    Uses app_label and model_name instead of GenericForeignKey for simplicity.
    """

    app_label = models.CharField(max_length=100, db_index=True)  
    model_name = models.CharField(max_length=100, db_index=True) 
    field_name = models.CharField(max_length=100, db_index=True)
    value = models.CharField(max_length=255)
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        db_table = "core_field_reference"
        unique_together = ['app_label', 'model_name', 'field_name', 'value']
        indexes = [
            models.Index(fields=['app_label', 'model_name', 'field_name']),
            models.Index(fields=['field_name', 'value']),
            models.Index(fields=['app_label', 'model_name', 'field_name', 'is_active']),
        ]
        verbose_name = "Field Reference"
        verbose_name_plural = "Field References"
    
    def __str__(self):
        return f"{self.model_name}.{self.field_name}: {self.value}"
    
    @classmethod
    def get_options(cls, model, field_name, search='', use_cache=True):
        """Get options for a specific model and field"""
        app_label = model._meta.app_label
        model_name = model.__name__
        
        cache_key = f"field_options_{app_label}_{model_name}_{field_name}_{search}"
        
        if use_cache:
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
        
        queryset = cls.objects.filter(
            app_label=app_label,
            model_name=model_name,
            field_name=field_name,
            is_active=True
        )
        
        if search:
            queryset = queryset.filter(value__icontains=search)
        
        results = list(queryset.values_list('value', flat=True).distinct().order_by('value'))
        
        if use_cache:
            cache.set(cache_key, results, 3600)
        
        return results
    
    @classmethod
    def add_option(cls, model, field_name, value, created_by=None):
        """Add a new option for a specific model and field"""
        app_label = model._meta.app_label
        model_name = model.__name__
        
        obj, created = cls.objects.get_or_create(
            app_label=app_label,
            model_name=model_name,
            field_name=field_name,
            value=value,
            defaults={'created_by': created_by}
        )
        
        if created:
            cls._clear_field_cache(app_label, model_name, field_name)
        
        return obj, created
    
    @classmethod
    def _clear_field_cache(cls, app_label, model_name, field_name):
        """Clear cache for a specific field"""
        cache_key_base = f"field_options_{app_label}_{model_name}_{field_name}"
        
        try:
            if hasattr(cache, 'delete_pattern'):
                cache.delete_pattern(f"{cache_key_base}*")
            else:
                cache.delete(cache_key_base)
        except Exception as e:
            logger.warning(f"Failed to clear cache for {field_name}: {str(e)}")

    @classmethod
    def delete_option(cls, model, field_name, value):
        """Soft delete an option"""
        app_label = model._meta.app_label
        model_name = model.__name__
        
        obj = cls.objects.filter(
            app_label=app_label,
            model_name=model_name,
            field_name=field_name,
            value=value,
            is_active=True
        ).first()
        
        if obj:
            obj.is_active = False
            obj.save()
            cls._clear_field_cache(app_label, model_name, field_name)
            return True
        
        return False


class AuditLog(models.Model):
    """Track all changes made to any model in the system"""
    
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('VIEW', 'View'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('UPLOAD', 'Upload'),
        ('EXPORT', 'Export'),
    ]
    
    # Which model was affected
    app_label = models.CharField(max_length=100, db_index=True, blank=True, null=True)
    model_name = models.CharField(max_length=100, blank=True, null=True)
    object_id = models.CharField(max_length=100, blank=True, null=True)
    object_repr = models.CharField(max_length=200, blank=True)
    
    # What action was performed
    action = models.CharField(max_length=10, choices=ACTION_CHOICES, db_index=True)
    changes = models.JSONField(default=dict, blank=True)
    
    # Who performed the action
    user_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    user_name = models.CharField(max_length=200, blank=True)
    
    # Additional context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    request_path = models.CharField(max_length=500, blank=True)
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = "core_audit_log"
        indexes = [
            models.Index(fields=['app_label', 'model_name', 'object_id']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['user_id', 'created_at']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.action} - {self.object_repr} - {self.created_at}"
    
    @classmethod
    def log(cls, request, action, obj=None, changes=None, object_repr=None):
        """Helper method to create audit logs easily"""
        audit_data = {
            'action': action,
            'changes': changes or {},
            'ip_address': cls._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'request_path': request.path,
        }
        
        if request.user.is_authenticated:
            audit_data['user_id'] = request.user.id
            audit_data['user_name'] = request.user.username
        
        if obj:
            audit_data['app_label'] = obj._meta.app_label
            audit_data['model_name'] = obj.__class__.__name__
            audit_data['object_id'] = str(obj.pk)
            audit_data['object_repr'] = object_repr or str(obj)
        
        return cls.objects.create(**audit_data)
    
    @staticmethod
    def _get_client_ip(request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SystemSetting(models.Model):
    """Store system-wide configuration settings"""
    
    SETTING_TYPES = [
        ('string', 'String'),
        ('integer', 'Integer'),
        ('boolean', 'Boolean'),
        ('json', 'JSON'),
        ('text', 'Text'),
    ]
    
    key = models.CharField(max_length=100, unique=True, db_index=True)
    value = models.TextField()
    value_type = models.CharField(max_length=10, choices=SETTING_TYPES, default='string')
    description = models.TextField(blank=True, null=True)
    is_editable = models.BooleanField(default=True)
    is_public = models.BooleanField(default=False)
    group = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "core_system_settings"
        ordering = ['group', 'key']
        verbose_name = "System Setting"
        verbose_name_plural = "System Settings"
    
    def __str__(self):
        return f"{self.key}: {self.get_value()}"
    
    def get_value(self):
        """Get the value cast to the correct type"""
        if self.value_type == 'integer':
            return int(self.value) if self.value else 0
        elif self.value_type == 'boolean':
            return self.value.lower() in ['true', '1', 'yes', 'on']
        elif self.value_type == 'json':
            return json.loads(self.value) if self.value else {}
        else:
            return self.value
    
    @classmethod
    def get_setting(cls, key, default=None):
        """Get a setting by key with optional default value"""
        try:
            setting = cls.objects.get(key=key)
            return setting.get_value()
        except cls.DoesNotExist:
            return default
    
    @classmethod
    def set_setting(cls, key, value, value_type='string', description='', group=''):
        """Set a setting, creating or updating as needed"""
        if value_type == 'json':
            value = json.dumps(value)
        elif value_type == 'boolean':
            value = str(value).lower()
        else:
            value = str(value)
        
        setting, created = cls.objects.update_or_create(
            key=key,
            defaults={
                'value': value,
                'value_type': value_type,
                'description': description,
                'group': group
            }
        )
        
        # Clear cache for this setting
        cache.delete(f'system_setting_{key}')
        
        return setting