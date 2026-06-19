# Steel Fab Enterprises (SFE) Milestone Tracking & Estimation System
## Complete User Operational Workflow & Technical Reference Manual

---

## 1. Application Overview

The Steel Fab Enterprises (SFE) Milestone Tracking & Estimation System is an enterprise resource planning (ERP) portal designed specifically for steel fabrication and erection workflows. It coordinates the lifecycle of commercial steel construction projects from the initial Request for Quotation (RFQ) through estimation, bidding, sequencing, detailing, shop fabrication, shipping, erection, and final handover.

### Tech Stack Architecture
*   **Frontend**: React (Vite-powered Single Page Application), styled with Tailwind CSS, utilizing Lucide icons for UI indicators.
*   **Backend**: Django REST Framework (DRF) serving JSON APIs, using a custom middleware system for request logging.
*   **Database**: SQLite for development environments (`db.sqlite3` / `vps_db.sqlite3`) and PostgreSQL for production environments.
*   **Offline Chatbot**: Python-based PDF parser (`pypdf`), local `BM25Okapi` search indexing, and a local Ollama API server running `llama3.2` models.

---

## 2. User Roles & Permissions

The application enforces role-based access control (RBAC) defined in the custom User database model (`accounts.User`). The system supports six user roles:

| Database Value | Role | Description | Permissions |
| :--- | :--- | :--- | :--- |
| `admin` | **Admin** | System Administrator | Full access to all screens, read/write APIs, announcements, and context training. |
| `manager` | **Manager** | Operations Manager | Access to scheduling, capacity config, and approvals. Cannot change system settings. |
| `estimator` | **Estimator** | Bid Estimator | Read/write access to RFQ logging, estimations, bid calendars, and results. |
| `detailing` | **Detailing** | Detailing Partner | Access to Plan Creation and Plan Tracking. Read-only on estimation pricing. |
| `employee` | **Employee** | Shop Floor Staff | Read-only access to schedules. Can update item cutting/assembly logs. |
| `readonly` | **Read-Only** | Audit Guest | Read-only access to all dashboards and schedules. No modification rights. |

---

## 3. Module 1: Authentication & Security

### Screen 1: Login
*   **Screen Name**: Login
*   **Purpose**: Authenticates users and grants access tokens based on roles.
*   **Access Roles**: Guest/All roles.
*   **Navigation Path**: Direct landing page when unauthenticated.

#### Layout
*   **Username Field**: Text input. Required.
*   **Password Field**: Masked password text input. Required.
*   **Login Button**: Gradient button. Enabled when inputs are non-empty.
*   **Forgot Password Link**: Hyperlink text below form.

#### Actions
*   **Action Name**: Login Submission
    *   **Location**: Login form.
    *   **Preconditions**: Username and password fields populated.
    *   **User Action**: User clicks "Login" button.
    *   **System Result**: Validates credentials via API, stores JWT token in `sessionStorage`, and redirects user to Dashboard.
    *   **Validation Scenario**: If fields are empty, shows "Required field" validation indicator below inputs.
    *   **Error Scenario**: If credentials fail, displays warning banner: "Invalid credentials. Please check your username and password."

*   **Action Name**: Password Recovery Request
    *   **Location**: Below Login form.
    *   **Preconditions**: None.
    *   **User Action**: User clicks "Forgot Password?".
    *   **System Result**: Redirects browser to Forgot Password recovery screen.

---

### Screen 2: Forgot Password
*   **Screen Name**: Forgot Password Recovery
*   **Purpose**: Initiates reset tokens via email.
*   **Access Roles**: Guest/All.
*   **Navigation Path**: Login $\rightarrow$ Forgot Password link.

#### Layout
*   **Email Field**: Text input. Required. Validates email structure.
*   **Reset Link Button**: Submits recovery form.
*   **Back to Login Link**: Redirects to Login screen.

#### Actions
*   **Action Name**: Request Reset Token
    *   **Location**: Recover form.
    *   **Preconditions**: Email field filled with a valid format.
    *   **User Action**: User clicks "Send Reset Link".
    *   **System Result**: Sends email link and displays success notification: "If an account exists, a reset link has been dispatched."
    *   **Validation Scenario**: Invalid email structure triggers prompt: "Please specify a correct email address."

---

