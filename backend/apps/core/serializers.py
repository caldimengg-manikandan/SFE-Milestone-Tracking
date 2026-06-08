"""Core serializers: User, Contact, auth."""
from rest_framework import serializers
from apps.core.models import User, Contact


class UserSerializer(serializers.ModelSerializer):
    can_edit = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "is_active", "date_joined",
            "editing_project_id", "editing_since", "can_edit",
        ]
        read_only_fields = ["date_joined", "editing_project_id", "editing_since"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserMeSerializer(serializers.ModelSerializer):
    """Lightweight self-profile serializer."""
    full_name = serializers.SerializerMethodField()
    can_edit = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "full_name", "role", "can_edit"]
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "id", "name", "company", "email", "phone",
            "contact_type", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
