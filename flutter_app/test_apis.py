#!/usr/bin/env python3
"""
Comprehensive Flutter ↔ Backend API Integration Test
Tests every API endpoint the Flutter app calls against the NestJS backend.
"""

import requests
import json
import sys
import time

BASE = "http://localhost:3000/api"
RESULTS = {"pass": 0, "fail": 0, "errors": []}

def log(icon, msg):
    print(f"  {icon} {msg}")

AUTH_HEADERS = {}

def test(name, method, path, body=None, params=None, expect_status=None, expect_keys=None, auth=True):
    global RESULTS, AUTH_HEADERS
    url = f"{BASE}{path}"
    h = {"Content-Type": "application/json"}
    if auth and AUTH_HEADERS:
        h.update(AUTH_HEADERS)
    try:
        if method == "GET":
            r = requests.get(url, params=params, headers=h, timeout=5)
        elif method == "POST":
            r = requests.post(url, json=body, headers=h, timeout=5)
        elif method == "PATCH":
            r = requests.patch(url, json=body, headers=h, timeout=5)
        elif method == "PUT":
            r = requests.put(url, json=body, headers=h, timeout=5)
        elif method == "DELETE":
            r = requests.delete(url, headers=h, timeout=5)
        else:
            RESULTS["fail"] += 1
            RESULTS["errors"].append(f"{name}: Unknown method {method}")
            log("❌", f"{name} — Unknown method")
            return None

        data = {}
        if r.text:
            try:
                data = r.json()
            except:
                data = {}

        status_ok = r.status_code == expect_status if expect_status else True
        keys_ok = True
        if expect_keys:
            for k in expect_keys:
                if k not in data:
                    keys_ok = False

        if status_ok and keys_ok:
            RESULTS["pass"] += 1
            log("✅", f"{name} — HTTP {r.status_code}")
            return data
        else:
            RESULTS["fail"] += 1
            detail = []
            if not status_ok:
                detail.append(f"expected {expect_status}, got {r.status_code}")
            if not keys_ok:
                missing = [k for k in expect_keys if k not in data]
                detail.append(f"missing keys: {missing}")
            err_msg = f"{name} — {', '.join(detail)}"
            RESULTS["errors"].append(err_msg)
            log("❌", f"{err_msg}")
            if data:
                log("  ", f"Response: {json.dumps(data, default=str)[:300]}")
            return data
    except Exception as e:
        RESULTS["fail"] += 1
        RESULTS["errors"].append(f"{name} — {e}")
        log("❌", f"{name} — {e}")
        return None