### Screen 3: Reset Password
*   **Screen Name**: Password Reset Confirmation
*   **Purpose**: Validates reset token and saves new password.
*   **Access Roles**: Guest/All (via secret token link).
*   **Navigation Path**: Emailed reset link with token parameter.

#### Layout
*   **New Password Field**: Masked input. Minimum 8 characters. Required.
*   **Confirm Password Field**: Masked input. Must match new password. Required.
*   **Submit Button**: Saves changes.

#### Actions
*   **Action Name**: Save New Password
    *   **Location**: Form center.
    *   **Preconditions**: Secret token in URL is valid; passwords match requirements.
    *   **User Action**: User clicks "Reset Password".
    *   **System Result**: Changes password in database and redirects user to Login screen with success message: "Password updated successfully. Please log in."
    *   **Validation Scenario**: Mismatched passwords trigger notification: "Passwords do not match."

---

## 4. Module 2: Main Portals & Overview Dashboards

### Screen 4: Executive Dashboard
*   **Screen Name**: Executive Dashboard
*   **Purpose**: Aggregated operational overview including active projects count, bid status ratios, and upcoming milestone dates.
*   **Access Roles**: Admin, Manager, Estimator, Detailing, Read-Only.
*   **Navigation Path**: Sidebar $\rightarrow$ Dashboard.

#### Layout
*   **Tonnage Progress Card**: Card showing current project tonnage statuses.
*   **Active Bids Metric Card**: Card showing active bids with count.
*   **Announcements Carousel**: Top section scrolling latest admin bulletins.
*   **Milestones List Table**: Grid displaying critical deadlines coming in 30 days.

#### Actions
*   **Action Name**: View Project Detail
    *   **Location**: Milestones List Table row click.
    *   **Preconditions**: Project exists.
    *   **User Action**: User clicks on a row in the table.
    *   **System Result**: Navigates user directly to Project Master page.

---

### Screen 5: Operations Dashboard (VPS)
*   **Screen Name**: Operations Portal (VPS)
*   **Purpose**: Real-time overview of shop floor processes, daily output metrics, and capacity mapping statistics.
*   **Access Roles**: Admin, Manager, Employee, Read-Only.
*   **Navigation Path**: Sidebar $\rightarrow$ Operations Dashboard.

#### Layout
*   **Capacity Load Chart**: Bar chart highlighting monthly loaded manhours vs limits.
*   **Process Priority Queue**: List of items marked as priority for fabrication.
*   **Active Workstations Status**: Grid representing current active workstations (Cutting, Assembly, Welding, Painting).

#### Actions
*   **Action Name**: Adjust Capacity
    *   **Location**: Capacity Load Card header.
    *   **Preconditions**: User has role `manager` or `admin`.
    *   **User Action**: User clicks "Configure Limits".
    *   **System Result**: Redirects to Capacity Mapping configuration page.

---

## 5. Module 3: Master Administration Directories

### Screen 6: Employee Master
*   **Screen Name**: Employee Master Directory
*   **Purpose**: Manage personnel records, contact details, designations, and system roles.
*   **Access Roles**: Admin (Full write access), Manager, Read-Only (Read-only access).
*   **Navigation Path**: Sidebar $\rightarrow$ Employee Master.

#### Layout
*   **Add Employee Button**: Positioned top-right. Available to Admins.
*   **Search Bar**: Text field filtering employees by name or ID.
*   **Department Filter Dropdown**: Option list to filter rows (All, Fabrication, Design, Quality, Admin, Operations).
*   **Employees Grid Table**: Displays columns: Employee Name, Code (ID), Department, Designation, Contact Info, Status, Actions.
*   **Add/Edit Modal**: Form containing two tabs: Personal Profile and Professional Info.

#### Actions
*   **Action Name**: Open Add Modal
    *   **Location**: Top-right button.
    *   **Preconditions**: User is Admin.
    *   **User Action**: User clicks "+ Add Employee".
    *   **System Result**: Opens blank Employee Modal with 'Personal Profile' tab active.

*   **Action Name**: Submit Employee Data
    *   **Location**: Bottom of modal.
    *   **Preconditions**: All required fields populated (Name, Email, Phone, Designation, Department).
    *   **User Action**: User clicks "Create Identity" (or "Update Profile" if editing).
    *   **System Result**: Saves record to database, closes modal, shows success toast "Employee added/updated!", and refreshes table.
    *   **Validation Scenario**: Missing email or invalid phone triggers alert: "Please correct input errors before saving."

