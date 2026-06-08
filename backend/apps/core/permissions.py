"""DRF permission classes based on User.role."""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminRole(BasePermission):
    """Only Admin role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class CanEdit(BasePermission):
    """Admin or Estimator can write; anyone authenticated can read."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.can_edit


class CanAnnotate(BasePermission):
    """Admin, Estimator, or PM can annotate breakdown."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.can_annotate


class IsAuthenticated(BasePermission):
    """Any authenticated user — read-only views."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
