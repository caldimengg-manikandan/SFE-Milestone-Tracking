from rest_framework import serializers
from .models import Project, StructuralScheduleItem

class StructuralScheduleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StructuralScheduleItem
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class ProjectSerializer(serializers.ModelSerializer):
    structural_schedules = StructuralScheduleItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
