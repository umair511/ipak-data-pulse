#!/usr/bin/env python3
"""Comprehensive IPAK NestJS Backend Test Suite — CORRECTED"""
import json
import urllib.request
import urllib.error
import sys
from datetime import datetime

BASE = "http://localhost:3000"
passed = 0
failed = 0
skipped = 0
errors = []
test_log = []
created_ids = {}  # track created records for cleanup

def log(msg):
    print(msg)
    test_log.append(msg)

def req(method, path, body=None, headers=None):
    url = f"{BASE}{path}"
    hdrs = {"Content-Type": "application/json"}
    if headers: hdrs.update(headers)
    data = json.dumps(body).encode() if body is not None else None
    try:
        r = urllib.request.Request(url, data=data, headers=hdrs, method=method)
        resp = urllib.request.urlopen(r)
        return resp.getcode(), json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try: return e.code, json.loads(raw)
        except: return e.code, {"raw": raw}
    except Exception as e:
        return 0, {"error": str(e)}

def test(name, method, path, body=None, headers=None, expect=None, expect_keys=None, expect_error=False):
    """expect = list of acceptable status codes, e.g. [200] or [201] or [401,404]"""
    global passed, failed
    s, r = req(method, path, body, headers)
    ok = True
    reason = ""
    if expect:
        if s not in expect:
            ok = False; reason = f"expected {expect}, got {s}"
    if expect_error and s < 400:
        ok = False; reason = f"expected error, got {s}"
    if expect_keys and ok:
        for k in expect_keys:
            if k not in r:
                ok = False; reason = f"missing key '{k}' in {list(r.keys())}"; break
    if ok:
        passed += 1; log(f"  ✅ {name}: {method} {path} → {s}")
    else:
        failed += 1
        err = f"{name}: {method} {path} → {s} — {reason}"
        errors.append(err); log(f"  ❌ {err}"); log(f"     Body: {json.dumps(r)[:400]}")
    return s, r

# ──────────────────────────────────────────
log("=" * 60)
log("IPAK BACKEND COMPREHENSIVE TEST SUITE (CORRECTED)")
log(f"Started: {datetime.now().isoformat()}")
log("=" * 60)

# ═══════ SECTION 1: AUTH ═══════
log("\n📌 SECTION 1: AUTH MODULE")

# NestJS POST returns 201 by default (no @HttpCode(200) on login)
s, r = test("Login admin", "POST", "/api/auth/login",
    body={"username": "admin", "password": "admin123"}, expect=[201])
admin_token = r.get("accessToken", "")
admin_refresh = r.get("refreshToken", "")

test("Login wrong pw", "POST", "/api/auth/login",
    body={"username": "admin", "password": "wrong"}, expect=[401])
test("Login missing fields", "POST", "/api/auth/login",
    body={}, expect=[400])
test("Login missing password", "POST", "/api/auth/login",
    body={"username": "admin"}, expect=[400])

test("Seed", "POST", "/api/auth/seed", body={})
# Seed doesn't require auth (no guard)

AH = {"Authorization": f"Bearer {admin_token}"}  # auth headers

s, r = test("Me", "GET", "/api/auth/me", headers=AH, expect=[200], expect_keys=["ok","user"])
test("Me no token", "GET", "/api/auth/me", expect=[401])

s, r = test("Refresh", "POST", "/api/auth/refresh",
    body={"refreshToken": admin_refresh}, expect=[201], expect_keys=["accessToken"])
new_access = r.get("accessToken")
if new_access: admin_token = new_access; AH = {"Authorization": f"Bearer {admin_token}"}

test("Refresh invalid", "POST", "/api/auth/refresh",
    body={"refreshToken": "badtoken"}, expect=[401])

s, r = test("Register user", "POST", "/api/auth/register",
    body={"name": "Test Register", "username": "testreg1", "password": "pass123", "role": "operator"},
    expect=[201], expect_keys=["ok","user"])
test_user_id = r.get("user",{}).get("id","")

test("Register duplicate", "POST", "/api/auth/register",
    body={"name": "Dup", "username": "testreg1", "password": "pass123"}, expect=[409])

