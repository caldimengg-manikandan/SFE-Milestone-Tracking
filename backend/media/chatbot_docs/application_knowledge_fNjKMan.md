# Steel Fab Enterprises (SFE) Milestone Tracking & Estimation System
## Comprehensive Application Architecture, Module Specifications, Database Schemas, Formulas & Agentic Knowledge Base

Ground truth application manual and technical specification for Steel Fab Enterprises (SFE). This document serves as the authoritative source of knowledge for the system's architecture, modules, database models, mathematical formulas, business workflows, and AI agent tool capabilities.

---

## 1. System Architecture & Technical Stack

The SFE Milestone Tracking & Estimation System is built on a modern, decoupled architecture designed for high availability, security, and offline AI intelligence.

### Technology Architecture
- **Frontend SPA**: React 18 powered by Vite. Uses `react-router-dom` v6 for client-side routing, **Tailwind CSS** for styling, **TanStack React Query** for asynchronous data fetching and cache management, `react-hot-toast` for notifications, and `lucide-react` for icons.
- **Backend API**: Django 4.x with Django REST Framework (DRF). Modular architecture organized into domain apps (`accounts`, `dashboards`, `employees`, `projects`, `rfq`, `milestones`, `production`, `chatbot`). Enforces RESTful standards, request logging, and transaction integrity.
- **Database Layer**: Relational database storage (PostgreSQL in production, SQLite `db.sqlite3` in development) with foreign key constraints, indexing, and transactional guarantees.
- **Authentication & Security**: JWT (JSON Web Tokens via `SimpleJWT`). Access tokens stored in client `sessionStorage`. Authorization enforced server-side via custom DRF permission classes (`IsAuthenticated`, `IsChatbotAdmin`).
- **Offline Agentic AI & RAG Engine**: Python-based Retrieval-Augmented Generation engine. Combines `pypdf` for document processing, `BM25Okapi` lexical ranking, and dense vector embeddings (`JSONField` in database) for hybrid search retrieval. Connects to Ollama / cloud models with dynamic 28-tool call handlers.

---

## 2. User Roles & Permission Hierarchy

The system defines 6 explicit roles within the `accounts.User` schema:

1. **Admin (`admin`)**: Full system access across all modules, user administration (`/user-access`), system announcements (`/announcements`), and Agent Settings (`/settings`).
2. **Manager (`manager`)**: Full access to project management, production priority schedules, capacity mapping, and milestone tracking. Read/write on operational data.
3. **Estimator (`estimator`)**: Complete access to RFQ logging, Estimation Model, Steel Budget, Estimation Summary, Erection Takeoff, FMC, Internal Bid Schedule, and Dollar Dashboard.
4. **Detailing Partner (`detailing`)**: Access to Plan Creation and Plan Tracking (OFA/BFA dates, structural sequences, tonnages, drawing status).
5. **Shop Employee (`employee`)**: Access to Production Priority Schedule to view fabrication runs and update station task statuses.
6. **Read-Only (`readonly`)**: Audit and view-only access across dashboards, schedules, and reports. Blocked from write operations.

---

## 3. Exhaustive Module & Sub-module Matrix (12+ Core Modules, 25+ Tabs)

