"""Auth URL patterns."""
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.core.views import (
    MeView,
    UserListCreateView,
    UserDetailView,
    AcquireEditLockView,
    ReleaseEditLockView,
    ContactListCreateView,
    ContactDetailView,
)

urlpatterns = [
    # JWT
    path("login/", TokenObtainPairView.as_view(), name="token_obtain"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Self
    path("me/", MeView.as_view(), name="user_me"),
    # User management (Admin)
    path("users/", UserListCreateView.as_view(), name="user_list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user_detail"),
    # Edit locks (soft session lock)
    path("projects/<int:project_id>/lock/", AcquireEditLockView.as_view(), name="acquire_lock"),
    path("projects/<int:project_id>/lock/release/", ReleaseEditLockView.as_view(), name="release_lock"),
    # Contacts
    path("contacts/", ContactListCreateView.as_view(), name="contact_list"),
    path("contacts/<int:pk>/", ContactDetailView.as_view(), name="contact_detail"),
]