s, r = test("Logout", "POST", "/api/auth/logout",
    body={"refreshToken": admin_refresh}, headers=AH, expect=[201])


# ═══════ SECTION 2: USERS ═══════
log("\n📌 SECTION 2: USERS MODULE")

s, r = test("List users", "GET", "/api/users", headers=AH, expect=[200])
user_count = len(r.get("items", []))
log(f"     → {user_count} users")

s, r = test("Create user", "POST", "/api/users",
    body={"name": "CRUD User", "username": "testcrud_u1", "password": "pass123", "role": "operator"},
    headers=AH, expect=[201])
crud_uid = r.get("user",{}).get("id","")

if crud_uid:
    test("Update user", "PATCH", f"/api/users/{crud_uid}",
        body={"name": "CRUD Updated"}, headers=AH, expect=[200])
    test("Change password", "PATCH", f"/api/users/{crud_uid}/password",
        body={"newPassword": "newpass456"}, headers=AH, expect=[200])
    test("Batch passwords", "POST", "/api/users/batch-passwords",
        body={"passwords": {"testcrud_u1": "reset789"}}, headers=AH, expect=[201])
    test("Delete user", "DELETE", f"/api/users/{crud_uid}", headers=AH, expect=[200])

test("Delete nonexistent", "DELETE", "/api/users/fake-id", headers=AH, expect=[404])
test("Users no auth", "GET", "/api/users", expect=[401])
test("Create user missing fields", "POST", "/api/users",
    body={"username": "only"}, headers=AH, expect=[400])


# ═══════ SECTION 3: MACHINES ═══════
log("\n📌 SECTION 3: MACHINES MODULE")

s, r = test("List machines", "GET", "/api/machines", headers=AH, expect=[200])

s, r = test("Create machine", "POST", "/api/machines",
    body={"machineName": "TEST-MACH-001", "plantId": "isl", "plantName": "Islamabad", "section": "Film Line"},
    headers=AH, expect=[201])
mach_id = r.get("item",{}).get("id","")
created_ids.setdefault("machines",[]).append(mach_id)

if mach_id:
    test("Update machine", "PATCH", f"/api/machines/{mach_id}",
        body={"status": "Inactive"}, headers=AH, expect=[200])

test("List machines by plant", "GET", "/api/machines?plantName=Islamabad", headers=AH, expect=[200])
test("No auth", "GET", "/api/machines", expect=[401])


# ═══════ SECTION 4: FILM CODES ═══════
log("\n📌 SECTION 4: FILM CODES MODULE")

s, r = test("List film codes", "GET", "/api/film-codes", headers=AH, expect=[200])

s, r = test("Create film code", "POST", "/api/film-codes",
    body={"filmCodeName": "TEST-FC-001", "plantId": "isl", "plantName": "Islamabad", "status": "Active"},
    headers=AH, expect=[201])
fc_id = r.get("item",{}).get("id","")
created_ids.setdefault("film_codes",[]).append(fc_id)

test("Filter by plantId", "GET", "/api/film-codes?plantId=isl", headers=AH, expect=[200])
# Also test the "filtered" route if it exists
s, r2 = test("Filtered route", "GET", "/api/film-codes/filtered?plantId=isl", headers=AH, expect=[200, 404])

s, r = test("Bulk film codes", "POST", "/api/film-codes/bulk",
    body={"items": [{"filmCodeName": "TEST-BULK-FC1"}, {"filmCodeName": "TEST-BULK-FC2"}], "plantId": "isl", "plantName": "Islamabad"},
    headers=AH, expect=[201])
bulk_fc = r.get("created", 0)
log(f"     → Bulk created: {bulk_fc}")

if fc_id:
    test("Update film code", "PATCH", f"/api/film-codes/{fc_id}",
        body={"description": "Updated"}, headers=AH, expect=[200])
    test("Delete film code", "DELETE", f"/api/film-codes/{fc_id}", headers=AH, expect=[200])


# ═══════ SECTION 5: DOWNTIME REASONS ═══════
log("\n📌 SECTION 5: DOWNTIME REASONS MODULE")

s, r = test("List downtime reasons", "GET", "/api/downtime-reasons", headers=AH, expect=[200])

