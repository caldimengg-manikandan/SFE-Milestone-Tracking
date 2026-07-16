# Schema registry for Llama 3.2 tool calling

AVAILABLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_employee",
            "description": "Creates a new employee record in the Employee Master. Use this tool only when the user explicitly requests to add, create, or register a new employee.",
            "parameters": {
                "type": "object",
                "properties": {
                    "emp_id": {
                        "type": "string", 
                        "description": "Unique Employee ID (e.g. EMP-001). If not provided, the backend will auto-generate a unique ID."
                    },
                    "name": {
                        "type": "string",
                        "description": "Full name of the employee"
                    },
                    "department": {
                        "type": "string",
                        "description": "Department name (e.g., Fabrication, Detailing, Management, Quality Control)"
                    },
                    "designation": {
                        "type": "string",
                        "description": "Designation or role (e.g., Welder, Fitter, Project Manager, Detailer)"
                    },
                    "email": {
                        "type": "string",
                        "description": "Primary email address of the employee"
                    },
                    "phone": {
                        "type": "string",
                        "description": "Phone number (optional)"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["Active", "On Leave", "Inactive"],
                        "description": "Active status of the employee (defaults to Active)"
                    },
                    "join_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Joining date in YYYY-MM-DD format (optional)"
                    }
                },
                "required": ["name", "department", "designation", "email"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_employee_details",
            "description": "Retrieves employee records from the database using search parameters. Use this to lookup employees.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name or partial name of the employee to search for"
                    },
                    "department": {
                        "type": "string",
                        "description": "Filter by department"
                    },
                    "designation": {
                        "type": "string",
                        "description": "Filter by designation/role"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_projects",
            "description": "Lists SFE projects with their status, metrics, and managers. Can filter by status or priority.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["Yet to Start", "In Progress", "Planning", "Completed"],
                        "description": "Filter projects by their current status"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["Low", "Medium", "High"],
                        "description": "Filter projects by priority level"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "navigate_to_page",
            "description": "Directs the user's web browser view to a specific section or module of the application.",
            "parameters": {
                "type": "object",
                "properties": {
                    "page_name": {
                        "type": "string",
                        "enum": [
                            "dashboard",
                            "employee_master",
                            "customer_master",
                            "detailer_master",
                            "project_master",
                            "steel_budget",
                            "structural_schedules",
                            "production_schedules",
                            "rfq_entry",
                            "rfq_master",
                            "rfq",
                            "dollar_dashboard",
                            "erection_takeoff",
                            "field_moment_connections",
                            "internal_bid_schedule",
                            "holiday_calendar",
                            "estimation_summary",
                            "estimation",
                            "steel_budget_result",
                            "plan_creation",
                            "process_master_settings",
                            "capacity_configuration",
                            "machine_master",
                            "workforce_master",
                            "settings",
                            "announcements",
                            "user_access"
                        ],
                        "description": "The target page view to redirect the user to"
                    }
                },
                "required": ["page_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_customer",
            "description": "Creates a new customer profile in the Customer Master database along with an optional primary contact.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The full name of the customer company or organization"
                    },
                    "code": {
                        "type": "string",
                        "description": "Short code identifying the customer (optional)"
                    },
                    "category": {
                        "type": "string",
                        "description": "Customer category e.g. Domestic, International (defaults to Domestic)"
                    },
                    "country": {
                        "type": "string",
                        "description": "Country where the customer is located (defaults to India)"
                    },
                    "street": {
                        "type": "string",
                        "description": "Street address of the customer"
                    },
                    "state": {
                        "type": "string",
                        "description": "State address of the customer"
                    },
                    "address": {
                        "type": "string",
                        "description": "Full postal address description"
                    },
                    "designation": {
                        "type": "string",
                        "description": "Designation details (optional)"
                    },
                    "contact_person": {
                        "type": "string",
                        "description": "Name of the primary contact person (optional)"
                    },
                    "contact_email": {
                        "type": "string",
                        "description": "Email address of the contact person (optional)"
                    },
                    "contact_phone": {
                        "type": "string",
                        "description": "Phone number of the contact person (optional)"
                    }
                },
                "required": ["name"]
            }
        }
    }
]
