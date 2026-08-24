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
            "name": "update_employee",
            "description": "Updates an existing employee record. Requires confirmation from the user before the change is applied.",
            "parameters": {
                "type": "object",
                "properties": {
                    "emp_id": {"type": "string", "description": "Employee ID to update"},
                    "name": {"type": "string"},
                    "department": {"type": "string"},
                    "designation": {"type": "string"},
                    "email": {"type": "string"},
                    "phone": {"type": "string"},
                    "status": {"type": "string", "enum": ["Active", "On Leave", "Inactive"]},
                    "join_date": {"type": "string", "format": "date"},
                    "confirm": {"type": "boolean", "description": "Set to true only after the user explicitly confirms the update"}
                },
                "required": ["emp_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_employee",
            "description": "Deletes an employee record. Requires explicit confirmation before the deletion is applied.",
            "parameters": {
                "type": "object",
                "properties": {
                    "emp_id": {"type": "string", "description": "Employee ID to delete"},
                    "confirm": {"type": "boolean", "description": "Set to true only after the user explicitly confirms the deletion"}
                },
                "required": ["emp_id"]
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
            "name": "list_customers",
            "description": "Lists customers in the Customer Master with basic details. Can filter by category or country.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Filter by customer category (e.g., Domestic, International)"
                    },
                    "country": {
                        "type": "string",
                        "description": "Filter by country"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_project",
            "description": "Creates a new project record. Use this when the user explicitly asks to create or add a project.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string"},
                    "name": {"type": "string"},
                    "customer_name": {"type": "string"},
                    "project_manager_name": {"type": "string"},
                    "detailer_name": {"type": "string"},
                    "total_ton": {"type": "number"},
                    "erection_date": {"type": "string", "format": "date", "description": "Target erection start date in YYYY-MM-DD format"},
                    "shop_name": {"type": "string", "description": "Assigned fabrication shop name"},
                    "status": {"type": "string", "enum": ["Yet to Start", "In Progress", "Planning", "Completed"]},
                    "priority": {"type": "string", "enum": ["Low", "Medium", "High"]}
                },
                "required": ["code", "name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_project",
            "description": "Updates an existing project record in Project Master (including name, manager, detailer, erection_date, shop_name, status, priority, total_ton). You can search by project code OR project name (e.g. 'NAMRUTHA'). If the user wants to set an erection date, pass erection_date in YYYY-MM-DD format.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Project code (e.g. PRJ-101) or project name (e.g. 'NAMRUTHA') to search for"},
                    "name": {"type": "string", "description": "Full or partial project name to search for"},
                    "customer_name": {"type": "string"},
                    "project_manager_name": {"type": "string"},
                    "detailer_name": {"type": "string"},
                    "erection_date": {"type": "string", "format": "date", "description": "Target erection start date in YYYY-MM-DD format"},
                    "shop_name": {"type": "string", "description": "Assigned fabrication shop name"},
                    "total_ton": {"type": "number"},
                    "status": {"type": "string", "enum": ["Yet to Start", "In Progress", "Planning", "Completed"]},
                    "priority": {"type": "string", "enum": ["Low", "Medium", "High"]}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_project",
            "description": "Deletes a project record. Requires explicit confirmation before applying changes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Project code to delete"},
                    "confirm": {"type": "boolean"}
                },
                "required": ["code"]
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
    },
    {
        "type": "function",
        "function": {
            "name": "update_customer",
            "description": "Updates an existing customer record (including name, code, category, country, street, state, address, designation, contact_person, contact_email, contact_phone). You can search by customer_id or customer name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "integer", "description": "Customer DB ID to update"},
                    "name": {"type": "string", "description": "Customer name or partial name to search for/update"},
                    "code": {"type": "string"},
                    "category": {"type": "string"},
                    "country": {"type": "string"},
                    "street": {"type": "string"},
                    "state": {"type": "string"},
                    "address": {"type": "string"},
                    "designation": {"type": "string"},
                    "contact_person": {"type": "string", "description": "Name of primary contact person"},
                    "contact_email": {"type": "string", "description": "Email of primary contact person"},
                    "contact_phone": {"type": "string", "description": "Phone/contact number of primary contact person"},
                    "confirm": {"type": "boolean"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_customer",
            "description": "Deletes a customer record. Requires explicit confirmation before applying changes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "integer"},
                    "name": {"type": "string"},
                    "confirm": {"type": "boolean"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_records",
            "description": "Searches live business records across employees, customers, and projects.",
            "parameters": {
                "type": "object",
                "properties": {
                    "entity": {"type": "string", "enum": ["employee", "customer", "project", "rfq", "all"]},
                    "query": {"type": "string"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "summarize_milestones",
            "description": "Summarizes milestone health for a project or the full workspace, including overdue and pending counts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_code": {"type": "string"},
                    "project": {"type": "string"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_rfq",
            "description": "Creates a new Request for Quotation (RFQ) entry in the RFQ Master.",
            "parameters": {
                "type": "object",
                "properties": {
                    "quote_no": {"type": "string", "description": "Quote number e.g. 23-06-05"},
                    "project_name": {"type": "string", "description": "Name of the RFQ project"},
                    "customer_name": {"type": "string", "description": "Customer name"},
                    "budget_type": {"type": "string", "enum": ["Budget", "Final", "Rebid"]},
                    "bid_due_date": {"type": "string", "format": "date", "description": "YYYY-MM-DD"},
                    "bid_amount": {"type": "number", "description": "Financial bid amount ($)"},
                    "ton_steel": {"type": "number", "description": "Estimated steel weight in tons"},
                    "scope_of_work": {"type": "string", "description": "e.g. Detailing/Fabrication/Erection"}
                },
                "required": ["project_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_rfqs",
            "description": "Lists RFQ master records with filter and search parameters. Access is restricted to admin, manager, and estimator roles.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string", "description": "Filter by project name"},
                    "won_lost": {
                        "type": "string",
                        "enum": ["Won", "Lost", "Pending", "all"],
                        "description": "Filter RFQs by status. Use 'all' for no status filter."
                    },
                    "budget_type": {
                        "type": "string",
                        "enum": ["Budget", "Final", "Rebid", "all"],
                        "description": "Filter RFQs by budget type. Use 'all' for no budget type filter."
                    },
                    "query": {
                        "type": "string",
                        "description": "Search term matching quote number, project name, or client name"
                    },
                    "limit": {
                        "type": "string",
                        "description": "Max results to return (default '10'). Pass '-1' or '0' for maximum results."
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_milestone",
            "description": "Creates a new project milestone deliverable in Milestone Master.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_code": {"type": "string", "description": "Target project code (e.g. PRJ-101) or project name"},
                    "title": {"type": "string", "description": "Milestone title or deliverable description"},
                    "due_date": {"type": "string", "format": "date", "description": "Target completion date YYYY-MM-DD"},
                    "status": {"type": "string", "enum": ["Pending", "In Progress", "Completed", "Overdue"]}
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_milestone",
            "description": "Updates an existing milestone status, completion date, or title.",
            "parameters": {
                "type": "object",
                "properties": {
                    "milestone_id": {"type": "integer"},
                    "title": {"type": "string"},
                    "status": {"type": "string", "enum": ["Pending", "In Progress", "Completed", "Overdue"]},
                    "completion_date": {"type": "string", "format": "date"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_announcement",
            "description": "Broadcasts a system-wide announcement banner to all user dashboards.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Announcement header title"},
                    "message": {"type": "string", "description": "Announcement body message text"},
                    "priority": {"type": "string", "enum": ["Low", "Normal", "High", "Critical"]}
                },
                "required": ["title", "message"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_announcements",
            "description": "Lists active broadcast announcements on the system dashboard.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_production_priorities",
            "description": "Lists production schedule priorities filtered by module type (PLATE, ANGLE, STRUCTURAL) or process type.",
            "parameters": {
                "type": "object",
                "properties": {
                    "module_type": {"type": "string", "enum": ["PLATE", "ANGLE", "STRUCTURAL"]},
                    "process_type": {"type": "string"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_machine",
            "description": "Adds a new shop machine into the Machine Master inventory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Machine name (e.g. CNC Plasma Cutter)"},
                    "make": {"type": "string", "description": "Manufacturer / Make"},
                    "capacity_per_day": {"type": "number", "description": "Daily tonnage capacity"},
                    "shop": {"type": "string", "description": "Shop location e.g. Shop A"},
                    "machine_id": {"type": "string"}
                },
                "required": ["name", "make"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_machines",
            "description": "Lists shop machines in Machine Master with their daily capacity and shop location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "shop": {"type": "string"},
                    "name": {"type": "string"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_manpower",
            "description": "Adds workforce shift allocation in Workforce Master.",
            "parameters": {
                "type": "object",
                "properties": {
                    "employee_name": {"type": "string"},
                    "skill_level": {"type": "string", "enum": ["High", "Medium", "Low"]},
                    "process": {"type": "string", "description": "Assigned fabrication process e.g. Welding"},
                    "productivity_rate_per_day": {"type": "number"},
                    "rate_per_day": {"type": "number"}
                },
                "required": ["employee_name", "skill_level", "process"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_manpower",
            "description": "Lists workforce roster in Workforce Master filtered by skill level or process.",
            "parameters": {
                "type": "object",
                "properties": {
                    "skill_level": {"type": "string", "enum": ["High", "Medium", "Low"]},
                    "process": {"type": "string"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_capacity_config",
            "description": "Configures shop capacity mapping targets (Machine or Manual) per shop location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "shop": {"type": "string", "description": "Shop name e.g. Shop 1"},
                    "category": {"type": "string", "enum": ["Machine", "Manual"]},
                    "process": {"type": "string", "description": "Target process e.g. Cutting/Assembly"},
                    "capacity_per_day": {"type": "number"},
                    "capacity_per_month": {"type": "number"}
                },
                "required": ["shop", "category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_capacity_configs",
            "description": "Lists shop capacity mapping configurations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "shop": {"type": "string"},
                    "category": {"type": "string", "enum": ["Machine", "Manual"]}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_rfq_details",
            "description": "Retrieves the full details of a specific RFQ from the RFQ Master by its quote number or ID. Access is restricted to admin, manager, and estimator roles.",
            "parameters": {
                "type": "object",
                "properties": {
                    "quote_no": {
                        "type": "string",
                        "description": "The unique Quote Number of the RFQ (e.g. 26-05-01)"
                    },
                    "rfq_id": {
                        "type": "integer",
                        "description": "The database primary key ID of the RFQ record"
                    }
                }
            }
        }
    }
]


