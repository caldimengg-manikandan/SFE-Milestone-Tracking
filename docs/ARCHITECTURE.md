# ARCHITECTURE

Purpose:
Technical architecture documentation for developers and AI assistants.

Last Updated:
2026-08-25

Source:
Current SFE-Milestone-Tracking codebase.

---

## High-Level Architecture

The Steel Fab Enterprises (SFE) system follows a decoupled, client-server architecture:

```
+-----------------------------------------------------------------------+
|                       React 18 SPA (Vite)                             |
|    - Single Page Application with React Router v6 (Basename: /SFE)    |
|    - TanStack React Query (State Caching & API Sync)                  |
|    - Tailwind CSS UI Components & Custom Modules                      |
+-----------------------------------------------------------------------+
                                   |
                                   | HTTPS / REST APIs
                                   | JSON + JWT Authentication
                                   v
+-----------------------------------------------------------------------+
|                   Django 4.x / DRF API Backend                        |
|    - RequestLoggingMiddleware (Logs to request_log.txt)               |
|    - CookieJWTAuthentication (Cookie & Bearer Header)                 |
|    - App ViewSets / APIViews (RFQ, Bids, Projects, Production, etc.)  |
+-----------------------------------------------------------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
+-----------------------------------+             +-----------------------------------+
|         Relational Storage        |             |       Offline AI / RAG Engine     |
| - SQLite (db.sqlite3 for Dev)     |             | - Groq (openai/gpt-oss-120b) / Ollama    |
| - PostgreSQL (Prod Database)      |             | - FastEmbed (bge-small-en-v1.5)   |
| - Django ORM Models               |             | - 28 DRF Function Tools           |
+-----------------------------------+             +-----------------------------------+
```

---

## Frontend Architecture

### Main Source Folders
* `frontend/src/api/`: Axios client configuration (`client.js`) with request/response interceptors for JWT header attachment and cookie handling.
* `frontend/src/assets/`: Styling assets (`styles/rfq-scope.css`, static assets).
* `frontend/src/components/`: Reusable layout and UI components:
  * `Layout/`: Main shell (`Layout.jsx`), top header bar (`Header.jsx`), sidebar navigation (`Sidebar.jsx`), protected route wrapper (`ProtectedRoute.jsx`).
  * `ChatbotWidget.jsx`: Floating AI Assistant modal interface.
* `frontend/src/features/`: Feature-specific logic (e.g. `auth/Login.jsx`, `auth/ForgotPassword.jsx`, `dashboard/Dashboard.jsx`).
* `frontend/src/pages/`: Module page components:
  * `DataEntry/`: RFQ intake, Data Entry table, Quote Workflows modal (`QuoteWorkflowsModal.jsx`).
  * `Bids/`: Bid Enquiry, Internal Bid Schedule calendar, Holiday Calendar.
  * `Production/`: Production Priority Schedule, Process Master, Process Settings, Production Layout.
  * `Structural/`: Plan Creation, Plan Tracking.
  * `EstimationErection/`: Erection Takeoff, Field Moment Connections, Estimate Data, Contacts.
  * `BidPerformance/`, `DollarDashboard/`, `JobAnalytics/`, `SalesCycle/`, `FutureCapacity/`: RFQ Dashboard integrations.
  * `EmployeeMaster.jsx`, `CustomerMaster.jsx`, `DetailerMaster.jsx`, `ProjectMaster.jsx`, `CapacityMapping.jsx`, `UserAccess.jsx`, `AgentSettings.jsx`, `Announcements.jsx`, `Settings.jsx`.
* `frontend/src/hooks/`: Custom React hooks (e.g. `useAuth.js`).
* `frontend/src/services/`: API integration services (e.g. `chatbot.js`).
* `frontend/src/store/`: React Context / local state providers.
* `frontend/src/utils/`: Helper utilities for formatting currencies, dates, and numbers.

### Routing & Navigation Structure
* Router: `BrowserRouter` configured with basename `/SFE` in `App.jsx`.
* Route Protection: `ProtectedRoute` checks user authentication, role restrictions (`adminOnly`), and validates page access against `allowed_modules`.

