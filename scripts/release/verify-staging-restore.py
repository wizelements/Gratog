#!/usr/bin/env python3
"""Read-only source / destructive disposable-CLONE Turso restore verification.

Targets are deliberately hard-coded and CLI-mediated. Never points at
production 'tasteofgratitude'. Requires an existing disposable clone.
Removes disposable clone in finally, even after a failed assertion.
Does NOT certify Mongo PITR or post-cutover reverse-delta handling.
"""
import json
import re
import subprocess
import sys
from datetime import datetime, timezone

SOURCE = "gratog-migration-cert-20261017"
CLONE = "gratog-rollback-drill-20261017-01"
SQL = {
    "orders": "SELECT count(*) FROM orders",
    "products": "SELECT count(*) FROM products",
    "payment_rows": "SELECT count(*) FROM payments",
    "order_total_cents": "SELECT coalesce(sum(total_cents),0) FROM orders",
    "inventory_units": "SELECT coalesce(sum(current_stock),0) FROM inventory",
    "source_canary": "SELECT count(*) FROM sqlite_master WHERE name='opee_isolated_restore_canary'",
}


def cli(*args):
    completed = subprocess.run(["turso", "db", *args], capture_output=True,
                               text=True, timeout=40)
    if completed.returncode:
        raise RuntimeError(f"TURSO_COMMAND_FAILED:{args[0]}")
    return completed.stdout.strip()


def scalar(database, statement):
    output = cli("shell", database, statement + ";")
    values = re.findall(r"^-?\d+\s*$", output, re.MULTILINE)
    if len(values) != 1:
        raise RuntimeError("UNEXPECTED_SCALAR_RESPONSE")
    return int(values[0])


def integrity(database):
    output = cli("shell", database, "PRAGMA integrity_check;")
    if not re.search(r"^ok\s*$", output, re.MULTILINE):
        raise RuntimeError("RESTORED_CLONE_INTEGRITY_FAILED")


def main():
    report = {
        "kind": "ISOLATED_TURSO_STAGING_RESTORE_TEST",
        "source": SOURCE, "clone": CLONE,
        "executedAt": datetime.now(timezone.utc).isoformat(),
        "sourceReadOnly": True, "productionDatabaseAccess": False,
        "mongoPitrCertified": False, "mongoReverseDeltaCertified": False,
        "sourceBefore": {}, "cloneSnapshot": {},
        "cloneCanaryWritten": False, "sourceCanaryAbsent": False,
        "cloneDestroyed": False, "passed": False,
    }
    # Never destroy an unfamiliar target.
    assert CLONE.startswith("gratog-rollback-drill-20261017-")
    assert SOURCE != CLONE and SOURCE != "tasteofgratitude"
    try:
        for key, query in SQL.items():
            report["sourceBefore"][key] = scalar(SOURCE, query)
        if report["sourceBefore"]["source_canary"] != 0:
            raise RuntimeError("SOURCE_CANARY_PRESENT_BEFORE_TEST")
        for key, query in SQL.items():
            report["cloneSnapshot"][key] = scalar(CLONE, query)
        if report["cloneSnapshot"] != report["sourceBefore"]:
            raise RuntimeError("SNAPSHOT_INVARIANT_MISMATCH")
        integrity(CLONE)
        cli("shell", CLONE, "CREATE TABLE opee_isolated_restore_canary(token TEXT PRIMARY KEY);")
        cli("shell", CLONE, "INSERT INTO opee_isolated_restore_canary VALUES ('restore-test-only');")
        report["cloneCanaryWritten"] = scalar(CLONE,
                    "SELECT count(*) FROM opee_isolated_restore_canary") == 1
        report["sourceCanaryAbsent"] = scalar(SOURCE, SQL["source_canary"]) == 0
        if not report["cloneCanaryWritten"] or not report["sourceCanaryAbsent"]:
            raise RuntimeError("CLONE_ISOLATION_TEST_FAILED")
        integrity(CLONE)
    finally:
        # Even failed drills MUST NOT leave sensitive copied staging data behind.
        try:
            cli("destroy", CLONE, "--yes")
            report["cloneDestroyed"] = True
        finally:
            report["passed"] = (
                report["cloneDestroyed"] and report["cloneCanaryWritten"]
                and report["sourceCanaryAbsent"]
                and report["sourceBefore"] == report["cloneSnapshot"]
            )
            # Evidence contains counts only, no copied customer data or tokens.
            from pathlib import Path
            out = Path("test-results/turso-staging-restore-drill.json")
            out.parent.mkdir(exist_ok=True)
            out.write_text(json.dumps(report, indent=2) + "\n")
            print(json.dumps(report, indent=2))
    if not report["passed"]:
        raise RuntimeError("RESTORE_CERTIFICATION_FAILED")


if __name__ == "__main__":
    main()
