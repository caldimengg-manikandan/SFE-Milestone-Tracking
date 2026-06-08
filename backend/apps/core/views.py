"""Auth and user views."""
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.models import User, Contact
from apps.core.serializers import (
    UserSerializer, UserCreateSerializer, UserMeSerializer, ContactSerializer
)
from apps.core.permissions import IsAdminRole, CanEdit


class MeView(APIView):
    """GET /auth/me/ — return current user profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)


class UserListCreateView(generics.ListCreateAPIView):
    """GET/POST /auth/users/ — Admin only for create."""
    queryset = User.objects.all().order_by("username")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminRole()]
        return [IsAuthenticated()]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /auth/users/{id}/ — Admin only for write."""
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [IsAdminRole()]
        return [IsAuthenticated()]


class AcquireEditLockView(APIView):
    """POST /auth/projects/{project_id}/lock/ — acquire soft edit lock."""
    permission_classes = [IsAuthenticated, CanEdit]

    def post(self, request, project_id):
        # Check if anyone else holds the lock
        other_editor = User.objects.filter(
            editing_project_id=project_id
        ).exclude(pk=request.user.pk).first()

        if other_editor:
            return Response(
                {
                    "locked": True,
                    "editor": other_editor.get_full_name() or other_editor.username,
                    "since": other_editor.editing_since,
                },
                status=status.HTTP_409_CONFLICT,
            )

        request.user.editing_project_id = project_id
        request.user.editing_since = timezone.now()
        request.user.save(update_fields=["editing_project_id", "editing_since"])
        return Response({"locked": False, "acquired": True})


class ReleaseEditLockView(APIView):
    """DELETE /auth/projects/{project_id}/lock/ — release lock."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, project_id):
        if request.user.editing_project_id == project_id:
            request.user.editing_project_id = None
            request.user.editing_since = None
            request.user.save(update_fields=["editing_project_id", "editing_since"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContactListCreateView(generics.ListCreateAPIView):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filterset_fields = ["contact_type"]
    search_fields = ["name", "company", "email"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanEdit()]
        return [IsAuthenticated()]


class ContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [CanEdit()]
        return [IsAuthenticated()]
