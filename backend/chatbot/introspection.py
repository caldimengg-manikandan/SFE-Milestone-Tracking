"""
Derives LLM tool JSON-schemas and safe-default classifications directly from DRF
serializers/views, instead of hand-writing a schema per endpoint the way the old
chatbot/tools.py did (27 hand-written entries covering a fraction of the real ~90-100
endpoint surface). New endpoints become chatbot-usable by registering the view (see
manifest.py / tool_registry.py), not by hand-writing another schema here.
"""
from rest_framework import serializers

# Custom @action endpoints that do more than manage a single resource's own CRUD lifecycle
# (send real emails, poll an external mailbox, bulk-import a spreadsheet) - these must never
# come pre-enabled just because an admin's tool list defaults to "everything on", so they're
# excluded from the method-based classification below entirely.
DANGEROUS_ACTIONS = {
    'send_bulk_emails', 'sync_quote_mails', 'upload_excel', 'send_email', 'test_smtp',
}

# FK fields where a human-friendly "<field>_name" lookup alias is worth offering alongside the
# raw numeric id, because users refer to these by name in conversation ("project NAMRUTHA"),
# not by database id.
NAME_LOOKUP_ALLOWLIST = {'customer', 'project', 'detailer', 'estimator'}


def classify_tool(http_method, action_name=None):
    """
    Returns the admin-facing safe-default classification for a generated tool:
    - 'disabled': must never be exposed unless an admin explicitly opts in via
      AgentConfig.enabled_tools (DELETE operations, and any of DANGEROUS_ACTIONS).
    - 'enabled_confirm_required': safe to expose, but the caller must gate execution on the
      existing confirm=true pattern (see confirm.py) since it mutates data.
    - 'enabled': safe to expose with no extra gate (read-only).
    """
    if action_name in DANGEROUS_ACTIONS:
        return 'disabled'
    method = http_method.upper()
    if method == 'DELETE':
        return 'disabled'
    if method in ('POST', 'PUT', 'PATCH'):
        return 'enabled_confirm_required'
    return 'enabled'


def _special_field_description(field):
    """
    Field classes whose accepted input is broader than a generic type hint conveys - without
    this, the LLM only ever guesses one format (usually ISO) and silently limits how users can
    phrase things, even though the real endpoint accepts much more.
    """
    if type(field).__name__ == 'FlexibleDateField':
        return ("Accepts flexible formats: 'September 2026', 'Sep-26', 'Sep 2026', "
                "'09/2026', '09-2026', '2026-09', or ISO YYYY-MM-DD - normalized to the "
                "1st of the month.")
    return None


def _field_to_json_schema(field):
    description = (field.help_text or '').strip()
    special = _special_field_description(field)
    if special:
        description = f"{description} {special}".strip()

    if isinstance(field, serializers.ChoiceField):
        return {"type": "string", "enum": [str(c) for c in field.choices.keys()], "description": description}
    if isinstance(field, serializers.BooleanField):
        return {"type": "boolean", "description": description}
    if isinstance(field, (serializers.IntegerField, serializers.PrimaryKeyRelatedField)):
        return {"type": "integer", "description": description}
    if isinstance(field, (serializers.FloatField, serializers.DecimalField)):
        return {"type": "number", "description": description}
    if isinstance(field, serializers.ListSerializer):
        # Nested writable array, e.g. CustomerSerializer's `contacts` - one recursion level.
        nested_props = {
            name: _field_to_json_schema(f) for name, f in field.child.fields.items() if not f.read_only
        }
        return {"type": "array", "items": {"type": "object", "properties": nested_props}, "description": description}
    if isinstance(field, serializers.Serializer):
        # Nested writable single object.
        nested_props = {
            name: _field_to_json_schema(f) for name, f in field.fields.items() if not f.read_only
        }
        return {"type": "object", "properties": nested_props, "description": description}
    if isinstance(field, (serializers.ListField, serializers.ManyRelatedField)):
        child = getattr(field, 'child', None) or getattr(field, 'child_relation', None)
        child_schema = _field_to_json_schema(child) if child is not None else {"type": "string"}
        return {"type": "array", "items": child_schema, "description": description}
    # DateField, DateTimeField, CharField, EmailField, SlugRelatedField, etc. all map cleanly
    # to a plain string from the LLM's side.
    return {"type": "string", "description": description}


def build_tool_schema(tool_name, description, serializer_class, http_method, extra_params=None):
    """
    Builds an LLM tool JSON-schema {"type": "function", "function": {...}} from a serializer's
    declared fields, honoring read_only/required/choices/source-vs-field_name distinctions DRF
    already tracks - so the schema always matches what the real endpoint actually accepts.

    `extra_params`: an ordered dict of {name: (schema_dict, is_required)} spliced in ahead of
    the serializer-derived properties - used for path kwargs like project_id (see manifest.py)
    that aren't part of the serializer at all.
    """
    is_write = http_method.upper() in ('POST', 'PUT', 'PATCH')
    properties = {}
    required = []

    for name, (schema, is_required) in (extra_params or {}).items():
        properties[name] = schema
        if is_required:
            required.append(name)

    if serializer_class is not None:
        serializer = serializer_class()
        for field_name, field in serializer.fields.items():
            if is_write:
                if field.read_only:
                    continue
                properties[field_name] = _field_to_json_schema(field)
                if field.required:
                    required.append(field_name)
                if isinstance(field, serializers.PrimaryKeyRelatedField) and field_name in NAME_LOOKUP_ALLOWLIST:
                    properties[f"{field_name}_name"] = {
                        "type": "string",
                        "description": f"Alternative to '{field_name}': resolves it by fuzzy "
                                        f"name match instead of requiring its numeric id."
                    }
            else:
                # Read/list tools only expose meaningful filters, not every field as a param -
                # choice fields make good filters; free-text search is handled separately by
                # whatever 'query' param the view already defines (e.g. DRF SearchFilter).
                if isinstance(field, serializers.ChoiceField):
                    properties[field_name] = _field_to_json_schema(field)

    parameters = {"type": "object", "properties": properties}
    if required:
        parameters["required"] = required

    return {
        "type": "function",
        "function": {"name": tool_name, "description": description, "parameters": parameters},
    }