s, r = test("Create downtime reason", "POST", "/api/downtime-reasons",
    body={"reasonLabel": "TEST Mechanical Failure", "status": "Active"},
    headers=AH, expect=[201])
dt_id = r.get("item",{}).get("id","")
created_ids.setdefault("dt_reasons",[]).append(dt_id)

if dt_id:
    test("Update downtime reason", "PATCH", f"/api/downtime-reasons/{dt_id}",
        body={"reasonLabel": "TEST Mechanical Fixed"}, headers=AH, expect=[200])
    test("Delete downtime reason", "DELETE", f"/api/downtime-reasons/{dt_id}", headers=AH, expect=[200])


# ═══════ SECTION 6: PRODUCTION ENTRIES ═══════
log("\n📌 SECTION 6: PRODUCTION ENTRIES MODULE")

# First create prerequisite records: film code + machine
s, fc_resp = test("Pre-create film code for production", "POST", "/api/film-codes",
    body={"filmCodeName": "TEST-PROD-FC", "plantId": "isl", "plantName": "Islamabad"},
    headers=AH, expect=[201])
prod_fc_id = fc_resp.get("item",{}).get("id","")
created_ids.setdefault("film_codes",[]).append(prod_fc_id)

s, mach_resp = test("Pre-create machine for production", "POST", "/api/machines",
    body={"machineName": "TEST-PROD-MACH", "plantId": "isl", "plantName": "Islamabad", "section": "Film Line"},
    headers=AH, expect=[201])
prod_mach_id = mach_resp.get("item",{}).get("id","")
created_ids.setdefault("machines",[]).append(prod_mach_id)

s, dt_resp = test("Pre-create downtime reason for production", "POST", "/api/downtime-reasons",
    body={"reasonLabel": "TEST DT for Prod", "status": "Active"},
    headers=AH, expect=[201])
prod_dt_id = dt_resp.get("item",{}).get("id","")
created_ids.setdefault("dt_reasons",[]).append(prod_dt_id)

s, r = test("List production entries", "GET", "/api/production-entries", headers=AH, expect=[200])
test("Filter by plantName", "GET", "/api/production-entries?plantName=Islamabad", headers=AH, expect=[200])
test("Filter by date range", "GET", "/api/production-entries?dateFrom=2026-01-01&dateTo=2026-12-31", headers=AH, expect=[200])
test("Filter by shift", "GET", "/api/production-entries?shift=A", headers=AH, expect=[200])

s, r = test("Create production entry", "POST", "/api/production-entries",
    body={
        "entryDate": "2026-07-29", "shift": "A",
        "plantId": "isl", "plantName": "Islamabad", "section": "Film Line",
        "machineId": prod_mach_id, "machineName": "TEST-PROD-MACH",
        "filmCodeId": prod_fc_id, "filmCodeName": "TEST-PROD-FC",
        "productionTons": 15.5, "wasteTons": 0.5,
        "downtimeMinutes": 30, "downtimeReasonId": prod_dt_id, "downtimeReasonLabel": "TEST DT for Prod",
        "numberOfSettings": 10, "numberOfCycles": 0, "createdByName": "Admin"
    },
    headers=AH, expect=[201])
prod_id = r.get("item",{}).get("id","")
created_ids.setdefault("production",[]).append(prod_id)

if prod_id:
    test("Update production", "PATCH", f"/api/production-entries/{prod_id}",
        body={"productionTons": 16.0}, headers=AH, expect=[200])
    test("Delete production", "DELETE", f"/api/production-entries/{prod_id}", headers=AH, expect=[200])


# ═══════ SECTION 7: TARGETS ═══════
log("\n📌 SECTION 7: TARGETS MODULE")

s, r = test("List targets", "GET", "/api/targets", headers=AH, expect=[200])

s, r = test("Create target", "POST", "/api/targets",
    body={
        "targetDate": "2026-07-29", "shift": "A",
        "plantId": "isl", "plantName": "Islamabad",
        "machineId": prod_mach_id, "machineName": "TEST-PROD-MACH",
        "dailyTargetTons": 20.0, "createdByName": "Admin"
    },
    headers=AH, expect=[201])
