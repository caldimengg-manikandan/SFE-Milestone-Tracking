from django.contrib import admin
from .models import Employee

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['emp_id', 'name', 'department', 'designation', 'status']
    list_filter = ['department', 'status']
    search_fields = ['name', 'emp_id', 'email']
