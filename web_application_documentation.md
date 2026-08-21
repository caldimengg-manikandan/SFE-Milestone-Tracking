# Steel Fab Enterprises (SFE) Web Application – System Architecture & Technical Documentation

## Executive Summary & System Overview

The **Steel Fab Enterprises (SFE) Milestone Tracking & Estimation System** is an enterprise-grade Web Application tailored specifically for structural steel fabrication and erection workflows. It digitizes and automates the operational lifecycle of steel construction projects—ranging from initial **Request for Quotation (RFQ)** intake, bid estimation, detailing management, production station scheduling, capacity planning, through to final project milestone tracking and AI-driven conversational management.

---

## 1. System Architecture & Tech Stack

The system follows a modern decoupled architecture separating the **Single Page Application (SPA) Frontend** from the RESTful **API Backend**, backed by relational storage and an offline RAG AI Chatbot system with 28 tool integrations.

| Layer | Technology | Primary Function & Implementation Details |
| :--- | :--- | :--- |
| **Frontend** | **React 18 (Vite)** | Responsive single-page interface with `react-router-dom` v6 routes, styled via **Tailwind CSS**, state management via **TanStack React Query** & React Context, UI feedback via `react-hot-toast`, and icons via `lucide-react`. |
| **Backend** | **Django 4.x / Django REST Framework (DRF)** | Modular REST API endpoints handling authentication, permission enforcement, CRUD operations, aggregation pipelines, and custom request logging middleware (`request_log.txt`). |
| **Database** | **PostgreSQL / SQLite** | Relational data persistence with strict foreign key constraints. SQLite (`db.sqlite3`) for local development and PostgreSQL for production environments. |
| **Auth & Security** | **JWT (SimpleJWT)** | Stateless authentication using JSON Web Tokens. Access tokens are stored client-side in `sessionStorage` and verified per request via DRF `IsAuthenticated` and custom RBAC permissions. |
| **Offline AI / Chatbot** | **Ollama (`llama3.2`) + Python RAG** | Offline assistant using `pypdf` for document extraction, `BM25Okapi` indexing, and local vector retrieval connected to custom context files and 28 automated database tool handlers. |

---

## 2. User Roles & Permission Hierarchy

The system defines 6 distinct roles within the `accounts.User` schema to enforce granular access across all modules:

```
                  +-----------------------------------+
                  |      Admin (Full System Access)   |
                  +-----------------------------------+
                                    |
         +--------------------------+--------------------------+
         |                                                     |
+------------------+                                  +------------------+
|     Manager      |                                  |    Estimator     |
| (Ops, Capacity)  |                                  | (RFQs, Bids)     |
+------------------+                                  +------------------+
         |                                                     |
+------------------+                                  +------------------+
|    Detailing     |                                  |     Employee     |
| (Plans, Schedules|                                  | (Shop Floor Logs)|
+------------------+                                  +------------------+
         |                                                     |
         +--------------------------+--------------------------+
                                    |
                  +-----------------------------------+
                  |   Read-Only (Audit / Guest View)  |
                  +-----------------------------------+
```

1. **Admin (`admin`)**: Unrestricted access to all modules, REST endpoints, announcement broadcasting (`/announcements`), user account administration (`/user-access`), and Agent Settings (`/settings`).
2. **Manager (`manager`)**: Manages project schedules, shop production stations, capacity allocations, and milestone tracking. Restricted from global system configuration.
3. **Estimator (`estimator`)**: Complete access to RFQ logging, Estimation/Erection tabs, internal bid review calendars, and dollar dashboards. Read-only on production allocations.
4. **Detailing Partner (`detailing`)**: Manages Plan Creation and Plan Tracking (OFA/BFA dates, structural sequences, tonnages). Restricted from cost/estimation tabs.
5. **Shop Employee (`employee`)**: Access to Production Priority Schedule to view cutting/assembly lists and update fabrication task progress.
6. **Read-Only (`readonly`)**: Read-only permission across all dashboards, schedules, and reports. Blocked from write/edit actions.

---

## 3. Comprehensive Module Breakdown & Sub-modules (12+ Core Modules, 25+ Sub-modules/Tabs)

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
| | **Agent Settings** | `/settings` | AI agent persona instructions, tool enablement checkboxes (28 tools default enabled), model selection overrides. |

---

## 4. Complete Database Model & Field Specifications

### 1. User (`accounts.models.User`)
- `id` *(AutoField, Primary Key)*: Unique identifier.
- `username` *(CharField, Unique)*: Login username.
- `email` *(EmailField, Unique)*: User email address.
- `first_name`, `last_name` *(CharField)*: User full name.
- `role` *(CharField)*: Choices: `admin`, `manager`, `estimator`, `detailing`, `employee`, `readonly`. Default: `readonly`.
- `is_active` *(BooleanField)*: Active flag. Default: `True`.
- `date_joined` *(DateTimeField)*: Timestamp of registration.

