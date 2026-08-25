# Steel Fab Enterprises (SFE) Milestone Tracking & Estimation System
## Application Architecture, Roles, Workflows & UX Reference

Hand-maintained narrative manual for Steel Fab Enterprises (SFE) covering architecture, user roles, and workflow/formula context that isn't mechanically derivable from code. Exact, ground-truth facts that ARE derivable from code - database model field specifications, application page routes, and the chatbot's tool registry - live in the separately auto-generated "SFE Code-Derived Knowledge (auto-generated)" document (produced by `manage.py generate_app_knowledge`, regenerated automatically on every `migrate`) so they can never drift the way a hand-typed copy of the schema inevitably does. Do not re-add a hand-written model/route/tool-list section here - extend `chatbot/knowledge_extractors.py` instead.

---

## 1. System Architecture & Technical Stack

The SFE Milestone Tracking & Estimation System is built on a modern, decoupled architecture designed for high availability, security, and offline AI intelligence.

### Technology Architecture
- **Frontend SPA**: React 18 powered by Vite. Uses `react-router-dom` v6 for client-side routing, **Tailwind CSS** for styling, **TanStack React Query** for asynchronous data fetching and cache management, `react-hot-toast` for notifications, and `lucide-react` for icons.
- **Backend API**: Django 4.x with Django REST Framework (DRF). Modular architecture organized into domain apps (`accounts`, `dashboards`, `employees`, `projects`, `rfq`, `milestones`, `production`, `chatbot`). Enforces RESTful standards, request logging, and transaction integrity.
- **Database Layer**: Relational database storage (PostgreSQL in production, SQLite `db.sqlite3` in development) with foreign key constraints, indexing, and transactional guarantees.
- **Authentication & Security**: JWT (JSON Web Tokens via `SimpleJWT`). Access tokens stored in client `sessionStorage`. Authorization enforced server-side via custom DRF permission classes (`IsAuthenticated`, `IsChatbotAdmin`).
- **Offline Agentic AI & RAG Engine**: Python-based Retrieval-Augmented Generation engine. Combines `pypdf` for document processing, `BM25Okapi` lexical ranking, and dense vector embeddings (`JSONField` in database) for hybrid search retrieval. Connects to Ollama / cloud models with dynamically-selected tool call handlers (see the generated tool registry for the current exact count and list).

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

## 3. Core Modules Overview

SFE's modules, in the order a project moves through them: **RFQ & Bidding** (intake, bid enquiries, quote workflows, dollar/bid-performance/sales-cycle/future-capacity dashboards, internal bid schedule, holiday calendar) -> **Estimation & Sizing** (estimation model, steel budget sizing, 16-cost-code estimation summary, erection takeoff, field moment connections) -> **Contracts & Master Directories** (customer, detailer, employee, project masters) -> **Structural Tracking** (plan creation and tracking, OFA/BFA/RTS/ship dates) -> **Production Scheduling** (priority schedules, process rates, capacity mapping, machine/workforce masters) -> **Milestones & Admin** (milestone deliverables, announcements, user access, agent settings).

For the exact page route of any specific screen, or the exact tool name/description for any chatbot action, use the "SFE Code-Derived Knowledge (auto-generated)" document instead of guessing from a module name here - it's generated straight from the live router configuration and tool catalog and can't go stale.

---

## 4. Database Models

See the separately auto-generated "SFE Code-Derived Knowledge (auto-generated)" document for the exact, current field-by-field schema of every model (types, choices, nullability, foreign keys) - it's regenerated from `Model._meta.get_fields()` on every `migrate`, so it always matches the real database.

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

### Steps in Erection Estimation (Erection Takeoff Workflow)
To perform an Erection Estimation (Erection Takeoff) for a project in SFE:
1. **Navigate to Erection & Structural Takeoff**: Open the sidebar and select **Estimation Erection** -> **Erection Takeoff** (`/estimation-erection/erection-takeoff`).
2. **Select Target Project**: Select the project from the top dropdown to load project-specific rate configurations (`estimation_data`).
3. **Input Structural Piece Quantities**: Enter structural member quantities and piece manhour rates to compute Total Piece Manhours.
4. **Calculate Field Labor & Ironworker Crew Days**: Compute total ironworker crew days based on shift hours per day and crew size.
5. **Estimate Crane Days**: Enter total steel picks, picks per day, and crane efficiency factors to calculate required crane days.
6. **Compute Truck Unloading Hours**: Input expected truckload deliveries and unload hours per truck.
7. **Calculate Field Moment Connections (FMC)**: Access the FMC tab (`/estimation-erection/fmc`) to compute shop and field welding manhours (applying the 1.40x field work multiplier).
8. **Review Estimation Summary & Apply Markups**: Navigate to `/estimation-summary` to review the 16-cost-code rollup, apply overhead and profit margins, and export/save final bid estimates.

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

## 6. Agentic AI Architecture

The AI Chatbot operates as an autonomous tool-calling agent. When a user requests a business action, the agent evaluates intent, calls the appropriate tool handler, verifies authorizations, and returns synthesized natural language responses with interactive UI navigation actions. For the exact, current tool count and full registry (names, descriptions, default-enabled state), see the separately auto-generated "SFE Code-Derived Knowledge (auto-generated)" document - it's generated from the live tool catalog, not hand-counted.

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

- **Tool Enablement**: Most tools are enabled by default (`AgentConfig.enabled_tools = None`); destructive delete tools default to disabled until an administrator explicitly opts in via Agent Settings (`AgentSettings.jsx`).
- **Role Enforcement**: Destructive or admin actions (e.g., `create_employee`, `delete_project`) verify user roles server-side (`_is_admin_user`) before executing.
- **Confirmation Step**: State-changing update and delete operations inspect the `confirm` boolean parameter. If unconfirmed, the agent asks for user confirmation before executing.