*   **Action Name**: Delete Employee
    *   **Location**: Actions column (Trash icon).
    *   **Preconditions**: User is Admin.
    *   **User Action**: User clicks trash icon.
    *   **System Result**: Displays confirmation alert. If confirmed, deletes record and refreshes grid.

---

### Screen 7: Customer Master
*   **Screen Name**: Customer Master Directory
*   **Purpose**: Manage client directories, billing categories, and customer contacts.
*   **Access Roles**: Admin, Manager, Estimator.
*   **Navigation Path**: Sidebar $\rightarrow$ Customer Master.

#### Layout
*   **Add Customer Button**: Top right button.
*   **Customers List Table**: Columns for Customer Name, Code, Category, Country, State, Actions.
*   **Customer Modal**: Input fields: Name, Code, Category (Domestic/International), Address details. Includes a dynamic "Contacts" table inside.

#### Actions
*   **Action Name**: Add Contact Row
    *   **Location**: Customer Modal contact grid.
    *   **Preconditions**: Modal is open.
    *   **User Action**: User clicks "Add Contact" button.
    *   **System Result**: Appends a new editable contact row (Person Name, Email, Phone inputs).

---

### Screen 8: Detailer Master
*   **Screen Name**: Detailer Master Directory
*   **Purpose**: Manage detailing vendor profiles and communication logs.
*   **Access Roles**: Admin, Manager.
*   **Navigation Path**: Sidebar $\rightarrow$ Detailer Master.

#### Layout
*   **Detailers Table**: Shows columns for Detailer Name, Code, Active Projects count, and Actions.
*   **Add/Edit Detailer Modal**: Standard form for Detailer name and contact details.

#### Actions
*   **Action Name**: Register Detailer
    *   **Location**: Detailer Modal.
    *   **Preconditions**: Name and Code filled.
    *   **User Action**: User clicks "Save Detailer".
    *   **System Result**: Registers vendor and refreshes list.

---

### Screen 9: Project Master
*   **Screen Name**: Project Master Directory
*   **Purpose**: Central project directory listing project codes, descriptions, tonnages, managers, schedules, and report exports.
*   **Access Roles**: Admin, Manager, Estimator, Detailing, Read-Only.
*   **Navigation Path**: Sidebar $\rightarrow$ Project Master.

#### Layout
*   **Search Input**: Filters list by name or project code.
*   **Status Filter**: Dropdown (All, Yet to Start, Planning, In Progress, Completed).
*   **Projects Table Grid**: Columns: Project Code, Project Name, Customer, PM Name, Total Tons, Status, Priority, Action Icons (View, Edit, Delete, PDF).
*   **Project Form Modal**: Form containing Basic Info and Tonnage/Labor estimations.
*   **Schedule Grid Panel**: Slide-out panel to edit Sequence schedules directly.

#### Actions
*   **Action Name**: Export PDF Schedule
    *   **Location**: Table row Action column (PDF icon).
    *   **Preconditions**: Project has schedule items.
    *   **User Action**: User clicks PDF icon.
    *   **System Result**: Generates and downloads a custom landscape A4 PDF containing metadata, structural sequence grid, and a calculated Gantt chart.
    *   **Error Scenario**: If project has no schedules, displays alert: "No schedule data found for this project."

*   **Action Name**: Open Project Schedules
    *   **Location**: Project Row double-click or Edit icon.
    *   **Preconditions**: User has write permission.
    *   **User Action**: User clicks "Edit Schedule".
    *   **System Result**: Launches slide-out panel loading structural schedule items.

---

## 6. Module 4: Bids, RFQs & Estimations

### Screen 10: RFQ Data Entry
*   **Screen Name**: RFQ Scope Data Entry
*   **Purpose**: Logs incoming client inquiries, imports Excel spreadsheets, and coordinates SEBW sync.
*   **Access Roles**: Admin, Estimator, Manager.
*   **Navigation Path**: Sidebar $\rightarrow$ RFQ Module $\rightarrow$ Data Entry.

#### Layout
*   **Excel Upload Button**: Imports structured spreadsheet templates.
*   **Sync SEBW Button**: Coordinates with Steel Estimating Budget Worksheet.
*   **RFQs Table**: Columns for RFQ Number, Client Name, Received Date, Status, Action buttons.

