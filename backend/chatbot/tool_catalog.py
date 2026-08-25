"""
Single import seam combining the hand-written tools (tools.py/tool_handlers.py) with the
generated tools (tool_registry.py), so services.py and views.py never need to know which
category a given tool name came from.
"""
from . import tool_handlers
from . import tool_registry
from . import tools as legacy_tools

AVAILABLE_TOOLS: list[dict] = legacy_tools.AVAILABLE_TOOLS + tool_registry.GENERATED_TOOLS

ALL_TOOL_NAMES: set[str] = {t['function']['name'] for t in AVAILABLE_TOOLS}

_LEGACY_NAMES = {t['function']['name'] for t in legacy_tools.AVAILABLE_TOOLS}
_GENERATED_DEFAULT_ENABLED_NAMES = {
    name for name, classification in tool_registry.GENERATED_TOOL_CLASSIFICATIONS.items()
    if classification != 'disabled'
}

# What's active when AgentConfig.enabled_tools is None (no admin customization yet):
# every legacy tool (preserves today's default-all-on behavior exactly) plus every
# generated tool that isn't safe-default-disabled (i.e. every generated DELETE tool stays
# off until an admin explicitly opts in via the Agent Settings checkboxes - same UX as
# today, just extended to cover tools that didn't exist before).
DEFAULT_ENABLED_TOOL_NAMES: set[str] = _LEGACY_NAMES | _GENERATED_DEFAULT_ENABLED_NAMES


def dispatch_tool(name: str, user, arguments: dict) -> dict:
    """Single dispatch point for both hand-written and generated tools."""
    if name in tool_handlers.TOOL_HANDLERS:
        return tool_handlers.TOOL_HANDLERS[name](user, arguments or {})
    if name in tool_registry.GENERATED_TOOL_SPECS:
        return tool_registry.dispatch_generated_tool(name, user, arguments or {})
    return {"status": "error", "message": f"Tool '{name}' is not registered."}
