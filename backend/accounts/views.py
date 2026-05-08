from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
import random
from datetime import timedelta
from .serializers import LoginSerializer, UserSerializer, RegisterSerializer
from .models import User

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
