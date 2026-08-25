# PROJECT_CONTEXT

Purpose:
Permanent project context for developers and AI assistants.

Last Updated:
2026-08-25

Source:
Current SFE-Milestone-Tracking codebase.

---

## Project Overview

* **Project Name**: Steel Fab Enterprises (SFE) Milestone Tracking & Estimation System
* **Purpose**: Enterprise-grade Resource Planning (ERP) and Estimation Portal designed specifically for commercial structural steel fabrication and erection workflows.
* **Main Users / Roles**:
  1. `admin` (System Administrator): Unrestricted system access, user management (`/user-access`), announcements (`/announcements`), and AI agent settings (`/agent-settings`).
  2. `manager` (Operations Manager): Manages project schedules, shop production stations, capacity allocations, machine inventory, and milestone tracking.
  3. `estimator` (Bid Estimator): Manages RFQ intake, estimation models, steel budget calculations, erection takeoffs, field moment connections, internal bid calendars, and dollar dashboards.
  4. `detailing` (Detailing Partner): Manages structural plan creation, drawing status tracking (OFA/BFA dates), and tonnage sequencing. Restricted from financial pricing tabs.
  5. `employee` (Shop Floor Staff): Accesses production priority schedules to view cutting, fitting, welding, and assembly tasks and update item progress.
  6. `readonly` (Audit / Guest View): Read-only view across all system dashboards and schedules without write or edit permissions.
* **Main Business Purpose**: Digitizes and automates the entire operational lifecycle of structural steel construction projects—from initial Request for Quotation (RFQ) intake, bid estimation, detailing schedule management, production priority routing, machine capacity planning, through to milestone deliverable tracking and AI-assisted query resolution.

---

## Technology Stack

* **Frontend Framework**: React 18 (Vite-powered Single Page Application)
* **Backend Framework**: Django 4.x / Django REST Framework (DRF)
* **Programming Languages**: JavaScript (ES6+ / React JSX), Python 3.x
* **Database**:
  * **Development**: SQLite (`backend/db.sqlite3`)
  * **Production**: PostgreSQL (`sfe_milestone` database engine configured via `settings.py`)
* **Authentication**: JWT (SimpleJWT) with `CookieJWTAuthentication` custom backend (supports `access_token` HTTP cookie with fallback to `Authorization: Bearer <token>` header).
* **State Management**: TanStack React Query (`@tanstack/react-query`) for server-side state caching and invalidation, React Context API and `useState` for local UI state.
* **UI Framework & Styling**: Tailwind CSS, Lucide icons (`lucide-react`), Toast notifications (`react-hot-toast`), custom CSS (`rfq-scope.css`, `index.css`).
* **Build Tools**: Vite, PostCSS, npm.
* **Deployment Platforms**: Vercel (Frontend SPA via `vercel.json`), Docker / Render (Backend via `Dockerfile` and `render.yaml`).
* **External & Offline Integrations**:
  * **Offline AI Chatbot**: Local Ollama LLM server / Groq Cloud API (`openai/gpt-oss-120b`) with optional fallback to Groq 20B or Gemini LLM.
  * **Local Embeddings**: FastEmbed ONNX engine running `BAAI/bge-small-en-v1.5` cached locally in `backend/.embedding_cache`.
  * **Email System**: Django SMTP Email Backend (`django.core.mail.backends.smtp.EmailBackend`) for password reset tokens and quote notification dispatches.

---

## Project Modules

### 1. Accounts & Authentication Module
* **Module Name**: Authentication & Security
* **Purpose**: User login, password recovery, JWT token generation, role verification, and user access control.
* **Main Frontend Location**: `frontend/src/features/auth/` (`Login.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`), `frontend/src/pages/UserAccess.jsx`
* **Main Backend Location**: `backend/accounts/` (`models.py`, `views.py`, `authentication.py`, `serializers.py`, `urls.py`)
* **Important APIs**: `/api/auth/login/`, `/api/auth/logout/`, `/api/auth/me/`, `/api/auth/forgot-password/`, `/api/auth/reset-password/`, `/api/auth/users/`
* **Important Database Models**: `accounts.User` (custom Django user model extending `AbstractUser`)

