import re
import json
import urllib.request
import urllib.error
import pypdf
from django.conf import settings
from rank_bm25 import BM25Okapi
from .models import KnowledgeDocument, KnowledgeChunk, ChatMessage

def ingest_pdf_document(document_id):
    """
    Parses an uploaded PDF, chunks the text by page, and saves chunks in the database.
    """
    doc = KnowledgeDocument.objects.get(id=document_id)
    # Clear old chunks for this document if updating
    KnowledgeChunk.objects.filter(document=doc).delete()
    
    reader = pypdf.PdfReader(doc.file.path)
    chunks_to_create = []
    chunk_index = 0
    
    for page_idx, page in enumerate(reader.pages):
        page_num = page_idx + 1
        text = page.extract_text() or ""
        text = text.strip()
        if not text:
            continue
            
        # Split page text into blocks of approx 800 chars with 200 overlap to keep context
        chunk_size = 800
        overlap = 200
        
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            
            # Smart end: try to align with word boundaries
            if end < len(text):
                space_idx = text.rfind(" ", end - 50, end)
                if space_idx != -1:
                    end = space_idx
                    
            chunk_text = text[start:end].strip()
            if len(chunk_text) > 30:  # Ignore trivial noise chunks
                chunks_to_create.append(KnowledgeChunk(
                    document=doc,
                    text=chunk_text,
                    page_number=page_num,
                    chunk_index=chunk_index
                ))
                chunk_index += 1
            
            start = end - overlap
            if overlap >= (end - start):  # Prevent infinite loop
                start = end
                
    KnowledgeChunk.objects.bulk_create(chunks_to_create)
    return len(chunks_to_create)

def tokenize(text):
    """Tokenizes a string for BM25 matching."""
    return re.findall(r'\w+', text.lower())

def retrieve_relevant_context(query, limit=5):
    """
    Performs BM25 search on all active KnowledgeChunks.
    Returns list of dicts: {"chunk": chunk, "score": score}
    """
    chunks = list(KnowledgeChunk.objects.filter(document__is_active=True))
    if not chunks:
        return []
        
    corpus = [tokenize(c.text) for c in chunks]
    bm25 = BM25Okapi(corpus)
    
    query_tokens = tokenize(query)
    scores = bm25.get_scores(query_tokens)
    
    # Sort and rank
    scored_chunks = sorted(zip(scores, chunks), key=lambda x: x[0], reverse=True)
    
    results = []
    for score, chunk in scored_chunks[:limit]:
        if score > 0:  # Only return chunks with some match relevance
            results.append({
                "chunk": chunk,
                "score": score
            })
    return results

def should_use_tools(query):
    """
    Heuristic to decide if we should pass tools to Ollama.
    Prevents Llama from force-calling/hallucinating tools for general Q&A.
    """
    query_lower = query.lower().strip()
    
    # Informational keywords should bypass tools
    if any(q_word in query_lower for q_word in ["how to", "how do", "how can", "explain", "what is", "steps to", "guide for"]):
        return False

    # Navigation keywords
    if any(keyword in query_lower for keyword in ["navigate", "go to", "open page", "show page", "take me to", "redirect", "open the"]):
        return True
        
    # Employee creation keywords (e.g., "add an employee", "create employee")
    if "employee" in query_lower or "emp" in query_lower:
        if any(verb in query_lower for verb in ["add", "create", "new", "register", "insert"]):
            return True
            
    # Employee details search keywords (e.g., "details of employee", "find emp")
    if "employee" in query_lower or "emp" in query_lower:
        if any(verb in query_lower for verb in ["search", "find", "lookup", "details", "get", "show", "view"]):
            return True

    # Project listing keywords (e.g., "view projects", "list projects")
    if "project" in query_lower or "proj" in query_lower:
        if any(verb in query_lower for verb in ["list", "show", "get", "what", "active", "view"]):
            return True

    # Customer creation keywords (e.g., "add customer", "create customer")
    if "customer" in query_lower or "cust" in query_lower:
        if any(verb in query_lower for verb in ["add", "create", "new", "register", "insert"]):
            return True
            
    return False
        