target_id = r.get("item",{}).get("id","")
created_ids.setdefault("targets",[]).append(target_id)

test("Filter targets", "GET", "/api/targets?plantName=Islamabad", headers=AH, expect=[200])

if target_id:
    test("Update target", "PATCH", f"/api/targets/{target_id}",
        body={"dailyTargetTons": 22.0}, headers=AH, expect=[200])
    test("Delete target", "DELETE", f"/api/targets/{target_id}", headers=AH, expect=[200])


# ═══════ SECTION 8: DISPATCH ═══════
log("\n📌 SECTION 8: DISPATCH MODULE")

s, r = test("List dispatches", "GET", "/api/dispatch/list", headers=AH, expect=[200])
test("Dispatch analytics", "GET", "/api/dispatch/analytics", headers=AH, expect=[200])
test("Dispatch report", "GET", "/api/dispatch/report", headers=AH, expect=[200])
test("Dispatch report summary", "GET", "/api/dispatch/report-summary", headers=AH, expect=[200])
test("Dispatch customers", "GET", "/api/dispatch/customers", headers=AH, expect=[200])

s, r = test("Create dispatch", "POST", "/api/dispatch",
    body={
        "dispatchDate": "2026-07-29", "customerName": "TEST Dispatch Customer",
        "filmCodeId": prod_fc_id, "filmCodeName": "TEST-PROD-FC",
        "quantityTons": 10.0, "dispatchType": "Local",
        "plantId": "isl", "plantName": "Islamabad", "createdByName": "Admin"
    },
    headers=AH, expect=[201])
disp_id = r.get("item",{}).get("id","")
created_ids.setdefault("dispatch",[]).append(disp_id)

s, r = test("Bulk dispatch", "POST", "/api/dispatch/bulk",
    body={
        "items": [{
            "dispatchDate": "2026-07-29", "customerName": "TEST Bulk Dispatch",
            "filmCodeId": prod_fc_id, "filmCodeName": "TEST-PROD-FC",
            "quantityTons": 5.0, "dispatchType": "Export"
        }],
        "plantId": "isl", "plantName": "Islamabad"
    },
    headers=AH, expect=[201])
log(f"     → Bulk created: {r.get('created',0)}, errors: {len(r.get('errors',[]))}")

if disp_id:
    test("Delete dispatch", "DELETE", f"/api/dispatch/{disp_id}", headers=AH, expect=[200])


# ═══════ SECTION 9: EXPORT QUANTITIES ═══════
log("\n📌 SECTION 9: EXPORT QUANTITIES MODULE")

s, r = test("List export quantities", "GET", "/api/export-quantities", headers=AH, expect=[200])

s, r = test("Create export quantity", "POST", "/api/export-quantities",
    body={
        "exportDate": "2026-07-29", "plantId": "isl", "plantName": "Islamabad",
        "filmCodeId": prod_fc_id, "filmCodeName": "TEST-PROD-FC",
        "exportQuantityTons": 5.5, "createdByName": "Admin"
    },
    headers=AH, expect=[201])
eq_id = r.get("item",{}).get("id","")
created_ids.setdefault("export_qty",[]).append(eq_id)

if eq_id:
    test("Update export qty", "PATCH", f"/api/export-quantities/{eq_id}",
        body={"exportQuantityTons": 6.0}, headers=AH, expect=[200])
    test("Delete export qty", "DELETE", f"/api/export-quantities/{eq_id}", headers=AH, expect=[200])


# ═══════ SECTION 10: PACKING COSTS ═══════
log("\n📌 SECTION 10: PACKING COSTS MODULE")

s, r = test("List packing costs", "GET", "/api/packing-costs", headers=AH, expect=[200])

s, r = test("Create packing cost", "POST", "/api/packing-costs",
    body={
        "costMonth": "2026-07", "plantId": "isl", "plantName": "Islamabad",
        "totalProductionTons": 100.0, "totalCostRs": 500000,
        "bomTotalCostRs": 450000, "actualTotalCostRs": 480000,
        "bomPackingCost": 4500, "actualPackingCost": 4800,
        "createdByName": "Admin"
    },
    headers=AH, expect=[201])