### 2. Request for Quotation (RFQ) & Bidding Module
* **Module Name**: RFQ Intake, Master & Combined Workflows
* **Purpose**: Log incoming RFQs, track bid due dates, assign estimators, manage combined estimator/detailer quote reply workflows, and dispatch quotes to customers.
* **Main Frontend Location**: `frontend/src/pages/DataEntry/` (`RFQLayout.jsx`, `DataEntryPage.jsx`, `QuoteWorkflowsModal.jsx`), `frontend/src/pages/Bids/` (`BidEnquiry.jsx`, `InternalBidSchedule.jsx`, `HolidayCalendar.jsx`)
* **Main Backend Location**: `backend/apps/rfq/` (`models.py`, `views.py`, `urls.py`), `backend/bids/` (`models.py`, `views.py`, `urls.py`)
* **Important APIs**: `/api/rfq/rfqs/`, `/api/rfq/bid-enquiries/`, `/api/rfq/quote-workflows/`, `/api/bids/schedules/`, `/api/bids/holidays/`
* **Important Database Models**: `apps.rfq.models.RFQ`, `apps.rfq.models.BidEnquiry`, `apps.rfq.models.QuoteWorkflow`, `bids.models.BidSchedule`, `bids.models.Holiday`

### 3. Dashboards & Bidding Analytics Module
* **Module Name**: Executive & Operational Analytics Dashboards
* **Purpose**: Provide real-time metrics on dollar bid values vs awarded contracts, bid performance win rates, job analytics, 5-year sales trends, and 12-month forward capacity projections.
* **Main Frontend Location**: `frontend/src/features/dashboard/Dashboard.jsx`, `frontend/src/pages/` (`BidPerformancePage.jsx`, `DollarDashboardPage.jsx`, `JobAnalyticsPage.jsx`, `SalesCyclePage.jsx`, `FutureCapacityPage.jsx`)
* **Main Backend Location**: `backend/apps/dashboards/`, `backend/dashboard/`
* **Important APIs**: `/api/dashboard/summary/`, `/api/rfq-dashboard/dollar-dashboard/`, `/api/rfq-dashboard/bid-performance/`, `/api/rfq-dashboard/job-analytics/`, `/api/rfq-dashboard/sales-cycle/`, `/api/rfq-dashboard/capacity/`
* **Important Database Models**: `dashboards.models.Announcement`

### 4. Estimation & Steel Budgeting Module
* **Module Name**: Estimation & Steel Budgeting
* **Purpose**: Calculate raw steel material costs, warehouse vs mill pricing, detailing, bolt, paint, labor hours, sublet costs, and early-stage square footage (SF) steel budgets.
* **Main Frontend Location**: `frontend/src/pages/` (`EstimationModel.jsx`, `SteelBudgetInput.jsx`, `SteelBudgetResult.jsx`, `EstimationSummary.jsx`)
* **Main Backend Location**: `backend/apps/estimate_data/`, `backend/apps/bid_summary/`, `backend/apps/breakdown/`, `backend/quote_helper.py`
* **Important APIs**: `/api/projects/<id>/estimate-data/`, `/api/projects/<id>/bid-summary/`, `/api/projects/<id>/breakdown/`
* **Important Database Models**: `projects.models.Project` (contains `steel_budget_worksheet` JSON data), estimate breakdown models in `apps.estimate_data`.

### 5. Erection Estimation Module
* **Module Name**: Erection & Structural Takeoff Module
* **Purpose**: Estimate field erection labor hours, ironworker crew-days, crane-day requirements, trucking/unloading manhours, and AISC W-shape flange moment connection shop and field welding hours.
* **Steps in Erection Estimation (Erection Takeoff Workflow)**:
  1. Open the Erection Takeoff tab (`/estimation-erection/erection-takeoff`).
  2. Select target project from top dropdown to load `estimation_data` rate configurations.
  3. Input structural piece quantities and member manhour rates.
  4. Compute ironworker crew days based on shift hours per day and crew size.
  5. Input steel picks, picks per day, and crane efficiency factor to compute required crane days.
  6. Input truckload delivery counts and unload hours per truck.
  7. Compute Field Moment Connections (FMC) welding manhours (applying 1.40x field multiplier).
  8. Review the 16-cost-code rollup on `/estimation-summary` and save/export final bid estimates.
