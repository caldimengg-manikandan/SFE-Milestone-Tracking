from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('me/', views.me_view, name='me'),
    path('logout/', views.logout_view, name='logout'),
    path('forgot-password/', views.forgot_password_view, name='forgot-password'),
    path('reset-password/', views.reset_password_view, name='reset-password'),
    path('profile/update/', views.update_profile_view, name='profile-update'),
    path('profile/change-password/', views.change_password_view, name='profile-change-password'),
    path('profile/delete/', views.delete_account_view, name='profile-delete'),
]
