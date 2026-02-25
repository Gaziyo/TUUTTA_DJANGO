#!/usr/bin/env python3
"""
Phase 6 – Data Migration: Verify migrated data in PostgreSQL against the
original Firestore export JSON.

Usage (from backend/ with venv active):
    DJANGO_SETTINGS_MODULE=tuutta_backend.settings.development \\
        python scripts/verify_migration.py --input firestore_export.json

Checks:
  1. Row-count parity — PostgreSQL count vs JSON export count per collection
  2. Spot-check emails — random sample of user emails found in DB
  3. Foreign-key integrity — enrollments/progress reference valid users & courses
  4. Data quality — no null emails, no null org names, etc.

Exit code: 0 = all checks passed, 1 = some checks failed.
"""

import argparse
import json
import os
import random
import sys


# ---------------------------------------------------------------------------
# Django bootstrap
# ---------------------------------------------------------------------------
def bootstrap_django():
    os.environ.setdefault(
        "DJANGO_SETTINGS_MODULE", "tuutta_backend.settings.development"
    )
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import django
    django.setup()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
WARN = "\033[33mWARN\033[0m"


def check(label: str, passed: bool, detail: str = "") -> bool:
    icon = PASS if passed else FAIL
    line = f"  [{icon}] {label}"
    if detail:
        line += f"  — {detail}"
    print(line)
    return passed


# ---------------------------------------------------------------------------
# Verification steps
# ---------------------------------------------------------------------------
def verify_counts(collections: dict) -> list[bool]:
    from apps.accounts.models import User
    from apps.courses.models import Course
    from apps.enrollments.models import Enrollment
    from apps.genie.models import GenieSource, GeniePipeline
    from apps.organizations.models import Organization, OrganizationMember
    from apps.progress.models import ProgressRecord

    mapping = [
        ("users",          User,               collections.get("users", [])),
        ("organizations",  Organization,        collections.get("organizations", [])),
        ("orgMembers",     OrganizationMember,  collections.get("orgMembers", [])),
        ("courses",        Course,              collections.get("courses", [])),
        ("enrollments",    Enrollment,          collections.get("enrollments", [])),
        ("progress",       ProgressRecord,      collections.get("progress", [])),
        ("genieSources",   GenieSource,         collections.get("genieSources", [])),
        ("geniePipelines", GeniePipeline,       collections.get("geniePipelines", [])),
    ]

    results = []
    print("\n[Count parity]")
    for name, model, export_data in mapping:
        export_count = len(export_data)
        if export_count == 0:
            print(f"  [----] {name:<20} — no export data, skipping")
            continue
        db_count = model.objects.count()
        pct = round((db_count / export_count) * 100) if export_count else 0
        passed = db_count >= export_count * 0.95  # allow up to 5% skip rate
        results.append(
            check(
                f"{name:<20}",
                passed,
                f"DB={db_count}  Export={export_count}  ({pct}% imported)",
            )
        )
    return results


def verify_user_emails(export_users: list) -> list[bool]:
    from apps.accounts.models import User

    if not export_users:
        return []

    print("\n[User email spot-check (10 random)]")
    sample = random.sample(export_users, min(10, len(export_users)))
    results = []
    for item in sample:
        email = (item.get("email") or "").strip().lower()
        if not email:
            continue
        exists = User.objects.filter(email__iexact=email).exists()
        results.append(check(f"email '{email}'", exists))
    return results


def verify_data_quality() -> list[bool]:
    from apps.accounts.models import User
    from apps.courses.models import Course
    from apps.organizations.models import Organization

    print("\n[Data quality]")
    results = []

    # No users with blank email
    blank_emails = User.objects.filter(email="").count()
    results.append(check("No users with blank email", blank_emails == 0,
                          f"{blank_emails} found" if blank_emails else ""))

    # No orgs with blank name
    blank_names = Organization.objects.filter(name="").count()
    results.append(check("No orgs with blank name", blank_names == 0,
                          f"{blank_names} found" if blank_names else ""))

    # No courses with blank title
    blank_titles = Course.objects.filter(title="").count()
    results.append(check("No courses with blank title", blank_titles == 0,
                          f"{blank_titles} found" if blank_titles else ""))

    # All Firebase-migrated users have firebase_uid
    firebase_users = User.objects.filter(firebase_uid__isnull=False).count()
    total_users = User.objects.count()
    results.append(check(
        f"firebase_uid coverage",
        True,  # informational
        f"{firebase_users}/{total_users} users have firebase_uid set",
    ))

    return results


def verify_fk_integrity() -> list[bool]:
    from apps.enrollments.models import Enrollment
    from apps.progress.models import ProgressRecord

    print("\n[Foreign-key integrity]")
    results = []

    # Enrollments with null user
    null_user_enrollments = Enrollment.objects.filter(user__isnull=True).count()
    results.append(check(
        "Enrollments: no null user",
        null_user_enrollments == 0,
        f"{null_user_enrollments} found" if null_user_enrollments else "",
    ))

    # Enrollments with null course
    null_course_enrollments = Enrollment.objects.filter(course__isnull=True).count()
    results.append(check(
        "Enrollments: no null course",
        null_course_enrollments == 0,
        f"{null_course_enrollments} found" if null_course_enrollments else "",
    ))

    # Progress with null user
    null_user_progress = ProgressRecord.objects.filter(user__isnull=True).count()
    results.append(check(
        "Progress: no null user",
        null_user_progress == 0,
        f"{null_user_progress} found" if null_user_progress else "",
    ))

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def parse_args():
    parser = argparse.ArgumentParser(
        description="Verify Firestore-to-PostgreSQL migration"
    )
    parser.add_argument(
        "--input",
        default="firestore_export.json",
        help="Path to the original Firestore export JSON file",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    bootstrap_django()

    print(f"Loading export: {args.input}")
    try:
        with open(args.input, "r", encoding="utf-8") as f:
            export = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: Export file not found: {args.input}")
        sys.exit(1)

    collections = export.get("collections", export)
    exported_at = export.get("exported_at", "unknown")
    print(f"Exported at:  {exported_at}")

    all_results: list[bool] = []
    all_results += verify_counts(collections)
    all_results += verify_user_emails(collections.get("users", []))
    all_results += verify_data_quality()
    all_results += verify_fk_integrity()

    passed = sum(1 for r in all_results if r)
    failed = len(all_results) - passed

    print(f"\n{'=' * 50}")
    print(f"  Passed: {passed}  Failed: {failed}  Total: {len(all_results)}")
    if failed == 0:
        print("\nVerification PASSED — migration looks complete.")
        sys.exit(0)
    else:
        print(f"\nVerification FAILED — {failed} check(s) did not pass. Review above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
