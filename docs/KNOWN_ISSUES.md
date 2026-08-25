# KNOWN_ISSUES

Purpose:
Catalog of known issues, technical debt, and architectural concerns in the current codebase.

Last Updated:
2026-08-25

Source:
Current SFE-Milestone-Tracking codebase.

---

## Critical

No critical system-breaking bugs or crash loops identified in the current codebase.

---

## High Priority

### ISSUE-001
Title: Default Insecure Django Secret Key Fallback
Module: Backend Configuration (`sfe_project/settings.py`)
Description: The Django `SECRET_KEY` configuration falls back to a hardcoded insecure key (`django-insecure-change-me`) if the `SECRET_KEY` environment variable is missing or empty.
Expected: The application should require a cryptographically secure `SECRET_KEY` environment variable in production and fail startup if unconfigured.
Current Behavior: Defaults to a hardcoded insecure fallback string.
Evidence: `backend/sfe_project/settings.py` line 10: `SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-me')`.
Status: Open

---

## Medium Priority

### ISSUE-002
Title: Synchronous File IO in Request Logging Middleware
Module: Backend Middleware (`sfe_project/middleware.py`)
Description: `RequestLoggingMiddleware` opens `request_log.txt` in append mode and performs synchronous disk IO on every incoming HTTP request.
Expected: HTTP request logging should use standard Django logging handlers or asynchronous logging to avoid blocking server worker threads.
Current Behavior: Synchronous disk IO executed per API request, causing potential request latency under higher concurrency.
Evidence: `backend/sfe_project/middleware.py` line 20-30 opens `BASE_DIR / 'request_log.txt'` on every request.
Status: Open

### ISSUE-003
Title: Lack of Comprehensive Automated Unit Test Suite
Module: Testing Infrastructure
Description: Test coverage is low across Django DRF viewsets, business logic modules, and frontend React components.
Expected: Continuous Integration (CI) test suite executing automated unit and integration tests.
Current Behavior: Verification relies primarily on manual testing and basic inline checks.
Evidence: Absence of comprehensive test files in `backend/` apps and `frontend/src/`.
Status: Open

---

## Low Priority

### ISSUE-004
Title: Inconsistent Backend Application Directory Hierarchy
Module: Backend Architecture (`backend/` vs `backend/apps/`)
Description: Django apps are split across the root `backend/` directory (`accounts`, `employees`, `projects`, `milestones`, `production`, `bids`, `chatbot`) and the `backend/apps/` sub-directory (`apps.rfq`, `apps.dashboards`, `apps.core`, `apps.bid_summary`, `apps.breakdown`, `apps.erection_takeoff`, `apps.estimate_data`, `apps.field_moment_conn`, `apps.misc_metals`).
Expected: A unified Django application layout (either all apps under `apps/` or all at root).
Current Behavior: Split app layout requiring dual module import conventions in `INSTALLED_APPS` and `urls.py`.
Evidence: `INSTALLED_APPS` configuration in `backend/sfe_project/settings.py`.
Status: Open (Technical Debt)

---

## API Issues

### ISSUE-005
Title: Large Default Page Size in REST Framework Configuration
Module: Backend API (`sfe_project/settings.py`)
Description: `REST_FRAMEWORK` default pagination page size is set to `200` records per page.
Expected: Standard pagination (e.g. 20–50 items per page) to optimize query performance and payload size.
Current Behavior: Single requests retrieve up to 200 model instances, increasing payload payload transmission overhead.
Evidence: `backend/sfe_project/settings.py` line 146: `'PAGE_SIZE': 200`.
Status: Open

---

## Frontend Issues

### ISSUE-006
Title: Hardcoded API Basename in React Router
Module: Frontend Routing (`frontend/src/App.jsx`)
Description: The React Router `BrowserRouter` relies on a fixed basename `/SFE`.
Expected: Environment-configurable basename to allow flexible deployment path hosting.
Current Behavior: Router hardcodes `basename="/SFE"`.
Evidence: `frontend/src/App.jsx` line 65: `<Router basename="/SFE">`.
Status: Open

---

## Backend Issues

### ISSUE-007
Title: SQLite Development vs PostgreSQL Production Settings Branching
Module: Backend Configuration (`sfe_project/settings.py`)
Description: Database backend switches between SQLite and PostgreSQL based on `USE_SQLITE` boolean environment flag.
Expected: Consistent database engine behavior between development and production (e.g. Dockerized PostgreSQL for dev).
Current Behavior: SQLite engine used locally while PostgreSQL used in production environments, presenting potential SQL dialect or JSON field query discrepancies.
Evidence: `backend/sfe_project/settings.py` lines 80-99.
Status: Open

---

## Database Issues

### ISSUE-008
Title: Embedded Structural Schedule Items Data Dump Reliance
Module: Database Management (`backend/datadump.json`)
Description: Initial database fixture `datadump.json` contains limited sample instances for testing.
Expected: Automated database seed scripts for local development setup.
Current Behavior: Manual reliance on `datadump.json` or `backup_db.json`.
Evidence: `backend/datadump.json`.
Status: Open

---

## Security Concerns

### ISSUE-009
Title: Access Token Cookie Not Enforcing Strict SameSite Attributes
Module: Authentication (`accounts/views.py`)
Description: JWT token cookies set during login should strictly enforce `HttpOnly`, `Secure`, and `SameSite='Lax'` or `'Strict'`.
Expected: Cookie attributes configured to prevent Cross-Site Request Forgery (CSRF) and script reading.
Current Behavior: `CookieJWTAuthentication` reads raw token from `access_token` cookie; cookie attributes need audit across production web servers.
Evidence: `backend/accounts/authentication.py`.
Status: Open

---

## Performance Concerns

### ISSUE-010
Title: High Local LLM Inference Latency During Peak Requests
Module: Chatbot Module (`chatbot/services.py`)
Description: When using local Ollama LLM (`llama-3.3-70b-versatile`), complex multi-tool calls or heavy RAG context queries may experience response latency depending on local CPU/GPU hardware.
Expected: Low-latency streaming response or asynchronous task processing.
Current Behavior: Synchronous request wait until LLM completion, with cloud fallback fallback mechanism triggered on timeout.
Evidence: `backend/chatbot/services.py`.
Status: Open

---

## Technical Debt

### ISSUE-011
Title: Legacy Navigation Comment References
Module: Documentation & Navigation
Description: Older documentation files reference legacy navigation paths and deprecated route names that have been integrated into unified layouts (`RFQLayout.jsx`, `EstimationErectionLayout.jsx`).
Expected: Unified documentation aligned with current React routes in `App.jsx`.
Current Behavior: Minor discrepancies between legacy documentation files and live React Router paths.
Evidence: Comparison of `sfe_application_workflow.md` with `frontend/src/App.jsx`.
Status: Open