* **Main Frontend Location**: `frontend/src/pages/EstimationErection/` (`EstimationErectionLayout.jsx`, `ErectionTakeoffTab.jsx`, `FieldMomentConnTab.jsx`, `EstimateDataTab.jsx`, `CoreTab.jsx`)
* **Main Backend Location**: `backend/apps/erection_takeoff/`, `backend/apps/field_moment_conn/`, `backend/apps/misc_metals/`
* **Important APIs**: `/api/projects/<id>/erection-takeoff/`, `/api/projects/<id>/fmc/`, `/api/projects/<id>/misc-metals/`, `/api/reference/`
* **Important Database Models**: Takeoff and connection models in `apps.erection_takeoff` and `apps.field_moment_conn`.

### 6. Master Directories & Contracts Module
* **Module Name**: Contracts & Master Directories
* **Purpose**: Maintain master directories for customers, detailing vendors, internal employees, project contracts, and SFE project catalogs.
* **Main Frontend Location**: `frontend/src/pages/` (`CustomerMaster.jsx`, `DetailerMaster.jsx`, `EmployeeMaster.jsx`, `ProjectMaster.jsx`)
* **Main Backend Location**: `backend/customers/` (or `projects/models.py`), `backend/employees/`, `backend/projects/`
* **Important APIs**: `/api/employees/`, `/api/projects/customers/`, `/api/projects/detailers/`, `/api/projects/`
* **Important Database Models**: `employees.models.Employee`, `projects.models.Customer`, `projects.models.Detailer`, `projects.models.Project`

### 7. Structural Tracking Module
* **Module Name**: Structural Plan Creation & Tracking
* **Purpose**: Build structural sequence schedules (planned vs actual OFA/BFA approval dates, ready-to-ship dates, ship dates, erection dates) and track drawing revisions.
* **Main Frontend Location**: `frontend/src/pages/Structural/` (`PlanCreation.jsx`, `PlanTracking.jsx`)
* **Main Backend Location**: `backend/projects/` (`models.py`, `views.py`)
* **Important APIs**: `/api/projects/<id>/structural-schedules/`, `/api/projects/structural-items/`
* **Important Database Models**: `projects.models.StructuralScheduleItem`

### 8. Production Priority & Capacity Configuration Module
* **Module Name**: Production Scheduling & Station Capacity
* **Purpose**: Shop floor run sequence for Plate, Angle, and Structural modules; station production rates ($/hr, tons/hr); machine inventory; shop workforce rosters; and monthly throughput limits.
* **Main Frontend Location**: `frontend/src/pages/Production/` (`ProductionLayout.jsx`, `ProductionPrioritySchedule.jsx`, `ProcessMaster.jsx`, `ProcessMasterSettings.jsx`), `frontend/src/pages/CapacityMapping.jsx`
* **Main Backend Location**: `backend/production/` (`models.py`, `views.py`, `urls.py`)
* **Important APIs**: `/api/production/priority-schedule/`, `/api/production/process-master/`, `/api/production/capacity-config/`, `/api/production/machines/`, `/api/production/workforce/`
* **Important Database Models**: `production.models.ProcessMaster`, `production.models.ProductionPrioritySchedule`, `production.models.CapacityConfig`, `production.models.MachineMaster`, `production.models.WorkforceMaster`