---

## Backend Architecture

### Server Entry Point
* `backend/sfe_project/wsgi.application`: WSGI web server application entry point.
* `backend/sfe_project/asgi.application`: ASGI asynchronous server entry point.
* `backend/manage.py`: Django administrative CLI entry point.

### Application Layout & Modular Structure
* Root Settings & URL Routing: `sfe_project/settings.py`, `sfe_project/urls.py`
* Core Domain Apps (Root):
  * `accounts`: User identity, authentication views, JWT token cookie handler, role model.
  * `employees`: Internal SFE employee directory models and REST endpoints.
  * `projects`: Customer master, detailer master, project catalog, structural schedule items.
  * `milestones`: Deliverable milestone models and completion tracking endpoints.
  * `production`: Priority schedules, machine inventory, workforce rosters, capacity mapping, process masters.
  * `dashboard` / `apps.dashboards`: Operational statistics and system announcement banners.
  * `bids`: Internal bid schedule calendar and holiday management.
  * `chatbot`: RAG AI assistant service, tool schema definitions, tool handlers, chat history.
* Sub-Domain Apps (`apps/` Directory):
  * `apps.rfq`: Request for Quotation intake, bid enquiries, quote workflows.
  * `apps.dashboards`: Analytics endpoints (Dollar Dashboard, Bid Performance, Sales Cycle, Future Capacity).
  * `apps.core`: Erection estimation core authentication routes.
  * `apps.bid_summary`, `apps.breakdown`, `apps.erection_takeoff`, `apps.estimate_data`, `apps.field_moment_conn`, `apps.misc_metals`: Specialized steel estimation modules.

### Middleware Pipeline
1. `corsheaders.middleware.CorsMiddleware`: Cross-Origin Resource Sharing control.
2. `django.middleware.security.SecurityMiddleware`: Security headers and HTTPS enforcement.
3. `django.contrib.sessions.middleware.SessionMiddleware`: HTTP session management.
4. `django.middleware.common.CommonMiddleware`: URL rewriting and standard handling.
5. `django.middleware.csrf.CsrfViewMiddleware`: CSRF protection.
6. `django.contrib.auth.middleware.AuthenticationMiddleware`: Attaches Django user to request context.
7. `django.contrib.messages.middleware.MessageMiddleware`: Cookie/session message framework.
8. `django.middleware.clickjacking.XFrameOptionsMiddleware`: X-Frame Options header protection.
9. `sfe_project.middleware.RequestLoggingMiddleware`: Custom middleware appending request method, path, IP, and status to `request_log.txt`.

---

## API Architecture

### Base Path
All system APIs are mounted under the `/api/` root path:

* `/api/auth/`: Login, logout, current user profile, password reset, user management.
* `/api/employees/`: Employee CRUD operations.
* `/api/projects/`: Customer, detailer, project, and structural schedule endpoints.
* `/api/milestones/`: Milestone CRUD and completion state toggles.
* `/api/production/`: Shop floor priority schedules, process rates, machine & workforce masters.
* `/api/dashboard/`: Executive summary statistics.
* `/api/bids/`: Internal bid schedule calendar and holiday dates.
* `/api/rfq/`: RFQs, bid enquiries, quote workflows sync and dispatch.
* `/api/rfq-dashboard/`: Analytics metrics (dollar dashboard, bid performance, sales cycle, capacity).
* `/api/chatbot/`: Query processing, chat history, document uploads, agent settings.
* `/api/projects/<id>/erection-takeoff/`, `/api/projects/<id>/fmc/`, `/api/projects/<id>/estimate-data/`: Estimation takeoff sub-resources.

### Authentication & Authorization Enforcement
* All API endpoints require valid JWT authentication via `CookieJWTAuthentication` and DRF `IsAuthenticated` permission unless explicitly public (`/login`, `/forgot-password`, `/reset-password`).
* Role permissions evaluate helper properties on `request.user` (`is_admin`, `is_manager`, `can_edit`).