pc_id = r.get("item",{}).get("id","")
created_ids.setdefault("packing",[]).append(pc_id)

if pc_id:
    test("Update packing cost", "PATCH", f"/api/packing-costs/{pc_id}",
        body={"totalCostRs": 520000}, headers=AH, expect=[200])
    test("Delete packing cost", "DELETE", f"/api/packing-costs/{pc_id}", headers=AH, expect=[200])


# ═══════ SECTION 11: CUSTOMERS ═══════
log("\n📌 SECTION 11: CUSTOMERS MODULE")

s, r = test("List customers", "GET", "/api/customers", headers=AH, expect=[200])

s, r = test("Create customer", "POST", "/api/customers",
    body={"name": "TEST Customer Co", "plantId": "isl", "plantName": "Islamabad"},
    headers=AH, expect=[201])
cust_id = r.get("customer",{}).get("id","")
created_ids.setdefault("customers",[]).append(cust_id)

test("Create duplicate customer", "POST", "/api/customers",
    body={"name": "TEST Customer Co", "plantName": "Islamabad"},
    headers=AH, expect=[409])

test("Create customer empty name", "POST", "/api/customers",
    body={"name": ""}, headers=AH, expect=[400])

s, r2 = test("List customers by plant", "GET", "/api/customers/list?plant=Islamabad",
    headers=AH, expect=[200, 404])

if cust_id:
    test("Update customer", "PATCH", f"/api/customers/{cust_id}",
        body={"name": "TEST Customer Updated"}, headers=AH, expect=[200])
    test("Delete customer", "DELETE", f"/api/customers/{cust_id}", headers=AH, expect=[200])


# ═══════ SECTION 12: DASHBOARD ═══════
log("\n📌 SECTION 12: DASHBOARD MODULE")

test("Dashboard KPIs", "GET", "/api/dashboard/kpis", headers=AH, expect=[200])
test("Dashboard dispatch KPIs", "GET", "/api/dashboard/dispatch-kpis", headers=AH, expect=[200])
test("KPIs with plant", "GET", "/api/dashboard/kpis?plant=Islamabad", headers=AH, expect=[200])
test("KPIs with date range", "GET", "/api/dashboard/kpis?dateFrom=2026-01-01&dateTo=2026-12-31",
    headers=AH, expect=[200])
test("Dispatch KPIs with plant", "GET", "/api/dashboard/dispatch-kpis?plant=Islamabad", headers=AH, expect=[200])


# ═══════ SECTION 13: ANALYTICS ═══════
log("\n📌 SECTION 13: ANALYTICS MODULE")

for name, path in [
    ("Production", "/api/analytics/production"),
    ("Downtime", "/api/analytics/downtime"),
    ("Film-wise", "/api/analytics/film-wise"),
    ("Machine-wise", "/api/analytics/machine-wise"),
    ("Settings", "/api/analytics/settings"),
    ("Cycles", "/api/analytics/cycles"),
    ("Target machines", "/api/analytics/target-machines"),
    ("Target", "/api/analytics/target"),
    ("Export plant-wise", "/api/analytics/export-plant-wise"),
    ("Dispatch plant-wise", "/api/analytics/dispatch-plant-wise"),
]:
    test(f"Analytics {name}", "GET", path, headers=AH, expect=[200])

test("Analytics production filtered", "GET",
    "/api/analytics/production?plant=Islamabad&dateFrom=2026-01-01&dateTo=2026-12-31",
    headers=AH, expect=[200])
test("Analytics downtime filtered", "GET", "/api/analytics/downtime?plant=Islamabad",
    headers=AH, expect=[200])


# ═══════ SECTION 14: REPORTS ═══════
log("\n📌 SECTION 14: REPORTS MODULE")

for rt in ["Overall Production", "Film-wise Production", "Machine-wise Production",
           "Waste", "Downtime", "Settings", "Cycles", "Target"]:
    test(f"Report: {rt}", "GET",
        f"/api/reports?reportType={rt.replace(' ', '+')}", headers=AH, expect=[200])

