from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
import random
from datetime import timedelta
from .serializers import LoginSerializer, UserSerializer, RegisterSerializer, ChangePasswordSerializer
from .models import User
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate user and return JWT token."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    refresh = RefreshToken.for_user(user)
    return Response({
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'role': user.role,
        },
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Register a new user."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response({
        'token': str(refresh.access_token),
        'user': UserSerializer(user).data,
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Get current user info."""
    return Response(UserSerializer(request.user).data)

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    """Send OTP to user for password reset."""
    email = request.data.get('email')
    if not email:
        return Response({'message': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        otp = f"{random.randint(100000, 999999)}"
        user.otp = otp
        user.otp_expiry = timezone.now() + timedelta(minutes=10)
        user.save()
        
        subject = 'Password Reset OTP — Steel Fab Enterprises'
        message = f"Your password reset OTP is: {otp}\n\nThis code will expire in 10 minutes."
        
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
        
        return Response({'message': 'If an account exists, an OTP has been sent.'})
    except User.DoesNotExist:
        return Response({'message': 'If an account exists, an OTP has been sent.'})

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    """Reset user password using OTP."""
    email = request.data.get('email')
    otp = request.data.get('otp')
    new_password = request.data.get('new_password')
    
    if not all([email, otp, new_password]):
        return Response({'message': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        if user.otp == otp and user.otp_expiry > timezone.now():
            user.set_password(new_password)
            user.otp = None
            user.otp_expiry = None
            user.save()
            return Response({'message': 'Password has been reset successfully.'})
        else:
            return Response({'message': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)
    except User.DoesNotExist:
        return Response({'message': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PATCH'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """Update authenticated user's profile."""
    user = request.user
    data = request.data
    
    # Update fields if present in request
    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    if 'email' in data:
        email = data['email']
        # Check if email is already used by another user
        if User.objects.filter(email=email).exclude(id=user.id).exists():
            return Response({'email': ['This email is already in use.']}, status=status.HTTP_400_BAD_REQUEST)
        user.email = email
        user.username = email
    if 'role' in data:
        user.role = data['role']
    if 'phone' in data:
        user.phone = data['phone']
    
    # Handle profile picture if sent
    if 'profile_picture' in request.FILES:
        user.profile_picture = request.FILES['profile_picture']
    
    try:
        user.save()
    except Exception as e:
        return Response({'message': f"Database Error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = UserSerializer(user)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """Change authenticated user's password."""
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': ['Wrong password.']}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password updated successfully.'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account_view(request):
    """Delete authenticated user's account."""
    user = request.user
    user.delete()
    return Response({'message': 'Account deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