| Core Module | Sub-module / Tab Name | Route / Path | Primary Purpose & Key Features |
| :--- | :--- | :--- | :--- |
| **RFQ & Bidding** | **RFQ Intake Entry** | `/rfq-entry` | Log incoming RFQs, auto-generate Quote No (YY-MM-SEQ), record customer, scope, bid due dates. |
| | **RFQ Master** | `/rfq-master` | Master RFQ table tracking status (Budget/Final/Rebid), pricing, tonnage, won/lost outcomes, and scope email notifications. |
| | **Bid Enquiry** | `/rfq` | Early-stage bid enquiry record tracking AISC requirements, sent-to-dept dates, and phase breakdown hours. |
| | **Dollar Dashboard** | `/dollar-dashboard` | Monthly/yearly metrics of Amount Bid vs Awarded vs Profit, win rates, and 5-year trend tracking. |
| | **Bid Performance** | `/bid-performance` | Win-ratio matrix by month and year (count % and $ %) with color-coded benchmark thresholds. |
| | **Sales Cycle** | `/sales-cycle` | Days-between-milestones tracking (Quote to Award, Award to Fab Start) for awarded projects. |
| | **Future Capacity** | `/future-capacity` | 12-month forward projection of committed fabrication tonnage vs shop capacity limits. |
| | **Internal Bid Schedule** | `/internal-bid-schedule` | Bid due date calendar with status color codes and holiday calendar overlay. |
| | **Holiday Calendar** | `/holiday-calendar` | Company, public, and optional holiday manager integrated into bid schedules. |
| **Estimation & Sizing** | **Estimation Model** | `/estimation` | Main estimator input workspace for raw cost drivers (steel $, mill/warehouse, bolts, paint, labor hours, sublet costs). |
| | **Steel Budget (Inputs)** | `/steel-budget` | Early-stage square footage (SF) to steel tonnage & dollar budget calculator per building level. |
| | **Steel Budget Result** | `/steel-budget-result` | Sizing output breakdown of base steel, premiums, contingencies, tonnage totals, and budget rates. |
| | **Estimation Summary** | `/estimation-summary` | 16-cost-code detailed estimate rollup (Material, Labor, Erection, Freight, Overhead) feeding Schedule of Values. |
| | **Erection Takeoff** | `/erection-takeoff` | Field erection labor, ironworker crew-day, crane-day, and trucking/unloading manhour estimator. |
| | **Field Moment Connections** | `/field-moment-connections` | AISC W-shape flange moment connection shop & field welding hour estimator with 1.40x field factor. |
| **Contracts & Contacts** | **Contracts Sheet** | `/contacts` | Project contract information sheet (job #, terms, tax, paint specs) and customer/architect/engineer attachments. |
| | **Customer Master** | `/customer-master` | Master database of customer organizations, categories, addresses, and primary contact persons. |
| | **Detailer Master** | `/detailer-master` | Detailer vendor directory tracking rating, monthly capacity (tons), and contact details. |
| | **Employee Master** | `/employee-master` | Internal employee database with department, designation, contact info, join date, and active status. |
| | **Project Master** | `/project-master` | SFE Project catalog with code, manager, detailer, target erection date, assigned shop, status, and tonnage. |
| **Structural Tracking** | **Plan Creation** | `/plan-creation` | Build structural sequence schedule (planned approval order/return, ready-to-ship, ship, erection dates, tons). |
| | **Structural Schedules** | `/structural-schedules` | Structural tracking schedule comparing actual dates/hours against plan, revision history, and drawing status. |
| **Production Schedule** | **Production Priority** | `/production-schedules` | Shop floor run sequence for Plate, Angle, and Structural modules by process (Plasma, Ficep, Punch). |
| | **Process Master Settings**| `/process-master-settings` | Production rate definitions ($/hr, tons/hr) per fabrication process and station step. |
| | **Capacity Configuration** | `/capacity-configuration` | Shop capacity mapping linking machine inventory or workforce labor to shop processes and monthly throughput limits. |
| | **Machine Master** | `/machine-master` | Shop machinery inventory (name, make, daily tonnage capacity, assigned shop location). |
| | **Workforce Master** | `/workforce-master` | Roster of shop floor manpower, skill levels, assigned process, daily productivity rates, and pay rates. |
| **Milestone & Admin** | **Milestone Management** | `/milestones` | Milestone deliverable tracking (title, project, target date, completion date, status: Pending/In Progress/Completed/Overdue). |
| | **Announcements** | `/announcements` | System-wide broadcast announcement banners (Low, Normal, High, Critical priority). |
| | **User Access** | `/user-access` | Admin user account management, role assignments, and active state toggles. |
| | **Agent Settings** | `/settings` | AI agent persona instructions, tool enablement checkboxes (28 tools), model selection overrides. |

---

## 4. Complete Database Models & Field Specifications

### 1. User (`accounts.models.User`)
- `id` *(AutoField, Primary Key)*: Unique identifier.
- `username` *(CharField, Unique)*: Login username.
- `email` *(EmailField, Unique)*: User email address.
- `first_name`, `last_name` *(CharField)*: User full name.
- `role` *(CharField)*: User system role. Choices: `admin`, `manager`, `estimator`, `detailing`, `employee`, `readonly`. Default: `readonly`.
- `is_active` *(BooleanField)*: Active flag. Default: `True`.
- `date_joined` *(DateTimeField)*: Timestamp of registration.

### 2. Employee (`employees.models.Employee`)
- `id` *(AutoField, Primary Key)*: Database key.
- `emp_id` *(CharField, Unique)*: Human-readable ID (e.g., `EMP-001`). Auto-generated if omitted.
- `name` *(CharField)*: Full employee name.
- `department` *(CharField)*: Department (e.g., Fabrication, Detailing, Management, Quality Control).
- `designation` *(CharField)*: Role title (e.g., Welder, Fitter, Project Manager, Detailer).
- `email` *(EmailField, Unique)*: Primary email.
- `phone` *(CharField, Optional)*: Phone contact number.
- `status` *(CharField)*: Choices: `Active`, `On Leave`, `Inactive`. Default: `Active`.
- `join_date` *(DateField, Optional)*: Date employee joined SFE.

### 3. Customer (`projects.models.Customer`)
- `id` *(AutoField, Primary Key)*: Database key.
- `name` *(CharField, Unique)*: Customer company name.
- `code` *(CharField, Optional)*: Short customer identifier.
- `category` *(CharField)*: Category (e.g., Domestic, International). Default: `Domestic`.
- `country` *(CharField)*: Country location. Default: `India`.
- `street`, `state`, `address` *(CharField/TextField)*: Address details.
- `designation` *(CharField, Optional)*: Customer contact designation.
- `contact_person` *(CharField, Optional)*: Primary contact name.
- `contact_email` *(EmailField, Optional)*: Contact email address.
- `contact_phone` *(CharField, Optional)*: Contact phone number.

### 4. Detailer (`projects.models.Detailer`)
- `id` *(AutoField, Primary Key)*: Database key.
- `name` *(CharField)*: Detailer company name.
- `contact_person`, `email`, `phone` *(CharField/EmailField)*: Contact details.
- `rating` *(IntegerField)*: Vendor rating score (1-5).
- `capacity_tons_per_month` *(DecimalField)*: Monthly detailing tonnage capacity.
- `address` *(TextField)*: Office address.

### 5. Project (`projects.models.Project`)
- `id` *(AutoField, Primary Key)*: Primary Key.
- `code` *(CharField, Unique)*: Project code (e.g., `PRJ-101`).
- `name` *(CharField)*: Project name.
- `customer` *(ForeignKey -> Customer)*: Customer reference.
- `project_manager` *(ForeignKey -> Employee)*: Assigned PM.
- `detailer` *(ForeignKey -> Detailer, Optional)*: Assigned detailing firm.
- `shop_name` *(CharField, Optional)*: Assigned fabrication shop location (e.g., Shop A, Shop 1).
- `total_ton` *(DecimalField)*: Total structural steel weight in tons.
- `erection_date` *(DateField, Optional)*: Target erection start date.
- `status` *(CharField)*: Choices: `Yet to Start`, `In Progress`, `Planning`, `Completed`. Default: `Yet to Start`.
- `priority` *(CharField)*: Choices: `Low`, `Medium`, `High`. Default: `Medium`.
- `created_at` *(DateTimeField)*: Auto creation timestamp.

### 6. RFQ (`rfq.models.RFQ`)
- `id` *(AutoField, Primary Key)*: Database key.
- `quote_no` *(CharField, Unique)*: Auto-generated quote number (`YY-MM-SEQ`).
- `budget_type` *(CharField)*: Choices: `Budget`, `Final`, `Rebid`.
- `quote_date` *(DateField)*: Date quote was created.
- `bid_ref` *(CharField, Optional)*: External customer reference code.
- `project_name` *(CharField)*: Name of the project being quoted.
- `comments` *(TextField, Optional)*: General bidding notes.
- `bid_due_date` *(DateTimeField)*: Bid submission deadline.
- `location`, `distance` *(CharField/DecimalField)*: Job site location and distance from SFE shop.
- `customer` *(ForeignKey -> Customer)*: Bidding customer.
- `decision_to_bid` *(CharField)*: Choices: `Yes`, `No`, `NoBid`, `Bid`.
- `scope_of_work` *(CharField)*: Multi-select comma string (`Detailing`, `Fabrication`, `Erection`).
- `estimator` *(ForeignKey -> Employee)*: Primary assigned estimator.
- `pricing_status` *(CharField)*: Bidding outcome state: `Won`, `Lost`, `Pending`, `Cancelled`.
- `awarded_amount` *(DecimalField, Optional)*: Total contract award value ($).
- `awarded_date` *(DateField, Optional)*: Contract award date.
- `sfe_job_no` *(CharField, Optional)*: Assigned SFE job tracking number upon winning.
- `contract_executed_date`, `fab_start_date` *(DateField, Optional)*: Key schedule dates.

### 7. BidEnquiry (`rfq.models.BidEnquiry`)
- `id` *(AutoField, Primary Key)*: Database key.
- `quote_no` *(CharField, Unique)*: Unique enquiry quote identifier.
- `bid_due_date` *(DateField)*: Bid due date.
- `location` *(CharField)*: Project location.
- `aisc_fab_req`, `aisc_erect_req` *(BooleanField)*: AISC certification requirements flags.
- `customer` *(ForeignKey -> Customer)*: Customer reference.
- `scope_of_work` *(CharField)*: Bidding scope.
- `decision_to_bid` *(CharField)*: Decision status.
- `primary_estimator` *(ForeignKey -> Employee)*: Assigned estimator.
- `sent_to_dept_dates` *(JSONField)*: Department routing dates.
- `pricing_tonnage`, `hours_by_phase` *(JSONField)*: Detailed pricing tonnage and shop/field phase hours.

### 8. Milestone (`milestones.models.Milestone`)
- `id` *(AutoField, Primary Key)*: Database key.
- `project` *(ForeignKey -> Project)*: Target project reference.
- `title` *(CharField)*: Deliverable title (e.g., `Submit Anchor Bolt Plan`).
- `due_date` *(DateField)*: Planned completion deadline.
- `completion_date` *(DateField, Optional)*: Actual completion date.
- `status` *(CharField)*: Choices: `Pending`, `In Progress`, `Completed`, `Overdue`. Default: `Pending`.
- `created_at` *(DateTimeField)*: Timestamp.

### 9. Announcement (`dashboards.models.Announcement`)
- `id` *(AutoField, Primary Key)*: Database key.
- `title` *(CharField)*: Announcement header title.
- `message` *(TextField)*: Body notification content.
- `priority` *(CharField)*: Choices: `Low`, `Normal`, `High`, `Critical`. Default: `Normal`.
- `created_by` *(ForeignKey -> User)*: Author user.
- `created_at` *(DateTimeField)*: Timestamp.
- `is_active` *(BooleanField)*: Display active flag. Default: `True`.

### 10. Machine (`production.models.Machine`)
- `id` *(AutoField, Primary Key)*: Database key.
- `machine_id` *(CharField, Unique)*: Machine code (e.g., `MAC-001`).
- `name` *(CharField)*: Machine name (e.g., `CNC Plasma Cutter`).
- `make` *(CharField)*: Manufacturer / make model.
- `capacity_per_day` *(DecimalField)*: Daily tonnage processing capacity.
- `shop` *(CharField)*: Assigned shop location (e.g., `Shop A`).

### 11. Workforce / Manpower (`production.models.Manpower`)
- `id` *(AutoField, Primary Key)*: Database key.
- `employee_name` *(CharField)*: Shop floor worker name.
- `skill_level` *(CharField)*: Choices: `High`, `Medium`, `Low`.
- `process` *(CharField)*: Assigned fabrication process (e.g., `Welding`, `Fitting`, `Plasma`).
- `productivity_rate_per_day` *(DecimalField)*: Worker daily output capacity (tons or hours).
- `rate_per_day` *(DecimalField)*: Daily wage rate ($).

### 12. Capacity (`production.models.Capacity`)
- `id` *(AutoField, Primary Key)*: Database key.
- `shop` *(CharField)*: Shop location name.
- `category` *(CharField)*: Choices: `Machine`, `Manual`.
- `process` *(CharField)*: Fabrication process name.
- `capacity_per_day` *(DecimalField)*: Daily capacity throughput.
- `capacity_per_month` *(DecimalField)*: Calculated monthly capacity throughput.

### 13. ProcessSetting (`production.models.ProcessSetting`)
- `id` *(AutoField, Primary Key)*: Database key.
- `module_type` *(CharField)*: Choices: `PLATE`, `ANGLE`, `STRUCTURAL`.
- `process_name` *(CharField)*: Process name (e.g., `Ficep Drill`, `Plasma Cut`).
- `rate_per_hour` *(DecimalField)*: Standard production processing rate per hour.
- `description` *(TextField, Optional)*: Process notes.

### 14. AgentConfig (`chatbot.models.AgentConfig`)
- `id` *(IntegerField, Primary Key)*: Singleton row (`pk=1`).
- `persona_instructions` *(TextField)*: Additive system prompt persona instructions.
- `enabled_tools` *(JSONField, Optional)*: List of enabled tool names. `NULL` or empty represents all 28 tools enabled by default.
- `model_override` *(CharField)*: Optional LLM model override string.
- `updated_at` *(DateTimeField)*: Last update timestamp.
- `updated_by` *(ForeignKey -> User)*: User who updated agent settings.

---

## 5. Workflows & Mathematical Formulas

### Steel Budget Sizing Calculation
Used for early-stage structural steel sizing based on building square footage (SF) and framing weight factors:

1. **Floor Steel Weight (lbs)** = $\text{Floor Area (SF)} \times \text{Floor Framing Weight (lbs/SF)}$
2. **Roof Steel Weight (lbs)** = $\text{Roof Area (SF)} \times \text{Roof Framing Weight (lbs/SF)}$
3. **Misc Steel Weight (lbs)** = $(\text{Floor Area} + \text{Roof Area}) \times \text{Misc Steel Percentage (\temp\_pct)}$
4. **Base Framing Steel (lbs)** = $\text{Floor Steel} + \text{Roof Steel} + \text{Misc Steel}$
5. **Total Estimated Steel (lbs)** = $\text{Base Framing Steel} \times \left(1 + \text{Moment Premium \%} + \text{Facade Premium \%} + \text{Contingency \%}\right) + \text{Canopy/Rooftop Allowance (lbs)}$
6. **Total Estimated Steel Tonnage** = $\frac{\text{Total Estimated Steel (lbs)}}{2,000 \text{ lbs/ton}}$
7. **Total Budget ($)** = $\text{Total Estimated Steel Tonnage} \times \text{Budget Rate (\$/ton)}$

### Erection Takeoff Calculations
Calculates field erection labor and equipment requirements:
1. **Total Structural Piece Manhours** = $\sum_{i} \left( \text{Quantity}_i \times \text{Manhours per Piece}_i \right)$
2. **Ironworker Crew Days** = $\frac{\text{Total Structural Piece Manhours}}{\text{Crew Size} \times \text{Shift Hours per Day}}$
3. **Crane Days** = $\frac{\text{Total Steel Picks}}{\text{Picks per Day} \times \text{Crane Efficiency Factor}}$
4. **Truck Unloading Hours** = $\text{Total Truckloads} \times \text{Unload Hours per Truck}$
5. **Total Field Erection Hours** = $\text{Total Structural Piece Manhours} + \text{Truck Unloading Hours}$

### Field Moment Connections (FMC) Welding Formulas
1. **Shop Beaded Weld Hours** = $(\text{Flange Width} \times \text{Flange Thickness} \times \text{Weld Factor})$ per AISC W-shape connection
2. **Field Work Multiplier** = $1.40 \times \text{Shop Weld Hours}$ *(accounts for out-of-position field welding, scaffolding, safety harnesses, and fit-up)*
3. **Total Field Welding Manhours** = $\text{Number of Moment Connections} \times \text{Shop Weld Hours} \times 1.40$

### Shop Capacity Mapping Throughput
1. **Daily Machine Capacity (Tons/Day)** = $\sum \text{Machine.capacity\_per\_day}$ for assigned shop and process.
2. **Daily Workforce Capacity (Tons/Day)** = $\sum \text{Manpower.productivity\_rate\_per\_day}$ for assigned shop workers.
3. **Monthly Shop Throughput (Tons/Month)** = $\text{Daily Capacity (Tons/Day)} \times \text{Operating Days per Month (22-26 Days)}$

### Hybrid Search RAG Retrieval Scoring
1. **BM25 Lexical Score**: Measures keyword match frequency and inverse document frequency across knowledge chunks.
2. **Vector Cosine Similarity**: Measures semantic similarity between query vector and chunk embedding vector ($S_{\text{cos}} = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$).
3. **Hybrid RAG Score**: $Score_{\text{hybrid}} = 0.5 \times \text{BM25Score}_{\text{norm}} + 0.5 \times S_{\text{cos}}$. Top 5 highest scoring chunks are retrieved with page numbers and document titles as citations.

---

## 6. Agentic AI Architecture & Tool Capabilities

The AI Chatbot operates as an autonomous tool-calling agent with **28 defaultly enabled system tools**. When a user requests a business action, the agent evaluates intent, calls the appropriate tool handler, verifies authorizations, and returns synthesized natural language responses with interactive UI navigation actions.

### Complete Tool Registry (28 Tools)

1. `create_employee`: Creates a new employee record in Employee Master (Name, Dept, Designation, Email, Phone, Status, Join Date). Enforces Admin authorization. Auto-generates `emp_id` if omitted.
2. `update_employee`: Updates an existing employee profile by `emp_id`. Requires confirmation flag (`confirm: true`).
3. `delete_employee`: Deletes an employee record by `emp_id`. Requires confirmation flag.
4. `get_employee_details`: Looks up employee records by name, department, or designation filter.
5. `list_projects`: Lists SFE projects with status, priority, tonnage, and manager details.
6. `list_customers`: Lists customer organizations filtered by category or country.
7. `create_project`: Creates a new project in Project Master (Code, Name, Customer, PM, Detailer, Tonnage, Target Erection Date, Shop, Status, Priority).
8. `update_project`: Updates an existing project by project code or project name.
9. `delete_project`: Deletes a project record by code. Requires confirmation.
10. `navigate_to_page`: Directs user UI view to any of 27 application pages (e.g. `dashboard`, `employee_master`, `steel_budget`, `rfq_master`, `settings`).
11. `create_customer`: Creates a new customer profile in Customer Master with address and contact details.
12. `update_customer`: Updates an existing customer profile by customer ID or name.
13. `delete_customer`: Deletes a customer profile. Requires confirmation.
14. `search_records`: Performs a multi-entity live database search across employees, customers, and projects.
15. `summarize_milestones`: Summarizes milestone health for a project or full workspace (Pending, In Progress, Completed, Overdue counts).
16. `create_rfq`: Creates a new RFQ entry in RFQ Master (Quote No, Project Name, Customer, Budget Type, Bid Due Date, Bid Amount, Steel Tonnage, Scope).
17. `list_rfqs`: Filters and lists RFQs from RFQ Master by project name or status (Won, Lost, Pending).
18. `create_milestone`: Creates a new project deliverable in Milestone Master (Project Code, Title, Target Date, Status).
19. `update_milestone`: Updates a milestone's title, status, or completion date by `milestone_id`.
20. `create_announcement`: Broadcasts a system-wide announcement banner to user dashboards (Title, Message, Priority).
21. `list_announcements`: Lists active system dashboard announcements.
22. `list_production_priorities`: Filters production priority schedules by module type (`PLATE`, `ANGLE`, `STRUCTURAL`) or process type.
23. `create_machine`: Adds a new shop machine into Machine Master inventory (Name, Make, Daily Capacity, Shop Location).
24. `list_machines`: Lists shop machinery with daily tonnage capacities and shop assignments.
25. `create_manpower`: Adds workforce shift allocations in Workforce Master (Employee Name, Skill Level, Process, Daily Productivity Rate, Pay Rate).
26. `list_manpower`: Lists workforce roster filtered by skill level or assigned process.
27. `create_capacity_config`: Configures shop capacity targets (`Machine` or `Manual`) per shop location and process.
28. `list_capacity_configs`: Lists shop capacity mapping configurations.

---

## 7. Safety, Authorization & Tool Execution Flow

```
+------------------+      +-------------------+      +----------------------+
| User Chat Query  | ---> | Intent Recognition| ---> | Active Tool Decision |
+------------------+      +-------------------+      +----------------------+
                                                                |
                                                                v
+------------------+      +-------------------+      +----------------------+
| Output Response  | <--- | Execute Handler   | <--- | RBAC & Confirmation  |
| & UI Action      |      | & Query Database  |      | Security Checks      |
+------------------+      +-------------------+      +----------------------+
```

- **Tool Enablement**: All 28 tools are enabled by default in backend (`AgentConfig.enabled_tools = None`) and frontend settings (`AgentSettings.jsx`). Administrators may selectively toggle specific tools off if desired.
- **Role Enforcement**: Destructive or admin actions (e.g., `create_employee`, `delete_project`) verify user roles server-side (`_is_admin_user`) before executing.
- **Confirmation Step**: State-changing update and delete operations inspect the `confirm` boolean parameter. If unconfirmed, the agent asks for user confirmation before executing.