### 2. Employee (`employees.models.Employee`)
- `id` *(AutoField, Primary Key)*: System key.
- `emp_id` *(CharField, Unique)*: Unique Employee ID (e.g. `EMP-001`). Auto-generated if omitted.
- `name` *(CharField)*: Full employee name.
- `department` *(CharField)*: Department (Fabrication, Detailing, Management, Quality Control).
- `designation` *(CharField)*: Role title (Welder, Fitter, Project Manager, Detailer).
- `email` *(EmailField, Unique)*: Primary email address.
- `phone` *(CharField, Optional)*: Contact phone number.
- `status` *(CharField)*: Choices: `Active`, `On Leave`, `Inactive`. Default: `Active`.
- `join_date` *(DateField, Optional)*: Date joined SFE.

### 3. Customer (`projects.models.Customer`)
- `id` *(AutoField, Primary Key)*: System key.
- `name` *(CharField, Unique)*: Customer company name.
- `code` *(CharField, Optional)*: Short customer code.
- `category` *(CharField)*: Choices: `Domestic`, `International`. Default: `Domestic`.
- `country` *(CharField)*: Country location. Default: `India`.
- `street`, `state`, `address` *(CharField/TextField)*: Address details.
- `designation` *(CharField, Optional)*: Contact person designation.
- `contact_person` *(CharField, Optional)*: Primary contact name.
- `contact_email` *(EmailField, Optional)*: Contact email address.
- `contact_phone` *(CharField, Optional)*: Contact phone number.

### 4. Detailer (`projects.models.Detailer`)
- `id` *(AutoField, Primary Key)*: Database key.
- `name` *(CharField)*: Detailer company name.
- `contact_person`, `email`, `phone` *(CharField/EmailField)*: Contact details.
- `rating` *(IntegerField)*: Vendor rating (1-5).
- `capacity_tons_per_month` *(DecimalField)*: Monthly detailing capacity (tons).
- `address` *(TextField)*: Office address.

### 5. Project (`projects.models.Project`)
- `id` *(AutoField, Primary Key)*: System key.
- `code` *(CharField, Unique)*: Project code (e.g. `PRJ-101`).
- `name` *(CharField)*: Project name.
- `customer` *(ForeignKey -> Customer)*: Customer reference.
- `project_manager` *(ForeignKey -> Employee)*: Assigned PM.
- `detailer` *(ForeignKey -> Detailer, Optional)*: Assigned detailer.
- `shop_name` *(CharField, Optional)*: Assigned shop location (e.g. Shop A).
- `total_ton` *(DecimalField)*: Structural steel tonnage.
- `erection_date` *(DateField, Optional)*: Target erection start date.
- `status` *(CharField)*: Choices: `Yet to Start`, `In Progress`, `Planning`, `Completed`. Default: `Yet to Start`.
- `priority` *(CharField)*: Choices: `Low`, `Medium`, `High`. Default: `Medium`.
- `created_at` *(DateTimeField)*: Timestamp.

### 6. RFQ (`rfq.models.RFQ`)
- `id` *(AutoField, Primary Key)*: System key.
- `quote_no` *(CharField, Unique)*: Quote identifier (`YY-MM-SEQ`).
- `budget_type` *(CharField)*: Choices: `Budget`, `Final`, `Rebid`.
- `quote_date` *(DateField)*: Quote date.
- `bid_ref` *(CharField, Optional)*: Customer reference number.
- `project_name` *(CharField)*: RFQ project name.
- `comments` *(TextField, Optional)*: Bidding comments.
- `bid_due_date` *(DateTimeField)*: Submission deadline.
- `location`, `distance` *(CharField/DecimalField)*: Site location and distance.
- `customer` *(ForeignKey -> Customer)*: Customer reference.
- `decision_to_bid` *(CharField)*: Choices: `Yes`, `No`, `NoBid`, `Bid`.
- `scope_of_work` *(CharField)*: Scope string (`Detailing`, `Fabrication`, `Erection`).
- `estimator` *(ForeignKey -> Employee)*: Primary estimator.
- `pricing_status` *(CharField)*: Outcome: `Won`, `Lost`, `Pending`, `Cancelled`.
- `awarded_amount`, `awarded_date` *(DecimalField/DateField)*: Award value and date.
- `sfe_job_no` *(CharField, Optional)*: Assigned SFE Job number.
- `contract_executed_date`, `fab_start_date` *(DateField, Optional)*: Schedule dates.