def main():
    print("=" * 70)
    print("FLUTTER ↔ NESTJS BACKEND API INTEGRATION TEST")
    print("=" * 70)

    # ─── 1. AUTH ─────────────────────────────────────────────
    print("\n▸ AUTH")

    # Login — Flutter calls: POST /auth/login {username, password}
    # Flutter expects: {ok, user: {id, name, username, role}, accessToken, refreshToken}
    login = test("Login", "POST", "/auth/login",
        body={"username": "admin", "password": "admin123"},
        expect_status=201, expect_keys=["ok", "user", "accessToken", "refreshToken"], auth=False)
    token = login.get("accessToken", "") if login else ""
    AUTH_HEADERS["Authorization"] = f"Bearer {token}"
    user_id = login["user"]["id"] if login and "user" in login else "u1"

    # Auth/me — Flutter calls: GET /auth/me with Bearer token
    test("Auth/Me", "GET", "/auth/me", expect_keys=None)

    # Auth/logout — Flutter calls: POST /auth/logout {refreshToken}
    test("Auth/Logout", "POST", "/auth/logout",
        body={"refreshToken": login.get("refreshToken", "") if login else ""},
        expect_status=201, expect_keys=None)

    # Re-login after logout
    login2 = test("Re-Login", "POST", "/auth/login",
        body={"username": "admin", "password": "admin123"},
        expect_status=201, expect_keys=["accessToken"], auth=False)
    if login2 and login2.get("accessToken"):
        AUTH_HEADERS["Authorization"] = f"Bearer {login2['accessToken']}"

    # ─── 2. USERS ────────────────────────────────────────────
    print("\n▸ USERS")
    # Flutter calls: GET /users  → expects {items: [...]}
    users = test("List Users", "GET", "/users", expect_keys=None)

    # Flutter calls: POST /users {name, username, password, role}
    new_user = test("Create User", "POST", "/users",
        body={"name": "Test Operator", "username": f"testop_{int(time.time())}",
              "password": "test123", "role": "operator"},
        expect_keys=None)

    if new_user and new_user.get("user"):
        uid = new_user["user"]["id"]
        # Flutter calls: PATCH /users/:id {name, role}
        test("Update User", "PATCH", f"/users/{uid}",
            body={"name": "Test Operator Updated"}, expect_keys=None)
        # Flutter calls: DELETE /users/:id
        test("Delete User", "DELETE", f"/users/{uid}", expect_keys=None)

    # ─── 3. PERMISSIONS ──────────────────────────────────────
    print("\n▸ PERMISSIONS")
    # Flutter calls: GET /permissions/all → expects {items: [...]}
    test("Permissions All", "GET", "/permissions/all", expect_keys=None)

    # Flutter calls: GET /permissions/:userId → expects {ok, permissions: [...]}
    test("User Permissions", "GET", f"/permissions/{user_id}", expect_keys=None)

    # Flutter calls: PUT /permissions/:userId {permissions: [...]}
    test("Update Permissions", "PUT", f"/permissions/{user_id}",
        body={"permissions": ["dashboard.view", "production.view"]}, expect_keys=None)

    # Flutter calls: GET /permissions/:userId/plants → expects {ok, plants: [...]}
    test("User Plant Perms", "GET", f"/permissions/{user_id}/plants", expect_keys=None)

    # ─── 4. DASHBOARD ────────────────────────────────────────
    print("\n▸ DASHBOARD")
    # Flutter calls: GET /dashboard/kpis?plant=&dateFrom=&dateTo=
    test("Dashboard KPIs", "GET", "/dashboard/kpis",
        params={"plant": "IPAK", "dateFrom": "2026-07-01", "dateTo": "2026-07-31"},
        expect_keys=None)

    # Flutter calls: GET /dashboard/dispatch-kpis
    test("Dashboard Dispatch KPIs", "GET", "/dashboard/dispatch-kpis",
        params={"plant": "IPAK", "monthDateFrom": "2026-07-01",
                "monthDateTo": "2026-07-31", "yesterdayDate": "2026-07-28"},
        expect_keys=None)

    # ─── 5. PRODUCTION ENTRIES ────────────────────────────────
    print("\n▸ PRODUCTION ENTRIES")
    # Flutter calls: GET /production-entries?plantName=&section=&shift=
    prods = test("List Production", "GET", "/production-entries",
        params={"plantName": "IPAK"}, expect_keys=None)

    # Flutter calls: POST /production-entries
    prod = test("Create Production", "POST", "/production-entries",
        body={"entryDate": "2026-07-29", "shift": "Morning", "plantName": "IPAK", "plantId": "ipak",
              "section": "Film Line", "machineName": "Film Line",
              "filmCodeName": "GF-01", "filmCodeId": None, "productionTons": 15.5,
              "wasteTons": 0.8, "downtimeMinutes": 30,
              "numberOfSettings": 5, "numberOfCycles": 0},
        expect_keys=None)

    if prod and prod.get("id"):
        pid = prod["id"]
        test("Update Production", "PATCH", f"/production-entries/{pid}",
            body={"productionTons": 16.0}, expect_keys=None)
        test("Delete Production", "DELETE", f"/production-entries/{pid}", expect_keys=None)

    # ─── 6. TARGETS ──────────────────────────────────────────
    print("\n▸ TARGETS")
    # Flutter calls: GET /targets?plantName=
    targets = test("List Targets", "GET", "/targets",
        params={"plantName": "IPAK"}, expect_keys=None)

    # Flutter calls: POST /targets
    tgt = test("Create Target", "POST", "/targets",
        body={"targetDate": "2026-07-29", "shift": "Morning",
              "plantName": "IPAK", "plantId": "ipak", "machineName": "Film Line",
              "dailyTargetTons": 20.0},
        expect_keys=None)

    if tgt and tgt.get("id"):
        tid = tgt["id"]
        test("Update Target", "PATCH", f"/targets/{tid}",
            body={"dailyTargetTons": 25.0}, expect_keys=None)
        test("Delete Target", "DELETE", f"/targets/{tid}", expect_keys=None)

    # ─── 7. DISPATCH ─────────────────────────────────────────
    print("\n▸ DISPATCH")
    # Flutter calls: GET /dispatch/list?plantName=
    dispatches = test("List Dispatches", "GET", "/dispatch/list",
        params={"plantName": "IPAK"}, expect_keys=None)

    # Flutter calls: POST /dispatch
    disp = test("Create Dispatch", "POST", "/dispatch",
        body={"dispatchDate": "2026-07-29", "customerName": "Test Customer",
              "filmCodeName": "GF-01", "quantityTons": 5.0,
              "dispatchType": "Local", "plantName": "IPAK", "plantId": "ipak",
              "vehicleNumber": "ABC-123"},
        expect_keys=None)

    if disp and disp.get("id"):
        did = disp["id"]
        test("Update Dispatch", "PATCH", f"/dispatch/{did}",
            body={"quantityTons": 6.0}, expect_keys=None)

        # Flutter calls: GET /dispatch/report-summary
        test("Dispatch Report Summary", "GET", "/dispatch/report-summary",
            params={"plantName": "IPAK", "dateFrom": "2026-07-01",
                    "dateTo": "2026-07-31"}, expect_keys=None)

        test("Delete Dispatch", "DELETE", f"/dispatch/{did}", expect_keys=None)

    # ─── 8. EXPORT QUANTITIES ────────────────────────────────
    print("\n▸ EXPORT QUANTITIES")
    # Flutter calls: GET /export-quantities?plantName=
    exports = test("List Exports", "GET", "/export-quantities",
        params={"plantName": "IPAK"}, expect_keys=None)

    # Flutter calls: POST /export-quantities
    exp = test("Create Export", "POST", "/export-quantities",
        body={"exportDate": "2026-07-29", "plantName": "IPAK",
              "filmCodeName": "GF-01", "plantId": "ipak", "filmCodeId": None, "exportQuantityTons": 10.0},
        expect_keys=None)

    if exp and exp.get("id"):
        eid = exp["id"]
        test("Update Export", "PATCH", f"/export-quantities/{eid}",
            body={"exportQuantityTons": 12.0}, expect_keys=None)
        test("Delete Export", "DELETE", f"/export-quantities/{eid}", expect_keys=None)

    # ─── 9. PACKING COSTS ────────────────────────────────────
    print("\n▸ PACKING COSTS")
    # Flutter calls: GET /packing-costs?plantName=
    packing = test("List Packing Costs", "GET", "/packing-costs",
        params={"plantName": "IPAK"}, expect_keys=None)

    # Flutter calls: POST /packing-costs
    pk = test("Create Packing Cost", "POST", "/packing-costs",
        body={"costMonth": "2026-07", "plantName": "IPAK",
              "totalProductionTons": 100.0, "totalCostRs": 500000,
              "bomTotalCostRs": 450000, "plantId": "ipak", "actualTotalCostRs": 480000},
        expect_keys=None)

    if pk and pk.get("id"):
        pkid = pk["id"]
        test("Update Packing Cost", "PATCH", f"/packing-costs/{pkid}",
            body={"totalCostRs": 520000}, expect_keys=None)
        test("Delete Packing Cost", "DELETE", f"/packing-costs/{pkid}", expect_keys=None)

    # ─── 10. REPORTS ─────────────────────────────────────────
    print("\n▸ REPORTS")
    # Flutter calls: GET /reports?reportType=Overall Production&plant=&dateFrom=&dateTo=&section=
    for rt in ["Overall Production", "Film-wise Production", "Machine-wise Production",
               "Waste", "Downtime", "Settings", "Cycles", "Target"]:
        test(f"Report: {rt}", "GET", "/reports",
            params={"reportType": rt, "plant": "IPAK",
                    "dateFrom": "2026-07-01", "dateTo": "2026-07-31"},
            expect_keys=None)

    # ─── 11. ANALYTICS ───────────────────────────────────────
    print("\n▸ ANALYTICS")
    test("Analytics Production", "GET", "/analytics/production",
        params={"plant": "IPAK"}, expect_keys=None)
    test("Analytics Downtime", "GET", "/analytics/downtime",
        params={"plant": "IPAK"}, expect_keys=None)
    test("Analytics Film-wise", "GET", "/analytics/film-wise",
        params={"plant": "IPAK"}, expect_keys=None)
    test("Analytics Machine-wise", "GET", "/analytics/machine-wise",
        params={"plant": "IPAK"}, expect_keys=None)

    # ─── 12. MACHINES ────────────────────────────────────────
    print("\n▸ MACHINES")
    machines = test("List Machines", "GET", "/machines",
        params={"plantName": "IPAK"}, expect_keys=None)

    mach = test("Create Machine", "POST", "/machines",
        body={"machineName": "Test Machine", "plantName": "IPAK",
              "section": "Film Line", "plantId": "ipak"},
        expect_keys=None)

    if mach and mach.get("id"):
        mid = mach["id"]
        test("Delete Machine", "DELETE", f"/machines/{mid}", expect_keys=None)

    # ─── 13. FILM CODES ─────────────────────────────────────
    print("\n▸ FILM CODES")
    films = test("List Film Codes", "GET", "/film-codes",
        params={"plantId": "ipak"}, expect_keys=None)

    film = test("Create Film Code", "POST", "/film-codes",
        body={"filmCodeName": "TEST-FC-001", "plantName": "IPAK", "plantId": "ipak"},
        expect_keys=None)

    if film and film.get("id"):
        fid = film["id"]
        test("Delete Film Code", "DELETE", f"/film-codes/{fid}", expect_keys=None)

    # ─── 14. DOWNTIME REASONS ────────────────────────────────
    print("\n▸ DOWNTIME REASONS")
    reasons = test("List Downtime Reasons", "GET", "/downtime-reasons", expect_keys=None)

    reason = test("Create Downtime Reason", "POST", "/downtime-reasons",
        body={"reasonLabel": "Test Reason"}, expect_keys=None)

    if reason and reason.get("id"):
        rid = reason["id"]
        test("Delete Downtime Reason", "DELETE", f"/downtime-reasons/{rid}", expect_keys=None)

    # ─── 15. AUDIT ──────────────────────────────────────────
    print("\n▸ AUDIT")
    test("List Audit Logs", "GET", "/audit",
        params={"page": "1", "limit": "20"}, expect_keys=None)
    test("Audit Stats", "GET", "/audit/stats", expect_keys=None)

    # ─── SUMMARY ─────────────────────────────────────────────
    print("\n" + "=" * 70)
    total = RESULTS["pass"] + RESULTS["fail"]
    print(f"TOTAL: {RESULTS['pass']}/{total} PASSED, {RESULTS['fail']}/{total} FAILED")
    print("=" * 70)

    if RESULTS["errors"]:
        print("\nFAILED TESTS:")
        for e in RESULTS["errors"]:
            print(f"  ❌ {e}")

    return 0 if RESULTS["fail"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
