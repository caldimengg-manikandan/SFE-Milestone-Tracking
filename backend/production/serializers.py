from rest_framework import serializers
from .models import (
    ProductionSchedule, ProductionItem, ProductionPriority, ProductionPriorityItem,
    Machine, Manpower, Capacity
)
from projects.models import Project

class ProductionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionItem
        fields = '__all__'

class ProductionScheduleSerializer(serializers.ModelSerializer):
    items = ProductionItemSerializer(many=True, read_only=True)
    items_input = serializers.JSONField(write_only=True, required=False)
    projects = serializers.PrimaryKeyRelatedField(many=True, queryset=Project.objects.all(), required=False)

    class Meta:
        model = ProductionSchedule
        fields = ['id', 'schedule_number', 'start_date', 'end_date', 'projects', 'items', 'items_input', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items_input', [])
        projects_data = validated_data.pop('projects', [])
        schedule = ProductionSchedule.objects.create(**validated_data)
        schedule.projects.set(projects_data)
        for item_data in items_data:
            ProductionItem.objects.create(schedule=schedule, **item_data)
        return schedule

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items_input', None)
        projects_data = validated_data.pop('projects', None)
        
        instance.schedule_number = validated_data.get('schedule_number', instance.schedule_number)
        instance.start_date = validated_data.get('start_date', instance.start_date)
        instance.end_date = validated_data.get('end_date', instance.end_date)
        instance.save()

        if projects_data is not None:
            instance.projects.set(projects_data)

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                ProductionItem.objects.create(schedule=instance, **item_data)
        return instance

class ProductionPriorityItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionPriorityItem
        fields = '__all__'

class ProductionPrioritySerializer(serializers.ModelSerializer):
    items = ProductionPriorityItemSerializer(many=True, read_only=True)
    items_input = serializers.JSONField(write_only=True, required=False)
    schedule_number = serializers.CharField(source='schedule.schedule_number', read_only=True)
    project_names = serializers.SerializerMethodField()
    project_codes = serializers.SerializerMethodField()

    class Meta:
        model = ProductionPriority
        fields = ['id', 'schedule', 'schedule_number', 'project_names', 'project_codes', 'module_type', 'process_type', 'rate', 'items', 'items_input', 'created_at']

    def get_project_names(self, obj):
        return ", ".join([p.name for p in obj.schedule.projects.all()]) or "N/A"
    
    def get_project_codes(self, obj):
        return ", ".join([p.code for p in obj.schedule.projects.all()]) or "N/A"

    def create(self, validated_data):
        items_data = validated_data.pop('items_input', [])
        priority = ProductionPriority.objects.create(**validated_data)
        for item_data in items_data:
            ProductionPriorityItem.objects.create(priority=priority, **item_data)
        return priority

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items_input', None)
        instance.schedule = validated_data.get('schedule', instance.schedule)
        instance.module_type = validated_data.get('module_type', instance.module_type)
        instance.process_type = validated_data.get('process_type', instance.process_type)
        instance.rate = validated_data.get('rate', instance.rate)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                ProductionPriorityItem.objects.create(priority=instance, **item_data)
        return instance

class MachineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Machine
        fields = '__all__'

class ManpowerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Manpower
        fields = '__all__'

class CapacitySerializer(serializers.ModelSerializer):
    machine_name = serializers.CharField(source='machine.name', read_only=True)
    rate_per_month = serializers.ReadOnlyField()
    rate_per_year = serializers.ReadOnlyField()

    class Meta:
        model = Capacity
        fields = '__all__'
