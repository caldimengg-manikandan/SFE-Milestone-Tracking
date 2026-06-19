import random
from employees.models import Employee
from projects.models import Project
from employees.serializers import EmployeeSerializer

def handle_create_employee(user, arguments):
    """
    Creates a new employee record.
    Enforces role authorization (admin only).
    """
    # 1. Authorize user role
    role = getattr(user, 'role', '')
    is_admin = role == 'admin' or user.is_staff or user.is_superuser
    if not is_admin:
        return {
            "status": "error",
            "message": "Permission Denied: Only administrators can add new employees."
        }

    # 2. Extract arguments
    name = arguments.get("name")
    department = arguments.get("department")
    designation = arguments.get("designation")
    email = arguments.get("email")
    phone = arguments.get("phone", "")
    status_choice = arguments.get("status", "Active")
    join_date = arguments.get("join_date", None)
    emp_id = arguments.get("emp_id")

    if not name or not department or not designation or not email:
        return {
            "status": "error",
            "message": "Missing required fields. Full name, department, designation, and email are required."
        }

    # 3. Handle Auto-generation of emp_id
    if not emp_id:
        count = Employee.objects.count()
        emp_id = f"EMP-{count + 1:03d}"
        while Employee.objects.filter(emp_id=emp_id).exists():
            emp_id = f"EMP-{count + 1:03d}-{random.randint(10, 99)}"

    # Check email duplication
    if Employee.objects.filter(email=email).exists():
        return {
            "status": "error",
            "message": f"An employee with the email '{email}' already exists."
        }

    # 4. Create record
    try:
        employee = Employee.objects.create(
            emp_id=emp_id,
            name=name,
            department=department,
            designation=designation,
            email=email,
            phone=phone,
            status=status_choice,
            join_date=join_date
        )
        return {
            "status": "success",
            "message": f"Successfully created employee {employee.name} with ID {employee.emp_id}.",
            "employee": {
                "id": employee.id,
                "emp_id": employee.emp_id,
                "name": employee.name,
                "department": employee.department,
                "designation": employee.designation,
                "email": employee.email,
                "status": employee.status
            },
            "ui_actions": [
                {"type": "REFRESH_DATA", "payload": "employees"},
                {"type": "SHOW_TOAST", "payload": {"type": "success", "message": f"Employee {employee.name} added!"}}
            ]
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to save employee: {str(e)}"
        }

def handle_get_employee_details(user, arguments):
    """
    Searches for employee details based on filters.
    """
    name = arguments.get("name")
    department = arguments.get("department")
    designation = arguments.get("designation")

    queryset = Employee.objects.all()

    if name:
        queryset = queryset.filter(name__icontains=name)
    if department:
        queryset = queryset.filter(department__icontains=department)
    if designation:
        queryset = queryset.filter(designation__icontains=designation)

    # Limit to top 10 matches to keep LLM context clean
    matches = queryset[:10]
    
    results = []
    for emp in matches:
        results.append({
            "emp_id": emp.emp_id,
            "name": emp.name,
            "department": emp.department,
            "designation": emp.designation,
            "email": emp.email,
            "phone": emp.phone,
            "status": emp.status,
            "join_date": str(emp.join_date) if emp.join_date else None
        })

    return {
        "status": "success",
        "count": len(results),
        "employees": results
    }

def handle_list_projects(user, arguments):
    """
    Lists SFE projects.
    """
    status_filter = arguments.get("status")
    priority_filter = arguments.get("priority")

    queryset = Project.objects.all()

    if status_filter:
        queryset = queryset.filter(status=status_filter)
    if priority_filter:
        queryset = queryset.filter(priority=priority_filter)

    # Limit to top 15 results
    matches = queryset[:15]

    results = []
    for proj in matches:
        results.append({
            "code": proj.code,
            "name": proj.name,
            "customer": proj.customer_name,
            "project_manager": proj.project_manager_name,
            "total_ton": float(proj.total_ton),
            "status": proj.status,
            "priority": proj.priority,
            "erection_date": str(proj.erection_date) if proj.erection_date else None
        })

    return {
        "status": "success",
        "count": len(results),
        "projects": results
    }

def handle_navigate_to_page(user, arguments):
    """
    Processes navigation requests.
    Translates enum page_name to frontend URL paths.
    """
    page_name = arguments.get("page_name")
    
    # Map backend enum to frontend router paths
    page_routes = {
        "dashboard": "/dashboard",
        "employee_master": "/employees",
        "customer_master": "/customers",
        "detailer_master": "/detailers",
        "project_master": "/projects",
        "steel_budget": "/steel-budget/input",
        "structural_schedules": "/structural/plan-tracking",
        "production_schedules": "/production/priority-schedule",
        "rfq_entry": "/rfq/data-entry",
        "dollar_dashboard": "/rfq/dollar-dashboard",
        "erection_takeoff": "/estimation-erection/erection-takeoff",
        "field_moment_connections": "/estimation-erection/fmc"
    }

    route_path = page_routes.get(page_name)
    if not route_path:
        return {
            "status": "error",
            "message": f"Unsupported or unknown page target: '{page_name}'"
        }

    friendly_names = {
        "dashboard": "Dashboard",
        "employee_master": "Employee Master",
        "customer_master": "Customer Master",
        "detailer_master": "Detailer Master",
        "project_master": "Project Master",
        "steel_budget": "Steel Budget worksheet",
        "structural_schedules": "Structural Tracking Schedule",
        "production_schedules": "Production Priority Schedule",
        "rfq_entry": "RFQ Data Entry",
        "dollar_dashboard": "Dollar Dashboard",
        "erection_takeoff": "Erection Takeoff module",
        "field_moment_connections": "Field Moment Connections (FMC) dashboard"
    }

    return {
        "status": "success",
        "message": f"Navigating to {friendly_names.get(page_name, page_name)}.",
        "ui_actions": [
            {
                "type": "NAVIGATE",
                "payload": route_path
            },
            {
                "type": "SHOW_TOAST",
                "payload": {
                    "type": "success",
                    "message": f"Opened {friendly_names.get(page_name, page_name)}"
                }
            }
        ]
    }

# Mapping registry for the execution loops
TOOL_HANDLERS = {
    "create_employee": handle_create_employee,
    "get_employee_details": handle_get_employee_details,
    "list_projects": handle_list_projects,
    "navigate_to_page": handle_navigate_to_page
}