#### Actions
*   **Action Name**: Sync SEBW Data
    *   **Location**: Top header button.
    *   **Preconditions**: Target RFQ selected.
    *   **User Action**: User clicks "Sync SEBW".
    *   **System Result**: Connects to the local Steel Budget input worksheet, extracts calculations (tonnages, manhours, overhead costs), updates the selected RFQ, and displays success alert.

*   **Action Name**: Import Excel Template
    *   **Location**: Header action area.
    *   **Preconditions**: Valid SFE Excel template file selected.
    *   **User Action**: User clicks "Import Template" and selects file.
    *   **System Result**: Parses file contents and creates corresponding RFQ records in the grid.

---

### Screen 11: Estimation Model Configuration
*   **Screen Name**: Estimation Model Configuration
*   **Purpose**: Define default billing rates, hourly labor costs, buyout markups, and paint multipliers.
*   **Access Roles**: Admin, Manager, Estimator.
*   **Navigation Path**: Sidebar $\rightarrow$ Estimation Erection $\rightarrow$ Estimation.

#### Layout
*   **Hourly Labor Rate Input**: Field for shop labor cost per hour.
*   **Shipping Rate Input**: Field for shipping freight rates per truck.
*   **Overhead Markup Input**: Percentage modifier field.
*   **Profit Margin Input**: Percentage margin input.
*   **Save Configuration Button**: Saves values globally.

#### Actions
*   **Action Name**: Save Configuration
    *   **Location**: Form footer.
    *   **Preconditions**: Values are numeric and within valid ranges.
    *   **User Action**: User clicks "Apply Rates".
    *   **System Result**: Updates global model parameters used by project estimation calculations and shows success message.

---

### Screen 12: Estimation Summary
*   **Screen Name**: Estimation Summary
*   **Purpose**: Compile summaries of estimations, review mill steel weight metrics, and allocate line-item costs.
*   **Access Roles**: Admin, Manager, Estimator.
*   **Navigation Path**: Sidebar $\rightarrow$ Estimation Summary.

#### Layout
*   **Mill Steel lbs Input**: Field for total raw steel weight.
*   **Warehouse Steel lbs Input**: Field for warehouse stock weight.
*   **Buyout Items Grid**: Table listing subcontracted components (joist, deck) and pricing.
*   **Recalculate Button**: Re-runs cost matrix.

#### Actions
*   **Action Name**: Recalculate Estimates
    *   **Location**: Card footer.
    *   **Preconditions**: Weights and buyout values populated.
    *   **User Action**: User clicks "Recalculate Summary".
    *   **System Result**: Computes totals using the configured Estimation Model parameters and displays updated total estimation cost.

---

### Screen 13: Steel Budget Worksheet
*   **Screen Name**: Steel Budget Input & Results
*   **Purpose**: Estimate design tonnages, shop fabrication labor hours, and field measurement requirements.
*   **Access Roles**: Admin, Estimator.
*   **Navigation Path**: Sidebar $\rightarrow$ Steel Budget $\rightarrow$ Input.

#### Layout
*   **Budget Input Card**: Section containing numeric input fields: Design Tonnage, Shop Labor Hours, Lead Time, Field Hours.
*   **Calculate Button**: Bottom button.
*   **Results Cards**: Shows computed metrics: Manhour/Ton ratio, Total Budget, and Project Priority recommendations.

#### Actions
*   **Action Name**: Run Budget Calculation
    *   **Location**: Bottom of Input Card.
    *   **Preconditions**: Design Tonnage > 0 and Shop Labor Hours > 0.
    *   **User Action**: User clicks "Calculate Budget".
    *   **System Result**: Computes values and renders the Results page.
    *   **Validation Scenario**: Inputting zero or negative values triggers validation message: "Value must be greater than zero."

---

### Screen 14: Bid Enquiry Log
*   **Screen Name**: Bid Enquiry Log
*   **Purpose**: Track client bid deadlines, statuses, and follow-ups.
*   **Access Roles**: Admin, Estimator, Read-Only.
*   **Navigation Path**: Sidebar $\rightarrow$ Bids $\rightarrow$ Enquiry.

