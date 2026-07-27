from django.test import TestCase
from django.contrib.auth import get_user_model
from employees.models import Employee
from projects.models import Project, Customer
from milestones.models import Milestone
from chatbot.tool_handlers import (
    handle_create_employee,
    handle_get_employee_details,
    handle_list_projects,
    handle_navigate_to_page,
    handle_update_employee,
    handle_delete_employee,
    handle_search_records,
    handle_summarize_milestones
)

User = get_user_model()

class ChatbotToolHandlersTestCase(TestCase):
    def setUp(self):
        # Create test users with different roles
        self.admin_user = User.objects.create_user(
            username="admin_test",
            email="admin@test.com",
            password="testpassword"
        )
        self.admin_user.role = 'admin'
        self.admin_user.save()

        self.regular_user = User.objects.create_user(
            username="regular_test",
            email="user@test.com",
            password="testpassword"
        )
        self.regular_user.role = 'user'
        self.regular_user.save()

        # Create a test employee
        self.emp = Employee.objects.create(
            emp_id="EMP-999",
            name="Ramesh Kumar",
            department="Fabrication",
            designation="Welder",
            email="ramesh@test.com",
            status="Active"
        )

        # Create a test project
        self.project = Project.objects.create(
            code="PRJ-101",
            name="SFE Warehouse Expansion",
            customer_name="SFE Corp",
            project_manager_name="John PM",
            total_ton=120.5,
            status="In Progress",
            priority="High"
        )
        self.customer = Customer.objects.create(
            name="SFE Corp",
            code="SFC-001",
            category="Domestic"
        )
        self.milestone = Milestone.objects.create(
            title="Design Freeze",
            project="PRJ-101",
            status="Overdue",
            priority="High",
            due_date="2026-07-10"
        )

    def test_create_employee_admin_success(self):
        """Admin users should be authorized to create employees."""
        arguments = {
            "name": "Suresh Raina",
            "department": "Detailing",
            "designation": "Detailer",
            "email": "suresh@test.com",
            "status": "Active"
        }
        
        result = handle_create_employee(self.admin_user, arguments)
        self.assertEqual(result["status"], "success")
        self.assertTrue(Employee.objects.filter(email="suresh@test.com").exists())
        self.assertEqual(len(result["ui_actions"]), 2)
        self.assertEqual(result["ui_actions"][0]["type"], "REFRESH_DATA")

    def test_create_employee_regular_denied(self):
        """Non-admin users must be blocked from creating employees."""
        arguments = {
            "name": "Suresh Raina",
            "department": "Detailing",
            "designation": "Detailer",
            "email": "suresh@test.com",
            "status": "Active"
        }
        
        result = handle_create_employee(self.regular_user, arguments)
        self.assertEqual(result["status"], "error")
        self.assertIn("Permission Denied", result["message"])
        self.assertFalse(Employee.objects.filter(email="suresh@test.com").exists())

    def test_create_employee_missing_fields(self):
        """Missing required arguments should return an error."""
        arguments = {
            "name": "Suresh Raina",
            "department": "Detailing"
            # Missing email and designation
        }
        
        result = handle_create_employee(self.admin_user, arguments)
        self.assertEqual(result["status"], "error")
        self.assertIn("Missing required fields", result["message"])

    def test_get_employee_details_search(self):
        """Searching employees should filter records correctly."""
        arguments = {
            "name": "Ramesh",
            "department": "Fabrication"
        }
        
        result = handle_get_employee_details(self.regular_user, arguments)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["employees"][0]["emp_id"], "EMP-999")

    def test_list_projects(self):
        """Listing projects should retrieve matching database records."""
        arguments = {
            "status": "In Progress"
        }
        
        result = handle_list_projects(self.regular_user, arguments)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["projects"][0]["code"], "PRJ-101")

    def test_navigate_to_page_valid(self):
        """Navigation tool should translate enum names to route paths."""
        arguments = {
            "page_name": "employee_master"
        }
        
        result = handle_navigate_to_page(self.regular_user, arguments)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["ui_actions"][0]["payload"], "/employees")

        # Test rfq_master mapping
        arguments_rfq = {
            "page_name": "rfq_master"
        }
        result_rfq = handle_navigate_to_page(self.regular_user, arguments_rfq)
        self.assertEqual(result_rfq["status"], "success")
        self.assertEqual(result_rfq["ui_actions"][0]["payload"], "/rfq")

        # Test user_access mapping
        arguments_user_access = {
            "page_name": "user_access"
        }
        result_ua = handle_navigate_to_page(self.regular_user, arguments_user_access)
        self.assertEqual(result_ua["status"], "success")
        self.assertEqual(result_ua["ui_actions"][0]["payload"], "/user-access")

        # Test case-insensitivity matching variations
        # 1. Uppercase enum name
        result_upper = handle_navigate_to_page(self.regular_user, {"page_name": "EMPLOYEE_MASTER"})
        self.assertEqual(result_upper["status"], "success")
        self.assertEqual(result_upper["ui_actions"][0]["payload"], "/employees")

        # 2. Mixed case with space mapping variation
        result_mixed = handle_navigate_to_page(self.regular_user, {"page_name": "User Access"})
        self.assertEqual(result_mixed["status"], "success")
        self.assertEqual(result_mixed["ui_actions"][0]["payload"], "/user-access")

        # 3. Lowercase variation with space
        result_space = handle_navigate_to_page(self.regular_user, {"page_name": "plan creation"})
        self.assertEqual(result_space["status"], "success")
        self.assertEqual(result_space["ui_actions"][0]["payload"], "/structural/plan-creation")

        # 4. Typo matching variation
        result_typo = handle_navigate_to_page(self.regular_user, {"page_name": "worforce master"})
        self.assertEqual(result_typo["status"], "success")
        self.assertEqual(result_typo["ui_actions"][0]["payload"], "/production/capacity-mapping/manpower")

        # 5. Alternate synonym mapping
        result_synonym = handle_navigate_to_page(self.regular_user, {"page_name": "manpower"})
        self.assertEqual(result_synonym["status"], "success")
        self.assertEqual(result_synonym["ui_actions"][0]["payload"], "/production/capacity-mapping/manpower")

        # 6. Phrase matching variation
        result_phrase = handle_navigate_to_page(self.regular_user, {"page_name": "moment connections"})
        self.assertEqual(result_phrase["status"], "success")
        self.assertEqual(result_phrase["ui_actions"][0]["payload"], "/estimation-erection/fmc")

    def test_navigate_to_page_invalid(self):
        """Unknown pages should fail gracefully."""
        arguments = {
            "page_name": "invalid_page_enum"
        }
        
        result = handle_navigate_to_page(self.regular_user, arguments)
        self.assertEqual(result["status"], "error")

    def test_update_employee_requires_confirmation(self):
        """Employee updates should require explicit confirmation before mutating data."""
        result = handle_update_employee(self.admin_user, {"emp_id": "EMP-999", "department": "Quality"})
        self.assertEqual(result["status"], "pending_confirmation")
        self.assertIn("confirm", result["message"].lower())

    def test_update_employee_success_with_confirmation(self):
        """Confirmed updates should persist changes on the employee record."""
        result = handle_update_employee(self.admin_user, {"emp_id": "EMP-999", "department": "Quality", "confirm": True})
        self.assertEqual(result["status"], "success")
        self.emp.refresh_from_db()
        self.assertEqual(self.emp.department, "Quality")

    def test_delete_employee_requires_confirmation(self):
        """Deleting an employee should be blocked until confirmation is supplied."""
        result = handle_delete_employee(self.admin_user, {"emp_id": "EMP-999"})
        self.assertEqual(result["status"], "pending_confirmation")
        self.assertTrue(Employee.objects.filter(emp_id="EMP-999").exists())

    def test_search_records_returns_live_entities(self):
        """Record search should surface matching employees, customers, and projects."""
        result = handle_search_records(self.regular_user, {"entity": "customer", "query": "SFE"})
        self.assertEqual(result["status"], "success")
        self.assertGreaterEqual(result["count"], 1)
        self.assertEqual(result["results"][0]["entity"], "customer")

    def test_summarize_milestones_reports_overdue_items(self):
        """Milestone summaries should group active and overdue work clearly."""
        result = handle_summarize_milestones(self.regular_user, {"project_code": "PRJ-101"})
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["overdue_count"], 1)
        self.assertEqual(result["pending_count"], 0)

    def test_parse_json_from_text(self):
        """Should parse JSON tool call from raw text code blocks."""
        from chatbot.services import parse_json_from_text
        text = '```json\n{"name": "create_employee", "parameters": {"name": "Thamizh"}}\n```'
        name, args = parse_json_from_text(text)
        self.assertEqual(name, "create_employee")
        self.assertEqual(args, {"name": "Thamizh"})
        
        # Test without language tag
        text2 = '```\n{"name": "navigate_to_page", "arguments": {"page_name": "dashboard"}}\n```'
        name2, args2 = parse_json_from_text(text2)
        self.assertEqual(name2, "navigate_to_page")
        self.assertEqual(args2, {"page_name": "dashboard"})

        # Test case-insensitivity XML tag style
        text_xml = '<Navigate_to_page>{"page_name": "dashboard"}</function>'
        name_xml, args_xml = parse_json_from_text(text_xml)
        self.assertEqual(name_xml, "navigate_to_page")
        self.assertEqual(args_xml, {"page_name": "dashboard"})

        # Test case-insensitivity text prefix style
        text_prefix = 'Navigate_to_page {"page_name": "plan_creation"}'
        name_prefix, args_prefix = parse_json_from_text(text_prefix)
        self.assertEqual(name_prefix, "navigate_to_page")
        self.assertEqual(args_prefix, {"page_name": "plan_creation"})

        # Test case-insensitivity JSON body name style
        text_body = '{"name": "Navigate_to_page", "arguments": {"page_name": "dashboard"}}'
        name_body, args_body = parse_json_from_text(text_body)
        self.assertEqual(name_body, "navigate_to_page")
        self.assertEqual(args_body, {"page_name": "dashboard"})

    def test_should_use_tools(self):
        """Should correctly identify when to pass tools to the LLM based on user queries."""
        from chatbot.services import should_use_tools

        # Informational queries should NOT trigger tools
        self.assertFalse(should_use_tools("how to create a new RFQ in RFQ master"))
        self.assertFalse(should_use_tools("how do I add a new employee?"))
        self.assertFalse(should_use_tools("explain the structural schedule Gantt chart"))
        self.assertFalse(should_use_tools("what is the holiday calendar?"))

        # Navigation queries SHOULD trigger tools
        self.assertTrue(should_use_tools("navigate to RFQ Master"))
        self.assertTrue(should_use_tools("please go to dashboard"))
        self.assertTrue(should_use_tools("open the employee master page"))

        # Database action queries SHOULD trigger tools
        self.assertTrue(should_use_tools("add a new employee named Ramesh"))
        self.assertTrue(should_use_tools("find employee Suresh"))
        self.assertTrue(should_use_tools("list active projects"))
