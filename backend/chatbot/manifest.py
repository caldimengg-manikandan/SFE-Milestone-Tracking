"""
Curated allowlist of DRF views the chatbot may call as generated tools. Explicit
registration only, never blind route-discovery: several endpoints elsewhere in this
codebase send real emails, do IMAP sync, hard-delete with cascade, or irreversibly lock a
project, so auto-exposing every route to an LLM would be reckless. Anything registered
here gets its schema and CRUD behavior generated straight from the live serializer/view via
introspection.py + executor.py, so renaming/adding a field is automatically reflected in
what the chatbot can do and say - no hand-edited schema code to keep in sync.
"""
from dataclasses import dataclass, field
from typing import Optional

from projects.views import DetailerViewSet, StructuralScheduleItemViewSet
from projects.serializers import DetailerSerializer, StructuralScheduleItemSerializer
from bids.views import HolidayViewSet
from bids.serializers import HolidaySerializer
from production.views import MachineViewSet, ManpowerViewSet, CapacityViewSet
from production.serializers import MachineSerializer, ManpowerSerializer, CapacitySerializer
from dashboard.views import AnnouncementViewSet
from dashboard.serializers import AnnouncementSerializer
from milestones.views import MilestoneViewSet
from milestones.serializers import MilestoneSerializer


@dataclass
class ToolSpec:
    name: str
    description: str
    view_class: type
    http_method: str  # 'GET' | 'POST' | 'PATCH' | 'DELETE'
    action_map: dict
    serializer_class: Optional[type] = None
    # Ordered {name: (json_schema, is_required)} spliced into the tool's parameters ahead
    # of serializer-derived fields - used here for the `id` path kwarg on get/update/delete.
    extra_params: Optional[dict] = field(default=None)
    # Name of the tool-facing parameter that identifies the record (maps to path_kwargs={'pk': ...}).
    id_param: Optional[str] = None
    # ui_actions REFRESH_DATA payload key the frontend listens for (best-effort - see
    # ChatbotWidget.jsx; several existing hand-written tools already send keys with no
    # frontend listener yet, which is a harmless no-op, same as here).
    refresh_key: str = ""
    # Human-readable singular label used in confirmation/result messages, e.g. "detailer".
    resource_label: str = ""


def _id_param(description_noun: str) -> dict:
    return {"id": ({"type": "integer", "description": f"The database id of the {description_noun} record (from a previous list/search call)."}, True)}


def crud_tools(
    *,
    resource_singular: str,
    resource_plural: str,
    view_class: type,
    serializer_class: type,
    refresh_key: str,
    description_noun: str,
    ops: tuple = ('list', 'get', 'create', 'update', 'delete'),
) -> list[ToolSpec]:
    """Expands one resource into its list/get/create/update/delete ToolSpecs, so a new
    flat CRUD resource is one function call instead of five hand-written blocks. `ops`
    narrows which verbs to generate - used to gap-fill only the missing verbs on
    resources a hand-written tool in tools.py already partially covers (e.g. machines
    already have create/list; this only adds get/update/delete)."""
    specs = []
    if 'list' in ops:
        specs.append(ToolSpec(
            name=f"list_{resource_plural}",
            description=f"Lists {description_noun} records, optionally filtered.",
            view_class=view_class, http_method='GET', action_map={'get': 'list'},
            serializer_class=serializer_class, refresh_key=refresh_key, resource_label=resource_singular,
        ))
    if 'get' in ops:
        specs.append(ToolSpec(
            name=f"get_{resource_singular}",
            description=f"Retrieves full details of a single {description_noun} record by its database id.",
            view_class=view_class, http_method='GET', action_map={'get': 'retrieve'},
            serializer_class=None, extra_params=_id_param(description_noun),
            id_param='id', refresh_key=refresh_key, resource_label=resource_singular,
        ))
    if 'create' in ops:
        specs.append(ToolSpec(
            name=f"create_{resource_singular}",
            description=f"Creates a new {description_noun} record.",
            view_class=view_class, http_method='POST', action_map={'post': 'create'},
            serializer_class=serializer_class, refresh_key=refresh_key, resource_label=resource_singular,
        ))
    if 'update' in ops:
        specs.append(ToolSpec(
            name=f"update_{resource_singular}",
            description=f"Updates fields on an existing {description_noun} record. Only pass the fields you want to change - this is a partial update.",
            view_class=view_class, http_method='PATCH', action_map={'patch': 'partial_update'},
            serializer_class=serializer_class, extra_params=_id_param(description_noun),
            id_param='id', refresh_key=refresh_key, resource_label=resource_singular,
        ))
    if 'delete' in ops:
        specs.append(ToolSpec(
            name=f"delete_{resource_singular}",
            description=f"Permanently deletes a {description_noun} record. Requires the user to explicitly confirm first.",
            view_class=view_class, http_method='DELETE', action_map={'delete': 'destroy'},
            serializer_class=None, extra_params=_id_param(description_noun),
            id_param='id', refresh_key=refresh_key, resource_label=resource_singular,
        ))
    return specs


REGISTRY: list[ToolSpec] = [
    # Net-new full CRUD - previously zero chatbot coverage at all.
    *crud_tools(
        resource_singular='detailer', resource_plural='detailers',
        view_class=DetailerViewSet, serializer_class=DetailerSerializer,
        refresh_key='detailers', description_noun='detailing vendor',
    ),
    *crud_tools(
        resource_singular='holiday', resource_plural='holidays',
        view_class=HolidayViewSet, serializer_class=HolidaySerializer,
        refresh_key='holidays', description_noun='company holiday',
    ),
    *crud_tools(
        resource_singular='structural_schedule_item', resource_plural='structural_schedule_items',
        view_class=StructuralScheduleItemViewSet, serializer_class=StructuralScheduleItemSerializer,
        refresh_key='structural_schedules',
        description_noun='structural schedule line item (OFA/BFA/RTS/ship dates for a project sequence)',
    ),

    # Gap-fill only: create/list already exist as hand-written tools in tools.py with
    # their own auto-ID/business-rule logic, so those verbs are deliberately excluded here.
    *crud_tools(
        resource_singular='machine', resource_plural='machines',
        view_class=MachineViewSet, serializer_class=MachineSerializer,
        refresh_key='machines', description_noun='shop machine', ops=('get', 'update', 'delete'),
    ),
    *crud_tools(
        resource_singular='manpower', resource_plural='manpower',
        view_class=ManpowerViewSet, serializer_class=ManpowerSerializer,
        refresh_key='manpower', description_noun='workforce roster entry', ops=('get', 'update', 'delete'),
    ),
    *crud_tools(
        resource_singular='capacity_config', resource_plural='capacity_configs',
        view_class=CapacityViewSet, serializer_class=CapacitySerializer,
        refresh_key='capacity', description_noun='shop capacity mapping configuration', ops=('get', 'update', 'delete'),
    ),
    *crud_tools(
        resource_singular='announcement', resource_plural='announcements',
        view_class=AnnouncementViewSet, serializer_class=AnnouncementSerializer,
        refresh_key='announcements', description_noun='dashboard announcement', ops=('get', 'update', 'delete'),
    ),
    *crud_tools(
        resource_singular='milestone', resource_plural='milestones',
        view_class=MilestoneViewSet, serializer_class=MilestoneSerializer,
        refresh_key='milestones', description_noun='project milestone', ops=('list', 'get', 'delete'),
    ),
]