### 9. Milestones & Announcements Module
* **Module Name**: Milestone Tracking & System Broadcasts
* **Purpose**: Deliverable tracking with deadline statuses (Pending, In Progress, Completed, Overdue) and system-wide broadcast banners.
* **Main Frontend Location**: `frontend/src/features/dashboard/Dashboard.jsx` (Milestone grid), `frontend/src/pages/Announcements.jsx`
* **Main Backend Location**: `backend/milestones/`, `backend/apps/dashboards/`
* **Important APIs**: `/api/milestones/`, `/api/rfq-dashboard/announcements/`
* **Important Database Models**: `milestones.models.Milestone`, `dashboards.models.Announcement`

### 10. AI Chatbot & Agent Settings Module
* **Module Name**: RAG AI Assistant & Agent Configuration
* **Purpose**: Offline context-aware conversational AI assistant with 28 automated database function tools, BM25Okapi document indexing, local FastEmbed vector search, and admin persona prompt management.
* **Main Frontend Location**: `frontend/src/components/ChatbotWidget.jsx`, `frontend/src/pages/AgentSettings.jsx`, `frontend/src/pages/Settings.jsx`
* **Main Backend Location**: `backend/chatbot/` (`models.py`, `views.py`, `services.py`, `tools.py`, `tool_handlers.py`, `urls.py`)
* **Important APIs**: `/api/chatbot/query/`, `/api/chatbot/history/`, `/api/chatbot/upload/`, `/api/chatbot/settings/`
* **Important Database Models**: `chatbot.models.ChatMessage`, `chatbot.models.AgentSetting`

---

## Authentication

* **Login Flow**:
  1. Frontend posts credentials (`username`, `password`) to `/api/auth/login/`.
  2. Django DRF validates credentials using standard Django authentication framework.
  3. SimpleJWT generates an `access_token` (lifetime 1 day) and a `refresh_token` (lifetime 7 days).
  4. Response sets an HTTP-only `access_token` cookie and returns user profile data (including `role` and `allowed_modules`).
  5. Frontend stores user state and token reference for authenticated session persistence.
* **Authentication Mechanism**: DRF default authentication set to `accounts.authentication.CookieJWTAuthentication`, which first inspects the HTTP request `COOKIES.get('access_token')` and falls back to checking the standard `Authorization: Bearer <token>` header.
* **Token / Session Handling**:
  * `ACCESS_TOKEN_LIFETIME`: 1 Day (`timedelta(days=1)`)
  * `REFRESH_TOKEN_LIFETIME`: 7 Days (`timedelta(days=7)`)
  * `ROTATE_REFRESH_TOKENS`: Enabled (`True`)
* **User Identity**: Enforced via `accounts.User` schema which extends `AbstractUser`. Includes custom fields `role`, `department`, `initials`, `allowed_modules` JSON list, and project edit soft-lock identifiers (`editing_project_id`, `editing_since`).
* **Password Handling**: Django's built-in `pbkdf2_sha256` password hashing algorithm with custom password strength validators (`UserAttributeSimilarityValidator`, `MinimumLengthValidator`, `CommonPasswordValidator`, `NumericPasswordValidator`).
* **Multi-Factor Authentication (MFA)**:
  * Schema fields `otp` (6-digit string) and `otp_expiry` exist on `accounts.User`.
  * Mandatory MFA enforcement flow across API endpoints is **Not confirmed from the current codebase.**

---

## Authorization

* **Roles**:
  * `admin`: Unrestricted full system access across all views, REST endpoints, user administration, announcements, and AI agent configuration.
  * `manager`: Operational management over projects, schedules, shop production, capacity configuration, and milestone deliverables. Restricted from system administration settings.
  * `estimator`: Full read/write access to RFQ logging, bid enquiries, estimation models, erection takeoffs, and dollar dashboards. Read-only on production shop allocations.
  * `detailing`: Access to structural plan creation and drawing status tracking. Read-only on pricing and estimation financial fields.
  * `employee`: Shop floor view for production priority schedules; permitted to update fabrication cutting and assembly progress.
  * `readonly`: Audit guest role with read-only privileges across all dashboards and schedules. Prevented from performing create, edit, or delete operations.
