from rest_framework import serializers
from .models import Announcement

class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'message', 'from_date', 'to_date', 'is_active', 'created_by_name', 'created_at']
        read_only_fields = ['created_by']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username
