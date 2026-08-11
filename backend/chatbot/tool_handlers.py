import random
from typing import Any
from django.db.models import Q
from employees.models import Employee
from projects.models import Project, Customer
from milestones.models import Milestone
from employees.serializers import EmployeeSerializer
from apps.rfq.models import RFQMaster


def _is_admin_user(user) -> bool:
    role = getattr(user, 'role', '')
    return role == 'admin' or getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)


def _is_confirmed(arguments: dict[str, Any]) -> bool:
    confirm_value = arguments.get("confirm", False)
    if isinstance(confirm_value, str):
        return confirm_value.strip().lower() in {"true", "yes", "1", "confirm", "confirmed"}
    return bool(confirm_value)


def _is_rfq_authorized(user) -> bool:
    if not user:
        return False
    role = getattr(user, 'role', '')
    return role in {'admin', 'manager', 'estimator'} or getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)


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


def handle_update_employee(user, arguments):
    """Updates an existing employee after confirmation."""
    if not _is_admin_user(user):
        return {"status": "error", "message": "Permission Denied: Only administrators can update employees."}

    emp_id = arguments.get("emp_id") or arguments.get("employee_id")
    if not emp_id:
        return {"status": "error", "message": "Missing required field: employee ID."}

    employee = Employee.objects.filter(emp_id__iexact=emp_id).first()
    if not employee:
        return {"status": "error", "message": f"No employee found with ID '{emp_id}'."}

    # Skip confirmation for chatbot-initiated actions (user already explicitly requested update)
    if not _is_confirmed(arguments):
        return {
            "status": "pending_confirmation",
            "message": f"Please confirm you want to update employee {employee.name} with the requested changes."
        }

    update_fields = {}
    for field in ["name", "department", "designation", "email", "phone", "status", "join_date"]:
        if field in arguments and arguments.get(field) not in (None, ""):
            update_fields[field] = arguments[field]

    if not update_fields:
        return {"status": "error", "message": "No update values were provided."}

    for field, value in update_fields.items():
        setattr(employee, field, value)
    employee.save()

    return {
        "status": "success",
        "message": f"Updated employee {employee.name}.",
        "employee": {
            "emp_id": employee.emp_id,
            "name": employee.name,
            "department": employee.department,
            "designation": employee.designation,
            "email": employee.email,
            "status": employee.status
        },
        "ui_actions": [
            {"type": "REFRESH_DATA", "payload": "employees"},
            {"type": "SHOW_TOAST", "payload": {"type": "success", "message": f"Employee {employee.name} updated!"}}
        ]
    }