* **Permissions & Access-Control Logic**:
  * **Backend**: DRF views apply `IsAuthenticated` by default. Specific endpoints enforce custom role permissions (`IsAdmin`, `IsManager`, `IsEstimator`, `IsDetailing`, `CanEdit`) by evaluating property helpers on `request.user` (`user.is_admin`, `user.is_manager`, `user.can_edit`).
  * **Frontend**: `ProtectedRoute` component inspects the authenticated user's `role` and checks if the requested route path matches any string in their `allowed_modules` array or if `adminOnly={true}` is specified.
* **Admin / User Restrictions**:
  * Route paths `/user-access` and `/agent-settings` require `adminOnly={true}`.
  * Write operations (POST, PUT, PATCH, DELETE) reject users with role `readonly`.

---

## Multi-Tenant Architecture

* **Tenant Identification**: Not confirmed from the current codebase.
* **Tenant-Related Fields**: Not confirmed from the current codebase.
* **Tenant Isolation**: Not confirmed from the current codebase.
* **Frontend Tenant Handling**: Not confirmed from the current codebase.
* **Backend Tenant Validation**: Not confirmed from the current codebase.
* **Database Isolation Strategy**: Not confirmed from the current codebase.

*Note: The current SFE application operates as a single-tenant enterprise system. All users belong to the same organizational database schema without multi-tenant partitioning.*

---

## Important Business Rules

1. **Quote Number Formatting**:
   * Quote numbers follow the strictly formatted sequence `YY-MM-SEQ` (e.g. `26-05-001`).
2. **AISC Moment Connection Field Factor**:
   * Structural steel flange moment connection calculations apply a fixed `1.40x` field hour multiplier relative to shop welding hours for field installation complexity (`apps.field_moment_conn`).
3. **Project Soft-Locking**:
   * When a user opens a project for editing, the system records `editing_project_id` and `editing_since` on the `User` model to prevent concurrent overwrites by multiple users.
4. **Estimation 16-Cost-Code Rollup**:
   * Detailed estimates aggregate costs across 16 standardized cost codes encompassing Material, Detailing, Labor, Erection, Freight, Sublet, and Overhead to form the Schedule of Values (`apps.bid_summary`).
5. **Combined Quote Dispatch Workflow**:
   * Incoming RFQs track department routing dates (`sent_to_dept_dates`) and generate a `QuoteWorkflow` record. Quotations are dispatched to customers once both Estimator (`estimator_replied`) and Detailer (`detailer_replied`) responses are marked as complete.
6. **Shop Machine & Workforce Capacity Limits**:
   * Production priority scheduling evaluates daily/monthly machine tonnage capacity (`MachineMaster`) and manpower productivity rates (`WorkforceMaster`) to prevent over-allocation of fabrication shop capacity (`production.models.CapacityConfig`).

---

## External Integrations

* **Local Ollama LLM Engine**:
  * **Purpose**: Serves offline LLM inference for the Chatbot assistant.
  * **Integration Location**: `backend/chatbot/services.py`, configured via `OLLAMA_API_URL` (default: `http://localhost:11434`) and `OLLAMA_MODEL` (default: `openai/gpt-oss-120b`).
* **Groq Cloud / Gemini Fallback LLM**:
  * **Purpose**: Provides secondary cloud LLM fallback when local Ollama service is unreachable or rate-limited.
  * **Integration Location**: `backend/chatbot/services.py`, configured via `LLM_API_KEY`, `FALLBACK_LLM_API_URL`, and `FALLBACK_LLM_MODEL`.
* **FastEmbed Local Embedding Engine**:
  * **Purpose**: Generates vector embeddings locally using ONNX runtime without PyTorch for RAG document chunk retrieval and tool selection.
  * **Integration Location**: `backend/chatbot/services.py`, model `BAAI/bge-small-en-v1.5` cached in `backend/.embedding_cache`.
* **SMTP Email Server**:
  * **Purpose**: Transmits password reset tokens and quote workflow notifications.
  * **Integration Location**: `backend/sfe_project/settings.py` (`EMAIL_HOST`, `EMAIL_PORT`, `DEFAULT_FROM_EMAIL`). Fallbacks to console backend if `EMAIL_HOST` is omitted.
