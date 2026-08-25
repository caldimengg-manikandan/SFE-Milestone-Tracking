# CURRENT_STATUS

Purpose:
Concise summary of current project status, completed modules, active work, and deployment state.

Last Updated:
2026-08-25

Source:
Current SFE-Milestone-Tracking codebase.

---

## Overall Status

The SFE Milestone Tracking & Estimation System is operational in development mode, featuring a complete single-page application frontend integrated with a Django REST Framework backend, SQLite/PostgreSQL storage support, and an offline RAG AI chatbot with a tool catalog generated from the live API (run `manage.py generate_app_knowledge` or check `chatbot/tool_catalog.py` for the current exact count, not a hand-typed number here). Continuous feature enhancements are focused on RFQ workflow dispatch, analytics dashboards, and shop floor capacity scheduling.

---

## Completed Modules

1. **Authentication & User Management**: JWT token authentication (`CookieJWTAuthentication`), role assignment (`admin`, `manager`, `estimator`, `detailing`, `employee`, `readonly`), user access management (`/user-access`), and module permission guards.
2. **RFQ & Bidding Management**: RFQ intake entry (`/rfq/data-entry`), quote number generation (`YY-MM-SEQ`), Bid Enquiry routing, combined Estimator/Detailer Quote Workflows (`QuoteWorkflowsModal.jsx`), Internal Bid Schedule calendar, and Holiday Calendar manager.
3. **Executive & Operational Dashboards**: Executive Overview Dashboard, Operations Portal (VPS), Dollar Dashboard, Bid Performance matrix, Job Analytics, Sales Cycle analysis, and 12-month Future Capacity forward projection.
4. **Estimation & Budgeting Modules**: Estimation Model workspace, Steel Budget input/result calculators, 16-cost-code Estimation Summary rollup, Erection Takeoff tab, Field Moment Connections tab (1.40x field factor), and Estimate Data manager.
5. **Master Administration Directories**: Customer Master, Detailer Vendor Directory, Internal Employee Master, and SFE Project Master catalog.
6. **Structural Schedule Tracking**: Plan Creation and Plan Tracking for structural drawing sequences, OFA/BFA approval dates, RTS dates, shipping dates, and erection target dates.
7. **Production Priority & Capacity Configuration**: Shop floor production priority schedules (Plate, Angle, Structural), process rate configurations ($/hr, tons/hr), machine inventory management, workforce roster management, and capacity mapping limits.
8. **Milestone Deliverable Management**: Project milestone tracking with target dates, completion dates, and status indicators (Pending, In Progress, Completed, Overdue).
9. **System Broadcast Announcements**: Announcement banners with priority levels (Low, Normal, High, Critical) managed by administrators.
10. **Offline RAG AI Chatbot Assistant**: Conversational assistant with a generated DRF-database tool catalog (hand-written tools in `chatbot/tool_handlers.py` plus auto-generated CRUD tools in `chatbot/tool_registry.py` - see `chatbot/tool_catalog.py` for the live count), local FastEmbed vector retrieval (`BAAI/bge-small-en-v1.5`), dual Ollama/Groq LLM fallback, and admin agent settings manager.

---

## Modules Under Development

* **RFQ Combined Dispatch Sync**: Refinements to automated synchronization of estimator and detailer reply workflows for combined customer email dispatch.
* **Shop Capacity Load Projections**: Optimization of 12-month forward capacity calculations linking committed machine tonnage against workforce manhours.

---

## Current Active Module

RFQ & Bidding Module (Data Entry & Combined Quote Workflows).

---

## Current Active Task

Current active task: Not confirmed from the current codebase.

---

## Recently Completed

* Integration of RFQ Scope and Data Entry sub-modules into `apps.rfq`.
* Implementation of the initial hand-written DRF function-calling tools for the Chatbot assistant (`chatbot/tools.py` and `chatbot/tool_handlers.py`); later extended with an auto-generated CRUD tool catalog (`chatbot/tool_registry.py`) covering additional resources - see `chatbot/tool_catalog.py` for the current live count, not a fixed number here.
* Integration of local FastEmbed ONNX embedding cache (`.embedding_cache`) and cloud fallback LLM capabilities (Groq/Gemini).
* Soft-locking concurrency protection on `accounts.User` schema (`editing_project_id`, `editing_since`).

---

## Pending Work

* Production PostgreSQL migration and production database indexing optimization.
* Development of a comprehensive automated unit and end-to-end integration test suite.
* Automated email trigger notifications for overdue milestone deliverables.

---

## Known Technical Debt

1. **Synchronous File IO Request Logging**: `RequestLoggingMiddleware` writes HTTP request metrics directly to a synchronous local file (`request_log.txt`) on every request.
2. **Dual Backend Application Directory Structure**: Django apps are split across the root directory (`accounts`, `projects`, `employees`, etc.) and the `apps/` subdirectory (`apps/rfq`, `apps/dashboards`, `apps/core`, etc.).
3. **Hardcoded Fallback Secret Key**: `SECRET_KEY` in `sfe_project/settings.py` defaults to `'django-insecure-change-me'` when `SECRET_KEY` environment variable is not defined.
4. **Single-Tenant Architectural Scope**: Database models and API routes do not include multi-tenant field separation or multi-tenant database partitioning.

---

## Testing Status

* **Manual Verification**: Manual testing performed across key frontend screens and REST API endpoints.
* **Automated Unit Tests**: Automated unit test coverage is currently minimal across backend Django test cases and frontend component tests.

---

## Deployment Status

* **Frontend**: Configured for Vercel deployment via `frontend/vercel.json` and static asset bundling via Vite (`npm run build`).
* **Backend**: Configured for containerized deployment via `backend/Dockerfile` and Render PaaS deployment via `backend/render.yaml`.
* **Local Development**: Currently running locally via Vite dev server (`npm run dev` on port 5173/3000) and Django development server (`python manage.py runserver` on port 8000).