def handle_delete_employee(user, arguments):
    """Deletes an employee after confirmation."""
    if not _is_admin_user(user):
        return {"status": "error", "message": "Permission Denied: Only administrators can delete employees."}

    emp_id = arguments.get("emp_id") or arguments.get("employee_id")
    if not emp_id:
        return {"status": "error", "message": "Missing required field: employee ID."}

    employee = Employee.objects.filter(emp_id__iexact=emp_id).first()
    if not employee:
        return {"status": "error", "message": f"No employee found with ID '{emp_id}'."}

    # Skip confirmation for chatbot-initiated actions (user already explicitly requested deletion)
    if not _is_confirmed(arguments):
        return {
            "status": "pending_confirmation",
            "message": f"Please confirm you want to delete employee {employee.name}."
        }

    employee_name = employee.name
    try:
        employee.delete()
        return {
            "status": "success",
            "message": f"Deleted employee {employee_name}.",
            "ui_actions": [
                {"type": "REFRESH_DATA", "payload": "employees"},
                {"type": "SHOW_TOAST", "payload": {"type": "success", "message": f"Employee {employee_name} removed!"}}
            ]
        }
    except Exception as e:
        error_msg = str(e)
        if "foreign key constraint" in error_msg.lower():
            # Extract the table name from the error message if possible
            return {
                "status": "error",
                "message": f"Cannot delete employee {employee_name} because they are referenced in other records. Please unassign the employee from related records first. Error: {error_msg}"
            }
        else:
            return {
                "status": "error",
                "message": f"Failed to delete employee: {error_msg}"
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

def handle_create_project(user, arguments):
    """Creates a new project after admin authorization."""
    if not _is_admin_user(user):
        return {"status": "error", "message": "Permission Denied: Only administrators can create projects."}

    code = arguments.get("code") or arguments.get("project_code")
    name = arguments.get("name")
    if not code or not name:
        return {"status": "error", "message": "Missing required fields: project code and name."}

    if Project.objects.filter(Q(code__iexact=code) | Q(name__iexact=name)).exists():
        return {"status": "error", "message": f"A project with code '{code}' or name '{name}' already exists."}

    project = Project.objects.create(
        code=code,
        name=name,
        customer_name=arguments.get("customer_name", ""),
        project_manager_name=arguments.get("project_manager_name", ""),
        detailer_name=arguments.get("detailer_name", ""),
        total_ton=arguments.get("total_ton", 0),
        status=arguments.get("status", "Yet to Start"),
        priority=arguments.get("priority", "Medium")
    )
    return {
        "status": "success",
        "message": f"Created project {project.name} ({project.code}).",
        "ui_actions": [
            {"type": "REFRESH_DATA", "payload": "projects"},
            {"type": "SHOW_TOAST", "payload": {"type": "success", "message": f"Project {project.name} created!"}}
        ]
    }


def handle_update_project(user, arguments):
    """Updates an existing project after confirmation."""
    if not _is_admin_user(user):
        return {"status": "error", "message": "Permission Denied: Only administrators can update projects."}

    code = arguments.get("code") or arguments.get("project_code")
    if not code:
        return {"status": "error", "message": "Missing required field: project code."}

    project = Project.objects.filter(code__iexact=code).first()
    if not project:
        return {"status": "error", "message": f"No project found with code '{code}'."}

    # Skip confirmation for chatbot-initiated actions (user already explicitly requested update)
    # if not _is_confirmed(arguments):
    #     return {"status": "pending_confirmation", "message": f"Please confirm you want to update project {project.name}."}

    allowed_fields = ["name", "customer_name", "project_manager_name", "detailer_name", "status", "priority", "total_ton"]
    update_fields = {field: arguments[field] for field in allowed_fields if field in arguments and arguments.get(field) not in (None, "")}
    if not update_fields:
        return {"status": "error", "message": "No update values were provided."}

    for field, value in update_fields.items():
        setattr(project, field, value)
    project.save()

    return {
        "status": "success",
        "message": f"Updated project {project.name}.",
        "ui_actions": [
            {"type": "REFRESH_DATA", "payload": "projects"},
            {"type": "SHOW_TOAST", "payload": {"type": "success", "message": f"Project {project.name} updated!"}}
        ]
    }


def handle_delete_project(user, arguments):
    """Deletes a project after confirmation."""
    if not _is_admin_user(user):
        return {"status": "error", "message": "Permission Denied: Only administrators can delete projects."}

    code = arguments.get("code") or arguments.get("project_code")
    if not code:
        return {"status": "error", "message": "Missing required field: project code."}

    project = Project.objects.filter(code__iexact=code).first()
    if not project:
        return {"status": "error", "message": f"No project found with code '{code}'."}

    # Skip confirmation for chatbot-initiated actions (user already explicitly requested deletion)
    # if not _is_confirmed(arguments):
    #     return {"status": "pending_confirmation", "message": f"Please confirm you want to delete project {project.name}."}

    project_name = project.name
    project.delete()
    return {
        "status": "success",
        "message": f"Deleted project {project_name}.",
        "ui_actions": [
            {"type": "REFRESH_DATA", "payload": "projects"},
            {"type": "SHOW_TOAST", "payload": {"type": "success", "message": f"Project {project_name} removed!"}}
        ]
    }


def handle_update_customer(user, arguments):
    """Updates a customer after confirmation."""
    if not _is_admin_user(user):
        return {"status": "error", "message": "Permission Denied: Only administrators can update customers."}

    customer_id = arguments.get("customer_id") or arguments.get("id")
    customer = None
    if customer_id:
        customer = Customer.objects.filter(id=customer_id).first()
    else:
        name = arguments.get("name")
        if name:
            customer = Customer.objects.filter(name__icontains=name).first()
    if not customer:
        return {"status": "error", "message": "Customer not found."}

    # Skip confirmation for chatbot-initiated actions (user already explicitly requested update)
    # if not _is_confirmed(arguments):
    #     return {"status": "pending_confirmation", "message": f"Please confirm you want to update customer {customer.name}."}

    allowed_fields = ["name", "code", "category", "country", "street", "state", "address", "designation"]
    update_fields = {field: arguments[field] for field in allowed_fields if field in arguments and arguments.get(field) not in (None, "")}
    if not update_fields:
        return {"status": "error", "message": "No update values were provided."}

    for field, value in update_fields.items():
        setattr(customer, field, value)
    customer.save()

    return {
        "status": "success",
        "message": f"Updated customer {customer.name}.",
        "ui_actions": [
            {"type": "REFRESH_DATA", "payload": "customers"},
            {"type": "SHOW_TOAST", "payload": {"type": "success", "message": f"Customer {customer.name} updated!"}}
        ]
    }


def handle_delete_customer(user, arguments):
    """Deletes a customer after confirmation."""
    if not _is_admin_user(user):
        return {"status": "error", "message": "Permission Denied: Only administrators can delete customers."}

    customer_id = arguments.get("customer_id") or arguments.get("id")
    customer = Customer.objects.filter(id=customer_id).first() if customer_id else None
    if not customer:
        name = arguments.get("name")
        if name:
            customer = Customer.objects.filter(name__icontains=name).first()
    if not customer:
        return {"status": "error", "message": "Customer not found."}

    # Skip confirmation for chatbot-initiated actions (user already explicitly requested deletion)
    if not _is_confirmed(arguments):
        return {"status": "pending_confirmation", "message": f"Please confirm you want to delete customer {customer.name}."}

    customer_name = customer.name
    customer.delete()
    return {
        "status": "success",
        "message": f"Deleted customer {customer_name}.",
        "ui_actions": [
            {"type": "REFRESH_DATA", "payload": "customers"},
            {"type": "SHOW_TOAST", "payload": {"type": "success", "message": f"Customer {customer_name} removed!"}}
        ]
    }


def handle_search_records(user, arguments):
    """Searches live records across employees, customers, and projects."""
    entity = (arguments.get("entity") or "all").lower()
    query = (arguments.get("query") or arguments.get("name") or "").strip()
    if not query:
        return {"status": "error", "message": "Missing search query."}

    results = []
    if entity in {"employee", "employees", "person", "people", "all"}:
        for emp in Employee.objects.filter(Q(name__icontains=query) | Q(emp_id__icontains=query) | Q(department__icontains=query)).order_by('name')[:10]:
            results.append({"entity": "employee", "id": emp.emp_id, "name": emp.name, "department": emp.department, "designation": emp.designation, "status": emp.status})

    if entity in {"customer", "customers", "client", "clients", "all"}:
        for customer in Customer.objects.filter(Q(name__icontains=query) | Q(code__icontains=query)).order_by('name')[:10]:
            results.append({"entity": "customer", "id": customer.id, "name": customer.name, "code": customer.code, "category": customer.category})

    if entity in {"project", "projects", "job", "jobs", "all"}:
        for project in Project.objects.filter(Q(name__icontains=query) | Q(code__icontains=query) | Q(customer_name__icontains=query)).order_by('name')[:10]:
            results.append({"entity": "project", "id": project.code, "name": project.name, "status": project.status, "priority": project.priority})

    if entity in {"rfq", "rfqs", "quote", "quotes", "all"}:
        if _is_rfq_authorized(user):
            for rfq in RFQMaster.objects.filter(deleted_at__isnull=True).filter(Q(quote_no__icontains=query) | Q(project_name__icontains=query) | Q(customer__name__icontains=query)).order_by('-id')[:10]:
                results.append({"entity": "rfq", "id": rfq.id, "quote_no": rfq.quote_no, "project_name": rfq.project_name, "won_lost": rfq.won_lost})
        elif entity in {"rfq", "rfqs", "quote", "quotes"}:
            return {
                "status": "error",
                "message": "Permission Denied: You are not authorized to search RFQs."
            }

    return {"status": "success", "count": len(results), "results": results}


def handle_list_rfqs(user, arguments):
    """Lists RFQ records from the database with filtering."""
    if not _is_rfq_authorized(user):
        return {
            "status": "error",
            "message": "Permission Denied: You are not authorized to view RFQ information."
        }
    
    won_lost = arguments.get("won_lost")
    budget_type = arguments.get("budget_type")
    query = arguments.get("query")
    
    limit = arguments.get("limit")
    if limit is None:
        limit = 10
    else:
        try:
            limit = int(limit)
            if limit <= 0:
                limit = 1000
        except ValueError:
            limit = 10
    
    queryset = RFQMaster.objects.filter(deleted_at__isnull=True)
    if won_lost and won_lost.lower() != "all":
        queryset = queryset.filter(won_lost=won_lost)
    if budget_type and budget_type.lower() != "all":
        queryset = queryset.filter(budget_type=budget_type)
    if query:
        queryset = queryset.filter(
            Q(quote_no__icontains=query) |
            Q(project_name__icontains=query) |
            Q(customer__name__icontains=query)
        )
        
    count = queryset.count()
    rfqs = []
    for rfq in queryset.order_by('-id')[:limit]:
        rfqs.append({
            "id": rfq.id,
            "quote_no": rfq.quote_no,
            "project_name": rfq.project_name,
            "customer": rfq.customer.name if rfq.customer else None,
            "won_lost": rfq.won_lost,
            "budget_type": rfq.budget_type,
            "bid_due_date": str(rfq.bid_due_date) if rfq.bid_due_date else None,
            "bid_amount": float(rfq.bid_amount) if rfq.bid_amount else 0.0,
            "total_tonnage": float(rfq.total_tonnage) if rfq.total_tonnage else 0.0
        })
        
    return {
        "status": "success",
        "total_matching_records": count,
        "records_returned": len(rfqs),
        "results": rfqs
    }


def handle_get_rfq_details(user, arguments):
    """Retrieves full details of a specific RFQ by quote_no or ID."""
    if not _is_rfq_authorized(user):
        return {
            "status": "error",
            "message": "Permission Denied: You are not authorized to view RFQ details."
        }

    quote_no = arguments.get("quote_no")
    rfq_id = arguments.get("rfq_id") or arguments.get("id")

    rfq = None
    if rfq_id:
        rfq = RFQMaster.objects.filter(id=rfq_id, deleted_at__isnull=True).first()
    elif quote_no:
        rfq = RFQMaster.objects.filter(quote_no=quote_no, deleted_at__isnull=True).first()

    if not rfq:
        return {
            "status": "error",
            "message": "RFQ not found."
        }

    return {
        "status": "success",
        "rfq": {
            "id": rfq.id,
            "quote_no": rfq.quote_no,
            "project_name": rfq.project_name,
            "won_lost": rfq.won_lost,
            "budget_type": rfq.budget_type,
            "bid_reference": rfq.bid_reference,
            "bid_due_date": str(rfq.bid_due_date) if rfq.bid_due_date else None,
            "bid_due_time": str(rfq.bid_due_time) if rfq.bid_due_time else None,
            "location": rfq.location,
            "distance_travel": float(rfq.distance_travel) if rfq.distance_travel else None,
            "customer": rfq.customer.name if rfq.customer else None,
            "primary_estimator": rfq.primary_estimator.name if rfq.primary_estimator else None,
            "scope_of_work": rfq.scope_of_work,
            "total_tonnage": float(rfq.total_tonnage) if rfq.total_tonnage else 0.0,
            "ton_steel": float(rfq.ton_steel) if rfq.ton_steel else 0.0,
            "ton_joist": float(rfq.ton_joist) if rfq.ton_joist else 0.0,
            "bid_amount": float(rfq.bid_amount) if rfq.bid_amount else 0.0,
            "quoted_profit": float(rfq.quoted_profit) if rfq.quoted_profit else 0.0,
            "sfe_job_no": rfq.sfe_job_no,
            "created_at": str(rfq.created_at) if rfq.created_at else None,
            "updated_at": str(rfq.updated_at) if rfq.updated_at else None
        }
    }


def handle_summarize_milestones(user, arguments):
    """Summarizes milestone health for a project or the full workspace."""
    project_code = arguments.get("project_code") or arguments.get("project") or ""
    queryset = Milestone.objects.all()
    if project_code:
        queryset = queryset.filter(project__icontains=project_code)

    overdue = queryset.filter(status="Overdue")
    pending = queryset.filter(status="Pending")
    in_progress = queryset.filter(status="In Progress")

    milestones = []
    for milestone in queryset.order_by('due_date', 'priority')[:20]:
        milestones.append({
            "title": milestone.title,
            "project": milestone.project,
            "status": milestone.status,
            "priority": milestone.priority,
            "due_date": str(milestone.due_date) if milestone.due_date else None,
            "assignee": milestone.assignee
        })

    return {
        "status": "success",
        "overdue_count": overdue.count(),
        "pending_count": pending.count(),
        "in_progress_count": in_progress.count(),
        "milestones": milestones
    }


def handle_navigate_to_page(user: Any, arguments: dict[str, Any]) -> dict[str, Any]:
    """
    Processes navigation requests.
    Translates enum page_name to frontend URL paths.
    """
    page_name = arguments.get("page_name")
    
    if isinstance(page_name, str):
        # Normalize: convert to lowercase, replace spaces and hyphens with underscores, strip slashes
        norm_name = page_name.strip().lower().replace(' ', '_').replace('-', '_').strip('/')
        
        # Exact mapping for known variations
        name_map = {
            "employees": "employee_master",
            "employee": "employee_master",
            "customers": "customer_master",
            "customer": "customer_master",
            "detailers": "detailer_master",
            "detailer": "detailer_master",
            "projects": "project_master",
            "project": "project_master",
            "steel_budget/input": "steel_budget",
            "steel_budget/result": "steel_budget_result",
            "estimation_result": "steel_budget_result",
            "rfq/data_entry": "rfq_entry",
            "rfq_entry": "rfq_entry",
            "rfq_master": "rfq_master",
            "rfq": "rfq",
            "erection_takeoff": "erection_takeoff",
            "fmc": "field_moment_connections",
            "bids/schedule": "internal_bid_schedule",
            "bids/holidays": "holiday_calendar",
            "estimation_erection": "estimation",
            "master_settings": "process_master_settings",
            "capacity": "capacity_configuration",
            "machine": "machine_master",
            "manpower": "workforce_master",
            "settings": "settings",
            "announcements": "announcements"
        }
        
        # Look up normalized name in map
        page_name = name_map.get(norm_name)
        if not page_name:
            # Fallback to keyword-based substring matching for typos and variants
            if "manpower" in norm_name or "workforce" in norm_name or "worforce" in norm_name or "worker" in norm_name:
                page_name = "workforce_master"
            elif "employ" in norm_name or "emp" in norm_name:
                page_name = "employee_master"
            elif "cust" in norm_name:
                page_name = "customer_master"
            elif "detail" in norm_name:
                page_name = "detailer_master"
            elif "proj" in norm_name:
                page_name = "project_master"
            elif "steel" in norm_name and "result" in norm_name:
                page_name = "steel_budget_result"
            elif "steel" in norm_name:
                page_name = "steel_budget"
            elif "plan" in norm_name and "track" in norm_name:
                page_name = "structural_schedules"
            elif "plan" in norm_name and "creat" in norm_name:
                page_name = "plan_creation"
            elif "production" in norm_name and "schedule" in norm_name:
                page_name = "production_schedules"
            elif "rfq" in norm_name and "entry" in norm_name:
                page_name = "rfq_entry"
            elif "rfq" in norm_name and "master" in norm_name:
                page_name = "rfq_master"
            elif "rfq" in norm_name:
                page_name = "rfq"
            elif "dollar" in norm_name:
                page_name = "dollar_dashboard"
            elif "erect" in norm_name and "take" in norm_name:
                page_name = "erection_takeoff"
            elif "fmc" in norm_name or ("moment" in norm_name and "connect" in norm_name):
                page_name = "field_moment_connections"
            elif "bid" in norm_name and "schedule" in norm_name:
                page_name = "internal_bid_schedule"
            elif "holiday" in norm_name or "calendar" in norm_name:
                page_name = "holiday_calendar"
            elif "estim" in norm_name and "sum" in norm_name:
                page_name = "estimation_summary"
            elif "estim" in norm_name:
                page_name = "estimation"
            elif "master" in norm_name and "settings" in norm_name:
                page_name = "process_master_settings"
            elif "cap" in norm_name:
                page_name = "capacity_configuration"
            elif "mach" in norm_name:
                page_name = "machine_master"
            elif "setting" in norm_name:
                page_name = "settings"
            elif "announc" in norm_name:
                page_name = "announcements"
            elif "user" in norm_name and "access" in norm_name:
                page_name = "user_access"
            else:
                page_name = norm_name
    
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
        "rfq_master": "/rfq",
        "rfq": "/rfq",
        "dollar_dashboard": "/rfq/dollar-dashboard",
        "erection_takeoff": "/estimation-erection/erection-takeoff",
        "field_moment_connections": "/estimation-erection/fmc",
        "internal_bid_schedule": "/bids/schedule",
        "holiday_calendar": "/bids/holidays",
        "estimation_summary": "/estimation-summary",
        "estimation": "/estimation-erection",
        "steel_budget_result": "/steel-budget/result",
        "plan_creation": "/structural/plan-creation",
        "process_master_settings": "/production/master-settings",
        "capacity_configuration": "/production/capacity-mapping/capacity",
        "machine_master": "/production/capacity-mapping/machine",
        "workforce_master": "/production/capacity-mapping/manpower",
        "settings": "/settings",
        "announcements": "/announcements",
        "user_access": "/user-access"
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
        "rfq_master": "RFQ Master",
        "rfq": "RFQ Master",
        "dollar_dashboard": "Dollar Dashboard",
        "erection_takeoff": "Erection Takeoff module",
        "field_moment_connections": "Field Moment Connections (FMC) dashboard",
        "internal_bid_schedule": "Internal Bid Schedule",
        "holiday_calendar": "Holiday Calendar",
        "estimation_summary": "Estimation Summary",
        "estimation": "Estimation",
        "steel_budget_result": "Steel Budget Result",
        "plan_creation": "Plan Creation",
        "process_master_settings": "Process Master Settings",
        "capacity_configuration": "Capacity Configuration",
        "machine_master": "Machine Master",
        "workforce_master": "Workforce Master",
        "settings": "Settings",
        "announcements": "Announcements",
        "user_access": "User Access"
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

def handle_create_customer(user, arguments):
    """
    Creates a new customer profile.
    Enforces role authorization (admin only).
    """
    # 1. Authorize user role
    role = getattr(user, 'role', '')
    is_admin = role == 'admin' or user.is_staff or user.is_superuser
    if not is_admin:
        return {
            "status": "error",
            "message": "Permission Denied: Only administrators can add new customers."
        }

    # 2. Extract arguments
    name = arguments.get("name")
    code = arguments.get("code", "")
    category = arguments.get("category", "Domestic")
    country = arguments.get("country", "India")
    street = arguments.get("street", "")
    state = arguments.get("state", "")
    address = arguments.get("address", "")
    designation = arguments.get("designation", "")
    
    contact_person = arguments.get("contact_person", "")
    contact_email = arguments.get("contact_email", "")
    contact_phone = arguments.get("contact_phone", "")

    if not name:
        return {
            "status": "error",
            "message": "Missing required field: Customer Name."
        }

    from projects.models import Customer, CustomerContact

    # Check for name duplication
    if Customer.objects.filter(name__iexact=name).exists():
        return {
            "status": "error",
            "message": f"A customer with the name '{name}' already exists."
        }

    # 3. Create Customer
    try:
        customer = Customer.objects.create(
            name=name,
            code=code,
            category=category,
            country=country,
            street=street,
            state=state,
            address=address,
            designation=designation
        )

        # 4. Create Contact if provided
        contact_info = None
        if contact_person or contact_email or contact_phone:
            contact = CustomerContact.objects.create(
                customer=customer,
                person=contact_person,
                email=contact_email,
                phone=contact_phone
            )
            contact_info = {
                "person": contact.person,
                "email": contact.email,
                "phone": contact.phone
            }

        return {
            "status": "success",
            "message": f"Successfully created customer '{customer.name}'.",
            "customer": {
                "id": customer.id,
                "name": customer.name,
                "code": customer.code,
                "category": customer.category,
                "contact": contact_info
            },
            "ui_actions": [
                {"type": "REFRESH_DATA", "payload": "customers"},
                {"type": "SHOW_TOAST", "payload": {"type": "success", "message": f"Customer {customer.name} added!"}}
            ]
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to save customer: {str(e)}"
        }

# Mapping registry for the execution loops
TOOL_HANDLERS = {
    "create_employee": handle_create_employee,
    "update_employee": handle_update_employee,
    "delete_employee": handle_delete_employee,
    "get_employee_details": handle_get_employee_details,
    "list_projects": handle_list_projects,
    "create_project": handle_create_project,
    "update_project": handle_update_project,
    "delete_project": handle_delete_project,
    "navigate_to_page": handle_navigate_to_page,
    "create_customer": handle_create_customer,
    "update_customer": handle_update_customer,
    "delete_customer": handle_delete_customer,
    "search_records": handle_search_records,
    "summarize_milestones": handle_summarize_milestones,
    "list_rfqs": handle_list_rfqs,
    "get_rfq_details": handle_get_rfq_details
}
