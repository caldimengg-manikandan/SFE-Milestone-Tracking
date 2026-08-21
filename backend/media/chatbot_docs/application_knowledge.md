# SFE Milestone Tracking - Application Knowledge

Ground truth on how this application actually works, derived from the real backend/frontend
implementation (not assumptions). Covers HOW features work conceptually and how they relate
to each other; for live data (actual records, counts, current statuses) the assistant uses
its tools instead of this document - the two are complementary.

Keep this file in sync with the app: when a module's workflow or calculation logic changes,
update the relevant section below, then re-run `python manage.py seed_app_knowledge`.

## RFQ & Bidding

- RFQ Data Entry: creates a new RFQ. Quote No. auto-generated (YY-MM-SEQ). Fields: Type
  (Budget/Final/Rebid), Quote Date, Bid Reference, Project Name, Comments, Bid Due Date/Time,
  Location, Distance, Customer, Decision to Bid (Yes/No/NoBid/Bid), Scope of Work
  (Detailing/Fabrication/Erection), Primary Estimator. Bulk Excel import supported.
- RFQ Master: master list; tracks pricing, tonnage, schedule estimates, outcome. Lifecycle:
  entry -> decision to bid -> pricing & quantities -> quote sent -> outcome (Won/Lost/
  Pending). Won records add SFE Job Number, awarded amount/date, contract executed date,
  fabrication start date. Rebid = duplicate of an RFQ with an R/R1 suffix on the quote
  number, outcome reset to Pending. Creating/updating an RFQ auto-sends a scope-based
  notification email (Detailing/Fabrication/Erection) to recipients configured in Settings.
- Bid Enquiry: a SEPARATE, earlier-stage record from RFQ Master (own quote_no, own table).
  Captures enquiry/bidding details (bid due date, location, AISC fab/erect requirements,
  customer, scope of work, decision to bid, primary estimator, sent-to-department dates,
  SFE job no, awarded/contract dates) plus pricing/tonnage/hours-by-phase fields with
  auto-calculated ratios. Also auto-sends a scope-based notification email on save, same as
  RFQ Master. Do not conflate Bid Enquiry with RFQ Master - they are different tables/pages
  serving a similar but distinct early-bidding purpose.
- Dollar Dashboard: monthly Amount Bid vs Amount Awarded vs Quoted Profit (current + 4 prior
  years) vs a monthly bid goal, plus yearly won/lost/pending totals and win rate.
- Internal Bid Schedule: calendar of RFQs by bid due date, colored by status (Won/Lost/
  Cancelled/Overdue/Due Today/Upcoming) and category (SFE Bid/Pre-Bid/Other), with holidays
  overlaid.
- Holiday Calendar: company/public/optional holidays shown on the Internal Bid Schedule.

## Estimation - Three Related but Distinct Features, Never Conflate

- Estimation Model: the primary estimator INPUT/calculator page (route "estimation"). Here
  the estimator enters raw cost drivers - bid enquiry figures (mill/warehouse steel weight &
  $, scrap %, bolts, paint, galvanizing, misc items, tax), shop fab hours, misc labor hours,
  hourly labor rate, trucking, shipping, sublet detailing/erection costs, overhead %, steel
  joist tons/cost, deck cost - and embeds the Estimation Summary as its output/rollup view.
- Steel Budget (Design Inputs / Result): QUICK, EARLY-STAGE tonnage & dollar sizing per
  project. Inputs: per-level areas (include Y/N), floor framing lbs/SF, roof framing lbs/SF,
  misc steel %, moment-frame premium %, facade premium %, rooftop/canopy allowance,
  contingency %. Formula: floor steel = floor area x lbs/SF; roof steel = roof area x lbs/SF;
  misc steel = (floor+roof area) x misc %; sum these, add moment/facade premiums +
  contingency % -> Total Estimated Steel (lb/tons); x $/ton rate -> Total Budget ($). Rough
  sizing only, not the detailed estimate.
- Estimation Summary: DETAILED, LATER-STAGE estimate from 16 standard cost codes (Shop
  Labor, Steel Material, Field Labor, Erection, Joist, Deck, Misc, Bond, Drawings, etc.),
  pulling from Bid Summary, Erection Takeoff, and Misc Metals data plus entered labor
  hours/rates, trucking, overhead %, use tax % -> full cost-code breakdown and grand total
  feeding the Schedule of Values (SOV). Can be "finalized" into an immutable versioned
  snapshot as the official baseline.
- If asked "how is estimation calculated": Estimation Model is where raw cost drivers are
  entered; Steel Budget (SF x lbs/SF -> tons -> $/ton) is a separate quick early sizing tool;
  Estimation Summary (16-cost-code buildup) is the detailed rollup/output feeding the SOV.
- Contracts (route "contacts"): the project's Contract Information Sheet - job number,
  address, salesman/PM, contract type/terms, prevailing wage, bonding, tax status, paint/
  surface-prep specs - plus dropdowns to attach existing Customer/Architect/Engineer Contact
  records (name, company, email, phone, contact_type) to the project.

## Erection & Field Connections

- Erection Takeoff: per-project field-erection labor/crane/trucking worksheet. User selects
  structural member types + quantities; computes ironworker hours (qty x manhours/piece),
  crane-days (picks/day x efficiency factor), trucking/unload hours, with overridable crew
  size and hourly rates.
- Field Moment Connections (FMC): field-welded/bolted moment-connection labor estimator.
  User selects AISC W-shape sections + quantities; computes shop/field welding hours from
  flange width x thickness, with a 1.40x field-work factor over shop hours.