### 7. BidEnquiry (`rfq.models.BidEnquiry`)
- `id` *(AutoField, Primary Key)*: System key.
- `quote_no` *(CharField, Unique)*: Enquiry quote number.
- `bid_due_date` *(DateField)*: Bid due date.
- `location` *(CharField)*: Site location.
- `aisc_fab_req`, `aisc_erect_req` *(BooleanField)*: AISC certification flags.
- `customer` *(ForeignKey -> Customer)*: Customer reference.
- `scope_of_work` *(CharField)*: Scope string.
- `decision_to_bid` *(CharField)*: Decision status.
- `primary_estimator` *(ForeignKey -> Employee)*: Primary estimator.
- `sent_to_dept_dates`, `pricing_tonnage`, `hours_by_phase` *(JSONField)*: Department routing dates and phase breakdown.

### 8. Milestone (`milestones.models.Milestone`)
- `id` *(AutoField, Primary Key)*: Database key.
- `project` *(ForeignKey -> Project)*: Target project.
- `title` *(CharField)*: Milestone title (e.g. `Submit Anchor Bolt Plan`).
- `due_date` *(DateField)*: Planned deadline.
- `completion_date` *(DateField, Optional)*: Actual completion date.
- `status` *(CharField)*: Choices: `Pending`, `In Progress`, `Completed`, `Overdue`. Default: `Pending`.
- `created_at` *(DateTimeField)*: Creation timestamp.

### 9. Announcement (`dashboards.models.Announcement`)
- `id` *(AutoField, Primary Key)*: Database key.
- `title` *(CharField)*: Header title.
- `message` *(TextField)*: Message body.
- `priority` *(CharField)*: Choices: `Low`, `Normal`, `High`, `Critical`. Default: `Normal`.
- `created_by` *(ForeignKey -> User)*: Author user.
- `created_at` *(DateTimeField)*: Timestamp.
- `is_active` *(BooleanField)*: Display active flag. Default: `True`.

### 10. Machine (`production.models.Machine`)
- `id` *(AutoField, Primary Key)*: Database key.
- `machine_id` *(CharField, Unique)*: Machine ID code (e.g. `MAC-001`).
- `name` *(CharField)*: Machine name (e.g. `CNC Plasma Cutter`).
- `make` *(CharField)*: Manufacturer / make model.
- `capacity_per_day` *(DecimalField)*: Daily tonnage capacity.
- `shop` *(CharField)*: Assigned shop location (e.g. `Shop A`).

### 11. Manpower (`production.models.Manpower`)
- `id` *(AutoField, Primary Key)*: Database key.
- `employee_name` *(CharField)*: Worker name.
- `skill_level` *(CharField)*: Choices: `High`, `Medium`, `Low`.
- `process` *(CharField)*: Fabrication process (e.g. `Welding`, `Fitting`).
- `productivity_rate_per_day` *(DecimalField)*: Worker daily capacity.
- `rate_per_day` *(DecimalField)*: Daily wage rate ($).

### 12. Capacity (`production.models.Capacity`)
- `id` *(AutoField, Primary Key)*: Database key.
- `shop` *(CharField)*: Shop location name.
- `category` *(CharField)*: Choices: `Machine`, `Manual`.
- `process` *(CharField)*: Fabrication process name.
- `capacity_per_day` *(DecimalField)*: Daily capacity throughput.
- `capacity_per_month` *(DecimalField)*: Monthly capacity throughput.

### 13. ProcessSetting (`production.models.ProcessSetting`)
- `id` *(AutoField, Primary Key)*: Database key.
- `module_type` *(CharField)*: Choices: `PLATE`, `ANGLE`, `STRUCTURAL`.
- `process_name` *(CharField)*: Process name (e.g. `Ficep Drill`, `Plasma Cut`).
- `rate_per_hour` *(DecimalField)*: Hourly output rate.
- `description` *(TextField, Optional)*: Process notes.

### 14. AgentConfig (`chatbot.models.AgentConfig`)
- `id` *(IntegerField, Primary Key)*: Singleton row (`pk=1`).
- `persona_instructions` *(TextField)*: Additive system instructions.
- `enabled_tools` *(JSONField, Optional)*: List of enabled tool names. `NULL` or empty represents all 28 tools enabled by default.
- `model_override` *(CharField)*: Optional LLM model override string.
- `updated_at` *(DateTimeField)*: Last update timestamp.
- `updated_by` *(ForeignKey -> User)*: User who updated config.

---

## 5. Workflows & Mathematical Formulas