def parse_json_from_text(text):
    """
    Tries to extract and parse a JSON object from text.
    Supports markdown blocks, backticks, and XML-style tag wrappers.
    Returns (tool_name, arguments) or (None, None).
    """
    if not text:
        return None, None
        
    from .tool_handlers import TOOL_HANDLERS
    valid_tools = list(TOOL_HANDLERS.keys())
        
    # Locate all opening braces
    brace_indices = [i for i, char in enumerate(text) if char == '{']
    
    # Check largest candidate blocks first
    for start in brace_indices:
        for end in range(len(text) - 1, start, -1):
            if text[end] == '}':
                candidate = text[start:end+1]
                try:
                    parsed = json.loads(candidate)
                    
                    # Check 1: Check if there is an XML-style opening tag before the JSON block
                    # e.g. <navigate_to_page {"page_name": "dashboard"}></function>
                    # or <call:navigate_to_page>{"page_name": "dashboard"}</call:navigate_to_page>
                    tag_match = re.search(r'<([\w:]+)', text[:start])
                    if tag_match:
                        raw_tag = tag_match.group(1)
                        # Extract the actual tool name (strip namespace if present)
                        tool_name = raw_tag.split(':')[-1]
                        if tool_name in valid_tools:
                            # Extract the arguments from parsed payload
                            args = parsed.get("parameters") or parsed.get("arguments") or parsed.get("args") or parsed
                            return tool_name, args
                            
                    # Check 2: Check if a valid tool name is mentioned in the text before the JSON block
                    # e.g., create_employee {"name": "thamizh", ...}
                    tool_match = re.search(r'\b(' + '|'.join(valid_tools) + r')\b', text[:start])
                    if tool_match:
                        tool_name = tool_match.group(1)
                        args = parsed.get("parameters") or parsed.get("arguments") or parsed.get("args") or parsed
                        return tool_name, args
                        
                    # Check 3: Standard JSON tool call structure (name inside the JSON body)
                    # We verify that the extracted name is in valid_tools to avoid false matches (e.g. name of employee)
                    name = parsed.get("name") or parsed.get("function")
                    if name and name in valid_tools:
                        args = parsed.get("parameters") or parsed.get("arguments") or parsed.get("args") or {}
                        return name, args
                except Exception:
                    continue  # Keep scanning if this block is invalid JSON
                    
    return None, None

def call_local_ollama(messages, tools=None):
    """
    Calls Ollama chat endpoint or OpenAI/Groq compatible cloud completions endpoints.
    Returns the raw assistant message dictionary.
    """
    base_url = getattr(settings, 'OLLAMA_API_URL', 'http://localhost:11434')
    api_key = getattr(settings, 'LLM_API_KEY', '')
    
    # Check if the URL indicates a cloud completions endpoint or if an API key is present
    is_cloud = "groq" in base_url or "together" in base_url or "openai" in base_url or api_key != ''
    
    payload = {
        "model": getattr(settings, 'OLLAMA_MODEL', 'llama3.2'),
        "messages": messages,
        "stream": False
    }
    if tools:
        payload["tools"] = tools
        
    if is_cloud:
        # Build standard completions endpoint URL
        url = base_url.rstrip('/')
        if not url.endswith('/chat/completions'):
            url = f"{url}/chat/completions"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    else:
        # Build local Ollama API URL
        url = base_url.rstrip('/')
        if not url.endswith('/api/chat'):
            url = f"{url}/api/chat"
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=180) as response:
            res_data = response.read().decode('utf-8')
            res_json = json.loads(res_data)
            
            if is_cloud:
                choices = res_json.get('choices', [])
                if choices:
                    return choices[0].get('message', {})
                return {}
            else:
                return res_json.get('message', {})
    except urllib.error.URLError as e:
        server_type = "cloud API" if is_cloud else "local Ollama server"
        raise Exception(
            f"Unable to connect to the {server_type}. Make sure the server URL and API key are correct in settings. "
            f"Error details: {str(e)}"
        )

