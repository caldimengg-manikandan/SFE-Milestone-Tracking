from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import LoginSerializer, UserSerializer, RegisterSerializer
from .models import User

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate user and return JWT token."""
    print(f"DEBUG: Login attempt for email: {request.data.get('email')}")
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        print(f"DEBUG: Serializer invalid: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = serializer.validated_data['user']
    print(f"DEBUG: Login successful for user: {user.email}")
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
    """Placeholder for forgot password flow."""
    email = request.data.get('email')
    if not email:
        return Response({'message': 'Email is required'}, status=400)
    # In production, send OTP email here
    return Response({'message': 'If an account exists, a reset link has been sent.'})

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    """Placeholder for password reset."""
    return Response({'message': 'Password reset is not yet implemented.'}, status=501)
