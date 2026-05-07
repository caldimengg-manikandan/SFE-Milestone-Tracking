from rest_framework import serializers
from .models import Project, StructuralSchedule

class StructuralScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StructuralSchedule
        fields = '__all__'
        extra_kwargs = {'project': {'required': False}}

class ProjectSerializer(serializers.ModelSerializer):
    schedules = StructuralScheduleSerializer(many=True, required=False)
    
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'manhour_ton']

    def create(self, validated_data):
        schedules_data = validated_data.pop('schedules', [])
        project = Project.objects.create(**validated_data)
        for schedule_data in schedules_data:
            schedule_data.pop('project', None)  # Avoid multiple values for 'project'
            StructuralSchedule.objects.create(project=project, **schedule_data)
        return project

    def update(self, instance, validated_data):
        schedules_data = validated_data.pop('schedules', None)
        
        # Update project instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update schedules only if provided in payload
        if schedules_data is not None:
            instance.schedules.all().delete()
            for schedule_data in schedules_data:
                schedule_data.pop('project', None)  # Avoid multiple values for 'project'
                StructuralSchedule.objects.create(project=instance, **schedule_data)
            
        return instance
