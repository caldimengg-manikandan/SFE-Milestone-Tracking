import urllib.request
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import ChatSession, ChatMessage, KnowledgeDocument, KnowledgeChunk, AgentConfig
from .services import ingest_pdf_document, get_chatbot_response, get_effective_model
from .tools import AVAILABLE_TOOLS
from .tool_handlers import TOOL_HANDLERS

class IsChatbotAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user 
            and request.user.is_authenticated 
            and (request.user.role == 'admin' or request.user.is_staff or request.user.is_superuser)
        )

class ChatSessionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List all chat sessions for the authenticated user."""
        sessions = ChatSession.objects.filter(user=request.user).order_by('-updated_at')
        data = [{
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at,
            "updated_at": s.updated_at
        } for s in sessions]
        return Response(data)

    def post(self, request):
        """Create a new chat session."""
        title = request.data.get("title", "New Chat")
        session = ChatSession.objects.create(user=request.user, title=title)
        return Response({
            "id": session.id,
            "title": session.title,
            "created_at": session.created_at
        }, status=status.HTTP_201_CREATED)

class ChatSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        """Get detail of a chat session including message history."""
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

        messages = ChatMessage.objects.filter(session=session).order_by('timestamp')
        messages_data = [{
            "id": m.id,
            "sender": m.sender,
            "text": m.text,
            "timestamp": m.timestamp,
            "metadata": m.metadata
        } for m in messages]

        return Response({
            "id": session.id,
            "title": session.title,
            "messages": messages_data
        })

    def delete(self, request, session_id):
        """Delete a chat session."""
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

        session.delete()
        return Response({"message": "Session deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

class ChatQueryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Query endpoint:
        Takes 'query' (string) and 'session_id' (int, optional).
        If 'session_id' is missing or invalid, a new session is automatically initialized.
        """
        query_text = request.data.get("query", "").strip()
        session_id = request.data.get("session_id")

        if not query_text:
            return Response({"error": "Query is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Fetch or create session
        session = None
        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id, user=request.user)
            except ChatSession.DoesNotExist:
                pass

        if not session:
            # Generate a title from query snippet
            title = query_text[:40] + ("..." if len(query_text) > 40 else "")
            session = ChatSession.objects.create(user=request.user, title=title)

        # 2. Get AI Response
        bot_response, citations, ui_actions = get_chatbot_response(session, query_text, user=request.user)
        
        # 3. If session title was default "New Chat", auto-update it with the query topic
        if session.title == "New Chat" or session.title.startswith("New Chat"):
            session.title = query_text[:30] + ("..." if len(query_text) > 30 else "")
            session.save()
            
        return Response({
            "session_id": session.id,
            "session_title": session.title,
            "response": bot_response,
            "citations": citations,
            "ui_actions": ui_actions
        })

class DocumentUploadView(APIView):
    """
    Admin-only upload endpoint for workflow PDFs.
    Parses and ingests documents into local RAG DB.
    """
    permission_classes = [IsChatbotAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        if not file_obj.name.endswith('.pdf'):
            return Response({"error": "Only PDF files are supported"}, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get('title', file_obj.name)

        # Save document
        doc = KnowledgeDocument.objects.create(
            title=title,
            file=file_obj,
            is_active=True
        )

        # Extract & Index
        try:
            chunk_count = ingest_pdf_document(doc.id)
            return Response({
                "message": "Document ingested successfully",
                "document_id": doc.id,
                "title": doc.title,
                "chunks_created": chunk_count
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            # Rollback document if ingestion fails
            doc.delete()
            return Response({"error": f"Ingestion failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AgentConfigView(APIView):
    """
    Admin-only endpoint to view/edit the agent's persona, enabled tools, and model override.
    """
    permission_classes = [IsChatbotAdmin]

    def get(self, request):
        config = AgentConfig.get_solo()
        all_tool_names = [t['function']['name'] for t in AVAILABLE_TOOLS]
        enabled_tools = all_tool_names if (config.enabled_tools is None or len(config.enabled_tools) == 0) else config.enabled_tools

        return Response({
            "persona_instructions": config.persona_instructions,
            "enabled_tools": enabled_tools,
            "model_override": config.model_override,
            "effective_model": get_effective_model(),
            "available_tools": [
                {"name": t['function']['name'], "description": t['function'].get('description', '')}
                for t in AVAILABLE_TOOLS
            ],
            "updated_at": config.updated_at,
        })

    def put(self, request):
        config = AgentConfig.get_solo()

        if "persona_instructions" in request.data:
            config.persona_instructions = request.data.get("persona_instructions") or ""

        if "enabled_tools" in request.data:
            requested_tools = request.data.get("enabled_tools")
            if isinstance(requested_tools, list):
                all_tool_names = set(t['function']['name'] for t in AVAILABLE_TOOLS)
                valid_requested = set(name for name in requested_tools if name in TOOL_HANDLERS or name in all_tool_names)
                if valid_requested >= all_tool_names or len(valid_requested) == len(all_tool_names):
                    config.enabled_tools = None
                else:
                    config.enabled_tools = list(valid_requested)

        if "model_override" in request.data:
            requested_model = (request.data.get("model_override") or "").strip()
            # Guard against pasting an API key into this field by mistake (e.g. Groq keys
            # start with "gsk_", OpenAI-style keys with "sk-") — this would otherwise silently
            # break every chatbot response with a confusing "model not found" error.
            if requested_model and (
                requested_model.startswith("gsk_") or requested_model.startswith("sk-") or " " in requested_model
            ):
                return Response(
                    {"error": "That doesn't look like a valid model name (it looks like an API key or contains spaces). "
                              "The API key belongs in the LLM_API_KEY environment variable, not here."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            config.model_override = requested_model

        config.updated_by = request.user
        config.save()

        return Response({
            "message": "Agent configuration saved.",
            "persona_instructions": config.persona_instructions,
            "enabled_tools": config.enabled_tools if config.enabled_tools is not None else [t['function']['name'] for t in AVAILABLE_TOOLS],
            "model_override": config.model_override,
            "effective_model": get_effective_model(),
        })


class ChatbotStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Checks connections and reports database indexing stats."""
        # Check active document
        active_doc = KnowledgeDocument.objects.filter(is_active=True).first()
        chunk_count = KnowledgeChunk.objects.filter(document__is_active=True).count() if active_doc else 0

        # Check local/cloud LLM connection
        ollama_url = getattr(settings, 'OLLAMA_API_URL', 'http://localhost:11434')
        api_key = getattr(settings, 'LLM_API_KEY', '')
        is_cloud = "groq" in ollama_url or "together" in ollama_url or "openai" in ollama_url or api_key != ''
        
        from django.core.cache import cache
        cache_key = f"ollama_online_status_{ollama_url}_{api_key[:10]}"
        ollama_online = cache.get(cache_key)
        
        if ollama_online is None:
            ollama_online = False
            try:
                if is_cloud:
                    # Query models endpoint to verify connection and credentials
                    url = ollama_url.rstrip('/')
                    if not url.endswith('/models'):
                        url = f"{url}/models"
                    req = urllib.request.Request(url, method='GET')
                    req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
                    if api_key:
                        req.add_header('Authorization', f'Bearer {api_key}')
                    with urllib.request.urlopen(req, timeout=3):
                        ollama_online = True
                else:
                    # Query base endpoint of local Ollama
                    req = urllib.request.Request(ollama_url, method='GET')
                    req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
                    with urllib.request.urlopen(req, timeout=3):
                        ollama_online = True
            except Exception:
                pass
            # Cache connection status for 5 minutes (300 seconds)
            cache.set(cache_key, ollama_online, 300)

        return Response({
            "ollama_connected": ollama_online,
            "ollama_url": ollama_url,
            "model_configured": get_effective_model(),
            "is_cloud": is_cloud,
            "active_document": {
                "title": active_doc.title if active_doc else None,
                "uploaded_at": active_doc.uploaded_at if active_doc else None,
                "chunk_count": chunk_count
            } if active_doc else None
        })