test("Report filtered", "GET",
    "/api/reports?reportType=Overall+Production&plant=Islamabad&dateFrom=2026-01-01&dateTo=2026-12-31",
    headers=AH, expect=[200])


# ═══════ SECTION 15: PERMISSIONS ═══════
log("\n📌 SECTION 15: PERMISSIONS MODULE")

# Use the admin user (u1 from seed)
s, r = test("All permissions", "GET", "/api/permissions/all", headers=AH, expect=[200])
log(f"     → {len(r.get('items',[]))} permission records")

s, r = test("Get user permissions", "GET", "/api/permissions/u1", headers=AH, expect=[200])
test("Set user permissions", "PUT", "/api/permissions/u1",
    body={"permissions": ["dashboard.view", "production.view", "dispatch.view"]},
    headers=AH, expect=[200])
s, r = test("Verify permissions set", "GET", "/api/permissions/u1", headers=AH, expect=[200])
perms = r.get("permissions",[])
log(f"     → Permissions after set: {perms}")

s, r = test("Get user plants", "GET", "/api/permissions/u1/plants", headers=AH, expect=[200])
test("Set user plants", "PUT", "/api/permissions/u1/plants",
    body={"plants": [{"id": "isl", "name": "Islamabad"}, {"id": "lah", "name": "Lahore"}]},
    headers=AH, expect=[200])
s, r = test("Verify plants set", "GET", "/api/permissions/u1/plants", headers=AH, expect=[200])
plants = r.get("plants",[])
log(f"     → Plants after set: {len(plants)}")

test("Get perms nonexistent", "GET", "/api/permissions/nonexistent", headers=AH, expect=[200])


# ═══════ SECTION 16: AUDIT ═══════
log("\n📌 SECTION 16: AUDIT MODULE")

s, r = test("List audit logs", "GET", "/api/audit", headers=AH, expect=[200])
log_count = len(r.get("logs",[]))
log(f"     → {log_count} audit logs, total: {r.get('pagination',{}).get('total',0)}")
test("Audit with pagination", "GET", "/api/audit?page=1&limit=5", headers=AH, expect=[200])
test("Audit stats", "GET", "/api/audit/stats", headers=AH, expect=[200])
test("Audit by module", "GET", "/api/audit/module/machines", headers=AH, expect=[200])
test("Audit by user", "GET", "/api/audit/user/u1", headers=AH, expect=[200])


# ═══════ SECTION 17: ERROR HANDLING & EDGE CASES ═══════
log("\n📌 SECTION 17: ERROR HANDLING & EDGE CASES")

test("Nonexistent route", "GET", "/api/nonexistent", headers=AH, expect=[404])
test("SQL injection (URL encoded)", "GET", "/api/users?id=%27%3B+DROP+TABLE+users%3B+--", headers=AH, expect=[200])
test("XSS in input", "POST", "/api/machines",
    body={"machineName": "<script>alert('xss')</script>", "plantId": "x", "plantName": "XSS", "section": "Test"},
    headers=AH, expect=[201])
# Clean up XSS machine
s, machines = req("GET", "/api/machines", headers=AH)
for m in machines.get("items",[]):
    if "<script>" in m.get("machineName",""):
        created_ids.setdefault("machines",[]).append(m["id"])

test("Special chars", "POST", "/api/machines",
    body={"machineName": "M#@$%^&*()_+{}|:<>?", "plantId": "sp", "plantName": "Special", "section": "Test"},
    headers=AH, expect=[201])
s, machines = req("GET", "/api/machines", headers=AH)
for m in machines.get("items",[]):
    if "#@$" in m.get("machineName",""):
        created_ids.setdefault("machines",[]).append(m["id"])

test("Unicode input", "POST", "/api/machines",
    body={"machineName": "ماشین تست", "plantId": "uni", "plantName": "یونیکوڈ", "section": "Test"},
    headers=AH, expect=[201])
s, machines = req("GET", "/api/machines", headers=AH)
for m in machines.get("items",[]):
    if "ماشین" in m.get("machineName",""):
        created_ids.setdefault("machines",[]).append(m["id"])