#### Layout
*   **Active Deadlines list**: Cards sorted by upcoming deadline dates.
*   **Enquiry Log Table**: Columns: Bid ID, Customer, Project Name, Status, Date Due, Action icons.

#### Actions
*   **Action Name**: Add Bid Entry
    *   **Location**: Header action area.
    *   **Preconditions**: None.
    *   **User Action**: User clicks "Add Bid Entry".
    *   **System Result**: Displays form to input customer details, scope details, and target submission deadline date.

---

### Screen 15: Holiday Calendar
*   **Screen Name**: Holiday Calendar Configuration
*   **Purpose**: Setup non-working holidays to prevent schedule conflicts during automatic sequencing.
*   **Access Roles**: Admin, Manager.
*   **Navigation Path**: Sidebar $\rightarrow$ Bids $\rightarrow$ Holidays.

#### Layout
*   **Year Selector**: Dropdown to select calendar year.
*   **Holidays Grid List**: Table of registered holidays showing Date, Name, Category, and Action buttons.
*   **Add Holiday Card**: Quick-add form on the right side.

#### Actions
*   **Action Name**: Add Holiday
    *   **Location**: Right-hand card.
    *   **Preconditions**: Date and Name are populated.
    *   **User Action**: User clicks "Register Holiday".
    *   **System Result**: Inserts holiday to database, locks that date from scheduling algorithms, and updates list.

---

## 7. Module 5: Fabrication & Production Scheduling

### Screen 16: Plan Creation
*   **Screen Name**: Plan Creation (Structural Sequences)
*   **Purpose**: Create sequence structures, define scheduled OFA/BFA milestones, and map out fabrication timelines.
*   **Access Roles**: Admin, Manager, Detailing.
*   **Navigation Path**: Sidebar $\rightarrow$ Structural Schedule $\rightarrow$ Plan Creation.

#### Layout
*   **Project Selector Dropdown**: List to select target project.
*   **Sequence Grid**: Editable spreadsheet-like interface. Columns: Seq #, Tons, Description, Scheduled OFA, Scheduled BFA, RTS Target, Ship Date.
*   **Generate Sequence Row Button**: Button to append blank sequence rows.

#### Actions
*   **Action Name**: Generate Blank Sequence Row
    *   **Location**: Below sequence table.
    *   **Preconditions**: Project selected.
    *   **User Action**: User clicks "+ Add Row".
    *   **System Result**: Appends a new sequence row with default sequence number incremented by 1.

