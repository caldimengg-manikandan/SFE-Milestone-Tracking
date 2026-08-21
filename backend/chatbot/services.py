import re
import json
import time
import urllib.request
import urllib.error
import pypdf
import numpy as np
from django.conf import settings
from rank_bm25 import BM25Okapi
from .models import KnowledgeDocument, KnowledgeChunk, ChatMessage, AgentConfig


def build_context_memory(chat_session):
    """Extracts conversational context from recent messages to support entity-based follow-ups."""
    history_messages = list(ChatMessage.objects.filter(session=chat_session).order_by('-timestamp')[:12])
    history_messages.reverse()

    recent_entities = []
    for message in history_messages:
        text = (message.text or '').strip()
        if not text:
            continue
        lowered = text.lower()
        if 'employee' in lowered:
            recent_entities.append('employee')
        if 'customer' in lowered:
            recent_entities.append('customer')
        if 'project' in lowered or 'rfq' in lowered or 'milestone' in lowered:
            recent_entities.append('project')
        if 'customer' in lowered and 'create' in lowered:
            recent_entities.append('customer:create')

    if not recent_entities:
        return "No prior business context in this conversation."

    context = []
    if recent_entities.count('employee'):
        context.append("The user has recently discussed employees.")
    if recent_entities.count('customer'):
        context.append("The user has recently discussed customers.")
    if recent_entities.count('project'):
        context.append("The user has recently discussed projects, milestones, or RFQ-related work.")
    if recent_entities.count('customer:create'):
        context.append("The user may be working on customer-creation tasks.")
    return " ".join(context)

def _embed_and_save_chunks(chunks_to_create):
    """
    Bulk-creates KnowledgeChunk rows and immediately computes+stores their embeddings, so a
    chunk is never left without one once ingestion succeeds (no separate backfill needed for
    freshly ingested documents - backfill_chunk_embeddings only exists for pre-migration rows).
    """
    created = KnowledgeChunk.objects.bulk_create(chunks_to_create)
    if not created:
        return 0
    from .embeddings import embed_texts
    vectors = embed_texts([c.text for c in created])
    for chunk, vector in zip(created, vectors):
        chunk.embedding = vector
    KnowledgeChunk.objects.bulk_update(created, ['embedding'])
    return len(created)