### Steel Budget Sizing Calculation
1. **Floor Steel Weight (lbs)** = $\text{Floor Area (SF)} \times \text{Floor Framing Weight (lbs/SF)}$
2. **Roof Steel Weight (lbs)** = $\text{Roof Area (SF)} \times \text{Roof Framing Weight (lbs/SF)}$
3. **Misc Steel Weight (lbs)** = $(\text{Floor Area} + \text{Roof Area}) \times \text{Misc Steel Percentage}$
4. **Base Framing Steel (lbs)** = $\text{Floor Steel} + \text{Roof Steel} + \text{Misc Steel}$
5. **Total Estimated Steel (lbs)** = $\text{Base Framing Steel} \times \left(1 + \text{Moment Premium \%} + \text{Facade Premium \%} + \text{Contingency \%}\right) + \text{Canopy Allowance (lbs)}$
6. **Total Estimated Steel Tonnage** = $\frac{\text{Total Estimated Steel (lbs)}}{2,000 \text{ lbs/ton}}$
7. **Total Budget ($)** = $\text{Total Estimated Steel Tonnage} \times \text{Budget Rate (\$/ton)}$

### Erection Takeoff Calculations
1. **Total Piece Manhours** = $\sum_{i} \left( \text{Quantity}_i \times \text{Manhours per Piece}_i \right)$
2. **Ironworker Crew Days** = $\frac{\text{Total Piece Manhours}}{\text{Crew Size} \times \text{Shift Hours per Day}}$
3. **Crane Days** = $\frac{\text{Total Steel Picks}}{\text{Picks per Day} \times \text{Crane Efficiency Factor}}$
4. **Truck Unloading Hours** = $\text{Total Truckloads} \times \text{Unload Hours per Truck}$
5. **Total Field Erection Hours** = $\text{Total Piece Manhours} + \text{Truck Unloading Hours}$

### Field Moment Connections (FMC) Welding Formulas
1. **Shop Beaded Weld Hours** = $(\text{Flange Width} \times \text{Flange Thickness} \times \text{Weld Factor})$ per AISC W-shape connection
2. **Field Work Multiplier** = $1.40 \times \text{Shop Weld Hours}$ *(accounts for out-of-position field welding, scaffolding, safety, and fit-up)*
3. **Total Field Welding Manhours** = $\text{Number of Connections} \times \text{Shop Weld Hours} \times 1.40$

### Hybrid Search RAG Retrieval Scoring
1. **BM25 Lexical Score**: Measures keyword match frequency and inverse document frequency across knowledge chunks.
2. **Vector Cosine Similarity**: Measures semantic similarity between query vector and chunk embedding vector ($S_{\text{cos}} = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$).
3. **Hybrid RAG Score**: $Score_{\text{hybrid}} = 0.5 \times \text{BM25Score}_{\text{norm}} + 0.5 \times S_{\text{cos}}$.

---

## 6. Agentic AI Architecture & Tool Capabilities

All **28 system tools** are defaultly enabled in both backend configuration (`AgentConfig.enabled_tools = None`) and frontend settings (`AgentSettings.jsx`).

### Complete List of 28 Enabled Agent Tools:
1. `create_employee`: Creates a new employee record in Employee Master.
2. `update_employee`: Updates an existing employee profile by `emp_id` (requires confirmation).
3. `delete_employee`: Deletes an employee record by `emp_id` (requires confirmation).
4. `get_employee_details`: Looks up employee records by name, department, or designation filter.
5. `list_projects`: Lists SFE projects with status, priority, tonnage, and manager details.
6. `list_customers`: Lists customer organizations filtered by category or country.
7. `create_project`: Creates a new project in Project Master.
8. `update_project`: Updates an existing project by project code or project name.
9. `delete_project`: Deletes a project record by code (requires confirmation).
10. `navigate_to_page`: Directs user UI view to any of 27 application pages.
11. `create_customer`: Creates a new customer profile in Customer Master.
12. `update_customer`: Updates an existing customer profile by customer ID or name.
13. `delete_customer`: Deletes a customer profile (requires confirmation).
14. `search_records`: Performs a multi-entity live database search across employees, customers, and projects.
15. `summarize_milestones`: Summarizes milestone health for a project or full workspace.
16. `create_rfq`: Creates a new RFQ entry in RFQ Master.
17. `list_rfqs`: Filters and lists RFQs from RFQ Master by project name or status.
18. `create_milestone`: Creates a new project deliverable in Milestone Master.
19. `update_milestone`: Updates a milestone's title, status, or completion date.
20. `create_announcement`: Broadcasts a system-wide announcement banner to user dashboards.
21. `list_announcements`: Lists active system dashboard announcements.
22. `list_production_priorities`: Filters production priority schedules by module type (`PLATE`, `ANGLE`, `STRUCTURAL`) or process type.
23. `create_machine`: Adds a new shop machine into Machine Master inventory.
24. `list_machines`: Lists shop machinery with daily tonnage capacities and shop assignments.
25. `create_manpower`: Adds workforce shift allocations in Workforce Master.
26. `list_manpower`: Lists workforce roster filtered by skill level or assigned process.
27. `create_capacity_config`: Configures shop capacity targets (`Machine` or `Manual`) per shop location and process.
28. `list_capacity_configs`: Lists shop capacity mapping configurations.