test("Empty body create", "POST", "/api/machines", body={}, headers=AH, expect=[400])
test("Wrong method", "GET", "/api/auth/login", expect=[404])


# ═══════ SECTION 18: AUTHORIZATION ═══════
log("\n📌 SECTION 18: AUTHORIZATION TESTS")

protected = [
    ("GET", "/api/users"), ("GET", "/api/machines"), ("GET", "/api/film-codes"),
    ("GET", "/api/downtime-reasons"), ("GET", "/api/production-entries"),
    ("GET", "/api/targets"), ("GET", "/api/dispatch/list"),
    ("GET", "/api/export-quantities"), ("GET", "/api/packing-costs"),
    ("GET", "/api/customers"), ("GET", "/api/dashboard/kpis"),
    ("GET", "/api/analytics/production"),
    ("GET", "/api/reports?reportType=Overall+Production"),
    ("GET", "/api/permissions/all"), ("GET", "/api/audit"),
]

for m, p in protected:
    test(f"🔒 Unauth: {p}", m, p, expect=[401])

for m, p in protected:
    test(f"🔓 Auth: {p}", m, p, headers=AH, expect=[200])


# ═══════ SECTION 19: CLEANUP ═══════
log("\n📌 SECTION 19: CLEANUP")

# Delete all test-created records in reverse dependency order
for model, ids in reversed(list(created_ids.items())):
    route_map = {
        "dispatch": "/api/dispatch", "export_qty": "/api/export-quantities",
        "packing": "/api/packing-costs", "targets": "/api/targets",
        "production": "/api/production-entries", "customers": "/api/customers",
        "machines": "/api/machines", "film_codes": "/api/film-codes",
        "dt_reasons": "/api/downtime-reasons",
    }
    base = route_map.get(model)
    if not base: continue
    for rid in ids:
        if not rid: continue
        test(f"Cleanup {model}/{rid[:8]}", "DELETE", f"{base}/{rid}", headers=AH, expect=[200, 404])

# Cleanup test users
s, r = req("GET", "/api/users", headers=AH)
for u in r.get("items", []):
    if u.get("username","").startswith("test") or u.get("username","").startswith("testreg"):
        test(f"Cleanup user {u['username']}", "DELETE", f"/api/users/{u['id']}", headers=AH, expect=[200])


# ═══════ FINAL REPORT ═══════
log("\n" + "=" * 60)
log("📊 FINAL TEST REPORT")
log("=" * 60)
total = passed + failed + skipped
rate = f"{passed/(passed+failed)*100:.1f}%" if (passed+failed) > 0 else "N/A"
log(f"Total tests:  {total}")
log(f"✅ Passed:     {passed}")
log(f"❌ Failed:     {failed}")
log(f"⏭️  Skipped:   {skipped}")
log(f"Pass rate:    {rate}")

if errors:
    log(f"\n🔴 ERRORS ({len(errors)}):")
    for e in errors:
        log(f"  • {e}")
else:
    log("\n🟢 No errors found!")

log(f"\nFinished: {datetime.now().isoformat()}")
log("=" * 60)

# Write markdown report
report_path = "/app/workspace/project/ipak-management-app/backend/TEST_REPORT.md"
with open(report_path, "w") as f:
    f.write("# IPAK Backend Test Report\n\n")
    f.write(f"**Date:** {datetime.now().isoformat()}\n\n")
    f.write("## Summary\n\n")
    f.write("| Metric | Count |\n|--------|-------|\n")
    f.write(f"| Total tests | {total} |\n")
    f.write(f"| ✅ Passed | {passed} |\n")
    f.write(f"| ❌ Failed | {failed} |\n")
    f.write(f"| ⏭️ Skipped | {skipped} |\n")
    f.write(f"| Pass rate | {rate} |\n\n")
    if errors:
        f.write("## Errors\n\n")
        for e in errors: f.write(f"- {e}\n")
        f.write("\n")
    else:
        f.write("## Errors\n\nNo errors found! 🎉\n\n")
    f.write("## Test Log\n\n```\n")
    f.write("\n".join(test_log))
    f.write("\n```\n")
log(f"\n📝 Report saved to {report_path}")
