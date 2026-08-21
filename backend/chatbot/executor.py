"""
Generic in-process executor for calling real DRF views as an already-authenticated user, so
generated LLM tools get real serializer validation and real permission-class enforcement for
free instead of hand-rolled ORM + duplicated RBAC checks (what the old tool_handlers.py did).

Mechanism: builds a request via Django's RequestFactory, then uses DRF's own
`rest_framework.test.force_authenticate()` - the same public mechanism DRF's own
APIClient/APIRequestFactory use in tests - to attach the known user to the request BEFORE
the view wraps it. DRF's `Request.__init__` checks the raw request for a `_force_auth_user`
attribute and, if present, swaps in a `ForcedAuthentication` authenticator that returns that
user immediately, so `CookieJWTAuthentication` (which needs a real cookie/header we don't
have) is never consulted and `request.user` is the real user by the time
`check_permissions()` runs. This was verified directly against the installed DRF version's
source (drf 3.17) rather than assumed - a naive `django_request.user = user` before wrapping
does NOT work, because DRF's `Request.user` is a lazy property that runs its own
authentication pass on first access and ignores whatever was set on the underlying Django
request.

No real HTTP round trip happens, so the cookie-based auth story for the real frontend is
irrelevant here - we go straight to permission/serializer logic with a known user.
"""
import json

from django.http import Http404
from django.test import RequestFactory
from rest_framework.test import force_authenticate

_factory = RequestFactory()


def execute_view_tool(view_class, http_method, user, *, action_map=None, path='/',
                       path_kwargs=None, query_params=None, body=None):
    """
    Calls `view_class` in-process as `user`, exactly as the real API would over HTTP for the
    equivalent request, and returns a small normalized result dict a tool-calling LLM can act
    on directly.

    - view_class: a DRF ModelViewSet or generics.*APIView/APIView subclass.
    - http_method: 'GET' / 'POST' / 'PUT' / 'PATCH' / 'DELETE'.
    - user: the already-authenticated Django user issuing this tool call.
    - action_map: for ViewSets, the {http_method_lowercase: action_name} mapping normally
      passed to `.as_view()` by the router (e.g. {'get': 'list'}, {'post': 'create'},
      {'get': 'retrieve', 'patch': 'partial_update'}, or {'post': 'duplicate'} for a custom
      @action). Leave None for plain APIView/generics subclasses, which resolve their own
      handler from the HTTP method the same way url dispatch would.
    - path: the URL this call nominally represents. Not resolved through Django's URL
      routing (the view is invoked directly), so it doesn't need to match a real URL pattern
      - it only affects request.path/request.build_absolute_uri() (used by e.g. pagination
      link generation), which is cosmetic for our purposes.
    - path_kwargs: URL kwargs the view expects, e.g. {'pk': 5} or {'project_id': 12}.
    - query_params: dict of query-string parameters, for GET requests (filters, search, etc).
    - body: dict of request-body data, for POST/PUT/PATCH requests.
    """
    path_kwargs = path_kwargs or {}
    http_method = http_method.upper()

    if http_method == 'GET':
        django_request = _factory.get(path, data=query_params or None)
    elif http_method == 'DELETE':
        django_request = _factory.delete(path)
    elif http_method in ('POST', 'PUT', 'PATCH'):
        factory_method = getattr(_factory, http_method.lower())
        django_request = factory_method(path, data=json.dumps(body or {}), content_type='application/json')
    else:
        return {"status": "error", "message": f"Unsupported HTTP method: {http_method}"}

    force_authenticate(django_request, user=user)

    view_callable = view_class.as_view(action_map) if action_map else view_class.as_view()

    try:
        response = view_callable(django_request, **path_kwargs)
    except Http404:
        # Belt-and-suspenders: DRF's own dispatch() already converts Http404 raised inside a
        # view method into a normal 404 Response before we ever see it, so this path is only
        # reachable for a genuinely unusual view that raises outside that flow.
        return {"status": "error", "message": "Not found."}
    except Exception as exc:
        # Anything DRF didn't already normalize into a Response (e.g. an uncaught ORM
        # IntegrityError) - surface it as a tool failure instead of crashing the chat turn.
        return {"status": "error", "message": f"Unexpected error executing this action: {exc}"}

    # response.data is populated directly by DRF views before .render() is ever called (that
    # only happens in the normal WSGI response cycle, which we're bypassing), so it's already
    # usable as plain Python data here.
    data = getattr(response, 'data', None)

    if 200 <= response.status_code < 300:
        return {"status": "success", "data": data}
    if response.status_code == 400:
        # This IS serializer.errors verbatim - real field-level validation errors the LLM can
        # read and correct, instead of a hand-written generic failure string.
        return {"status": "validation_error", "errors": data}
    if response.status_code in (401, 403):
        return {"status": "error", "message": "Permission denied.", "detail": data}
    if response.status_code == 404:
        return {"status": "error", "message": "Not found.", "detail": data}
    return {"status": "error", "message": f"Request failed (HTTP {response.status_code}).", "detail": data}