## Structural & Production Scheduling

- Plan Creation: builds the per-item structural schedule - sequence no, tonnage, category,
  planned dates (Order-for-Approval, Back-from-Approval, Ready-to-Ship, Ship, Erection), shop
  lead time, budgeted shop/field hours.
- Structural Tracking Schedule (Plan Tracking): same schedule rows as Plan Creation, but
  tracks ACTUAL dates/hours, drawing status, and overall tracking status against the plan.
- Production Priority Schedule: shop-floor job run sequence by module type (Plate/Angle/
  Structural) and process (Plasma/Ficep/Punch/Ironworker etc.) - job number, sequence,
  weight, planned vs actual RTS/OFA/BFA dates, run days, completion.
- Process Master Settings: configures production rates per fabrication process/machine step
  (Plate/Angle/Structural tabs - e.g. Plasma, Bent Plate, Ironworker, Ficep, Punch).
- Capacity Configuration / Machine Master / Workforce Master: 3 tabs of Capacity Mapping.
  Machine Master = machine inventory (name, make/model, shop, daily capacity). Workforce
  Master = manpower roster (skill, process, productivity/day, pay rate). Capacity
  Configuration = ties a machine (or manual labor) + assigned manpower to a process/shop ->
  daily/monthly/yearly throughput used for scheduling.

## Analytics & Reporting (all driven by historical RFQ Master data)

- Bid Performance: 5-year x 12-month win-ratio matrix (count % and $ %) of quotes won vs bid,
  plus an annual average win-ratio trend line. Color-coded: >=50% high, 25-49% mid, <25% low.
- Job Analytics: historical unit-cost KPIs for WON jobs only - avg/peak cost-per-ton and
  cost-per-sqft, seasonal monthly charts across 5 years, and heatmapped pivot tables (green
  = well below average cost, red = well above average cost).
- Sales Cycle: for awarded jobs, tracks day-counts between milestones - Quote-to-Award,
  Quote-to-Contract, Quote-to-Fab-Start, Award-to-Fab-Start - with KPI averages and a
  per-job breakdown table.
- Future Capacity: an 18-month rolling forecast of Potential (all non-lost bids) vs
  Confirmed (Won only) labor hours needed, split across Structural/Misc Fabrication and
  Structural/Misc Erection, flagged when projected hours exceed a 2000 hr/month threshold.

## Project Management & Project Master

- Project Master: manages project profiles (`code`, `name`, `customer_name`,
  `project_manager_name`, `detailer_name`, `total_ton`, `erection_date`, `shop_name`,
  `status`, `priority`).

## Features That Exist in the Codebase but Are Not Currently Usable in the Live UI

Breakdown and Misc Metals have frontend components (per-project cost/quantity worksheets
feeding Estimation Summary) but are not wired into the app's routing yet, so users cannot
reach them. Bid Summary (mill/warehouse steel weights, freight, buyout inputs feeding
Estimation Summary) has no frontend UI at all - it's backend-only data. If a user asks about
these, say they exist in the codebase but are not currently accessible as pages, rather than
describing a UI flow for them.

## Dashboard, Settings & System

- Main Dashboard: project stat cards (Total/In Progress/Yet to Start/Completed), a Gantt
  chart of production schedule jobs, a pie chart of project status distribution, a monthly
  plant-capacity bar chart (available vs required manhours and tonnage vs capacity), total
  won tonnage summary, recent project activity, and active Announcements. Also shows a
  VPDashboard sub-view classifying projects as on-track/delayed/light-delay/completed/yet-
  to-start.
- Announcements: date-windowed banner notices (title, message, from/to date, active flag)
  created by admins/managers, shown on the Dashboard; marked high-priority if <=1 day left.
- Settings page: 4 tabs - Profile (name/email/role/department), Security (password change),
  System Emails (configures the RFQ/Bid Enquiry notification recipient lists per scope -
  Detailing/Fabrication/Erection - that drive the auto-send emails described above), and
  Appearance (theme toggle).
- User Access (admin only): manages each user's role (free-text, but the app's role-based
  logic recognizes admin/manager/estimator/detailing/readonly) and their allowed_modules -
  a per-user list of which pages/modules they can access. Admins always have access to every
  module regardless of allowed_modules.
- Email notifications: this app does not have an inbox/email client feature. "Email
  Integration" refers to transactional emails only - password-reset OTP emails, and
  scope-based notification emails auto-sent when an RFQ or Bid Enquiry is created/updated
  (routed to the recipient lists configured on the Settings page).

## Master Data (also queryable live via tools for actual records/counts)

- Employee Master: emp ID, name, department, designation, email, phone, status
  (Active/On Leave/Inactive), join date.
- Customer Master: name, code, category (Domestic/International), country, address,
  optional primary contact.
- Detailer Master: name, code, plus one or more contacts (person, email, phone).
- Project Master: code, name, customer, project manager, detailer, total tonnage, status
  (Yet to Start/Planning/In Progress/Completed), priority, erection date.
- Milestones: title, project, assignee, due date, status (Pending/In Progress/Completed/
  Overdue), priority (Low/Medium/High/Critical), description. IMPORTANT CAVEAT: the
  "Milestone Management" page in the frontend currently displays hardcoded sample data and
  is NOT connected to the live Milestone records or API - so what a user sees on that page
  may not match live milestone data returned by tools. If asked about this discrepancy,
  explain it honestly rather than assuming the page and the data must agree.
