"""
RFQ permissions — enforces role-based field editability per §9.
"""
from rest_framework import permissions


class IsManagerOrReadOnly(permissions.BasePermission):
    """Only Managers can write; everyone else reads."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.is_manager


class CanEditRFQ(permissions.BasePermission):
    """Estimators and above can create/edit/delete RFQs."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.can_edit