### Error Response Patterns
* Standard API errors return consistent JSON responses:
  * Authentication failure: `{"detail": "Authentication credentials were not provided."}` (HTTP 401)
  * Permission denied: `{"detail": "You do not have permission to perform this action."}` (HTTP 403)
  * Field validation errors: `{"<field_name>": ["<error description>"]}` (HTTP 400)
  * Object not found: `{"detail": "Not found."}` (HTTP 404)

---

## Database Architecture

### Technology & Configuration
* **Development Engine**: SQLite 3 (`backend/db.sqlite3`)
* **Production Engine**: PostgreSQL (configured via `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` environment variables when `USE_SQLITE=False`).

### Primary Database Models & Tables

This section previously hand-listed each model's fields/PKs and had drifted from the real schema in several rows (e.g. claiming `Project.customer`/`project_manager` were ForeignKeys when they're plain `CharField`s, and naming production models `ProcessMaster`/`MachineMaster`/`WorkforceMaster`/`CapacityConfig` that don't exist under those names - the real models are `Machine`, `Manpower`, `Capacity`, `ProductionSchedule`, `ProductionPriority`). For the exact, current field-by-field schema of every model, run `python manage.py generate_app_knowledge` in `backend/` and inspect the resulting "SFE Code-Derived Knowledge (auto-generated)" `KnowledgeDocument` (generated from live `Model._meta.get_fields()` introspection via `chatbot/knowledge_extractors.py`), or read the model source directly - don't hand-transcribe it here again.

### Tenant Fields
* None. The current system operates as a single-tenant enterprise database without tenant isolation columns or multi-tenant keys.

---

## Workflow Architecture

### Quote Workflows & Combined Dispatch
While a visual node-based drag-and-drop Workflow Studio is **Not confirmed from the current codebase**, the RFQ module implements a specialized **Quote Workflow & Combined Dispatch** lifecycle:

```
[ Incoming RFQ Entry ] 
         │
         ▼
[ Create Bid Enquiry & Quote Workflow Record ]
         │
         ├─────────────────────────────────────────┐
         ▼                                         ▼
[ Department Estimator Review ]          [ Detailing Vendor Review ]
   (Sets estimator_replied=True)            (Sets detailer_replied=True)
         │                                         │
         └─────────────────────────────────────────┘
         │
         ▼
[ Quote Workflow Status: "Ready" ]
         │
         ▼
[ Synchronize & Dispatch Combined Quote to Customer ]
         │
         ▼
[ Status: "Completed" ]
```

---

## Module Relationships

```
                        +----------------------+
                        |   Customer Master    |
                        +----------------------+
                                   │
                                   ▼
+---------------------+     +----------------------+     +----------------------+
|   Employee Master   | ──► |  RFQ Intake Entry    | ◄── |   Detailer Master    |
+---------------------+     +----------------------+     +----------------------+
           │                           │                            │
           │                           ▼                            │
           │                +----------------------+                │
           │                |   Bid Enquiry &      |                │
           │                |   Quote Workflow     |                │
           │                +----------------------+                │
           │                           │                            │
           │                           ▼                            │
           │                +----------------------+                │
           │                | Estimation & Steel   |                │
           │                | Budget / Takeoffs    |                │
           │                +----------------------+                │
           │                           │                            │
           ▼                           ▼                            ▼
+-------------------------------------------------------------------------------+
|                               Project Master                                  |
|   - Foreign Keys: Customer, Project Manager (Employee), Detailer               |
+-------------------------------------------------------------------------------+
           │                                   │
           ▼                                   ▼
+-----------------------------------+ +-----------------------------------+
|    Structural Schedule Tracking   | |        Milestone Tracking         |
| - OFA/BFA Drawing Dates           | | - Target Deliverable Dates        |
| - Ship & Erection Sequence        | | - Milestone Completion Status     |
+-----------------------------------+ +-----------------------------------+
           │
           ▼
+-------------------------------------------------------------------------------+
|                       Production Priority & Capacity Mapping                  |
| - Machine Master Tonnage Limits & Workforce Master Productivity               |
| - Station Scheduling (Cutting, Assembly, Welding, Painting)                   |
+-------------------------------------------------------------------------------+
```
