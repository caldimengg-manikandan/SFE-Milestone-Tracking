"""
Generates chatbot RAG knowledge content directly from live code instead of hand-typed
Markdown, so the chatbot's conceptual answers can't silently drift from the real schema,
routes, and tools the way `seed_data/application_knowledge.md` already had (it described
Customer/Detailer with inline contact fields that don't exist, Project.customer as a
ForeignKey when it's a CharField, and "28 tools" after the real count moved to 59).

Each function below pulls from exactly one live source and is deliberately curated (not
blind reflection over the entire codebase) - mirrors the explicit-manifest principle used
for the generated chatbot CRUD tools in manifest.py.
"""
import hashlib
import inspect

from django.apps import apps as django_apps

# Curated app labels to document - internal Django/DRF/third-party apps are deliberately
# excluded, this is a data dictionary for the business apps only.
CORE_APP_LABELS = [
    'accounts', 'employees', 'projects', 'milestones', 'production', 'dashboard', 'bids',
    'rfq', 'dashboards', 'core', 'bid_summary', 'breakdown', 'erection_takeoff',
    'estimate_data', 'field_moment_conn', 'misc_metals', 'chatbot',
]

# (module_or_class_or_function, label) pairs whose docstring is pulled verbatim. Curated
# because these are the specific spots research confirmed already explain their formula/
# business-rule in prose (or were just given one - see projects.models.RateConfigAdapter,
# bids.models.BidEnquiry.calculate_values, apps.misc_metals.services.stair_material_lbs).
def _business_logic_targets():
    from projects.models import RateConfigAdapter
    from bids.models import BidEnquiry
    from apps.misc_metals import services as misc_metals_services
    from apps.field_moment_conn import services as fmc_services
    from apps.erection_takeoff import services as erection_services
    from apps.erection_takeoff import models as erection_models
    from apps.estimate_data.models import EstimateSnapshot
    from apps.rfq import models as rfq_models
    from apps.rfq import views as rfq_views

    targets = [
        (fmc_services, "Field Moment Connections - shop/field welding hour formulas"),
        (erection_services, "Erection Takeoff - field labor/crane/trucking formulas"),
        (erection_models, "Erection Takeoff - member-hour and crane-pick business rules"),
        (misc_metals_services.stair_material_lbs, "Misc Metals - stair material weight formula"),
        (EstimateSnapshot, "Estimate finalize/revision business rule"),
        (rfq_models.RFQMaster.is_rebid.fget, "RFQ - rebid detection from quote number"),
        (rfq_models.RFQMaster.quote_no_rolled_up.fget, "RFQ - base quote number (rebid suffix stripped)"),
        (rfq_views.get_next_quote_no, "RFQ - quote number auto-generation (YY-MM-SEQ)"),
        (RateConfigAdapter, "Estimation rate assumptions (with project-level overrides)"),
        (BidEnquiry.calculate_values, "Bid Enquiry - bidding-efficiency ratio calculations"),
    ]
    return targets


def extract_model_specs(app_labels=None) -> str:
    """
    Walks the real Django model registry for `app_labels` and documents every field's
    actual name/type/nullability/default/choices/FK-target straight from
    `Model._meta.get_fields()` - cannot misreport a CharField as a ForeignKey because it
    reads the real field class, unlike a hand-transcribed doc.
    """
    app_labels = app_labels or CORE_APP_LABELS
    lines = ["## Database Models & Field Specifications (generated from live code)\n"]

    for label in app_labels:
        try:
            app_config = django_apps.get_app_config(label)
        except LookupError:
            continue
        models = sorted(app_config.get_models(), key=lambda m: m.__name__)
        if not models:
            continue
        lines.append(f"### App: `{label}`\n")
        for model in models:
            lines.append(f"#### {model.__name__} (`{model._meta.app_label}.{model.__name__}`, table `{model._meta.db_table}`)")
            for field in model._meta.get_fields():
                lines.append(f"- {_describe_field(field)}")
            lines.append("")
    return "\n".join(lines)


def _describe_field(field) -> str:
    field_type = type(field).__name__
    name = getattr(field, 'name', getattr(field, 'field_name', str(field)))

    if field.is_relation:
        target = field.related_model.__name__ if field.related_model else '?'
        rel_kind = 'ForeignKey' if field.many_to_one else (
            'ManyToMany' if field.many_to_many else (
                'OneToOne' if field.one_to_one else 'ReverseRelation'
            )
        )
        return f"`{name}` ({rel_kind} -> {target})"

    parts = [f"`{name}` ({field_type}"]
    choices = getattr(field, 'choices', None)
    if choices:
        values = ", ".join(str(c[0]) for c in choices)
        parts.append(f", choices: {values}")
    if getattr(field, 'null', False):
        parts.append(", nullable")
    default = getattr(field, 'default', None)
    from django.db.models.fields import NOT_PROVIDED
    if default is not None and default is not NOT_PROVIDED and not callable(default):
        parts.append(f", default={default!r}")
    help_text = getattr(field, 'help_text', '')
    parts.append(")")
    suffix = f" - {help_text}" if help_text else ""
    return "".join(parts) + suffix


