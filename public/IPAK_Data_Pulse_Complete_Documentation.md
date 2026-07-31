# IPAK Data Pulse — Complete Software Documentation

**Software Requirements Specification (SRS) + Technical Documentation + User Manual + System Documentation**

**Version:** 1.0
**Date:** July 22, 2026
**Classification:** Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Purpose](#3-purpose)
4. [Objectives](#4-objectives)
5. [Scope](#5-scope)
6. [Business Requirements](#6-business-requirements)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [User Roles and Permissions](#9-user-roles-and-permissions)
10. [Complete Module List](#10-complete-module-list)
11. [Every Screen with Details](#11-every-screen-with-details)
12. [Complete Dashboard Documentation](#12-complete-dashboard-documentation)
13. [Reports Documentation](#13-reports-documentation)
14. [Masters Documentation](#14-masters-documentation)
15. [Database Documentation](#15-database-documentation)
16. [API Documentation](#16-api-documentation)
17. [Complete Application Workflow](#17-complete-application-workflow)
18. [Production Flow](#18-production-flow)
19. [Data Entry Flow](#19-data-entry-flow)
20. [User Journey](#20-user-journey)
21. [Error Handling](#21-error-handling)
22. [Security Features](#22-security-features)
23. [Audit Logs](#23-audit-logs)
24. [Calculations and Formulas](#24-calculations-and-formulas)
25. [Filters and Search Logic](#25-filters-and-search-logic)
26. [Import/Export Features](#26-importexport-features)
27. [System Architecture](#27-system-architecture)
28. [Folder Structure](#28-folder-structure)
29. [Dependencies](#29-dependencies)
30. [Configuration](#30-configuration)
31. [Installation Guide](#31-installation-guide)
32. [Deployment Guide](#32-deployment-guide)
33. [Backup and Restore](#33-backup-and-restore)
34. [Known Limitations](#34-known-limitations)
35. [Future Enhancements](#35-future-enhancements)
36. [Complete Business Rules](#36-complete-business-rules)
37. [Complete Data Flow](#37-complete-data-flow)
38. [Screen-by-Screen User Manual](#38-screen-by-screen-user-manual)
39. [Administrator Manual](#39-administrator-manual)
40. [Technical Notes](#40-technical-notes)
41. [Assumptions](#41-assumptions)
42. [Appendix](#42-appendix)

---

# 1. Executive Summary

**IPAK Data Pulse** is a full-stack enterprise production management system built for the IPAK group of companies (IPAK, CPAK, GPAK, PETPAK). It tracks production data, targets, dispatch shipments, export quantities, packing costs, and analytics across multiple manufacturing plants and sections (Film Line, Slitter, Metallizer).

The system supports role-based access control (RBAC) with four roles (admin, supervisor, manager, operator), per-user plant assignments, granular per-module permissions, and multi-plant context switching. All data is plant-scoped — users only see data for the plant they have selected.

**Key Technologies:** React 19 + TypeScript, Vite 7, Tailwind CSS v4, shadcn/ui, Recharts, Hono (server), Prisma 7 ORM, SQLite database.

**Deployment:** Single-page application with a sidecar Hono API server, deployed as a Shogo-managed pod.

---

# 2. Project Overview

| Attribute | Value |
|---|---|
| **Project Name** | IPAK Data Pulse |
| **Application Type** | Full-Stack Single Page Application (SPA) |
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind CSS v4, shadcn/ui, Recharts |
| **Backend** | Hono.js (lightweight HTTP framework) |
| **ORM** | Prisma 7 |
| **Database** | SQLite (via Prisma) |
| **Authentication** | Custom JWT-like token (SHA-256 password hashing) |
| **Deployment** | Shogo-managed pod |
| **UI Library** | shadcn/ui (Radix UI primitives) |
| **Charts** | Recharts (BarChart, LineChart, PieChart, AreaChart) |
| **Icons** | Lucide React |
| **Routing** | Hash-based client-side routing (`window.location.hash`) |

---

# 3. Purpose

The application was built to replace manual Excel-based production tracking for the IPAK group's manufacturing plants. It provides:

1. **Centralized data entry** for production, targets, dispatch, export quantity, and packing cost records.
2. **Real-time dashboards** with KPI cards showing production, waste, downtime, settings, cycles, and dispatch metrics.
3. **Analytics** with section-specific charts (Film Line, Slitter, Metallizer, Targets).
4. **Report generation** with 8 report types, filterable by section, machine, shift, and date range.
5. **Multi-plant management** with plant-scoped data isolation.
6. **Role-based access control** with granular per-module permissions.
7. **Master data management** for Film Codes, Downtime Reasons, and Machines.

---

# 4. Objectives

1. Eliminate manual spreadsheet-based production tracking.
2. Provide real-time visibility into production KPIs across all plants.
3. Enable shift-wise and section-wise production data entry.
4. Track target vs. actual production with achievement percentages.
5. Monitor dispatch shipments (Local + Export) with customer tracking.
6. Calculate packing costs per kilogram (automatic tons-to-kg conversion).
7. Generate export quantities for film-code-wise tracking.
8. Provide analytics with daily/monthly granularity.
9. Enforce role-based access so operators only see permitted modules.
10. Maintain an audit trail of user actions.

---

# 5. Scope

## In Scope
- Multi-plant production tracking (IPAK, CPAK, GPAK, PETPAK)
- Three production sections: Film Line, Slitter, Metallizer
- Shift-wise production data entry (Morning, Evening, Night)
- Target setting and achievement tracking
- Dispatch management (Local + Export) with customer tracking
- Export quantity tracking by film code
- Packing cost calculation with tons-to-kg conversion
- Master data management (Film Codes, Downtime Reasons, Machines)
- Dashboard with section-wise KPIs
- Analytics with charts (Bar, Line, Pie)
- Reports with 8 report types
- User management and role-based access control
- Per-user permission and plant assignment
- Audit logging

## Out of Scope
- Mobile native application
- Integration with ERP systems
- Barcode/QR scanning
- Multi-language support
- Workflow approval chains
- Real-time WebSocket notifications
- Hardware (IoT sensor) integration

---

# 6. Business Requirements

| ID | Requirement |
|---|---|
| BR-01 | The system shall support 4 manufacturing plants: IPAK, CPAK, GPAK, PETPAK |
| BR-02 | Each plant shall have 3 production sections: Film Line, Slitter, Metallizer |
| BR-03 | Production data shall be entered per shift (Morning, Evening, Night) |
| BR-04 | Each production entry shall track production in Tons, waste in Tons, and downtime in minutes |
| BR-05 | Waste percentage shall be auto-calculated as (Waste / Production) × 100 |
| BR-06 | Slitter entries shall require Number of Settings; Metallizer entries shall track Number of Cycles |
| BR-07 | Downtime reason shall be mandatory when downtime > 0 |
| BR-08 | Targets shall be set per slitter machine per shift per date |
| BR-09 | Achievement % shall be calculated as (Actual / Target) × 100 |
| BR-10 | Dispatch records shall track customer name, film code, quantity in Tons, and dispatch type (Local/Export) |
| BR-11 | Packing cost shall be calculated in Rs/Kg (Total Cost ÷ Production in Kg, where 1 Ton = 1,000 Kg) |
| BR-12 | The system shall support 4 user roles: admin, supervisor, manager, operator |
| BR-13 | Admin users shall have full access to all plants and all modules |
| BR-14 | Non-admin users shall only access plants explicitly assigned to them |
| BR-15 | Navigation items shall be filtered based on user permissions |
| BR-16 | All data shall be scoped to the currently selected plant |

---

# 7. Functional Requirements

## 7.1 Authentication
| ID | Requirement |
|---|---|
| FR-AUTH-01 | Users shall authenticate with username + password |
| FR-AUTH-02 | Passwords shall be hashed with SHA-256 using a random 16-byte salt |
| FR-AUTH-03 | Passwords shall be stored as `hash:salt` format |
| FR-AUTH-04 | On successful login, a user object (without password) shall be returned |
| FR-AUTH-05 | User session shall persist in localStorage (`ipak_user` key) |
| FR-AUTH-06 | Logout shall clear all session data and reload the page |

## 7.2 Plant Selection
| ID | Requirement |
|---|---|
| FR-PLANT-01 | After login, users shall select a plant to continue |
| FR-PLANT-02 | Admin users shall see all 4 plants |
| FR-PLANT-03 | Non-admin users shall see only their assigned plants |
| FR-PLANT-04 | If a user has exactly 1 plant, it shall be auto-selected |
| FR-PLANT-05 | If no plants are assigned, the user sees "No Plants Assigned" with a sign-out option |
| FR-PLANT-06 | The selected plant shall persist in localStorage (`selectedPlant` key) |
| FR-PLANT-07 | Users can switch plants at any time via the top bar dropdown |

## 7.3 Production Entry
| ID | Requirement |
|---|---|
| FR-PROD-01 | Users shall enter production data per date, shift, machine, and film code |
| FR-PROD-02 | Required fields: Date, Shift, Machine, Film Code, Production (Tons) |
| FR-PROD-03 | Optional fields: Waste (Tons), Downtime (Minutes), Number of Settings (Slitter), Number of Cycles (Metallizer) |
| FR-PROD-04 | Section is auto-determined from the selected machine (via plantConfig) |
| FR-PROD-05 | Waste % is auto-calculated: `(Waste Tons / Production Tons) × 100` |
| FR-PROD-06 | Downtime Reason becomes required when Downtime Minutes > 0 |
| FR-PROD-07 | Number of Settings is required for Slitter section entries |
| FR-PROD-08 | Entries shall support Create, Edit, and Delete operations |
| FR-PROD-09 | Table shall display up to 200 most recent entries |
| FR-PROD-10 | Waste % shall display with color coding: red if > 5%, green otherwise |

## 7.4 Targets
| ID | Requirement |
|---|---|
| FR-TGT-01 | Users shall set targets per date, shift, and slitter machine |
| FR-TGT-02 | Only slitter machines (filtered by section='Slitter') shall appear in the machine dropdown |
| FR-TGT-03 | Required fields: Date, Shift, Slitter Machine, Target (Tons) |
| FR-TGT-04 | Targets shall support Create, Edit, and Delete operations |
| FR-TGT-05 | Table shall display up to 200 most recent targets |

## 7.5 Dispatch
| ID | Requirement |
|---|---|
| FR-DSP-01 | Users shall record dispatch entries with customer name, film code, quantity, and dispatch type |
| FR-DSP-02 | Dispatch types: "Local" or "Export" |
| FR-DSP-03 | Customer name shall have autocomplete from previously entered customers |
| FR-DSP-04 | Required fields: Date, Customer, Film Code, Quantity (Tons), Dispatch Type |
| FR-DSP-05 | Dispatch module has 3 tabs: Entry, Reports, Analytics |
| FR-DSP-06 | Dispatch reports support CSV export, PDF export, and Print |
| FR-DSP-07 | Dispatch analytics show daily dispatch, customer-wise pie chart, and film-wise horizontal bar |
| FR-DSP-08 | Dispatch analytics can be filtered by dispatch type (All, Export, Local) |

## 7.6 Export Quantity
| ID | Requirement |
|---|---|
| FR-EXP-01 | Users shall track export quantities per date and film code |
| FR-EXP-02 | KPI card shows "This Month Export" total in Tons |
| FR-EXP-03 | Charts show daily export (bar chart) and film-wise export (pie chart) |
| FR-EXP-04 | Only active film codes shall appear in the dropdown |

## 7.7 Packing Cost
| ID | Requirement |
|---|---|
| FR-PCK-01 | Users shall enter monthly packing cost data per plant |
| FR-PCK-02 | Input fields: Month (YYYY-MM), Total Production (Tons), BOM Total Cost (Rs), Actual Total Cost (Rs) |
| FR-PCK-03 | The system shall automatically calculate BOM and Actual packing cost in Rs/Kg |
| FR-PCK-04 | Conversion: Total Production (Kg) = Total Production (Tons) × 1,000 |
| FR-PCK-05 | BOM Packing Cost (Rs/Kg) = BOM Total Cost ÷ Total Production (Kg) |
| FR-PCK-06 | Actual Packing Cost (Rs/Kg) = Actual Total Cost ÷ Total Production (Kg) |
| FR-PCK-07 | Auto-computed fields shall display with 4 decimal places |
| FR-PCK-08 | "All Plants Summary" table shows aggregated packing costs across all plants |
| FR-PCK-09 | Analytics chart shows plant-wise packing cost comparison (bar chart) |
| FR-PCK-10 | The Total Cost (Rs) field is hidden from all UI surfaces (stored as 0 in database) |

## 7.8 Masters
| ID | Requirement |
|---|---|
| FR-MAS-01 | Admin can manage three master types: Film Codes, Downtime Reasons, Machines |
| FR-MAS-02 | Film Code fields: Name, Status (Active/Inactive), Description |
| FR-MAS-03 | Downtime Reason fields: Name, Status (Active/Inactive) |
| FR-MAS-04 | Machine fields: Name, Section (Film Line/Slitter/Metallizer), Plant association |
| FR-MAS-05 | Items can be toggled between Active and Inactive status |
| FR-MAS-06 | Only Active items shall appear in production entry dropdowns |

## 7.9 Analytics
| ID | Requirement |
|---|---|
| FR-ANL-01 | Analytics shall have 4 tabs: Film Line, Slitter, Metallizer, Targets |
| FR-ANL-02 | All analytics shall support date range filtering (Date From, Date To) |
| FR-ANL-03 | Film Line tab shows: Production (daily/monthly), Production vs Waste, Waste (daily/monthly), Downtime (daily/monthly/by reason), Film-wise Production (total + daily trend) |
| FR-ANL-04 | Slitter tab shows: Combined settings (daily/monthly), Per-machine settings (daily/monthly) for each configured slitter machine |
| FR-ANL-05 | Metallizer tab shows: Production (daily/monthly), Cycles (daily/monthly) |
| FR-ANL-06 | Targets tab shows: Machine selector dropdown, Daily/Shift-wise toggle, Target vs Actual bar chart, Achievement % bar chart, Trend line (daily mode only), Summary cards (Total Target, Total Actual, Achievement %, Gap) |
| FR-ANL-07 | Targets tab machine selector is populated from distinct machines in the targets table |

## 7.10 Reports
| ID | Requirement |
|---|---|
| FR-RPT-01 | 8 report types: Overall Production, Film-wise Production, Machine-wise Production, Waste, Downtime, Target, Settings, Cycles |
| FR-RPT-02 | Reports shall support filters: Section, Machine, Shift, Date Range |
| FR-RPT-03 | When Section is selected, Machine dropdown filters to machines in that section |
| FR-RPT-04 | Machine filter resets when Section changes |
| FR-RPT-05 | Downtime report shows Top 4 Downtime Reasons as summary cards |
| FR-RPT-06 | Target report enriches targets with actual production and achievement % |
| FR-RPT-07 | Settings report only shows Slitter section entries |
| FR-RPT-08 | Cycles report only shows Metallizer section entries |
| FR-RPT-09 | Table columns are dynamic based on report type |
| FR-RPT-10 | Records are limited to 500 per report |

## 7.11 User Management
| ID | Requirement |
|---|---|
| FR-USR-01 | Admin can create, edit, delete users |
| FR-USR-02 | User fields: Full Name, Username, Email, Password, Role |
| FR-USR-03 | Roles: admin, supervisor, manager, operator |
| FR-USR-04 | Username is unique (case-insensitive, stored lowercase) |
| FR-USR-05 | Password minimum 6 characters |
| FR-USR-06 | Admin cannot delete the last admin user |
| FR-USR-07 | Password can be changed via a dedicated dialog |
| FR-USR-08 | Users can be searched by name, username, or role |

## 7.12 Permissions
| ID | Requirement |
|---|---|
| FR-PERM-01 | 36 granular permissions across 11 modules |
| FR-PERM-02 | Admin role has ALL 36 permissions by default (read-only, locked) |
| FR-PERM-03 | Non-admin roles start with 0 permissions; must be explicitly granted |
| FR-PERM-04 | Permissions are stored per-user in the user_permissions table |
| FR-PERM-05 | Plant access is managed separately from module permissions |
| FR-PERM-06 | Plant access determines which plants appear in the plant switcher |
| FR-PERM-07 | Navigation items are dynamically filtered based on user permissions |
| FR-PERM-08 | Route guards prevent direct URL access to unauthorized pages |

## 7.13 Audit Logs
| ID | Requirement |
|---|---|
| FR-AUD-01 | Audit logs record: User, Action, Module, Details, Timestamp |
| FR-AUD-02 | Audit logs are viewable by admin users only |
| FR-AUD-03 | Logs are displayed in chronological order |

## 7.14 Dashboard
| ID | Requirement |
|---|---|
| FR-DB-01 | Dashboard shows section-wise KPIs for Film Line, Slitter, Metallizer, and Dispatch |
| FR-DB-02 | Two time periods: "This Month" (1st of month to today) and "Yesterday" |
| FR-DB-03 | Production sections show: Production (Tons), Waste (%), Downtime (Hours) |
| FR-DB-04 | Slitter section additionally shows: Settings (count) |
| FR-DB-05 | Metallizer section additionally shows: Cycles (count) |
| FR-DB-06 | Dispatch section shows: Total Dispatch (Tons), Export (Tons), Local (Tons) |
| FR-DB-07 | KPI cards are clickable and navigate to the relevant report with pre-filled filters |
| FR-DB-08 | Sections are hidden based on user permissions |
| FR-DB-09 | Dashboard data is fetched from `/api/dashboard/kpis` and `/api/dashboard/dispatch-kpis` |

---

# 8. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | The application shall load in under 3 seconds on a standard broadband connection |
| NFR-02 | The database shall be SQLite for simplicity and zero-configuration deployment |
| NFR-03 | All passwords shall be hashed with SHA-256 + salt (never stored in plaintext) |
| NFR-04 | User session persists in localStorage (no server-side session) |
| NFR-05 | The UI shall be responsive (desktop + mobile sidebar) |
| NFR-06 | All data tables shall handle up to 500 records with client-side rendering |
| NFR-07 | Charts shall use responsive containers for adaptive sizing |
| NFR-08 | The application supports dark mode via CSS variables (class toggling) |
| NFR-09 | The build system uses Vite for fast HMR (Hot Module Replacement) |
| NFR-10 | All API errors shall return JSON with `{ ok: false, error: string }` |

---

# 9. User Roles and Permissions

## 9.1 Roles

| Role | Description | Default Permissions |
|---|---|---|
| **admin** | Full system access | ALL 36 permissions |
| **supervisor** | Department-level oversight | None (must be granted) |
| **manager** | Read-only analytics and reports | None (must be granted) |
| **operator** | Data entry at plant level | None (must be granted) |

## 9.2 Complete Permission List (36 Permissions)

| # | Permission ID | Label | Module |
|---|---|---|---|
| 1 | `dashboard.view` | View Dashboard | Dashboard |
| 2 | `production.view` | View Entries | Production Entry |
| 3 | `production.create` | Create Entries | Production Entry |
| 4 | `production.edit` | Edit Entries | Production Entry |
| 5 | `production.delete` | Delete Entries | Production Entry |
| 6 | `targets.view` | View Targets | Targets |
| 7 | `targets.create` | Create Targets | Targets |
| 8 | `targets.edit` | Edit Targets | Targets |
| 9 | `targets.delete` | Delete Targets | Targets |
| 10 | `reports.view` | View Reports | Reports |
| 11 | `reports.export` | Export Reports | Reports |
| 12 | `analytics.view` | View Analytics | Analytics |
| 13 | `export-quantity.view` | View Export Data | Export Quantity |
| 14 | `export-quantity.create` | Create Export Data | Export Quantity |
| 15 | `export-quantity.edit` | Edit Export Data | Export Quantity |
| 16 | `export-quantity.delete` | Delete Export Data | Export Quantity |
| 17 | `packing-cost.view` | View Packing Cost | Packing Cost |
| 18 | `packing-cost.create` | Create Packing Cost | Packing Cost |
| 19 | `packing-cost.edit` | Edit Packing Cost | Packing Cost |
| 20 | `packing-cost.delete` | Delete Packing Cost | Packing Cost |
| 21 | `masters.view` | View Masters | Masters |
| 22 | `masters.create` | Create Master Records | Masters |
| 23 | `masters.edit` | Edit Master Records | Masters |
| 24 | `masters.delete` | Delete Master Records | Masters |
| 25 | `admin.view` | View Admin Panel | Admin |
| 26 | `admin.users.manage` | Manage Users | Admin |
| 27 | `admin.users.create` | Create Users | Admin |
| 28 | `admin.users.edit` | Edit Users | Admin |
| 29 | `admin.users.delete` | Delete Users | Admin |
| 30 | `admin.permissions.manage` | Manage Permissions | Admin |
| 31 | `admin.audit.view` | View Audit Logs | Admin |
| 32 | `admin.machines.manage` | Manage Machines | Admin |
| 33 | `admin.film-codes.manage` | Manage Film Codes | Admin |
| 34 | `admin.downtime.manage` | Manage Downtime Reasons | Admin |
| 35 | `admin.plants.manage` | Manage Plant Selection | Admin |
| 36 | `dispatch.view` | View Dispatch | Dispatch |
| 37 | `dispatch.create` | Add Dispatch | Dispatch |
| 38 | `dispatch.edit` | Edit Dispatch | Dispatch |
| 39 | `dispatch.delete` | Delete Dispatch | Dispatch |
| 40 | `dispatch.export` | Export Dispatch | Dispatch |

*(Note: The system actually defines 40 permission entries as shown in the source code.)*

## 9.3 Permission Resolution Logic

The effective permissions for a user are computed as:

```
effectivePermissions = ROLE_DEFAULTS[user.role] ∪ customPermissions
```

- For `admin`: `ROLE_DEFAULTS` = all 40 permission IDs
- For `supervisor`, `manager`, `operator`: `ROLE_DEFAULTS` = empty array `[]`
- Custom permissions are loaded from the `user_permissions` table at login time
- Navigation filtering: `canAccessNavPath(permissions, path)` checks if the user has any permission with the correct module prefix
- Route guards: If a user navigates to an unauthorized path, they are redirected to `/dashboard`

## 9.4 Plant Access Resolution

- Admin users can access ALL plants regardless of assignments
- Non-admin users can only access plants explicitly assigned to them via the `user_plants` table
- If a non-admin user has no plants assigned, they see "No Plants Assigned" and cannot proceed
- If a non-admin user has exactly 1 plant assigned, it is auto-selected

## 9.5 Navigation Path to Permission Mapping

| Route Path | Required Permission Prefix |
|---|---|
| `/dashboard` | `dashboard` |
| `/production` | `production` |
| `/targets` | `targets` |
| `/reports` | `reports` |
| `/analytics` | `analytics` |
| `/export-quantity` | `export-quantity` |
| `/dispatch` | `dispatch` |
| `/packing-cost` | `packing-cost` |
| `/masters` | `masters` |
| `/users` | Exact: `admin.view` |
| `/permissions` | Exact: `admin.permissions.manage` |
| `/audit-logs` | Exact: `admin.audit.view` |

---

# 10. Complete Module List

| # | Module | Route | Icon | Nav Label |
|---|---|---|---|---|
| 1 | Dashboard | `/dashboard` | LayoutDashboard | Dashboard |
| 2 | Production Entry | `/production` | ClipboardList | Production Entry |
| 3 | Targets | `/targets` | Target | Targets |
| 4 | Reports | `/reports` | FileText | Reports |
| 5 | Analytics | `/analytics` | BarChart3 | Analytics |
| 6 | Export Quantity | `/export-quantity` | Ship | Export Quantity |
| 7 | Dispatch | `/dispatch` | Truck | Dispatch |
| 8 | Packing Cost | `/packing-cost` | Package | Packing Cost |
| 9 | Masters | `/masters` | Database | Masters |
| 10 | User Management | `/users` | Users | User Management |
| 11 | Permissions | `/permissions` | Shield | Permissions |
| 12 | Audit Logs | `/audit-logs` | ScrollText | Audit Logs |

---

# 11. Every Screen with Details

## 11.1 Login Screen (`Login.tsx`)

**Purpose:** Authenticate users before granting access.

**Fields:**
| Field | Type | Required | Validation |
|---|---|---|---|
| Username | Text input | Yes | Non-empty string, converted to lowercase |
| Password | Password input (with show/hide toggle) | Yes | Non-empty string |

**Buttons:**
- **Sign In** — Calls `/api/auth/login` with username + password. Disabled when fields are empty or loading.

**Validations:**
- Both fields must be non-empty
- Server returns 401 for invalid credentials
- Error message displayed in red banner above form

**Business Logic:**
- Username is lowercased before API call
- On success, user object stored in `localStorage('ipak_user')`, navigation to `/select-plant`
- On failure, error message shown, password field cleared

**Navigation Flow:**
- Successful login → Plant Selection screen
- Failed login → Error message displayed on same screen

---

## 11.2 Plant Selection Screen (`PlantSelection.tsx`)

**Purpose:** Allow user to select which plant's data to work with.

**Displayed Plants:**
- Admin: All 4 plants (IPAK, CPAK, GPAK, PETPAK)
- Non-admin: Only plants assigned to the user

**Each plant card shows:**
- Emoji icon
- Plant name
- Plant code
- Color stripe

**Empty State:**
- If no plants are assigned, shows "No Plants Assigned" message with a Lock icon
- Provides Sign Out option

**Business Logic:**
- On plant click: `selectPlant(plant)` → saves to localStorage → navigates to `/dashboard`
- Auto-selection: If user has exactly 1 plant, it is auto-selected and screen is skipped

---

## 11.3 Layout (`Layout.tsx`)

**Purpose:** Provides the main application shell with sidebar, top bar, and content area.

**Desktop Sidebar:**
- Collapsible (expand/collapse toggle)
- Shows all permission-filtered nav items with icons
- Active item highlighted with plant color
- Sign Out button at bottom

**Mobile Sidebar:**
- Hamburger menu triggers a slide-in overlay sidebar
- Same nav items as desktop
- Tap outside or X button to close

**Top Bar:**
- Plant switcher dropdown (filtered by assigned plants)
- User avatar (first letter of name)
- User name and role display
- Click-outside handler closes plant dropdown

**Plant Switcher:**
- Shows colored dot + plant name
- Dropdown lists visible plants (admin sees all, others see assigned)
- Clicking a plant calls `switchPlant()` which updates context + localStorage

---

## 11.4 Dashboard Screen (`Dashboard.tsx`)

**Purpose:** Display high-level KPIs for quick production overview.

**See Section 12 for complete documentation.**

---

## 11.5 Production Entry Screen (`ProductionEntry.tsx`)

**Purpose:** Record daily production data for the selected plant.

**Add/Edit Form Fields:**
| Field | Type | Required | Validation |
|---|---|---|---|
| Date | Date picker | Yes | Must be a valid date |
| Shift | Button group (Morning/Evening/Night) | Yes | Must select one; default: Morning |
| Machine | Dropdown | Yes | Populated from plantConfig for current plant |
| Film Code | Dropdown | Yes | Populated from active film codes in database |
| Production (Tons) | Number input | Yes | Minimum 0, step 0.01 |
| Waste (Tons) | Number input | No | Minimum 0, step 0.01 |
| Waste % | Read-only text | Auto | (Waste / Production) × 100, formatted to 2 decimals |
| Downtime (Min) | Number input | No | Minimum 0 |
| Downtime Reason | Dropdown | Conditionally required | Required when Downtime > 0; populated from active reasons |
| Number of Settings | Number input | Required for Slitter | Minimum 0, integer |
| Number of Cycles | Number input | No (Metallizer only) | Minimum 0, integer |

**Buttons:**
- **Add Entry** (top right) — Opens form; visibility: `production.create` permission
- **Save** — Submits form (POST for new, PATCH for edit)
- **Cancel** — Closes form without saving
- **Edit** (per row) — Opens form with row data; visibility: `production.edit` permission
- **Delete** (per row) — Confirms then DELETEs; visibility: `production.delete` permission

**Validations:**
1. All required fields must be filled
2. If Downtime Minutes > 0, a Downtime Reason must be selected
3. If section is Slitter, Number of Settings is required
4. Section is auto-determined from the selected machine via `getSectionForMachine(plant, machineName)`

**Business Logic:**
- On machine selection change, the section is auto-computed
- Film Code dropdown shows only Active film codes
- Downtime Reason dropdown shows only Active reasons
- Downtime Reason dropdown only appears when Downtime > 0
- Number of Settings field only appears for Slitter section
- Number of Cycles field only appears for Metallizer section
- Payload includes `createdByName` from current user
- Waste % is computed client-side and stored with the record
- Table displays max 200 entries

**Table Columns:**
Date | Shift | Machine | Film | Prod (T) | Waste (T) | Waste % | DT (Min) | Actions

---

## 11.6 Targets Screen (`Targets.tsx`)

**Purpose:** Set daily shift-wise targets for slitter machines.

**Add/Edit Form Fields:**
| Field | Type | Required | Validation |
|---|---|---|---|
| Date | Date picker | Yes | Must be a valid date |
| Shift | Button group (Morning/Evening/Night) | Yes | Default: Morning |
| Slitter Machine | Dropdown | Yes | Only slitter machines (section='Slitter') |
| Target (Tons) | Number input | Yes | Minimum 0, step 0.01 |

**Buttons:**
- **Set Target** — Opens form; visibility: `targets.create`
- **Save** — POST or PATCH
- **Cancel** — Closes form
- **Edit** (per row) — visibility: `targets.edit`
- **Delete** (per row) — visibility: `targets.delete`

**Table Columns:**
Date | Shift | Machine | Target (T) | Actions

---

## 11.7 Dispatch Screen (`Dispatch.tsx`)

**Purpose:** Manage dispatch records with three sub-tabs.

### 11.7.1 Dispatch Entry Tab

**Form Fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| Date | Date picker | Yes | Default: today |
| Customer | Text input with autocomplete | Yes | Suggests from previous customers |
| Film Code | Dropdown | Yes | Active film codes |
| Quantity (Tons) | Number input | Yes | Step 0.01 |
| Dispatch Type | Dropdown | Yes | "Local" or "Export" |

**Table Columns:**
Date | Customer | Film Code | Quantity (T) | Type | Actions

**Features:**
- Customer autocomplete dropdown (fetched from `/api/dispatch/customers`)
- Edit and Delete buttons per row (respective permissions)
- Total records and total tons displayed

### 11.7.2 Dispatch Reports Tab

**Filters:** Plant, Date From, Date To, Customer, Film Code, Dispatch Type

**Features:**
- Search bar for text filtering
- Column sorting (click header to sort, toggle asc/desc)
- Record count and total quantity displayed
- Export buttons: CSV (Excel), PDF, Print

### 11.7.3 Dispatch Analytics Tab

**Features:**
- Type filter: All, Export Only, Local Only
- Daily Dispatch bar chart (main area)
- Customer-wise pie chart (side panel)
- Film-wise horizontal bar chart (full width)

---

## 11.8 Export Quantity Screen (`ExportQuantity.tsx`)

**Purpose:** Track export shipments by film code.

**Form Fields:**
| Field | Type | Required |
|---|---|---|
| Date | Date picker | No (default: today) |
| Film Code | Dropdown | Yes |
| Quantity (Tons) | Number input | Yes |

**KPI Card:**
- "This Month Export" — Sum of current month's export quantities in Tons

**Charts:**
- Daily Export (bar chart)
- Film-wise Export (pie chart)

**Table Columns:**
Date | Film Code | Quantity (T) | Actions

---

## 11.9 Packing Cost Screen (`PackingCost.tsx`)

**Purpose:** Track and calculate monthly packing costs per plant.

**Form Fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| Month (YYYY-MM) | Month picker | Yes | Default: current month |
| Total Production (Tons) | Number input | Yes | Users enter in Tons |
| BOM Total Cost (Rs) | Number input | No | Bill of Materials total cost |
| Actual Total Cost (Rs) | Number input | No | Actual total cost incurred |
| BOM Cost/Kg (Auto) | Disabled text | Auto | BOM Total Cost ÷ (Production × 1,000) |
| Actual Cost/Kg (Auto) | Disabled text | Auto | Actual Total Cost ÷ (Production × 1,000) |

**All Plants Summary Table:**
| Column | Description |
|---|---|
| Plant | Plant name |
| Production (T) | Total production in Tons |
| BOM Cost/Kg | BOM total cost ÷ total production in Kg |
| Actual Cost/Kg | Actual total cost ÷ total production in Kg |
| Group (Total) | Aggregated total across all plants |

**Analytics Chart:**
- Plant-wise Packing Cost Comparison (grouped bar chart)

**Records Table:**
| Column | Description |
|---|---|
| Month | Cost month (YYYY-MM) |
| Production (T) | Total production in Tons |
| BOM Cost/Kg | Rs/Kg with 4 decimal places |
| Actual Cost/Kg | Rs/Kg with 4 decimal places |
| Actions | Delete button (if permitted) |

**Calculation Logic:**
```
Total Production (Kg) = Total Production (Tons) × 1,000
BOM Packing Cost (Rs/Kg) = BOM Total Cost (Rs) ÷ Total Production (Kg)
Actual Packing Cost (Rs/Kg) = Actual Total Cost (Rs) ÷ Total Production (Kg)
```

**Note:** The `totalCostRs` field exists in the database schema (sent as 0) but is hidden from all UI surfaces.

---

## 11.10 Masters Screen (`Masters.tsx`)

**Purpose:** Manage reference/master data.

**Three Tabs:**

### Film Codes
| Field | Type | Required |
|---|---|---|
| Name | Text input | Yes |
| Description | Text input | No |

**Table:** Name | Status | Toggle

### Downtime Reasons
| Field | Type | Required |
|---|---|---|
| Name | Text input | Yes |

**Table:** Name | Status | Toggle

### Machines
| Field | Type | Required |
|---|---|---|
| Name | Text input | Yes |
| Section | Dropdown (Film Line/Slitter/Metallizer) | Yes |

**Table:** Name | Section | Status | Toggle

**Features:**
- Status toggle switches between Active/Inactive
- Only Active items appear in production entry dropdowns
- Machines are plant-scoped (associated with current plant)

---

## 11.11 User Management Screen (`Admin.tsx — UserManagement`)

**Purpose:** Manage system users.

**Form Fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| Full Name | Text input | Yes | |
| Username | Text input | Yes | Disabled on edit |
| Email | Email input | No | |
| Password | Password input | Yes (create only) | Min 6 chars; blank keeps current on edit |
| Role | Dropdown | Yes | admin, supervisor, manager, operator |

**Password Change Dialog:**
| Field | Type | Required |
|---|---|---|
| New Password | Password input | Yes |
| Confirm Password | Password input | Yes |

**Validations:**
- Passwords must match
- Minimum 6 characters
- Cannot delete the last admin user

**Table Columns:**
Name (with avatar) | Username | Role (color-coded badge) | Created | Actions (Edit, Change Password, Delete)

---

## 11.12 Permissions Screen (`Admin.tsx — Permissions` + `PermissionsManager.tsx`)

**Purpose:** Manage per-user permissions and plant access.

**Layout:** Two-panel design

**Left Panel (User List):**
- Search input
- Scrollable list of users with name, username, and role badge
- Click to select a user

**Right Panel (Access Management):**
- Two tabs: "Module Permissions" and "Plant Access"

**Module Permissions Tab:**
- For admin: All permissions checked, locked (read-only)
- For non-admin: Checkbox grid grouped by module
- "Save Permissions" button persists to `/api/permissions/:userId`

**Plant Access Tab:**
- Checkbox cards for each plant (IPAK, CPAK, GPAK, PETPAK)
- Admin: All checked, locked
- Non-admin: Selective checking
- "Save Plant Access" button persists to `/api/plants/:userId`

---

## 11.13 Audit Logs Screen (`Admin.tsx — AuditLogs`)

**Purpose:** View recent system activity.

**Table Columns:**
Timestamp | User | Action | Module | Details

**Data Source:** `/api/audit-logs` (GET)

---

# 12. Complete Dashboard Documentation

**Route:** `/dashboard`

## 12.1 Data Sources

| API Endpoint | Purpose |
|---|---|
| `/api/dashboard/kpis?plant=X&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` | Production KPIs per section |
| `/api/dashboard/dispatch-kpis?plant=X&monthDateFrom=...&monthDateTo=...&yesterdayDate=...` | Dispatch KPIs |

## 12.2 Time Periods

| Period | Date Range |
|---|---|
| This Month | 1st of current month → today |
| Yesterday | Previous day only |

## 12.3 Sections

### Film Line Section
| KPI Card | Value | Unit | Icon | Click navigates to |
|---|---|---|---|---|
| Production | Total production tons (month/yesterday) | Tons | TrendingUp | Reports → Overall Production |
| Waste | Waste % | Tons total | TrendingDown | Reports → Waste |
| Downtime | Downtime in hours | Hours | Clock | Reports → Downtime |

### Slitter Section
| KPI Card | Value | Unit |
|---|---|---|
| Production | Tons | Tons |
| Waste | % | Tons |
| Downtime | Hours | Hours |
| Settings | Total settings count | Total Settings |

### Metallizer Section
| KPI Card | Value | Unit |
|---|---|---|
| Production | Tons | Tons |
| Waste | % | Tons |
| Downtime | Hours | Hours |
| Cycles | Total cycles count | Total Cycles |

### Dispatch Section
| KPI Card | Value | Unit |
|---|---|---|
| This Month Dispatch | Total tons (Export + Local) | Tons |
| Export Customer Dispatch | Export-only tons | Tons |
| Local Customer Dispatch | Local-only tons | Tons |
| Yesterday Dispatch | Total tons | Tons |
| Yesterday Export Dispatch | Export-only tons | Tons |
| Yesterday Local Dispatch | Local-only tons | Tons |

## 12.4 KPI Card Calculations

```
Production = SUM(production_entries.production_tons) WHERE plant = X AND date IN range
Waste = SUM(production_entries.waste_tons)
Waste % = (total_waste / total_production) × 100
Downtime Hours = SUM(production_entries.downtime_minutes) / 60
Settings = SUM(production_entries.number_of_settings) WHERE section = 'Slitter'
Cycles = SUM(production_entries.number_of_cycles) WHERE section = 'Metallizer'
```

---

# 13. Reports Documentation

**Route:** `/reports`

## 13.1 Report Types

### Overall Production
**Columns:** Date, Machine, Film, Production (T), Waste (T), Waste %
**Data:** All production entries for selected filters

### Film-wise Production
**Columns:** Film, Production (T), Waste (T)
**Aggregation:** SUM by film code name

### Machine-wise Production
**Columns:** Machine, Section, Production (T)
**Aggregation:** SUM by machine name

### Waste
**Columns:** Date, Machine, Production (T), Waste (T), Waste %
**Data:** All production entries

### Downtime
**Columns:** Date, Machine, Downtime (Hours), Reason
**Data:** Entries where downtime_minutes > 0
**Additional:** Top 4 Downtime Reasons summary cards

### Target
**Columns:** Date, Shift, Machine, Target (T), Actual (T), Achievement %
**Logic:** Targets enriched by matching production entries on (date + machine + shift)

### Settings
**Columns:** Date, Machine, Settings
**Data:** Entries where section = 'Slitter'

### Cycles
**Columns:** Date, Machine, Film, Cycles
**Data:** Entries where section = 'Metallizer'

## 13.2 Filter Behavior

- **Section** filter resets Machine filter when changed
- **Machine** dropdown shows machines for selected section (or all machines if no section selected)
- **Date Range** defaults to current month (1st to today)
- **"Clear" button** resets Section, Machine, Shift to defaults

---

# 14. Masters Documentation

## 14.1 Film Codes

**Database Table:** `film_codes`

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| filmCodeName | String | Unique film code name |
| status | String | "Active" or "Inactive" |
| description | String? | Optional description |
| createdAt | DateTime | Auto-generated |
| updatedAt | DateTime | Auto-updated |

**Used by:** Production Entry, Export Quantity, Dispatch

## 14.2 Downtime Reasons

**Database Table:** `downtime_reasons`

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| reasonLabel | String | Reason text |
| status | String | "Active" or "Inactive" |
| createdAt | DateTime | Auto-generated |
| updatedAt | DateTime | Auto-updated |

**Used by:** Production Entry (when downtime > 0)

## 14.3 Machines

**Database Table:** `machines`

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| machineName | String | Machine name |
| plantId | String | Associated plant ID |
| plantName | String | Associated plant name |
| section | String | "Film Line", "Slitter", or "Metallizer" |
| status | String | "Active" or "Inactive" |
| createdAt | DateTime | Auto-generated |
| updatedAt | DateTime | Auto-updated |

**Note:** Machines are also hard-coded in `plantConfig.ts` for UI dropdowns. The database table exists for extensibility but the production entry form reads from `plantConfig.ts`.

---

# 15. Database Documentation

## 15.1 Database Engine
- **Type:** SQLite
- **Location:** `file:./prisma/dev.db`
- **ORM:** Prisma 7

## 15.2 Complete Table Reference

### Table: `users`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | Unique user identifier |
| username | TEXT | UNIQUE, NOT NULL | Login username (lowercase) |
| email | TEXT | Nullable | User email |
| name | TEXT | Nullable | Display name |
| role | TEXT | NOT NULL, DEFAULT 'operator' | User role |
| password | TEXT | NOT NULL, DEFAULT '' | Hashed password (hash:salt format) |
| created_at | DATETIME | DEFAULT NOW() | Creation timestamp |
| updated_at | DATETIME | AUTO-UPDATE | Last update timestamp |

**Relationships:** Has many audit_logs, user_permissions, user_plants

---

### Table: `machines`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | Unique identifier |
| machine_name | TEXT | NOT NULL | Machine name |
| plant_id | TEXT | NOT NULL | Associated plant ID |
| plant_name | TEXT | NOT NULL | Associated plant name |
| section | TEXT | NOT NULL | Film Line / Slitter / Metallizer |
| status | TEXT | DEFAULT 'Active' | Active / Inactive |
| created_at | DATETIME | DEFAULT NOW() | |
| updated_at | DATETIME | AUTO-UPDATE | |

**Relationships:** Has many production_entries, targets

---

### Table: `film_codes`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | |
| film_code_name | TEXT | NOT NULL | Film code name |
| status | TEXT | DEFAULT 'Active' | Active / Inactive |
| description | TEXT | Nullable | Optional description |
| created_at | DATETIME | DEFAULT NOW() | |
| updated_at | DATETIME | AUTO-UPDATE | |

**Relationships:** Has many production_entries, export_quantities, dispatches

---

### Table: `downtime_reasons`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | |
| reason_label | TEXT | NOT NULL | Reason text |
| status | TEXT | DEFAULT 'Active' | |
| created_at | DATETIME | DEFAULT NOW() | |
| updated_at | DATETIME | AUTO-UPDATE | |

**Relationships:** Has many production_entries

---

### Table: `production_entries`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | |
| entry_date | TEXT | NOT NULL | Date as YYYY-MM-DD string |
| shift | TEXT | NOT NULL | Morning / Evening / Night |
| plant_id | TEXT | NOT NULL | |
| plant_name | TEXT | NOT NULL | |
| section | TEXT | NOT NULL | Film Line / Slitter / Metallizer |
| machine_id | TEXT | Nullable, FK → machines.id | |
| machine_name | TEXT | NOT NULL | |
| film_code_id | TEXT | NOT NULL, FK → film_codes.id | |
| film_code_name | TEXT | NOT NULL | |
| production_tons | FLOAT | NOT NULL | Production in Tons |
| waste_tons | FLOAT | NOT NULL | Waste in Tons |
| waste_percent | FLOAT | Nullable | Calculated: (waste/production)×100 |
| downtime_minutes | FLOAT | DEFAULT 0 | Downtime in minutes |
| downtime_reason_id | TEXT | Nullable, FK → downtime_reasons.id | |
| downtime_reason_label | TEXT | Nullable | |
| number_of_settings | INT | Nullable | Slitter-specific |
| number_of_cycles | INT | Nullable | Metallizer-specific |
| created_by_name | TEXT | Nullable | Name of user who created |
| created_at | DATETIME | DEFAULT NOW() | |
| updated_at | DATETIME | AUTO-UPDATE | |

**Relationships:** Belongs to Machine, FilmCode, DowntimeReason

---

### Table: `targets`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | |
| target_date | TEXT | NOT NULL | YYYY-MM-DD |
| shift | TEXT | NOT NULL | Morning / Evening / Night |
| plant_id | TEXT | NOT NULL | |
| plant_name | TEXT | NOT NULL | |
| machine_id | TEXT | Nullable, FK → machines.id | |
| machine_name | TEXT | NOT NULL | Slitter machine name |
| daily_target_tons | FLOAT | NOT NULL | Target in Tons |
| created_by_name | TEXT | Nullable | |
| created_at | DATETIME | DEFAULT NOW() | |
| updated_at | DATETIME | AUTO-UPDATE | |

**Relationships:** Belongs to Machine

---

### Table: `export_quantities`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | |
| export_date | TEXT | NOT NULL | YYYY-MM-DD |
| plant_id | TEXT | NOT NULL | |
| plant_name | TEXT | NOT NULL | |
| film_code_id | TEXT | NOT NULL, FK → film_codes.id | |
| film_code_name | TEXT | NOT NULL | |
| export_quantity_tons | FLOAT | NOT NULL | Export qty in Tons |
| created_by_name | TEXT | Nullable | |
| created_at | DATETIME | DEFAULT NOW() | |
| updated_at | DATETIME | AUTO-UPDATE | |

**Relationships:** Belongs to FilmCode

---

### Table: `packing_costs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | |
| cost_month | TEXT | NOT NULL | YYYY-MM |
| plant_id | TEXT | NOT NULL | |
| plant_name | TEXT | NOT NULL | |
| total_production_tons | FLOAT | NOT NULL | Production in Tons |
| total_cost_rs | FLOAT | NOT NULL | Hidden from UI, stored as 0 |
| bom_total_cost_rs | FLOAT | NOT NULL | BOM total cost |
| actual_total_cost_rs | FLOAT | NOT NULL | Actual total cost |
| bom_packing_cost | FLOAT | Nullable | Calculated: Rs/Kg |
| actual_packing_cost | FLOAT | Nullable | Calculated: Rs/Kg |
| created_by_name | TEXT | Nullable | |
| created_at | DATETIME | DEFAULT NOW() | |
| updated_at | DATETIME | AUTO-UPDATE | |

---

### Table: `dispatches`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | |
| dispatch_date | TEXT | NOT NULL | YYYY-MM-DD |
| customer_name | TEXT | NOT NULL | Customer name |
| film_code_id | TEXT | Nullable, FK → film_codes.id | |
| film_code_name | TEXT | NOT NULL | |
| quantity_tons | FLOAT | NOT NULL | Dispatch qty in Tons |
| dispatch_type | TEXT | NOT NULL | "Local" or "Export" |
| plant_id | TEXT | NOT NULL | |
| plant_name | TEXT | NOT NULL | |
| created_by_name | TEXT | Nullable | |
| created_at | DATETIME | DEFAULT NOW() | |
| updated_at | DATETIME | AUTO-UPDATE | |

**Relationships:** Belongs to FilmCode

---

### Table: `audit_logs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | |
| user_id | TEXT | NOT NULL, FK → users.id | |
| user_name | TEXT | NOT NULL | Denormalized user name |
| action | TEXT | NOT NULL | Action performed |
| module | TEXT | NOT NULL | Module affected |
| report_name | TEXT | Nullable | |
| export_format | TEXT | Nullable | CSV / PDF / Print |
| details | TEXT | Nullable | Additional details JSON |
| created_at | DATETIME | DEFAULT NOW() | |

**Relationships:** Belongs to User

---

### Table: `user_permissions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | |
| user_id | TEXT | NOT NULL, FK → users.id | |
| permission | TEXT | NOT NULL | Permission ID string |
| created_at | DATETIME | DEFAULT NOW() | |

**Constraints:** UNIQUE(user_id, permission)

**Relationships:** Belongs to User

---

### Table: `user_plants`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PK, CUID | |
| user_id | TEXT | NOT NULL, FK → users.id | |
| plant_id | TEXT | NOT NULL | Plant identifier |
| plant_name | TEXT | NOT NULL | Plant name |
| created_at | DATETIME | DEFAULT NOW() | |

**Constraints:** UNIQUE(user_id, plant_id)

**Relationships:** Belongs to User

---

## 15.3 Entity Relationship Summary

```
User ──1:N──> AuditLog
User ──1:N──> UserPermission
User ──1:N──> UserPlant

Machine ──1:N──> ProductionEntry
Machine ──1:N──> Target

FilmCode ──1:N──> ProductionEntry
FilmCode ──1:N──> ExportQuantity
FilmCode ──1:N──> Dispatch

DowntimeReason ──1:N──> ProductionEntry
```

---

# 16. API Documentation

## 16.1 Base URL
All API endpoints are served under `/api/` on the same origin as the frontend.

## 16.2 Authentication Endpoints

### POST `/api/auth/login`
**Body:** `{ username: string, password: string }`
**Response (200):** `{ ok: true, user: { id, name, username, email, role } }`
**Response (401):** `{ ok: false, error: "Invalid username or password." }`
**Response (400):** `{ ok: false, error: "Username and password are required." }`

## 16.3 User Management Endpoints

### GET `/api/user-management/list`
**Response:** `{ ok: true, items: [{ id, name, username, email, role, createdAt }] }`

### POST `/api/user-management/create`
**Body:** `{ name, username, password, role, email? }`
**Response:** `{ ok: true, user: { id, name, username, email, role, createdAt } }`
**Errors:** 400 (missing fields), 409 (duplicate username)

### PATCH `/api/user-management/update/:id`
**Body:** `{ name?, username?, email?, role? }`
**Response:** `{ ok: true, user: { id, name, username, email, role } }`

### PATCH `/api/user-management/change-password/:id`
**Body:** `{ currentPassword?, newPassword }`
**Response:** `{ ok: true, message: "Password updated successfully." }`
**Errors:** 400 (no password), 401 (wrong current password), 404 (not found)

### DELETE `/api/user-management/delete/:id`
**Response:** `{ ok: true, message: "User deleted." }`
**Errors:** 400 (cannot delete last admin), 404 (not found)

## 16.4 Permission Endpoints

### GET `/api/permissions/:userId`
**Response:** `{ ok: true, permissions: string[] }`

### PUT `/api/permissions/:userId`
**Body:** `{ permissions: string[] }`
**Response:** `{ ok: true, message: "Permissions updated." }`

### GET `/api/permissions-all`
**Response:** `{ ok: true, items: [{ userId, permission }] }`

## 16.5 Plant Access Endpoints

### GET `/api/plants/:userId`
**Response:** `{ ok: true, plants: [{ id, name }] }`

### PUT `/api/plants/:userId`
**Body:** `{ plants: [{ id, name }] }`
**Response:** `{ ok: true, message: "Plant assignments updated." }`

## 16.6 Dashboard Endpoints

### GET `/api/dashboard/kpis`
**Query Params:** `plant`, `dateFrom`, `dateTo`
**Response:**
```json
{
  "ok": true,
  "total": { "production": N, "waste": N, "downtimeHours": N, "settings": N, "cycles": N },
  "sections": [
    { "section": "Film Line", "production": N, "waste": N, "wastePercent": N, "downtimeHours": N, "settings": N, "cycles": N },
    ...
  ]
}
```

### GET `/api/dashboard/dispatch-kpis`
**Query Params:** `plant`, `monthDateFrom`, `monthDateTo`, `yesterdayDate`
**Response:**
```json
{
  "ok": true,
  "month": { "total": N, "exportTons": N, "localTons": N },
  "yesterday": { "total": N, "exportTons": N, "localTons": N }
}
```

## 16.7 Analytics Endpoints

### GET `/api/analytics/production`
**Query Params:** `plant`, `section`, `dateFrom`, `dateTo`
**Response:** `{ ok: true, daily: [{ date, production, waste }], monthly: [{ month, production, waste }] }`

### GET `/api/analytics/downtime`
**Query Params:** `plant`, `section`, `dateFrom`, `dateTo`
**Response:** `{ ok: true, reasons: [{ reason, minutes, hours }], daily: [{ date, downtimeHours }], monthly: [{ month, downtimeHours }] }`

### GET `/api/analytics/film-wise`
**Query Params:** `plant`, `section`, `dateFrom`, `dateTo`
**Response:** `{ ok: true, films: [{ film, production, waste }], daily: [{ date, [filmCode]: tons }], filmsList: string[] }`

### GET `/api/analytics/machine-wise`
**Query Params:** `plant`, `dateFrom`, `dateTo`
**Response:** `{ ok: true, machines: [{ machine, section, production }], daily: [...], machinesList: string[] }`

### GET `/api/analytics/settings`
**Query Params:** `plant`, `dateFrom`, `dateTo`
**Response:** `{ ok: true, daily: [...], monthly: [...], byMachine: [...], machinesList: [...] }`

### GET `/api/analytics/cycles`
**Query Params:** `plant`, `dateFrom`, `dateTo`
**Response:** `{ ok: true, daily: [{ date, cycles }], monthly: [{ month, cycles }] }`

### GET `/api/analytics/target-machines`
**Query Params:** `plant`
**Response:** `{ ok: true, machines: string[] }`

### GET `/api/analytics/target`
**Query Params:** `plant`, `machine`, `dateFrom`, `dateTo`
**Response:** `{ ok: true, daily: [...], monthly: [...], targets: [{ ...target, actual, achievement }] }`

## 16.8 Reports Endpoint

### GET `/api/reports`
**Query Params:** `plant`, `reportType`, `section`, `machine`, `shift`, `dateFrom`, `dateTo`
**Response:** `{ ok: true, data: ReportRow[] }`
**Report Types:** Overall Production, Film-wise Production, Machine-wise Production, Waste, Downtime, Target, Settings, Cycles

## 16.9 Dispatch Endpoints

### GET `/api/dispatch/customers`
**Query Params:** `plant`
**Response:** `{ ok: true, items: string[] }`

### GET `/api/dispatch/report`
**Query Params:** `plant`, `dateFrom`, `dateTo`, `customer`, `filmCode`, `dispatchType`, `search`, `sort`, `order`
**Response:** `{ ok: true, data: DispatchRow[] }`

### GET `/api/dispatch/analytics`
**Query Params:** `plant`, `dateFrom`, `dateTo`, `dispatchType`
**Response:** `{ ok: true, daily: [...], customerWise: [...], filmWise: [...], totalTons: N, totalRecords: N }`

## 16.10 CRUD Endpoints (Auto-Generated)

Each Prisma model gets CRUD routes:

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/{model-plural}` | List all (supports `?fieldName=value` filtering) |
| GET | `/api/{model-plural}/:id` | Get by ID |
| POST | `/api/{model-plural}` | Create new record |
| PATCH | `/api/{model-plural}/:id` | Update record |
| DELETE | `/api/{model-plural}/:id` | Delete record |

**Models with CRUD routes:**
- `/api/users`
- `/api/machines`
- `/api/film-codes`
- `/api/downtime-reasons`
- `/api/production-entries`
- `/api/targets`
- `/api/export-quantities`
- `/api/packing-costs`
- `/api/dispatches`
- `/api/audit-logs`

---

# 17. Complete Application Workflow

## 17.1 Initial Access
1. User opens application URL
2. System checks `localStorage` for saved session
3. If no session → Login screen
4. User enters credentials → POST `/api/auth/login`
5. On success → Plant Selection screen
6. User selects a plant → Saved to context + localStorage
7. Dashboard loads with plant-scoped data

## 17.2 Daily Production Workflow
1. Operator navigates to Production Entry
2. Clicks "Add Entry"
3. Fills in: Date, Shift, Machine, Film Code, Production Tons
4. Optionally enters: Waste Tons, Downtime Minutes
5. If downtime > 0 → selects Downtime Reason
6. If Slitter machine → enters Number of Settings
7. If Metallizer machine → enters Number of Cycles
8. Clicks Save → POST `/api/production-entries`
9. Entry appears in table

## 17.3 Target Setting Workflow
1. Supervisor navigates to Targets
2. Clicks "Set Target"
3. Selects: Date, Shift, Slitter Machine
4. Enters: Target in Tons
5. Clicks Save → POST `/api/targets`

## 17.4 Dispatch Workflow
1. User navigates to Dispatch
2. On Dispatch Entry tab, clicks "Add New Dispatch"
3. Fills in: Date, Customer (with autocomplete), Film Code, Quantity, Type
4. Clicks Save → POST `/api/dispatches`
5. Record appears in entry table
6. Can switch to Reports tab for filtered views
7. Can switch to Analytics tab for charts

---

# 18. Production Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Film Line   │───>│   Slitter    │───>│  Metallizer  │
│  (Primary    │    │  (Secondary  │    │  (Finishing) │
│   Production)│    │   Processing)│    │              │
└──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
  ┌─────────┐        ┌─────────┐         ┌─────────┐
  │ Produce │        │ Process │         │ Metallize│
  │ Film    │        │ Film    │         │ Film     │
  └────┬────┘        └────┬────┘         └────┬────┘
       │                   │                   │
       ▼                   ▼                   ▼
  Waste + DT          Settings              Cycles
  Recorded            Recorded              Recorded
```

## Production Sections per Plant

| Plant | Film Line | Slitter Machines | Metallizer |
|---|---|---|---|
| **IPAK** | Film Line | Primary Slitter, Secondary Slitter 1, Secondary Slitter 2, Metallizer Slitter | Metallizer |
| **CPAK** | Film Line | Cast Slitter | Metallizer |
| **GPAK** | Film Line | Primary Slitter, Secondary Slitter, Metallizer Slitter | Metallizer |
| **PETPAK** | Film Line | Primary Slitter, Secondary Slitter | Metallizer |

---

# 19. Data Entry Flow

## 19.1 Production Data Entry
1. Select Plant → Select Date → Select Shift → Select Machine
2. System auto-determines Section from Machine
3. Select Film Code → Enter Production Tons
4. Enter Waste (optional) → Waste % auto-calculated
5. Enter Downtime (optional) → If > 0, select Reason (mandatory)
6. If Slitter: enter Number of Settings (mandatory)
7. If Metallizer: enter Number of Cycles (optional)
8. Save → Record created with `createdByName`

## 19.2 Target Data Entry
1. Select Date → Select Shift → Select Slitter Machine → Enter Target Tons
2. Save → Record created

## 19.3 Dispatch Data Entry
1. Select Date → Enter Customer (with autocomplete) → Select Film Code
2. Enter Quantity → Select Dispatch Type (Local/Export)
3. Save → Record created

## 19.4 Export Quantity Data Entry
1. Select Date → Select Film Code → Enter Quantity Tons
2. Save → Record created

## 19.5 Packing Cost Data Entry
1. Select Month → Enter Production Tons → Enter BOM Total Cost → Enter Actual Total Cost
2. BOM Cost/Kg and Actual Cost/Kg auto-calculate (visible in real-time)
3. Save → Record created

---

# 20. User Journey

## 20.1 New Admin Setup
1. System seeds admin user (username: `admin`, password: `admin123`)
2. Admin logs in
3. Admin navigates to User Management → Creates operators/supervisors/managers
4. Admin navigates to Permissions → Assigns plant access and module permissions
5. Admin navigates to Masters → Creates Film Codes, Downtime Reasons, Machines

## 20.2 Operator Daily Flow
1. Login → Select Plant → Dashboard (overview)
2. Navigate to Production Entry → Add daily entries
3. Navigate to Dispatch → Add dispatch records
4. Navigate to Export Quantity → Record exports
5. End of day → Sign out

## 20.3 Supervisor Weekly Flow
1. Login → Select Plant → Dashboard (review KPIs)
2. Navigate to Targets → Set targets for coming week
3. Navigate to Reports → Generate and review production reports
4. Navigate to Analytics → Review trends

## 20.4 Manager Review Flow
1. Login → Select Plant → Dashboard
2. Navigate to Analytics → Review section-wise analytics
3. Navigate to Reports → Generate comprehensive reports
4. Navigate to Packing Cost → Review cost metrics

---

# 21. Error Handling

## 21.1 Client-Side Error Handling

| Scenario | Behavior |
|---|---|
| Network failure on login | "Network error. Please try again." |
| Invalid credentials | "Invalid username or password." |
| API returns error | Error message from `body.error.message` or HTTP status |
| Save failure | Red banner with error details, auto-clears after 4 seconds |
| Delete confirmation | Browser `confirm()` dialog |
| Missing required fields | "Please fill all required fields." |

## 21.2 Server-Side Error Handling

| Scenario | HTTP Status | Response |
|---|---|---|
| Missing required fields | 400 | `{ ok: false, error: "..." }` |
| Authentication failure | 401 | `{ ok: false, error: "Invalid username or password." }` |
| Duplicate username | 409 | `{ ok: false, error: "A user with this username already exists." }` |
| Last admin delete attempt | 400 | `{ ok: false, error: "Cannot delete the last admin user." }` |
| Password mismatch | 401 | `{ ok: false, error: "Current password is incorrect." }` |
| Database error | 500 | `{ ok: false, error: error message }` |

---

# 22. Security Features

| Feature | Implementation |
|---|---|
| Password Hashing | SHA-256 with random 16-byte salt, stored as `hash:salt` |
| Password Input | Show/hide toggle, minimum 6 characters |
| Role-Based Access | 4 roles with permission-based module access |
| Plant Scoping | All data queries are plant-filtered |
| Navigation Guards | Hidden nav items for unauthorized modules |
| Route Guards | URL navigation blocked if permission missing; redirect to `/dashboard` |
| Admin Protection | Cannot delete the last admin user |
| Username Uniqueness | Enforced at database level |
| Client Bundle | No secrets in client-side code |

**Note:** There is no JWT/session token. Authentication state is managed via `localStorage`. The session persists until explicitly logged out or localStorage is cleared.

---

# 23. Audit Logs

## 23.1 Schema
```
AuditLog {
  id, userId, userName, action, module, reportName, exportFormat, details, createdAt
}
```

## 23.2 Usage
- Audit logs are designed for tracking user actions (report exports, data changes)
- Currently, the system logs activity in the `audit_logs` table
- Viewable only by admin users at `/audit-logs`

---

# 24. Calculations and Formulas

## 24.1 Waste Percentage
```
waste_percent = (waste_tons / production_tons) × 100
```
- Display: Red badge if > 5%, green badge otherwise
- Precision: 1 decimal in table, 2 decimals in form

## 24.2 Target Achievement
```
achievement = (actual_production / target_tons) ≥ 100
```
- Display: Green if ≥ 100%, orange otherwise

## 24.3 Packing Cost (Rs/Kg)
```
total_production_kg = total_production_tons × 1000
bom_packing_cost = bom_total_cost_rs / total_production_kg
actual_packing_cost = actual_total_cost_rs / total_production_kg
```
- Display: 4 decimal places

## 24.4 Dashboard KPIs
```
total_production = SUM(production_tons) WHERE plant = X AND date IN range
total_waste = SUM(waste_tons)
waste_percent = (total_waste / total_production) × 100
downtime_hours = SUM(downtime_minutes) / 60
settings = SUM(number_of_settings) WHERE section = 'Slitter'
cycles = SUM(number_of_cycles) WHERE section = 'Metallizer'
```

## 24.5 Dispatch KPIs
```
total_dispatch = SUM(quantity_tons) WHERE plant = X AND date IN range
export_dispatch = SUM(quantity_tons) WHERE dispatch_type = 'Export'
local_dispatch = SUM(quantity_tons) WHERE dispatch_type = 'Local'
```

## 24.6 Target-Actual Matching
```
actual = SUM(production_tons) WHERE entry_date = target_date AND machine_name = target_machine AND shift = target_shift
achievement_percent = (actual / daily_target_tons) × 100
```

---

# 25. Filters and Search Logic

## 25.1 Production Entry
- Filtered by `plantName` query parameter (implicit from selected plant)

## 25.2 Reports
- `plant` — Plant name
- `reportType` — One of 8 report types
- `section` — Film Line, Slitter, or Metallizer
- `machine` — Machine name (filtered by section)
- `shift` — Morning, Evening, or Night
- `dateFrom` / `dateTo` — Date range (YYYY-MM-DD strings, string comparison)

## 25.3 Analytics
- `plant` — Plant name
- `section` — For production/downtime/film-wise endpoints
- `dateFrom` / `dateTo` — Date range

## 25.4 Dispatch Reports
- `plant`, `dateFrom`, `dateTo`, `customer`, `filmCode`, `dispatchType`
- Client-side text search across customer, film code, date, type
- Client-side column sorting (asc/desc)

## 25.5 Packing Cost
- Client-side search by month string
- Client-side sort by any column (asc/desc)

---

# 26. Import/Export Features

## 26.1 Dispatch CSV Export
- Generates CSV with headers: Date, Customer, Film Code, Quantity (Tons), Type, Plant
- Downloads as `dispatch-report-YYYY-MM-DD.csv`

## 26.2 Dispatch PDF Export
- Opens a new browser window with formatted HTML table
- Auto-triggers print dialog

## 26.3 Dispatch Print
- Opens a new browser window with formatted HTML table
- Auto-triggers print dialog (no auto-close)

---

# 27. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (SPA)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  React 19   │  │  Tailwind   │  │  Recharts   │  │
│  │  Components │  │  CSS v4     │  │  Charts     │  │
│  └──────┬──────┘  └─────────────┘  └─────────────┘  │
│         │                                             │
│  ┌──────┴──────────────────────────────────────────┐  │
│  │              Hash Router (#/path)               │  │
│  └──────┬──────────────────────────────────────────┘  │
│         │                                             │
│  ┌──────┴──────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ AuthContext  │  │PlantContext │  │ permissions │  │
│  │ (login/session)│(selected plant)│  │ (RBAC)     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ fetch('/api/...')
┌──────────────────────┴──────────────────────────────┐
│                 Hono Server (API)                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │              custom-routes.ts                    │ │
│  │  Auth · Users · Permissions · Dashboard         │ │
│  │  Analytics · Reports · Dispatch · Seed          │ │
│  └──────────────────────┬──────────────────────────┘ │
│  ┌──────────────────────┴──────────────────────────┐ │
│  │           Auto-generated CRUD routes             │ │
│  │  /api/users · /api/machines · /api/film-codes   │ │
│  │  /api/production-entries · /api/targets          │ │
│  │  /api/export-quantities · /api/packing-costs    │ │
│  │  /api/dispatches · /api/audit-logs              │ │
│  └──────────────────────┬──────────────────────────┘ │
│  ┌──────────────────────┴──────────────────────────┐ │
│  │              Prisma 7 ORM                        │ │
│  └──────────────────────┬──────────────────────────┘ │
└─────────────────────────┬───────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │      SQLite DB        │
              │   prisma/dev.db       │
              └───────────────────────┘
```

---

# 28. Folder Structure

```
project/
├── prisma/
│   ├── schema.prisma          # Database schema (11 models)
│   └── dev.db                 # SQLite database file
├── src/
│   ├── components/
│   │   ├── ui/                # shadcn/ui components (20+ files)
│   │   │   ├── accordion.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── tooltip.tsx
│   │   ├── Admin.tsx          # UserManagement + Permissions + AuditLogs
│   │   ├── Analytics.tsx      # Section-based analytics (FilmLine/Slitter/Metallizer/Targets)
│   │   ├── Dashboard.tsx      # KPI dashboard with section-wise cards
│   │   ├── Dispatch.tsx       # Dispatch module (Entry/Reports/Analytics tabs)
│   │   ├── ExportQuantity.tsx # Export quantity tracking
│   │   ├── Layout.tsx         # App shell (sidebar + top bar + content)
│   │   ├── Login.tsx          # Authentication form
│   │   ├── Masters.tsx        # Film Codes / Downtime Reasons / Machines
│   │   ├── PackingCost.tsx    # Packing cost with Rs/Kg calculation
│   │   ├── PermissionsManager.tsx # Per-user permissions and plant access
│   │   ├── PlantSelection.tsx # Plant picker screen
│   │   ├── ProductionEntry.tsx # Production data entry form + table
│   │   ├── Reports.tsx        # Report generation with filters
│   │   └── Targets.tsx        # Target setting for slitter machines
│   ├── lib/
│   │   ├── AuthContext.tsx     # Authentication state + login/logout/permissions
│   │   ├── PlantContext.tsx    # Plant selection state + validation
│   │   ├── cn.ts              # Tailwind class merge utility
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── permissions.ts     # RBAC definitions + helper functions
│   │   └── plantConfig.ts     # Plant definitions + machine configs + constants
│   ├── generated/             # Auto-generated by Prisma/Shogo
│   │   ├── prisma/            # Prisma client types
│   │   ├── *.routes.ts        # Auto-generated CRUD routes
│   │   └── *.hooks.ts         # Auto-generated hooks (user-editable)
│   ├── App.tsx                # Root component with hash router
│   └── index.css              # Tailwind + shadcn theme variables
├── custom-routes.ts           # Custom Hono API routes (auth, dashboard, analytics, reports, dispatch)
├── server.tsx                 # Auto-generated Hono server (DO NOT EDIT)
├── package.json               # Dependencies
├── prisma.config.ts           # Prisma configuration
└── .shogo/                    # Runtime configuration
```

---

# 29. Dependencies

## 29.1 Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| react | ^19.0.0 | UI framework |
| react-dom | ^19.0.0 | React DOM renderer |
| recharts | ^2.15.3 | Charts (Bar, Line, Pie) |
| lucide-react | ^0.563.0 | Icons |
| hono | ^4.0.0 | Server-side HTTP framework |
| @prisma/client | ^7.3.0 | Database ORM client |
| @prisma/adapter-libsql | ^7.3.0 | SQLite adapter |
| @shogo-ai/sdk | ^1.10.0 | Shogo runtime SDK |
| class-variance-authority | ^0.7.1 | Component variant utility |
| clsx | ^2.1.1 | Class name utility |
| tailwind-merge | ^3.4.0 | Tailwind class deduplication |
| tailwindcss-animate | ^1.0.7 | Animation utilities |
| radix-ui | ^1.4.3 | UI primitives |
| mobx | ^6.13.0 | State management |
| mobx-react-lite | ^4.0.0 | MobX React bindings |

## 29.2 Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| typescript | ^5.0.0 | Type checking |
| vite | ^7.3.1 | Build tool |
| @vitejs/plugin-react | ^5.1.2 | Vite React plugin |
| vite-tsconfig-paths | ^5.0.0 | TypeScript path resolution |
| prisma | ^7.3.0 | Prisma CLI |
| @prisma/internals | ^7.3.0 | Prisma internals |
| tailwindcss | ^4.1.18 | CSS framework |
| @tailwindcss/postcss | ^4.1.18 | PostCSS plugin |
| shadcn | ^3.8.4 | Component generator |
| postcss | ^8.5.6 | CSS processor |
| tw-animate-css | ^1.4.0 | Tailwind animation CSS |
| concurrently | ^8.2.0 | Parallel process runner |
| @types/react | ^19.0.0 | React type definitions |
| @types/react-dom | ^19.0.0 | React DOM type definitions |
| @types/node | ^22.0.0 | Node.js type definitions |

---

# 30. Configuration

## 30.1 Plant Configuration (plantConfig.ts)

### Plants
| ID | Name | Code | Color | Emoji |
|---|---|---|---|---|
| ipak | IPAK | IPK | #16a34a (green) | 🟢 |
| cpak | CPAK | CPK | #dc2626 (red) | 🔴 |
| gpak | GPAK | GPK | #2563eb (blue) | 🔵 |
| petpak | PETPAK | PPK | #ea580c (orange) | 🟠 |

### Machines per Plant
| Plant | Machines |
|---|---|
| IPAK | Film Line, Primary Slitter, Secondary Slitter 1, Secondary Slitter 2, Metallizer Slitter, Metallizer |
| CPAK | Film Line, Cast Slitter, Metallizer |
| GPAK | Film Line, Primary Slitter, Secondary Slitter, Metallizer Slitter, Metallizer |
| PETPAK | Film Line, Primary Slitter, Secondary Slitter, Metallizer |

### Constants
```
SHIFTS = ['Morning', 'Evening', 'Night']
SECTIONS = ['Film Line', 'Slitter', 'Metallizer']
ROLES = ['admin', 'supervisor', 'manager', 'operator']
REPORT_TYPES = ['Overall Production', 'Film-wise Production', 'Machine-wise Production', 'Waste', 'Downtime', 'Target', 'Settings', 'Cycles']
ANALYTICS_TABS = ['Film Line', 'Slitter', 'Metallizer', 'Targets']
```

## 30.2 Theme Configuration (index.css)

- Light mode CSS variables defined in `:root`
- Dark mode CSS variables defined in `.dark` class
- Uses oklch color space
- Border radius: 0.625rem base
- Font: System font stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, ...)

---

# 31. Installation Guide

## Prerequisites
- Node.js 18+ or Bun
- Git

## Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd project

# 2. Install dependencies
bun install
# or
npm install

# 3. Initialize database
bunx prisma generate
bunx prisma db push

# 4. Seed admin user (optional)
curl -X POST http://localhost:3001/api/seed

# 5. Start development server
bun run dev
# or for the runtime, use the Shogo launcher
```

## Default Admin Credentials
- **Username:** `admin`
- **Password:** `admin123`

**IMPORTANT:** Change the admin password immediately after first login.

---

# 32. Deployment Guide

The application is deployed as a Shogo-managed pod:

1. The Shogo runtime builds the Vite SPA automatically
2. The Hono server (`server.tsx` + `custom-routes.ts`) starts at port 3001
3. The SPA is served at the pod's public URL
4. API calls from the SPA go to `/api/*` on the same origin
5. SQLite database persists at `prisma/dev.db`

---

# 33. Backup and Restore

## Backup
```bash
# Copy the SQLite database
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d)
```

## Restore
```bash
# Stop the server
# Replace the database
cp prisma/dev.db.backup.YYYYMMDD prisma/dev.db
# Restart the server
```

---

# 34. Known Limitations

1. **No JWT/Session tokens** — Authentication relies solely on localStorage, which can be cleared by the browser.
2. **No real-time updates** — Data requires manual refresh.
3. **No concurrent editing protection** — Two users editing the same record simultaneously may cause data loss.
4. **SQLite limitations** — Not suitable for high-concurrency multi-user scenarios.
5. **No data validation at database level** — Most validation is client-side only.
6. **Audit logging is minimal** — Not all actions are logged.
7. **No import functionality** — Data must be entered manually.
8. **No mobile-responsive optimization** — Designed primarily for desktop use.
9. **Password hashing uses SHA-256** — bcrypt or Argon2 would be more secure.
10. **No email notifications** — System is entirely pull-based.

---

# 35. Future Enhancements

1. Migrate to PostgreSQL for multi-user scalability
2. Add JWT-based authentication with refresh tokens
3. Implement WebSocket for real-time dashboard updates
4. Add Excel/CSV import for bulk data entry
5. Add email/SMS notifications for targets and dispatches
6. Implement approval workflows for data entry
7. Add mobile-responsive design
8. Implement data backup automation
9. Add multi-language support (Urdu, English)
10. Add shift-wise scheduling and attendance tracking

---

# 36. Complete Business Rules

| # | Rule |
|---|---|
| BR-01 | All production data is scoped to the currently selected plant |
| BR-02 | Admin can access all plants; non-admin only assigned plants |
| BR-03 | Waste % = (Waste Tons / Production Tons) × 100 |
| BR-04 | Waste > 5% is flagged as high (red indicator) |
| BR-05 | Downtime Reason is mandatory when Downtime > 0 minutes |
| BR-06 | Number of Settings is required for Slitter section entries |
| BR-07 | Number of Cycles is optional for Metallizer section entries |
| BR-08 | Only Slitter machines appear in the Targets form |
| BR-09 | Achievement % = (Actual Production / Target) × 100 |
| BR-10 | Packing Cost uses Tons → Kg conversion: 1 Ton = 1,000 Kg |
| BR-11 | BOM Cost/Kg = BOM Total Cost ÷ (Production Tons × 1,000) |
| BR-12 | Actual Cost/Kg = Actual Total Cost ÷ (Production Tons × 1,000) |
| BR-13 | Only Active master records appear in data entry dropdowns |
| BR-14 | Last admin user cannot be deleted |
| BR-15 | Navigation items are filtered by user permissions |
| BR-16 | Route guards redirect unauthorized users to dashboard |
| BR-17 | Username is unique (case-insensitive) |
| BR-18 | Password minimum 6 characters |
| BR-19 | Admin has all 40 permissions by default (locked) |
| BR-20 | Non-admin starts with zero permissions (must be granted) |
| BR-21 | Plant access is separate from module permissions |
| BR-22 | Single-plant users are auto-select their plant |
| BR-23 | Section is auto-determined from the selected machine |
| BR-24 | Today's date is the default for all date fields |
| BR-25 | Current month is the default date range for analytics/reports |
| BR-26 | Customer names in dispatch support autocomplete |
| BR-27 | Machine dropdown in reports filters by selected section |
| BR-28 | Target-actual matching uses (date + machine + shift) composite key |

---

# 37. Complete Data Flow

```
User Login
    │
    ▼
Plant Selection ──> Plant Context (selectedPlant)
    │
    ├──> Dashboard: KPIs fetched with plant + date range
    │       ├── /api/dashboard/kpis?plant=X
    │       └── /api/dashboard/dispatch-kpis?plant=X
    │
    ├──> Production Entry: CRUD on production_entries table
    │       ├── GET /api/production-entries?plantName=X
    │       ├── POST /api/production-entries
    │       ├── PATCH /api/production-entries/:id
    │       └── DELETE /api/production-entries/:id
    │
    ├──> Targets: CRUD on targets table
    │       ├── GET /api/targets?plantName=X
    │       ├── POST /api/targets
    │       ├── PATCH /api/targets/:id
    │       └── DELETE /api/targets/:id
    │
    ├──> Dispatch: CRUD + aggregation
    │       ├── GET /api/dispatches?plantName=X
    │       ├── POST /api/dispatches
    │       ├── PATCH /api/dispatches/:id
    │       ├── DELETE /api/dispatches/:id
    │       ├── GET /api/dispatch/customers?plant=X
    │       ├── GET /api/dispatch/report?...
    │       └── GET /api/dispatch/analytics?...
    │
    ├──> Export Quantity: CRUD + charts
    │       ├── GET /api/export-quantities?plantName=X
    │       ├── POST /api/export-quantities
    │       └── DELETE /api/export-quantities/:id
    │
    ├──> Packing Cost: CRUD + calculation
    │       ├── GET /api/packing-costs?plantName=X
    │       ├── POST /api/packing-costs
    │       └── DELETE /api/packing-costs/:id
    │
    ├──> Analytics: Read-only aggregation
    │       ├── /api/analytics/production?...
    │       ├── /api/analytics/downtime?...
    │       ├── /api/analytics/film-wise?...
    │       ├── /api/analytics/settings?...
    │       ├── /api/analytics/cycles?...
    │       ├── /api/analytics/target?...
    │       └── /api/analytics/target-machines?...
    │
    ├──> Reports: Read-only with filters
    │       └── /api/reports?...
    │
    └──> Masters: CRUD on master tables
            ├── GET/POST /api/film-codes
            ├── GET/POST /api/downtime-reasons
            └── GET/POST /api/machines
```

---

# 38. Screen-by-Screen User Manual

See Section 11 for complete per-screen documentation.

**Quick Reference:**

| Screen | URL | Primary Action |
|---|---|---|
| Login | `#/login` | Enter credentials |
| Plant Selection | `#/select-plant` | Choose a plant |
| Dashboard | `#/dashboard` | View KPIs |
| Production Entry | `#/production` | Enter production data |
| Targets | `#/targets` | Set slitter targets |
| Reports | `#/reports` | Generate reports |
| Analytics | `#/analytics` | View charts |
| Export Quantity | `#/export-quantity` | Track exports |
| Dispatch | `#/dispatch` | Manage dispatches |
| Packing Cost | `#/packing-cost` | Enter packing costs |
| Masters | `#/masters` | Manage reference data |
| User Management | `#/users` | Manage users |
| Permissions | `#/permissions` | Assign access |
| Audit Logs | `#/audit-logs` | View activity |

---

# 39. Administrator Manual

## 39.1 Initial Setup
1. Login with admin / admin123
2. Navigate to Masters → Create Film Codes, Downtime Reasons, Machines for each plant
3. Navigate to User Management → Create users with appropriate roles
4. Navigate to Permissions → Assign plant access and module permissions to each user

## 39.2 User Management
- Create users with name, username, email, password, and role
- Change passwords via the Key icon
- Delete users (cannot delete last admin)
- Edit user details (name, email, role)

## 39.3 Permissions Management
1. Select a user from the left panel
2. **Module Permissions tab:** Check/uncheck permissions per module
3. **Plant Access tab:** Check/uncheck plants the user can access
4. Click Save after each section

## 39.4 Master Data Maintenance
- Toggle items between Active/Inactive status
- Inactive items are hidden from data entry dropdowns
- Add new Film Codes with descriptions
- Add new Downtime Reasons
- Add new Machines with section assignment

---

# 40. Technical Notes

1. **Hash Routing:** The app uses `window.location.hash` for client-side routing (e.g., `#/dashboard`). No server-side routing configuration needed.
2. **Prisma Regeneration:** When `prisma/schema.prisma` is modified, the system auto-runs `shogo generate` and `prisma db push`, then restarts the server.
3. **Auto-Generated Files:** Never manually edit files in `src/generated/` or `server.tsx`. Custom API routes go in `custom-routes.ts`.
4. **Build Watch:** Vite runs in `--watch` mode. File changes trigger automatic rebuilds.
5. **Client-Side Permissions:** Effective permissions are computed client-side as `ROLE_DEFAULTS[role] ∪ customPermissions`. The admin role gets ALL permissions by default.
6. **Plant Context:** The selected plant is persisted in `localStorage('selectedPlant')` and validated against assigned plants on load.
7. **API Response Format:** All custom routes return `{ ok: boolean, data?: any, error?: string }`. Auto-generated CRUD routes return `{ ok: true, items: [...] }`.

---

# 41. Assumptions

1. The application serves a single-tenant manufacturing group (IPAK, CPAK, GPAK, PETPAK).
2. Production is tracked in Tons (metric tons).
3. All production happens in 3 shifts: Morning, Evening, Night.
4. The 3 production sections (Film Line, Slitter, Metallizer) are consistent across all plants.
5. Packing cost calculations assume 1 Ton = 1,000 Kg.
6. The admin user is seeded automatically on first run.
7. SQLite is sufficient for the expected data volume.
8. The application is accessed via a modern web browser.
9. Network connectivity is available for API calls.
10. Users have basic computer literacy for data entry.

---

# 42. Appendix

## A. Plant Color Codes

| Plant | Primary Color | Light Color | Dark Color | Text Color |
|---|---|---|---|---|
| IPAK | #16a34a | #dcfce7 | #15803d | #166534 |
| CPAK | #dc2626 | #fee2e2 | #b91c1c | #991b1b |
| GPAK | #2563eb | #dbeafe | #1d4ed8 | #1e40af |
| PETPAK | #ea580c | #fed7aa | #c2410c | #9a3412 |

## B. Chart Color Palettes

**Downtime:** #ef4444, #f59e0b, #8b5cf6, #3b82f6, #10b981, #ec4899, #14b8a6, #f97316, #6366f1, #84cc16

**Film:** #2563eb, #16a34a, #f59e0b, #ef4444, #8b5cf6, #0ea5e9, #ec4899, #14b8a6, #f97316, #6366f1

**Machine:** #2563eb, #16a34a, #f59e0b, #ef4444, #8b5cf6, #0ea5e9

## C. Default Seed Data

| Field | Value |
|---|---|
| Username | admin |
| Password | admin123 |
| Name | Admin |
| Role | admin |
| Plants | All 4 |
| Permissions | All 40 |

## D. API Response Format

All custom routes follow:
```json
{ "ok": true, "data": ..., "message": "...", "error": "..." }
```

All auto-generated CRUD routes follow:
```json
{ "ok": true, "items": [...] }
```

---

**End of Document**
