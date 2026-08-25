from django.test import TestCase
from django.contrib.auth import get_user_model

from projects.models import Detailer, Project
from bids.models import Holiday
from milestones.models import Milestone
from production.models import Machine

from chatbot.tool_catalog import AVAILABLE_TOOLS, ALL_TOOL_NAMES, DEFAULT_ENABLED_TOOL_NAMES, dispatch_tool
from chatbot.tool_registry import GENERATED_TOOL_CLASSIFICATIONS

User = get_user_model()


class GeneratedToolSchemaTestCase(TestCase):
    """Schemas must be generated from the live serializers, not hand-typed."""

    def _schema(self, name):
        for tool in AVAILABLE_TOOLS:
            if tool['function']['name'] == name:
                return tool
        self.fail(f"Tool '{name}' not found in AVAILABLE_TOOLS")

    def test_create_detailer_schema_reflects_serializer_fields(self):
        schema = self._schema('create_detailer')
        props = schema['function']['parameters']['properties']
        self.assertIn('name', props)
        self.assertIn('code', props)
        self.assertIn('contacts', props)  # nested DetailerContactSerializer
        self.assertIn('name', schema['function']['parameters']['required'])

    def test_update_machine_schema_has_no_required_body_fields(self):
        # PATCH: only the id extra_param should ever be required - never every field.
        schema = self._schema('update_machine')
        params = schema['function']['parameters']
        self.assertIn('id', params['properties'])
        self.assertEqual(params.get('required', []), ['id'])

    def test_delete_tools_are_disabled_by_default(self):
        self.assertEqual(GENERATED_TOOL_CLASSIFICATIONS['delete_detailer'], 'disabled')
        self.assertNotIn('delete_detailer', DEFAULT_ENABLED_TOOL_NAMES)
        self.assertIn('delete_detailer', ALL_TOOL_NAMES)  # still schema-registered, just opt-in

    def test_write_tools_default_enabled_require_confirmation(self):
        self.assertEqual(GENERATED_TOOL_CLASSIFICATIONS['update_machine'], 'enabled_confirm_required')
        self.assertIn('update_machine', DEFAULT_ENABLED_TOOL_NAMES)

    def test_read_tools_default_enabled(self):
        self.assertEqual(GENERATED_TOOL_CLASSIFICATIONS['list_holidays'], 'enabled')
        self.assertIn('list_holidays', DEFAULT_ENABLED_TOOL_NAMES)


class GeneratedToolDispatchTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="gen_tool_user", email="gen@test.com", password="testpassword")

    def test_create_detailer_requires_confirmation_then_persists(self):
        pending = dispatch_tool('create_detailer', self.user, {"name": "Acme Detailing", "code": "ACD-1"})
        self.assertEqual(pending['status'], 'pending_confirmation')
        self.assertFalse(Detailer.objects.filter(name="Acme Detailing").exists())

        result = dispatch_tool('create_detailer', self.user, {"name": "Acme Detailing", "code": "ACD-1", "confirm": True})
        self.assertEqual(result['status'], 'success')
        self.assertTrue(Detailer.objects.filter(name="Acme Detailing").exists())

    def test_update_machine_requires_confirmation_first(self):
        machine = Machine.objects.create(name="Laser Cutter", make="Amada", capacity_per_day=10)
        pending = dispatch_tool('update_machine', self.user, {"id": machine.id, "shop": "Bay 2"})
        self.assertEqual(pending['status'], 'pending_confirmation')
        machine.refresh_from_db()
        self.assertNotEqual(machine.shop, "Bay 2")  # nothing written yet

        confirmed = dispatch_tool('update_machine', self.user, {"id": machine.id, "shop": "Bay 2", "confirm": True})
        self.assertEqual(confirmed['status'], 'success')
        machine.refresh_from_db()
        self.assertEqual(machine.shop, "Bay 2")

    def test_delete_holiday_requires_confirmation_then_removes_record(self):
        holiday = Holiday.objects.create(date="2026-12-25", description="Christmas")
        pending = dispatch_tool('delete_holiday', self.user, {"id": holiday.id})
        self.assertEqual(pending['status'], 'pending_confirmation')
        self.assertTrue(Holiday.objects.filter(id=holiday.id).exists())

        confirmed = dispatch_tool('delete_holiday', self.user, {"id": holiday.id, "confirm": True})
        self.assertEqual(confirmed['status'], 'success')
        self.assertFalse(Holiday.objects.filter(id=holiday.id).exists())

    def test_list_milestones_returns_live_data(self):
        Milestone.objects.create(title="Design Freeze", project="PRJ-900", status="Pending")
        result = dispatch_tool('list_milestones', self.user, {})
        self.assertEqual(result['status'], 'success')
        titles = [m['title'] for m in result['data']]
        self.assertIn("Design Freeze", titles)

    def test_create_structural_schedule_item_resolves_project_name_alias(self):
        project = Project.objects.create(code="PRJ-901", name="Warehouse North")
        args = {
            "project_name": "Warehouse North",
            "seq_no": "1",
            "item_description": "Main columns",
            "rts_date": "2026-09-01",
            "confirm": True,
        }
        result = dispatch_tool('create_structural_schedule_item', self.user, args)
        self.assertEqual(result['status'], 'success')
        self.assertTrue(project.structural_schedules.filter(seq_no="1").exists())

    def test_create_structural_schedule_item_unknown_project_name_errors(self):
        result = dispatch_tool('create_structural_schedule_item', self.user, {
            "project_name": "Nonexistent Project",
            "seq_no": "1",
            "item_description": "Main columns",
            "rts_date": "2026-09-01",
            "confirm": True,
        })
        self.assertEqual(result['status'], 'error')
        self.assertIn("Nonexistent Project", result['message'])

    def test_dispatch_tool_routes_legacy_tools_unchanged(self):
        result = dispatch_tool('list_projects', self.user, {})
        self.assertEqual(result['status'], 'success')
