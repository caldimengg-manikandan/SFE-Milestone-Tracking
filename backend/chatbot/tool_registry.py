"""
Turns manifest.REGISTRY into LLM tool schemas (via introspection.build_tool_schema) and a
runtime dispatcher (via executor.execute_view_tool), so a registered resource's chatbot
behavior always matches its real serializer/view - no hand-maintained schema or handler to
drift out of sync when a field is renamed or added.
"""
from django.apps import apps

from . import confirm
from . import executor
from . import introspection
from .manifest import REGISTRY, ToolSpec

GENERATED_TOOL_SPECS: dict[str, ToolSpec] = {spec.name: spec for spec in REGISTRY}

GENERATED_TOOL_CLASSIFICATIONS: dict[str, str] = {
    spec.name: introspection.classify_tool(spec.http_method) for spec in REGISTRY
}


def _build_schema(spec: ToolSpec) -> dict:
    schema = introspection.build_tool_schema(
        spec.name, spec.description, spec.serializer_class, spec.http_method,
        extra_params=spec.extra_params,
    )
    if spec.http_method == 'PATCH':
        # Partial update (PATCH): build_tool_schema's `required` list reflects full
        # create-time requiredness from the serializer, which is wrong here - nothing
        # but the record id should ever be required on a partial update, otherwise the
        # LLM ends up restating every field just to change one.
        extra_required = {name for name, (_, is_required) in (spec.extra_params or {}).items() if is_required}
        params = schema['function']['parameters']
        if 'required' in params:
            params['required'] = [r for r in params['required'] if r in extra_required]
            if not params['required']:
                del params['required']
    return schema


GENERATED_TOOLS: list[dict] = [_build_schema(spec) for spec in REGISTRY]


# Mirrors introspection.NAME_LOOKUP_ALLOWLIST: for these FK fields, build_tool_schema
# already advertises a `<field>_name` alias in the schema. This is the runtime half -
# resolving that alias to the real id the serializer expects, the same fuzzy lookup
# tool_handlers.handle_update_project already does by hand for the legacy tools.
_NAME_LOOKUP_LOOKUPS = {
    'project': (('projects', 'Project'), ['code__iexact', 'name__icontains']),
    'customer': (('projects', 'Customer'), ['name__icontains']),
    'detailer': (('projects', 'Detailer'), ['name__icontains']),
}


def _resolve_fk_id(field: str, value):
    (app_label, model_name), lookups = _NAME_LOOKUP_LOOKUPS[field]
    model = apps.get_model(app_label, model_name)
    for lookup in lookups:
        obj = model.objects.filter(**{lookup: value}).first()
        if obj:
            return obj.id
    return None


def resolve_name_aliases(arguments: dict) -> tuple[dict, str | None]:
    """Returns (resolved_arguments, error_message). If a `<field>_name` alias is present
    without the raw id also being given, resolves it via fuzzy match; on no match,
    returns an error message instead of silently dropping the intended filter/value."""
    resolved = dict(arguments)
    for field_name in _NAME_LOOKUP_LOOKUPS:
        alias = f"{field_name}_name"
        if alias not in resolved:
            continue
        value = resolved.pop(alias)
        if field_name in resolved and resolved[field_name]:
            continue  # raw id already supplied - alias was redundant
        resolved_id = _resolve_fk_id(field_name, value)
        if resolved_id is None:
            return resolved, f"Could not find a {field_name} matching '{value}'."
        resolved[field_name] = resolved_id
    return resolved, None


_ACTION_VERBS = {'POST': 'create', 'PATCH': 'update', 'DELETE': 'delete'}
_RESULT_VERBS = {'GET': 'Retrieved', 'POST': 'Created', 'PATCH': 'Updated', 'DELETE': 'Deleted'}


def _normalize_result(spec: ToolSpec, result: dict) -> dict:
    status = result.get('status')
    label = spec.resource_label.replace('_', ' ')

    if status == 'success':
        data = result.get('data')
        if isinstance(data, dict) and 'results' in data and 'count' in data:
            # Default DRF PageNumberPagination wraps list responses in
            # {count, next, previous, results} - the LLM only ever needs the records.
            data = data['results']
        message = f"{_RESULT_VERBS.get(spec.http_method, 'Processed')} {label} record successfully."
        out = {"status": "success", "message": message, "data": data}
        if spec.http_method in ('POST', 'PATCH', 'DELETE'):
            out["ui_actions"] = [
                {"type": "REFRESH_DATA", "payload": spec.refresh_key},
                {"type": "SHOW_TOAST", "payload": {"type": "success", "message": message}},
            ]
        return out

    if status == 'validation_error':
        return {"status": "error", "message": f"Validation failed for {label}: {result.get('errors')}"}

    return {"status": "error", "message": result.get('message') or f"Request to {label} failed."}


def dispatch_generated_tool(name: str, user, arguments: dict) -> dict:
    spec = GENERATED_TOOL_SPECS.get(name)
    if not spec:
        return {"status": "error", "message": f"Tool '{name}' is not registered."}

    arguments = arguments or {}

    # Every mutation is confirm-gated regardless of classification - 'disabled' only
    # controls default *enablement* (see tool_catalog.DEFAULT_ENABLED_TOOL_NAMES), not
    # whether a confirmed admin opt-in still needs to double-check before it fires.
    if spec.http_method in ('POST', 'PATCH', 'DELETE') and not confirm.is_confirmed(arguments):
        verb = _ACTION_VERBS.get(spec.http_method, 'modify')
        return {
            "status": "pending_confirmation",
            "message": f"Please confirm you want to {verb} this {spec.resource_label.replace('_', ' ')} record.",
        }

    body, alias_error = resolve_name_aliases(arguments)
    if alias_error:
        return {"status": "error", "message": alias_error}
    body.pop('confirm', None)

    path_kwargs = {}
    if spec.id_param:
        record_id = body.pop(spec.id_param, None)
        if record_id is None:
            return {"status": "error", "message": f"Missing required field: {spec.id_param}."}
        path_kwargs['pk'] = record_id

    result = executor.execute_view_tool(
        spec.view_class, spec.http_method, user,
        action_map=spec.action_map,
        path_kwargs=path_kwargs,
        query_params=body if spec.http_method == 'GET' else None,
        body=body if spec.http_method != 'GET' else None,
    )
    return _normalize_result(spec, result)
