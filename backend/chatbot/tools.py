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
                            "dollar_dashboard",
                            "erection_takeoff",
                            "field_moment_connections"
                        ],
                        "description": "The target page view to redirect the user to"
                    }
                },
                "required": ["page_name"]
            }
        }
    }
]