*   **Action Name**: Save Plan
    *   **Location**: Bottom of screen.
    *   **Preconditions**: All required fields (Seq #, Description, Tons) populated for all rows.
    *   **User Action**: User clicks "Save Plan".
    *   **System Result**: Saves plan layout, creates structural schedule items, and redirects to Plan Tracking page.

---

### Screen 17: Plan Tracking
*   **Screen Name**: Plan Tracking (Schedules)
*   **Purpose**: Update actual milestone completion dates, track RTS, and manage erection deliveries.
*   **Access Roles**: Admin, Manager, Detailing, Read-Only.
*   **Navigation Path**: Sidebar $\rightarrow$ Structural Schedule $\rightarrow$ Plan Tracking.

#### Layout
*   **Search Box**: Search by sequence description.
*   **Milestones Tracking Grid**: Columns: Seq #, Description, Scheduled OFA, Actual OFA, Scheduled BFA, Actual BFA, Scheduled RTS, Actual RTS, Status.
*   **Log Actual Dates Modal**: Form to input milestone dates.

#### Actions
*   **Action Name**: Log Actual Date
    *   **Location**: Milestone Date Cell.
    *   **Preconditions**: Milestone is scheduled.
    *   **User Action**: User clicks on date cell or pencil icon.
    *   **System Result**: Launches modal to select Actual Date from date picker. Saving triggers database update and adjusts status color.

---

### Screen 18: Process Master
*   **Screen Name**: Process Master
*   **Purpose**: Define fabrication processes, order of operations, and routing pathways.
*   **Access Roles**: Admin, Manager.
*   **Navigation Path**: Sidebar $\rightarrow$ Production $\rightarrow$ Process Master.

#### Layout
*   **Processes List**: Grid showing code, process name, description, and stations.
*   **Add Process Modal**: Form: Process Code, Process Name, Description.

#### Actions
*   **Action Name**: Create Process Route
    *   **Location**: Add modal.
    *   **Preconditions**: Code and Name populated.
    *   **User Action**: User clicks "Save Process".
    *   **System Result**: Saves route configurations.

---

### Screen 19: Production Priority Schedule
*   **Screen Name**: Production Priority Schedule
*   **Purpose**: Log daily shop floor output, monitor target cutting, target assembly, and painting completions.
*   **Access Roles**: Admin, Manager, Employee, Read-Only.
*   **Navigation Path**: Sidebar $\rightarrow$ Production $\rightarrow$ Priority Schedule.

#### Layout
*   **Workstations Tabs**: Tabs for Cutting, Assembly, Welding, Painting.
*   **Daily Log Table**: Grid listing sequences, item designations, tonnage targets, logged progress, and status indicators.
*   **Log Progress Modal**: Form to update daily logged progress.

#### Actions
*   **Action Name**: Log Station Progress
    *   **Location**: Row Actions column (Log icon).
    *   **Preconditions**: Row item is in active state.
    *   **User Action**: User clicks Log icon.
    *   **System Result**: Launches progress logger modal. Saving updates daily progress charts.

---

### Screen 20: Capacity Mapping
*   **Screen Name**: Capacity Mapping Configuration
*   **Purpose**: Define monthly manhour capacities, overload thresholds, and mapping parameters.
*   **Access Roles**: Admin, Manager.
*   **Navigation Path**: Sidebar $\rightarrow$ Production $\rightarrow$ Capacity Mapping.

#### Layout
*   **Month Grid List**: Rows representing calendar months.
*   **Capacity Limit Input**: Numeric field representing maximum monthly manhours.
*   **Threshold Modifier Input**: Percentage modifier field (e.g., 85% warning limit).
*   **Save Configuration Button**: Saves values globally.

#### Actions
*   **Action Name**: Save Capacity Limits
    *   **Location**: Footer action area.
    *   **Preconditions**: Limits are numeric and positive.
    *   **User Action**: User clicks "Apply Limits".
    *   **System Result**: Updates capacity constraints, updates active charts, and triggers success notification.

---

## 8. Action $\rightarrow$ Result Workflow Formats (A-Z Examples)

### Authentication Flow (Forgot Password Request)
```
ACTION:
User clicks the "Forgot Password?" link on the login page.

RESULT:
The page navigates to the Forgot Password Recovery screen.

ACTION:
User enters "manager@steelfab.com" in the email field.

RESULT:
The entered email is verified to match email formatting rules.

ACTION:
User clicks the "Send Reset Link" button.

RESULT:
The system submits the recovery request to the backend. The screen displays a green banner: "If an account exists, a reset link has been dispatched."
```

### Employee Creation Flow
```
ACTION:
User clicks the "+ Add Employee" button.

RESULT:
The Add Employee modal pops up with the "Personal Profile" tab active. The fields are empty.

ACTION:
User enters "Alice Cooper" in the Full Name field, "alice@steelfab.com" in the Email, and "5551234567" in the Phone field.

RESULT:
Values appear in the respective input fields. The email field performs format validation on losing focus.

ACTION:
User clicks the "Next Step" button.

RESULT:
The modal switches to the "Professional Info" tab. Personal data is preserved.

ACTION:
User selects "Fabrication" in the Department dropdown, enters "Fitter" in Designation, and "EMP-150" in Employee ID.

RESULT:
Selections and text values are registered in form state.

ACTION:
User clicks the "Create Identity" button.

RESULT:
The form submits. The backend creates the record. The modal closes, a success toast "Employee Alice Cooper added!" appears, and the Employee directory table refreshes.
```

### Structural Plan Sequence Generation Flow
```
ACTION:
User selects "PRJ-101 (Expansion)" in the Project Selector Dropdown.

RESULT:
The system queries the database and loads any existing structural sequences in the table. The "Add Row" button becomes enabled.

ACTION:
User clicks the "+ Add Row" button.

RESULT:
A new row is appended to the bottom of the Sequence Grid with Seq # automatically set to "3" (based on current rows).

ACTION:
User enters "Zone A - Roof Joists" in Description, "22.5" in Tons, "2026-07-01" in Scheduled OFA, and "2026-07-15" in Scheduled BFA.

RESULT:
Inputs appear in the row cells.

ACTION:
User clicks the "Save Plan" button.

RESULT:
The system submits the sequence data to the backend. The backend updates the database. The page navigates to the Plan Tracking dashboard.
```

---

## 9. Form Validations & Error States

### Missing Required Fields
*   **Behavior**: When a user leaves a required input field empty and attempts to submit the form, the submission is blocked.
*   **Visual Indicators**: The empty field is highlighted in red, and a message ("This field is required") is rendered directly below the input.
*   **Toast Alert**: A warning toast appears: "Please correct input errors before saving."

### Invalid Data Formats
*   **Email Fields**: Inputting strings without an `@` character or domain extension triggers validation on field blur: "Please enter a valid email address."
*   **Phone Fields**: Phone inputs only accept digits. Inputting non-numeric characters blocks typing. Submitting a phone number with fewer than 10 digits triggers warning: "Phone number must be exactly 10 digits."
*   **Date Fields**: Entering invalid dates (e.g. `2026-02-31`) triggers validation: "Please select a valid date."

### Duplicate Submissions
*   **Employee Code (ID)**: Attempting to save an employee with an ID that already exists in the database displays modal alert: "Employee ID already exists."
*   **Project Code**: Saving a new project with a duplicate code displays warning: "Project Code must be unique."
*   **Email Duplication**: Registering a duplicate email address returns: "An employee with this email already exists."

---

## 10. Status Transitions & Approval Workflows

### Project Lifecycle Workflows
```
+--------------+     (Start Work)     +-------------+     (Complete Work)     +-----------+
| Yet to Start |  ----------------->  | In Progress |  -------------------->  | Completed |
+--------------+                      +-------------+                         +-----------+
```
1.  **Yet to Start**:
    *   **Preconditions**: Project has been registered, but no schedule items have actual start dates.
    *   **Allowed Actions**: Full editing of basic details, deletion, schedule item creation.
2.  **In Progress**:
    *   **Trigger**: The first actual milestone date (e.g. Actual OFA or Actual RTS) is logged.
    *   **Allowed Actions**: Logging milestone dates, updating actual hours.
    *   **Restricted Actions**: Deleting the project is blocked.
3.  **Completed**:
    *   **Trigger**: All structural schedules have completed ship/erection logs, and status is set to Completed.
    *   **Allowed Actions**: Exporting PDF reports, read-only audit reviews.
    *   **Restricted Actions**: Modifying schedules or tonnages is locked.

### Bid Lifecycle Workflows
```
+-------+     (Submit Quote)     +-----------+     (Award/Loss)     +---------+ / +--------+
| Draft |  ------------------->  | Submitted |  ----------------->  | Awarded |   | Closed |
+-------+                        +-----------+                      +---------+   +--------+
```
1.  **Draft**:
    *   **Description**: Internal estimation phase. Tonnages and rates are actively adjusted.
    *   **UI Changes**: Status pill is gray.
2.  **Submitted**:
    *   **Description**: Proposal has been shared with the customer.
    *   **UI Changes**: Status pill is blue.
3.  **Awarded**:
    *   **Description**: Client has selected the bid and issued a contract.
    *   **UI Changes**: Status pill is green. Integrates a button: "Convert to Project".
4.  **Closed**:
    *   **Description**: Bid lost or cancelled.
    *   **UI Changes**: Status pill is red. Form inputs are locked.

---

## 11. Edge Cases & Exception Handling

### Empty Table Directory States
*   **Trigger**: A list screen is accessed (e.g., Customer Master) when no records exist.
*   **UI Rendering**: Displays a blank center card rendering a folder icon with the warning text: "No records found. Click '+ Add Customer' to create your first client directory profile."

### No Search Matches
*   **Trigger**: User filters list with search arguments that match no database records.
*   **UI Rendering**: Renders message: "No search results match your criteria. Try adjusting filters or search spelling."

### Expired Session Handling
*   **Trigger**: Session token has expired or is invalid.
*   **UI Rendering**: Displays warning modal: "Your session has expired. Please log in again to verify identity." User is redirected to Login.

### Unsaved Changes Safeguard
*   **Trigger**: User makes edits on a form (e.g. Estimation Config) and attempts to navigate away without saving.
*   **UI Rendering**: Displays browser dialog: "You have unsaved changes. Are you sure you want to leave this page?"