def ingest_pdf_document(document_id):
    """
    Parses an uploaded PDF, chunks the text by page, and saves + embeds chunks in the database.
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

    return _embed_and_save_chunks(chunks_to_create)


def ingest_text_content(doc, text_content):
    """
    Splits Markdown/text content into chunks by '## '/'### ' headers (keeps a whole
    section/subsection together in one chunk so context isn't fragmented mid-topic), then
    saves + embeds them for `doc`. Shared by the seed_app_knowledge and import_workflow
    management commands so both funnel through the same embedding pipeline as PDF uploads.
    """
    KnowledgeChunk.objects.filter(document=doc).delete()

    sections = re.split(r'\n(?=## |### )', text_content)
    chunks_to_create = []
    chunk_index = 0

    for sec_idx, section in enumerate(sections):
        chunk_content = section.strip()
        if len(chunk_content) > 30:
            chunks_to_create.append(KnowledgeChunk(
                document=doc,
                text=chunk_content,
                page_number=sec_idx + 1,
                chunk_index=chunk_index
            ))
            chunk_index += 1

    return _embed_and_save_chunks(chunks_to_create)

STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can',
    'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
    'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in',
    'into', 'is', 'it', 'its', 'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off',
    'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
    'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
    'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
    'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your',
    'yours', 'yourself', 'yourselves', 'show', 'shows', 'showed', 'showing'
}

def tokenize(text):
    """Tokenizes a string for BM25 matching."""
    return re.findall(r'\w+', text.lower())

def _normalize_scores(scores):
    """
    Min-max normalizes a score array to [0, 1] so two incomparable-scale signals (raw BM25
    scores vs. cosine similarities) can be combined without one dominating by magnitude alone.
    When every score ties (no differentiation - e.g. a single-chunk corpus, or no lexical/
    semantic signal at all), returns all-1s if the tied value is meaningfully positive (treat
    as equally relevant) or all-0s if the tied value is ~0 (no signal either way) - a plain
    min-max would otherwise silently zero out a single-chunk corpus regardless of relevance.
    """
    if scores.size == 0:
        return scores
    lo, hi = float(scores.min()), float(scores.max())
    if hi - lo < 1e-9:
        return np.ones_like(scores) if hi > 1e-9 else np.zeros_like(scores)
    return (scores - lo) / (hi - lo)


def retrieve_relevant_context(query, limit=5, alpha=0.5):
    """
    Hybrid retrieval over all active KnowledgeChunks: BM25 lexical search (reliable for exact
    codes/IDs like "RFQ-2026-001" that a general-purpose embedding model can conflate) combined
    with dense embedding cosine similarity (catches paraphrases/synonyms BM25 misses
    lexically, replacing the old hand-maintained synonym map). `alpha` weights the dense
    signal (0 = pure BM25, 1 = pure semantic); chunks without a stored embedding yet
    (pre-backfill) simply contribute 0 to the dense side rather than breaking retrieval.
    Returns a list of dicts: {"chunk": chunk, "score": score}.
    """
    chunks = list(KnowledgeChunk.objects.filter(document__is_active=True))
    if not chunks:
        return []

    # Sparse (lexical) scores.
    corpus = [tokenize(c.text) for c in chunks]
    bm25 = BM25Okapi(corpus)
    query_tokens = tokenize(query)
    filtered_tokens = [t for t in query_tokens if t not in STOP_WORDS]
    bm25_scores = np.array(bm25.get_scores(filtered_tokens or query_tokens), dtype=np.float32)

    # Dense (semantic) scores.
    from .embeddings import embed_query, cosine_similarity_batch
    query_vector = embed_query(query)
    embedding_dim = next((len(c.embedding) for c in chunks if c.embedding), 0)
    if embedding_dim and query_vector:
        embedding_matrix = [c.embedding if c.embedding else [0.0] * embedding_dim for c in chunks]
        dense_scores = cosine_similarity_batch(query_vector, embedding_matrix)
    else:
        dense_scores = np.zeros(len(chunks), dtype=np.float32)

    combined = alpha * _normalize_scores(dense_scores) + (1 - alpha) * _normalize_scores(bm25_scores)

    scored_chunks = sorted(zip(combined, chunks), key=lambda x: x[0], reverse=True)

    results = []
    for score, chunk in scored_chunks[:limit]:
        if score > 0:  # Only return chunks with some match relevance
            results.append({
                "chunk": chunk,
                "score": float(score)
            })
    return results

def select_relevant_tools(query, filtered_tools):
    """
    Dynamically filters AVAILABLE_TOOLS so we only pass relevant tools
    to Groq/LLM for the current query. Keeps payload size compact to prevent rate limits.
    """
    if not filtered_tools:
        return None

    query_lower = query.lower().strip()

    # Informational / How-To queries should NOT trigger navigate_to_page!
    is_informational = any(kw in query_lower for kw in ["how to", "how do", "how can", "explain", "what is", "steps to", "guide for", "how add"])

    selected = []

    # Include search_records for lookups, but ONLY include navigate_to_page if user explicitly asks to open/go to a page
    always_included = {"search_records"}
    if any(kw in query_lower for kw in ["navigate", "go to", "open", "show page", "take me to"]):
        always_included.add("navigate_to_page")

    for tool in filtered_tools:
        name = tool["function"]["name"]
        if name in always_included:
            selected.append(tool)
            continue

        # Match intent keywords for CRUD actions
        if any(kw in query_lower for kw in ["employee", "staff", "worker"]) and "employee" in name:
            selected.append(tool)
        elif any(kw in query_lower for kw in ["project", "erection", "ton"]) and "project" in name:
            selected.append(tool)
        elif any(kw in query_lower for kw in ["customer", "client"]) and "customer" in name:
            selected.append(tool)
        elif any(kw in query_lower for kw in ["rfq", "quote", "bid"]) and "rfq" in name:
            selected.append(tool)
        elif any(kw in query_lower for kw in ["milestone", "due", "deliverable"]) and "milestone" in name:
            selected.append(tool)
        elif any(kw in query_lower for kw in ["announcement", "alert", "post"]) and "announcement" in name:
            selected.append(tool)
        elif any(kw in query_lower for kw in ["machine", "equipment"]) and "machine" in name:
            selected.append(tool)
        elif any(kw in query_lower for kw in ["manpower", "workforce", "roster"]) and "manpower" in name:
            selected.append(tool)
        elif any(kw in query_lower for kw in ["capacity", "throughput"]) and "capacity" in name:
            selected.append(tool)

    # If the user is asking an informational "how-to" question and no action tools matched, pass NO tools so LLM gives a full text explanation
    if is_informational and len(selected) <= 1:
        return None

    return selected[:6] if selected else None


def get_effective_model():
    """Resolves the model actually in use: admin override, else the env default."""
    config = AgentConfig.get_solo()
    return config.model_override or getattr(settings, 'OLLAMA_MODEL', 'llama3.2')
        
def parse_json_from_text(text, allowed_tools=None):
    """
    Tries to extract and parse a JSON object from text.
    Supports markdown blocks, backticks, and XML-style tag wrappers.
    Returns (tool_name, arguments) or (None, None).

    `allowed_tools` restricts which tool names are recognized (e.g. the
    admin-configured enabled-tools allowlist). Defaults to every registered
    handler when not provided.
    """
    if not text:
        return None, None

    from .tool_handlers import TOOL_HANDLERS
    valid_tools = list(allowed_tools) if allowed_tools is not None else list(TOOL_HANDLERS.keys())
        
    # Locate all opening braces
    brace_indices = [i for i, char in enumerate(text) if char == '{']
    
    # Check largest candidate blocks first
    for start in brace_indices:
        for end in range(len(text) - 1, start, -1):
            if text[end] == '}':
                candidate = text[start:end+1]
                try:
                    parsed = json.loads(candidate)
                    
                    # Check 1: Check if there is an XML-style or Groq-style tag before the JSON block
                    # e.g. <function=navigate_to_page{"page_name": "holiday_calendar"}
                    # or <call:navigate_to_page>{"page_name": "dashboard"}</call:navigate_to_page>
                    tag_match = re.search(r'<[^\s>]*?([\w_]+)', text[:start], re.IGNORECASE)
                    if tag_match:
                        raw_tag = tag_match.group(1)
                        tool_name = raw_tag.split(':')[-1].split('=')[-1].lower()
                        if tool_name in valid_tools:
                            args = parsed.get("parameters") or parsed.get("arguments") or parsed.get("args") or parsed
                            return tool_name, args
                            
                    # Check 2: Check if a valid tool name is mentioned in the text before the JSON block
                    # e.g., create_employee {"name": "thamizh", ...}
                    tool_match = re.search(r'\b(' + '|'.join(valid_tools) + r')\b', text[:start], re.IGNORECASE)
                    if tool_match:
                        tool_name = tool_match.group(1).lower()
                        args = parsed.get("parameters") or parsed.get("arguments") or parsed.get("args") or parsed
                        return tool_name, args
                        
                    # Check 3: Standard JSON tool call structure (name inside the JSON body)
                    # We verify that the extracted name is in valid_tools to avoid false matches (e.g. name of employee)
                    name = parsed.get("name") or parsed.get("function")
                    if name and isinstance(name, str) and name.lower() in valid_tools:
                        args = parsed.get("parameters") or parsed.get("arguments") or parsed.get("args") or {}
                        return name.lower(), args
                except Exception:
                    continue  # Keep scanning if this block is invalid JSON
                    
    return None, None

def _parse_retry_after(headers, body_text, default=5):
    """Extracts a suggested cooldown (seconds) from a 429 response's Retry-After header or body text."""
    retry_after = headers.get('Retry-After') if headers else None
    if retry_after:
        try:
            return float(retry_after)
        except (TypeError, ValueError):
            pass
    match = re.search(r'try again in ([\d.]+)s', body_text or '', re.IGNORECASE)
    if match:
        try:
            return float(match.group(1)) + 0.5  # small buffer past the suggested window
        except ValueError:
            pass
    return default

def call_local_ollama(messages, tools=None, model=None, base_url=None, api_key=None):
    """
    Calls Ollama chat endpoint or OpenAI/Groq/Gemini compatible cloud completions endpoints.
    Returns the raw assistant message dictionary.

    base_url/api_key default to the primary provider's settings, but can be overridden to
    target a different provider (e.g. a fallback) without touching global settings.
    """
    base_url = base_url if base_url is not None else getattr(settings, 'OLLAMA_API_URL', 'http://localhost:11434')
    api_key = api_key if api_key is not None else getattr(settings, 'LLM_API_KEY', '')

    # Check if the URL indicates a cloud completions endpoint or if an API key is present
    is_cloud = "groq" in base_url or "together" in base_url or "openai" in base_url or api_key != ''

    payload = {
        "model": model or getattr(settings, 'OLLAMA_MODEL', 'llama3.2'),
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
    
    server_type = "cloud API" if is_cloud else "local Ollama server"
    # Codes that can plausibly be transient (rate limiting, upstream hiccups, or a request
    # body corrupted/truncated in transit by a flaky connection) rather than a genuinely
    # bad request - worth a brief retry. 401/403/404 are never transient, so fail fast.
    retryable_http_codes = {400, 408, 429, 500, 502, 503, 504}
    max_attempts = 3
    last_error_detail = None

    for attempt in range(1, max_attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                res_data = response.read().decode('utf-8')
                res_json = json.loads(res_data)

                if is_cloud:
                    choices = res_json.get('choices', [])
                    if choices:
                        return choices[0].get('message', {})
                    return {}
                else:
                    return res_json.get('message', {})
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', 'replace')
            last_error_detail = f"HTTP {e.code}: {body[:500]}"
            # A daily-quota rate limit (as opposed to a per-minute one) needs minutes to
            # clear, not seconds - retrying the same model here would just waste time before
            # the caller falls back to another provider, so fail fast instead.
            is_daily_quota_error = e.code == 429 and 'per day' in body.lower()
            if e.code in retryable_http_codes and not is_daily_quota_error and attempt < max_attempts:
                if e.code == 429:
                    # Respect the server's suggested cooldown (Retry-After header, or a
                    # "try again in Xs" hint in the body) instead of a fixed short backoff -
                    # a fixed 1-2s wait is nowhere near enough for a real rate-limit window.
                    wait_seconds = _parse_retry_after(e.headers, body)
                else:
                    wait_seconds = attempt  # 1s, then 2s backoff for other transient errors
                time.sleep(min(wait_seconds, 30))
                continue
            raise Exception(
                f"Unable to connect to the {server_type}. Make sure the server URL and API key are correct in settings. "
                f"Error details: {last_error_detail}"
            )
        except urllib.error.URLError as e:
            # Connection-level failure (timeout, DNS, refused) - can be a transient network blip, so retry briefly.
            last_error_detail = str(e)
            if attempt < max_attempts:
                time.sleep(attempt)  # 1s, then 2s backoff
                continue

    raise Exception(
        f"Unable to connect to the {server_type} after {max_attempts} attempts. Make sure the server URL and API key "
        f"are correct in settings, and that this server has network access to it. Error details: {last_error_detail}"
    )

def call_llm_with_fallback(messages, tools=None, model=None):
    """
    Calls the primary LLM provider; if that fails for any reason (rate limit - including a
    daily quota that won't clear for a while, connection issue, etc.), transparently retries
    the request across candidate fallback models (e.g., llama-3.1-8b-instant, gemma2-9b-it, mixtral-8x7b-32768)
    instead of failing the whole chatbot response.

    Returns (message_dict, model_actually_used, used_fallback).
    """
    primary_model = model or getattr(settings, 'OLLAMA_MODEL', 'llama3.2')
    fallback_url = getattr(settings, 'FALLBACK_LLM_API_URL', '')
    fallback_model = getattr(settings, 'FALLBACK_LLM_MODEL', '')
    fallback_key = getattr(settings, 'FALLBACK_LLM_API_KEY', '')

    # 1. Try primary provider
    try:
        return call_local_ollama(messages, tools=tools, model=primary_model), primary_model, False
    except Exception as primary_error:
        # Build candidate fallback models list
        candidate_models = []
        if fallback_model:
            candidate_models.append(fallback_model)
        for m in ['llama-3.1-8b-instant', 'gemma2-9b-it', 'mixtral-8x7b-32768', 'llama3-70b-8192']:
            if m not in candidate_models and m != primary_model:
                candidate_models.append(m)

        errors = [f"Primary ({primary_model}): {str(primary_error)}"]
        fb_url = fallback_url or getattr(settings, 'OLLAMA_API_URL', 'http://localhost:11434')
        fb_key = fallback_key or getattr(settings, 'LLM_API_KEY', '')

        # 2. Iterate through candidate fallback models
        for fb_m in candidate_models:
            try:
                result = call_local_ollama(
                    messages, tools=tools, model=fb_m,
                    base_url=fb_url, api_key=fb_key
                )
                return result, fb_m, True
            except Exception as fb_err:
                errors.append(f"Fallback ({fb_m}): {str(fb_err)}")
                continue

        raise Exception(" | ".join(errors))

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
    # 0. Load admin-configured agent behavior
    from .tools import AVAILABLE_TOOLS
    agent_config = AgentConfig.get_solo()
    effective_model = agent_config.model_override or getattr(settings, 'OLLAMA_MODEL', 'llama3.2')
    all_tool_names = {t['function']['name'] for t in AVAILABLE_TOOLS}
    allowed_tool_names = all_tool_names if agent_config.enabled_tools is None else set(agent_config.enabled_tools)
    filtered_tools = [t for t in AVAILABLE_TOOLS if t['function']['name'] in allowed_tool_names]

    # 1. Retrieve local context chunks (top 3 chunks, truncated to 500 chars to keep prompt token count light)
    search_results = retrieve_relevant_context(user_query, limit=3)

    # Build context string and track citations
    context_parts = []
    citations = []
    for res in search_results:
        chunk = res["chunk"]
        chunk_snippet = chunk.text[:500] + ("..." if len(chunk.text) > 500 else "")
        context_parts.append(f"[Content (Source: Page {chunk.page_number})]:\n{chunk_snippet}")
        citation = {
            "page": chunk.page_number,
            "document": chunk.document.title
        }
        if citation not in citations:
            citations.append(citation)
            
    context_str = "\n\n".join(context_parts)
    
    # 2. Define System Instructions
    memory_context = build_context_memory(chat_session)
    system_instruction = (
        "You are an in-application expert assistant for the SFE Milestone Tracking application - "
        "a steel fabrication and erection project management platform. You know this application "
        "thoroughly: its modules, workflows, and how each feature actually works. You are not a "
        "general-purpose chatbot; you exist ONLY to help users understand and use THIS application.\n"
        "FIRST AND FOREMOST: Never mention documents, context, sources, or reference materials in your responses. Do not use phrases like 'from the document', 'according to', 'mentioned in', 'based on', 'refer to', or any similar wording. Speak from your own knowledge of the application, as an expert naturally would.\n\n"
        "--- STRICT SCOPE (non-negotiable) ---\n"
        "You answer ONLY using two sources: (1) the RETRIEVED KNOWLEDGE section below, and (2) live data/actions returned by your tools. Never answer from general/industry/textbook knowledge that isn't grounded in one of these two sources, even if you technically know the answer from general training. This application's terms (RFQ, estimation, erection, FMC, milestones, etc.) may resemble general industry concepts elsewhere, but your answers must describe how THIS application specifically implements them - not how the industry 'typically' does it.\n"
        "If a question is unrelated to this application entirely (general knowledge, world facts, unrelated coding help, other software, small talk about unrelated topics), do not answer it. State plainly that you are the SFE Milestone Tracking assistant and only help with this application, then offer to help with something you can actually answer.\n"
        "If a question IS about this application but neither the RETRIEVED KNOWLEDGE section nor any tool covers it, say so honestly and specifically (name what you don't have information on) rather than filling the gap with a plausible-sounding generic answer. A confident wrong answer is worse than an honest 'I don't have that documented.'\n"
        "--- PRECISION & REASONING ---\n"
        "Before answering, identify internally: (a) is this conceptual/how-it-works (answer from RETRIEVED KNOWLEDGE), (b) is this live data or an action (use the matching tool), or (c) is this out of scope (say so per the rules above). Do not blend general assumptions into a knowledge- or tool-based answer.\n"
        "Be exact: use the real field names, formulas, statuses, and terminology from the RETRIEVED KNOWLEDGE section or tool results verbatim - do not paraphrase technical details into vaguer general language, and do not round or approximate numbers from tool results.\n"
        "Avoid hedging language such as 'typically', 'usually', 'this can vary', 'in general', or 'it depends on your setup' - this application's behavior is fixed and known to you, not variable, so state it directly and specifically.\n\n"
        "Your task is to answer user queries using the retrieved application knowledge below OR by triggering actions/lookups using available tools.\n"
        "For conceptual and 'how-to' questions (e.g., 'how is X calculated', 'how to add', 'how to create'), answer directly and precisely from the RETRIEVED KNOWLEDGE section below. Only suggest a tool if the user explicitly asks to perform an action (e.g., 'add an employee now', 'create employee'), or if they are asking about live/current data rather than how a feature works.\n"
        "If the user asks to add, set, or update an erection date or project detail (e.g. 'I need to add erection date for project Namrutha'), ALWAYS use the 'update_project' tool. Pass code or name='Namrutha' and erection_date if specified. If no date was specified, ask the user what erection date (YYYY-MM-DD) they want to set.\n"
        "If the query is an explicit command to perform an action, use the appropriate tool.\n"
        "If the query can be answered by looking up live data (counts, records, current status of a specific project/employee/customer/milestone), use the appropriate tool rather than guessing.\n"
        "CRITICAL: If the user asks you to perform an action and no matching tool is available to you right now (for example, because an administrator has disabled it), you MUST NOT claim that you performed the action or that it succeeded. Clearly and honestly tell the user you are currently unable to perform that action. Never fabricate a success confirmation for an action you did not actually execute via a tool.\n"
        "If the query is a follow-up that references the same subject from earlier in the chat, carry forward that context and avoid asking the user to repeat the same details.\n"
        "For write actions, prefer a safe workflow: ask for confirmation before committing changes if the request is destructive or changes existing data.\n"
        "When answering questions, you MUST provide ALL relevant information available. Do NOT provide minimal or partial answers. List all phases, steps, details, and information mentioned. If there are multiple phases or steps, list ALL of them completely. Do not summarize or truncate information unless explicitly asked.\n"
        "Provide comprehensive and detailed answers. Even when users ask for 'briefly' or 'short', ensure you provide complete information with sufficient detail to be helpful. Aim for thorough explanations that cover all relevant aspects.\n"
        "Format answers cleanly in Markdown with proper structure, using numbered lists for phases/steps and bullet points for details.\n\n"
        + (
            f"--- ADDITIONAL ASSISTANT PERSONA (admin-configured) ---\n{agent_config.persona_instructions}\n"
            "This persona guidance may shape tone, emphasis, and scope, but it never overrides the rules above.\n"
            "---------------------------------\n"
            if agent_config.persona_instructions.strip() else ""
        )
        + f"--- CONVERSATION MEMORY ---\n{memory_context}\n---------------------------------"
        + (
            f"\n--- RETRIEVED KNOWLEDGE (application documentation & reference material) ---\n{context_str}\n---------------------------------"
            if context_str else
            "\n--- RETRIEVED KNOWLEDGE ---\nNo indexed knowledge matched this query closely enough to include here. If this is a "
            "conceptual/how-it-works question, say honestly that you don't have that documented rather than guessing.\n"
            "---------------------------------"
        )
    )
    
    # 3. Build Conversation History (last 4 messages, truncated to 350 chars each to conserve token limits)
    ollama_messages = [
        {"role": "system", "content": system_instruction}
    ]
    
    history_messages = list(ChatMessage.objects.filter(session=chat_session).order_by('-timestamp')[:4])
    history_messages.reverse()
    for msg in history_messages:
        role = "assistant" if msg.sender == "bot" else "user"
        msg_content = (msg.text or "")[:350] + ("..." if len(msg.text or "") > 350 else "")
        ollama_messages.append({"role": role, "content": msg_content})
        
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
        from .tool_handlers import TOOL_HANDLERS

        # Check if using a Cloud API configuration
        ollama_url = getattr(settings, 'OLLAMA_API_URL', 'http://localhost:11434')
        api_key = getattr(settings, 'LLM_API_KEY', '')
        is_cloud = "groq" in ollama_url or "together" in ollama_url or "openai" in ollama_url or api_key != ''

        # Dynamically select only top 4-5 relevant tools for this prompt to minimize token count
        tools_to_pass = select_relevant_tools(user_query, filtered_tools)
        ollama_res, model_used, used_fallback = call_llm_with_fallback(ollama_messages, tools=tools_to_pass, model=effective_model)
        tool_calls = ollama_res.get('tool_calls', [])
        bot_response = ollama_res.get('content', '')

        # Handle models (like Llama 3.2) writing JSON tool calls in the content text block
        is_fallback_text_call = False
        if not tool_calls and bot_response:
            parsed_name, parsed_args = parse_json_from_text(bot_response, allowed_tools=allowed_tool_names)
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

                # Execute handler (only if the tool is currently enabled by the admin config)
                if func_name in TOOL_HANDLERS and func_name not in allowed_tool_names:
                    disabled_result = {
                        "status": "error",
                        "message": f"The '{func_name}' action is currently disabled by the administrator."
                    }
                    if is_fallback_text_call:
                        bot_response = disabled_result["message"]
                    else:
                        tool_msg = {
                            "role": "tool",
                            "content": json.dumps(disabled_result)
                        }
                        if tool_call.get('id'):
                            tool_msg["tool_call_id"] = tool_call.get('id')
                        ollama_messages.append(tool_msg)
                elif func_name in TOOL_HANDLERS:
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

            # Summarize only if it wasn't a direct text call or a navigation redirect that actually executed
            is_navigation = any(
                tc.get('function', {}).get('name') == 'navigate_to_page' and 'navigate_to_page' in allowed_tool_names
                for tc in tool_calls
            )
            if not is_fallback_text_call and not is_navigation:
                try:
                    if used_fallback:
                        fallback_url = getattr(settings, 'FALLBACK_LLM_API_URL', '')
                        fallback_key = getattr(settings, 'FALLBACK_LLM_API_KEY', '')
                        final_res = call_local_ollama(
                            ollama_messages, model=model_used, base_url=fallback_url, api_key=fallback_key
                        )
                    else:
                        final_res, _, _ = call_llm_with_fallback(ollama_messages, model=effective_model)
                    bot_response = final_res.get('content', '')
                except Exception as e:
                    if 'tool_calls' in ollama_messages[-1]:
                        bot_response = "Action completed successfully."
                    else:
                        bot_response = f"Action completed. (Summary unavailable due to: {str(e)})"

    except Exception as e:
        err_msg = str(e)
        parsed_name, parsed_args = parse_json_from_text(err_msg, allowed_tools=allowed_tool_names)
        if parsed_name and parsed_name in TOOL_HANDLERS:
            result = TOOL_HANDLERS[parsed_name](user, parsed_args or {})
            if isinstance(result, dict) and "ui_actions" in result:
                ui_actions.extend(result["ui_actions"])
            bot_response = result.get('message', 'Action executed successfully.')
        elif ui_actions:
            bot_response = "Action completed successfully."
        elif "rate limit" in err_msg.lower() or "429" in err_msg or "tpd" in err_msg.lower() or "tpm" in err_msg.lower():
            bot_response = (
                "⚠️ **Groq Cloud API Rate Limit Reached**\n\n"
                "The daily token limit for your free Groq API tier (`llama-3.3-70b-versatile`) has been temporarily reached.\n\n"
                "**How to continue using the assistant right now:**\n"
                "1. **Switch Model**: Go to **Agent Settings** (`/settings`) and select a lighter model like `llama-3.1-8b-instant` or `gemma2-9b-it`.\n"
                "2. **Use Local Ollama**: Set `OLLAMA_API_URL=http://localhost:11434` in `backend/.env` for unlimited local requests.\n"
                "3. **Wait for Reset**: Groq's daily free quota automatically resets every 24 hours (or in ~1 hour)."
            )
        else:
            bot_response = f"⚠️ Chatbot Error: {err_msg}"
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