def get_chatbot_response(chat_session, user_query, user=None):
    """
    Orchestrates the offline RAG chatbot workflow + tool calling agent loop:
    1. Search database for relevant document chunks based on user_query.
    2. Format system prompt incorporating the document context.
    3. Construct full conversation history from ChatSession messages.
    4. Fetch answer from local Ollama model (supporting tools).
    5. Execute tools if requested, feed results back to LLM.
    6. Save messages & metadata to database.
    """
    # 1. Retrieve local context chunks
    search_results = retrieve_relevant_context(user_query, limit=3)
    
    # Build context string and track citations
    context_parts = []
    citations = []
    for res in search_results:
        chunk = res["chunk"]
        context_parts.append(f"[Content (Source: Page {chunk.page_number})]:\n{chunk.text}")
        citation = {
            "page": chunk.page_number,
            "document": chunk.document.title
        }
        if citation not in citations:
            citations.append(citation)
            
    context_str = "\n\n".join(context_parts)
    
    # 2. Define System Instructions
    system_instruction = (
        "You are an offline assistant for the SFE Milestone Tracking application.\n"
        "Your task is to answer user queries using the provided application workflow context OR by triggering actions using available tools.\n"
        "If the query involves actions like adding an employee, searching for info, or navigation, use the appropriate tool.\n"
        "If the context does not contain relevant information and no tool applies, state that you cannot find it in the documentation.\n"
        "Keep answers concise, accurate, and format them cleanly in Markdown.\n\n"
        f"--- WORKFLOW DOCUMENT CONTEXT ---\n{context_str}\n---------------------------------"
    )
    
    # 3. Build Conversation History
    ollama_messages = [
        {"role": "system", "content": system_instruction}
    ]
    
    # Append last 10 messages from the database to maintain history
    history_messages = list(ChatMessage.objects.filter(session=chat_session).order_by('-timestamp')[:10])
    history_messages.reverse()
    for msg in history_messages:
        role = "assistant" if msg.sender == "bot" else "user"
        ollama_messages.append({"role": role, "content": msg.text})
        
    # Append the current user query
    ollama_messages.append({"role": "user", "content": user_query})
    
    # Save user message to database
    ChatMessage.objects.create(
        session=chat_session,
        sender='user',
        text=user_query
    )
    
    # 4. Generate Answer via Ollama (With Agent Tools)
    ui_actions = []
    try:
        if not context_parts:
            # If no context found, let the model know there is no documentation available
            ollama_messages[0]["content"] = (
                "You are an offline assistant for the SFE Milestone Tracking application. "
                "There is no workflow documentation context matching this query. You may still execute tools if appropriate. "
                "Otherwise, politely state that you could not find any matching documents, but offer general assistance."
            )
            
        from .tools import AVAILABLE_TOOLS
        from .tool_handlers import TOOL_HANDLERS

        # Check if using a Cloud API configuration
        ollama_url = getattr(settings, 'OLLAMA_API_URL', 'http://localhost:11434')
        api_key = getattr(settings, 'LLM_API_KEY', '')
        is_cloud = "groq" in ollama_url or "together" in ollama_url or "openai" in ollama_url or api_key != ''

        # Call with tools if heuristic matches or if using a cloud LLM
        tools_to_pass = AVAILABLE_TOOLS if (is_cloud or should_use_tools(user_query)) else None
        ollama_res = call_local_ollama(ollama_messages, tools=tools_to_pass)
        tool_calls = ollama_res.get('tool_calls', [])
        bot_response = ollama_res.get('content', '')

        # Handle models (like Llama 3.2) writing JSON tool calls in the content text block
        is_fallback_text_call = False
        if not tool_calls and bot_response:
            parsed_name, parsed_args = parse_json_from_text(bot_response)
            if parsed_name:
                tool_calls = [{
                    "function": {
                        "name": parsed_name,
                        "arguments": parsed_args
                    }
                }]
                is_fallback_text_call = True

        if tool_calls:
            # Append Ollama's response containing the tool call to history
            ollama_messages.append(ollama_res)

            for tool_call in tool_calls:
                function_info = tool_call.get('function', {})
                func_name = function_info.get('name')
                func_args = function_info.get('arguments', {})
                
                # Cloud APIs return arguments as a serialized JSON string, parse it
                if isinstance(func_args, str):
                    try:
                        func_args = json.loads(func_args)
                    except Exception:
                        pass

                # Execute handler
                if func_name in TOOL_HANDLERS:
                    result = TOOL_HANDLERS[func_name](user, func_args)
                    # Extract any UI actions returned by the handler
                    if isinstance(result, dict) and "ui_actions" in result:
                        ui_actions.extend(result["ui_actions"])
                    
                    if is_fallback_text_call or func_name == "navigate_to_page":
                        # Direct message response from tool handler for text fallbacks and navigation redirects
                        bot_response = result.get('message', 'Action executed successfully.')
                    else:
                        # Append execution output as a 'tool' role message
                        tool_msg = {
                            "role": "tool",
                            "content": json.dumps(result)
                        }
                        if tool_call.get('id'):
                            tool_msg["tool_call_id"] = tool_call.get('id')
                        ollama_messages.append(tool_msg)
                else:
                    if is_fallback_text_call:
                        bot_response = f"Tool '{func_name}' is not registered."
                    else:
                        tool_msg = {
                            "role": "tool",
                            "content": json.dumps({"status": "error", "message": f"Tool '{func_name}' is not registered."})
                        }
                        if tool_call.get('id'):
                            tool_msg["tool_call_id"] = tool_call.get('id')
                        ollama_messages.append(tool_msg)

            # Summarize only if it wasn't a direct text call or a navigation redirect
            is_navigation = any(tc.get('function', {}).get('name') == 'navigate_to_page' for tc in tool_calls)
            if not is_fallback_text_call and not is_navigation:
                # Call Ollama again to summarize the execution results
                final_res = call_local_ollama(ollama_messages)
                bot_response = final_res.get('content', '')

    except Exception as e:
        bot_response = f"⚠️ Chatbot Error: {str(e)}"
        citations = []
        
    # 5. Save bot message to database
    metadata = {"citations": citations} if citations else {}
    if ui_actions:
        metadata["ui_actions"] = ui_actions

    ChatMessage.objects.create(
        session=chat_session,
        sender='bot',
        text=bot_response,
        metadata=metadata if metadata else None
    )
    
    return bot_response, citations, ui_actions
