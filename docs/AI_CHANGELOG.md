# AI Changelog

Purpose:
Chronological record of AI-assisted and developer system changes, updates, and documentation entries.

Last Updated:
2026-08-25

Source:
Current SFE-Milestone-Tracking codebase.

---

## Initial Documentation

Date: 2026-08-25

* **Existing Major Modules Identified**:
  * Authentication & User Access (`accounts`)
  * RFQ Intake, Bid Enquiry & Quote Workflows (`apps.rfq`, `bids`)
  * Dashboards & Bidding Analytics (`apps.dashboards`, `dashboard`)
  * Estimation, Steel Budgeting & Erection Takeoff (`apps.estimate_data`, `apps.bid_summary`, `apps.erection_takeoff`, `apps.field_moment_conn`)
  * Structural Plan Creation & Tracking (`projects`)
  * Production Priority Scheduling, Process Rates & Capacity Configuration (`production`)
  * Master Directories (Customer, Detailer, Employee, Project)
  * Milestone Deliverable Tracking (`milestones`)
  * System Broadcast Announcements (`apps.dashboards`)
  * Offline RAG AI Chatbot Assistant (`chatbot`)

* **Major Architecture Identified**:
  * Decoupled architecture with React 18 (Vite SPA) frontend routing via `BrowserRouter` (basename `/SFE`).
  * Backend built with Django 4.x & Django REST Framework (DRF), custom `CookieJWTAuthentication`, and `RequestLoggingMiddleware`.
  * Multi-database configuration support: SQLite for local development (`db.sqlite3`) and PostgreSQL for production environments (`sfe_milestone`).
  * Offline RAG Chatbot leveraging local Ollama (`llama-3.3-70b-versatile`), local FastEmbed ONNX embedding (`BAAI/bge-small-en-v1.5`), Groq/Gemini cloud fallback, and 28 DRF database tools.

* **Major Existing Integrations**:
  * Local Ollama LLM server (`http://localhost:11434`).
  * Groq Cloud / Gemini API fallback integration.
  * Local ONNX embedding cache (`backend/.embedding_cache`).
  * Django SMTP Mailer Backend (`django.core.mail`).

* **Major Known Issues Identified**:
  * Hardcoded fallback secret key in `sfe_project/settings.py`.
  * Synchronous file IO request logging in `RequestLoggingMiddleware`.
  * Split Django application directory layout (`backend/` vs `backend/apps/`).
  * Low automated unit test coverage across API endpoints and frontend components.

* **Current Development State**:
  * System is fully functional in development mode with active work focused on RFQ combined quote reply workflows, sales analytics, and shop capacity planning.

---

## 2026-08-25

### Chatbot / LLM Engine

* Empirically tested and confirmed that legacy models `llama-3.1-8b-instant` and `llama-3.3-70b-versatile` return `HTTP 404: Not Found` (decommissioned on Groq Cloud API).
* Updated primary LLM model configuration to **`openai/gpt-oss-120b`** with fallback model **`openai/gpt-oss-20b`**.
* Verified `openai/gpt-oss-120b` delivers high speed (Groq LPU execution), 120B parameter reasoning and analysis capacity, native reasoning output, and 100% successful execution on all 28 database function tools.

### Chatbot UI / Movable Window

* Implemented full free-form drag-and-move functionality for the Chatbot Assist modal window (`ChatbotWidget.jsx`). Users can click and drag the header bar to position the chatbot window anywhere on the screen.
* Added quick corner alignment buttons in the header bar (`↖` Top-Left, `↗` Top-Right, `↙` Bottom-Left, `↘` Bottom-Right) for quick 1-click positioning to any side.

### Files Changed

* `backend/.env`
* `backend/sfe_project/settings.py`
* `frontend/src/components/Chatbot/ChatbotWidget.jsx`
* `docs/PROJECT_CONTEXT.md`
* `docs/ARCHITECTURE.md`
* `docs/KNOWN_ISSUES.md`
* `docs/AI_CHANGELOG.md`

### Testing

* Production Vite build verified successfully with 0 errors (`npm run build`).
* Verified mouse drag movement and corner snap buttons in `ChatbotWidget.jsx`.

---

## Template for Future Updates

## YYYY-MM-DD

### Module

* Change
* Change
* Change

### Files Changed

* file/path

### Testing

* Build:
* Tests:
* Manual verification:

### Remaining Issues

* Issue

### Next Task

* Task