def extract_route_matrix() -> str:
    """Documents the real navigable frontend pages from the same PAGE_ROUTES/
    FRIENDLY_PAGE_NAMES dicts handle_navigate_to_page() actually uses - the doc and the
    tool's real behavior can never disagree."""
    from chatbot.tool_handlers import PAGE_ROUTES, FRIENDLY_PAGE_NAMES

    lines = ["## Application Page Routes (generated from the live navigate_to_page tool)\n"]
    lines.append("| Page | Route |")
    lines.append("| :--- | :--- |")
    for key, path in sorted(PAGE_ROUTES.items()):
        friendly = FRIENDLY_PAGE_NAMES.get(key, key)
        lines.append(f"| {friendly} | `{path}` |")
    return "\n".join(lines)


def extract_tool_registry() -> str:
    """Documents the real chatbot tool catalog - always matches whatever CRUD tools
    exist right now, hand-written or generated, instead of a hand-typed numbered list.

    The count summary gets its own small `### ` chunk (ingest_text_content splits on
    ##/### headers) separate from the full per-tool listing below it, so a short factual
    query like "how many chatbot tools are there" has a small, densely-relevant chunk to
    match instead of competing against one giant blob containing every tool description.
    """
    from chatbot.tool_catalog import AVAILABLE_TOOLS, DEFAULT_ENABLED_TOOL_NAMES

    disabled_count = len(AVAILABLE_TOOLS) - len(DEFAULT_ENABLED_TOOL_NAMES)
    lines = [
        "## Chatbot Tool Registry (generated from the live tool catalog)\n",
        "### Tool Count Summary",
        f"The chatbot currently has exactly {len(AVAILABLE_TOOLS)} tools registered "
        f"({len(DEFAULT_ENABLED_TOOL_NAMES)} enabled by default, {disabled_count} "
        "disabled by default pending admin opt-in - these counts are generated live and "
        "supersede any specific number mentioned elsewhere).\n",
        "### Full Tool List",
    ]
    for tool in sorted(AVAILABLE_TOOLS, key=lambda t: t['function']['name']):
        name = tool['function']['name']
        desc = tool['function'].get('description', '')
        default_state = "enabled by default" if name in DEFAULT_ENABLED_TOOL_NAMES else "disabled by default (admin opt-in required)"
        lines.append(f"- `{name}` ({default_state}): {desc}")
    return "\n".join(lines)


def _property_docs(cls) -> list:
    """Every `@property` on `cls` with its own docstring - a class docstring alone (e.g.
    RateConfigAdapter's) doesn't surface each rate's individual business meaning, since
    inspect.getdoc(cls) only returns the class-level doc, not each property's."""
    docs = []
    for attr_name, attr in vars(cls).items():
        if isinstance(attr, property) and attr.fget and inspect.getdoc(attr.fget):
            docs.append((attr_name, inspect.getdoc(attr.fget)))
    return docs


def extract_business_logic_docstrings() -> str:
    """Pulls verbatim docstrings from the curated list of already-documented (or newly
    documented) modules/classes/functions that explain formulas and business rules in
    prose - so the knowledge base states exactly what the code's own docstring states."""
    lines = ["## Business Rules & Formulas (generated from source docstrings)\n"]
    for target, label in _business_logic_targets():
        doc = inspect.getdoc(target)
        if not doc:
            continue
        name = getattr(target, '__qualname__', getattr(target, '__name__', str(target)))
        lines.append(f"### {label} (`{name}`)")
        lines.append(doc)

        if inspect.isclass(target):
            prop_docs = _property_docs(target)
            if prop_docs:
                lines.append(f"\n**{name} rates/fields:**")
                for prop_name, prop_doc in prop_docs:
                    lines.append(f"- `{prop_name}`: {prop_doc}")
        lines.append("")
    return "\n".join(lines)


def generate_full_knowledge_text() -> str:
    """Assembles every generated section into one document for ingestion."""
    sections = [
        extract_model_specs(),
        extract_route_matrix(),
        extract_tool_registry(),
        extract_business_logic_docstrings(),
    ]
    return "\n\n---\n\n".join(sections)


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()
