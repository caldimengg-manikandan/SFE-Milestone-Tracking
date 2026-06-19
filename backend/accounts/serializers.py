from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        # Retrieve user by email (case‑insensitive)
        try:
            user = User.objects.get(email__iexact=data.get('email'))
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid email or password')
        # Verify the password
        if not user.check_password(data.get('password')):
            raise serializers.ValidationError('Invalid email or password')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled')
        data['user'] = user
        return data
        return data

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'phone', 'department', 'profile_picture', 'is_active', 'date_joined', 'allowed_modules', 'initials']
        read_only_fields = ['id', 'date_joined']

    def update(self, instance, validated_data):
        email = validated_data.get('email')
        if email:
            validated_data['username'] = email
        return super().update(instance, validated_data)

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name', 'role', 'phone', 'department', 'initials']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'employee'),
            phone=validated_data.get('phone', ''),
            department=validated_data.get('department', ''),
            initials=validated_data.get('initials', ''),
        )
        return user
