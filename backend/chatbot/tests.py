from django.test import TestCase
from django.contrib.auth import get_user_model
from employees.models import Employee
from projects.models import Project
from chatbot.tool_handlers import (
    handle_create_employee,
    handle_get_employee_details,
    handle_list_projects,
    handle_navigate_to_page
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

    def test_navigate_to_page_invalid(self):
        """Unknown pages should fail gracefully."""
        arguments = {
            "page_name": "invalid_page_enum"
        }
        
        result = handle_navigate_to_page(self.regular_user, arguments)
        self.assertEqual(result["status"], "error")

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
