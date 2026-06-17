from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes, authentication_classes
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
@authentication_classes([])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate user and return JWT token inside HttpOnly cookie."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    refresh = RefreshToken.for_user(user)
    
    response = Response({
        'token': str(refresh.access_token),  # Keep as fallback for non-cookie header clients
        'user': {
            'id': user.id,
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'role': user.role,
            'allowed_modules': user.allowed_modules,
        },
    })
    
    response.set_cookie(
        key='access_token',
        value=str(refresh.access_token),
        httponly=True,
        secure=not settings.DEBUG,  # HTTPS only in production
        samesite='Lax',
        max_age=24 * 60 * 60,  # 1 day
    )
    return response

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def register_view(request):
    """Register a new user and set cookie."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    
    response = Response({
        'token': str(refresh.access_token),
        'user': UserSerializer(user).data,
    }, status=status.HTTP_201_CREATED)
    
    response.set_cookie(
        key='access_token',
        value=str(refresh.access_token),
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
        max_age=24 * 60 * 60,
    )
    return response

@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """Log out user by deleting the access_token cookie."""
    response = Response({'message': 'Logged out successfully.'})
    response.delete_cookie('access_token')
    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Get current user info."""
    return Response(UserSerializer(request.user).data)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def forgot_password_view(request):
    """Send OTP to user for password reset."""
    email = request.data.get('email')
    if not email:
        return Response({'message': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email__iexact=email)
        otp = f"{random.randint(100000, 999999)}"
        user.otp = otp
        user.otp_expiry = timezone.now() + timedelta(minutes=10)
        user.save()
        
        subject = 'Password Reset OTP — Steel Fab Enterprises'
        message = f"Your password reset OTP is: {otp}\n\nThis code will expire in 10 minutes."
        
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
        except Exception as mail_err:
            return Response(
                {'message': f'Failed to send OTP email: {str(mail_err)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({'message': 'If an account exists, an OTP has been sent.'})
    except User.DoesNotExist:
        return Response({'message': 'If an account exists, an OTP has been sent.'})

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def reset_password_view(request):
    """Reset user password using OTP."""
    email = request.data.get('email')
    otp = request.data.get('otp')
    new_password = request.data.get('new_password')
    
    if not all([email, otp, new_password]):
        return Response({'message': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email__iexact=email)
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users_view(request):
    """List all users for admin access control."""
    if not request.user.is_admin:
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    users = User.objects.all().order_by('-date_joined')
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_user_access_view(request, pk):
    """Update a user's allowed_modules (admin only)."""
    if not request.user.is_admin:
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    allowed_modules = request.data.get('allowed_modules')
    if allowed_modules is not None:
        if not isinstance(allowed_modules, list):
            return Response({'detail': 'allowed_modules must be a list.'}, status=status.HTTP_400_BAD_REQUEST)
        user.allowed_modules = allowed_modules
        user.save()
        
    return Response(UserSerializer(user).data)
