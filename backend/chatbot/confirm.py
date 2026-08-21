"""Shared confirmation-gate helper for destructive/mutating tool calls.

Generalized from the `_is_confirmed()` check that used to be duplicated inline in
tool_handlers.py - both curated and generated-tool dispatch use this single implementation.
"""


def is_confirmed(arguments: dict) -> bool:
    """True if the caller explicitly confirmed a pending write/delete action."""
    confirm_value = (arguments or {}).get("confirm", False)
    if isinstance(confirm_value, str):
        return confirm_value.strip().lower() in {"true", "yes", "1", "confirm", "confirmed"}
    return bool(confirm_value)
