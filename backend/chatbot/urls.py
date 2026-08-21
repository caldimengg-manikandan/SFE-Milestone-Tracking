from django.urls import path
from .views import (
    ChatSessionListCreateView,
    ChatSessionDetailView,
    ChatQueryView,
    DocumentUploadView,
    ChatbotStatusView,
    AgentConfigView
)

urlpatterns = [
    path('sessions/', ChatSessionListCreateView.as_view(), name='chatbot-sessions'),
    path('sessions/<int:session_id>/', ChatSessionDetailView.as_view(), name='chatbot-session-detail'),
    path('chat/', ChatQueryView.as_view(), name='chatbot-query'),
    path('upload/', DocumentUploadView.as_view(), name='chatbot-upload'),
    path('status/', ChatbotStatusView.as_view(), name='chatbot-status'),
    path('agent-config/', AgentConfigView.as_view(), name='chatbot-agent-config'),
]
