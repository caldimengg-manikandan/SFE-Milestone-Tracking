import os
import django
import sys

# Setup django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sfe_project.settings")
django.setup()

from chatbot.services import call_local_ollama, retrieve_relevant_context
from chatbot.tools import AVAILABLE_TOOLS

user_query = "how to mark holidays in holiday calander"
context_results = retrieve_relevant_context(user_query, limit=3)
context_parts = []
for res in context_results:
    context_parts.append(f"[Content (Source: Page {res['chunk'].page_number})]:\n{res['chunk'].text}")
context_str = "\n\n".join(context_parts)

system_instruction_new = (
    "You are an offline assistant for the SFE Milestone Tracking application.\n"
    "Your task is to answer user queries using the provided application workflow context.\n"
    "Keep answers concise, accurate, and format them cleanly in Markdown.\n\n"
    f"--- WORKFLOW DOCUMENT CONTEXT ---\n{context_str}\n---------------------------------"
)

messages_new = [
    {"role": "system", "content": system_instruction_new},
    {"role": "user", "content": user_query}
]

print("--- TESTING NO TOOLS (STRICT RAG) ---")
res_no_tools = call_local_ollama(messages_new, tools=None)
print("Response:", res_no_tools)
print("="*40)
