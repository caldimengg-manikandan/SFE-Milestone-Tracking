from rest_framework import serializers
from .models import Milestone

class MilestoneSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.customer', read_only=True)
    project_number = serializers.CharField(source='project.job_number', read_only=True)
    project_startup_date = serializers.DateField(source='project.start_up_meeting_date', read_only=True)

    class Meta:
        model = Milestone
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
