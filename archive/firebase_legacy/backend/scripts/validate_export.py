#!/usr/bin/env python3
"""
Phase 6 – Data Migration: Validate a Firestore export JSON before importing.

Usage:
    python scripts/validate_export.py --input firestore_export.json

Checks performed per collection:
  users        — email present, no duplicates
  organizations— name present, no duplicate IDs
  orgMembers   — orgId + userId both present, role valid
  courses      — orgId + title present, lesson types valid
  enrollments  — userId + courseId + orgId present, status valid
  progress     — userId + courseId present
  genieSources — orgId present, type valid
  geniePipelines — orgId present

Cross-collection checks:
  - Enrollment user/course/org IDs exist in their collections
  - OrgMember user/org IDs exist in their collections
  - Course orgId exists in organizations

Exit code: 0 = clean, 1 = warnings found, 2 = errors found (import would fail).
"""

import argparse
import json
import sys
from collections import Counter


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_ROLES = {"learner", "instructor", "team_lead", "ld_manager", "org_admin", "super_admin"}
VALID_LESSON_TYPES = {"text", "video", "audio", "quiz", "assignment", "scorm", "iframe"}
VALID_ENROLLMENT_STATUSES = {"pending", "enrolled", "in_progress", "completed", "dropped", "expired"}
VALID_SOURCE_TYPES = {"document", "url", "video", "audio", "text"}
VALID_PLANS = {"free", "starter", "professional", "enterprise"}


class ValidationReport:
    def __init__(self):
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.infos: list[str] = []

    def error(self, msg: str):
        self.errors.append(f"  ERROR   {msg}")

    def warn(self, msg: str):
        self.warnings.append(f"  WARN    {msg}")

    def info(self, msg: str):
        self.infos.append(f"  INFO    {msg}")

    def print_section(self, title: str, messages: list[str]):
        if messages:
            print(f"\n[{title}]")
            for msg in messages:
                print(msg)

    def summary(self) -> int:
        """Print report and return exit code."""
        self.print_section("ERRORS", self.errors)
        self.print_section("WARNINGS", self.warnings)
        self.print_section("INFO", self.infos)

        print(f"\n{'=' * 50}")
        print(f"  Errors:   {len(self.errors)}")
        print(f"  Warnings: {len(self.warnings)}")
        if self.errors:
            print("\nResult: FAILED — fix errors before importing.")
            return 2
        if self.warnings:
            print("\nResult: PASSED WITH WARNINGS — review before importing.")
            return 1
        print("\nResult: CLEAN — safe to import.")
        return 0


# ---------------------------------------------------------------------------
# Per-collection validators
# ---------------------------------------------------------------------------

def validate_users(data: list, report: ValidationReport) -> set[str]:
    """Returns set of firebase UIDs found."""
    report.info(f"users: {len(data)} records")
    emails_seen: set[str] = set()
    uids: set[str] = set()

    for i, item in enumerate(data):
        uid = item.get("_id") or item.get("uid", "")
        email = (item.get("email") or "").strip().lower()
        label = f"users[{i}] (uid={uid or '?'})"

        if not email:
            report.error(f"{label} — missing email (will be skipped during import)")
        elif email in emails_seen:
            report.warn(f"{label} — duplicate email '{email}'")
        else:
            emails_seen.add(email)

        if uid:
            uids.add(uid)
        else:
            report.warn(f"{label} — missing _id/uid")

    return uids


def validate_organizations(data: list, report: ValidationReport) -> set[str]:
    """Returns set of org IDs found."""
    report.info(f"organizations: {len(data)} records")
    ids: set[str] = set()

    for i, item in enumerate(data):
        org_id = item.get("_id", "")
        label = f"organizations[{i}] (id={org_id or '?'})"

        if not org_id:
            report.error(f"{label} — missing _id")
        elif org_id in ids:
            report.warn(f"{label} — duplicate org ID '{org_id}'")
        else:
            ids.add(org_id)

        if not item.get("name"):
            report.warn(f"{label} — missing name")

        plan = item.get("plan", "free")
        if plan not in VALID_PLANS:
            report.warn(f"{label} — unknown plan '{plan}', will default to 'free'")

    return ids


def validate_org_members(data: list, report: ValidationReport,
                          known_uids: set[str], known_org_ids: set[str]):
    report.info(f"orgMembers: {len(data)} records")
    for i, item in enumerate(data):
        org_id = item.get("orgId") or item.get("organizationId", "")
        uid = item.get("userId") or item.get("uid", "")
        label = f"orgMembers[{i}]"

        if not org_id:
            report.error(f"{label} — missing orgId")
        elif known_org_ids and org_id not in known_org_ids:
            report.warn(f"{label} — references unknown org '{org_id}'")

        if not uid:
            report.error(f"{label} — missing userId")
        elif known_uids and uid not in known_uids:
            report.warn(f"{label} — references unknown user '{uid}'")

        role = item.get("role", "learner")
        if role not in VALID_ROLES:
            report.warn(f"{label} — unknown role '{role}', will default to 'learner'")


def validate_courses(data: list, report: ValidationReport,
                     known_org_ids: set[str]) -> set[str]:
    """Returns set of course IDs found."""
    report.info(f"courses: {len(data)} records")
    course_ids: set[str] = set()

    for i, item in enumerate(data):
        course_id = item.get("_id", "")
        org_id = item.get("orgId") or item.get("organizationId", "")
        label = f"courses[{i}] (id={course_id or '?'})"

        if not course_id:
            report.error(f"{label} — missing _id")
        else:
            course_ids.add(course_id)

        if not org_id:
            report.error(f"{label} — missing orgId")
        elif known_org_ids and org_id not in known_org_ids:
            report.warn(f"{label} — references unknown org '{org_id}'")

        if not item.get("title"):
            report.warn(f"{label} — missing title")

        # Check lesson types in nested structure
        for j, module in enumerate(item.get("modules", []) or []):
            for k, lesson in enumerate(module.get("lessons", []) or []):
                lesson_type = lesson.get("type") or lesson.get("lesson_type", "text")
                if lesson_type not in VALID_LESSON_TYPES:
                    report.warn(
                        f"{label} module[{j}] lesson[{k}] — unknown type '{lesson_type}', will use 'text'"
                    )

    return course_ids


def validate_enrollments(data: list, report: ValidationReport,
                          known_uids: set[str], known_course_ids: set[str],
                          known_org_ids: set[str]):
    report.info(f"enrollments: {len(data)} records")
    for i, item in enumerate(data):
        uid = item.get("userId") or item.get("uid", "")
        course_id = item.get("courseId", "")
        org_id = item.get("orgId") or item.get("organizationId", "")
        label = f"enrollments[{i}]"

        if not uid:
            report.error(f"{label} — missing userId (will be skipped)")
        elif known_uids and uid not in known_uids:
            report.warn(f"{label} — references unknown user '{uid}'")

        if not course_id:
            report.error(f"{label} — missing courseId (will be skipped)")
        elif known_course_ids and course_id not in known_course_ids:
            report.warn(f"{label} — references unknown course '{course_id}'")

        if not org_id:
            report.warn(f"{label} — missing orgId")
        elif known_org_ids and org_id not in known_org_ids:
            report.warn(f"{label} — references unknown org '{org_id}'")

        status = item.get("status", "enrolled")
        if status not in VALID_ENROLLMENT_STATUSES:
            report.warn(f"{label} — unknown status '{status}', will use 'enrolled'")


def validate_progress(data: list, report: ValidationReport,
                      known_uids: set[str], known_course_ids: set[str]):
    report.info(f"progress: {len(data)} records")
    for i, item in enumerate(data):
        uid = item.get("userId") or item.get("uid", "")
        course_id = item.get("courseId", "")
        label = f"progress[{i}]"

        if not uid:
            report.error(f"{label} — missing userId (will be skipped)")
        elif known_uids and uid not in known_uids:
            report.warn(f"{label} — references unknown user '{uid}'")

        if not course_id:
            report.error(f"{label} — missing courseId (will be skipped)")
        elif known_course_ids and course_id not in known_course_ids:
            report.warn(f"{label} — references unknown course '{course_id}'")


def validate_genie_sources(data: list, report: ValidationReport, known_org_ids: set[str]):
    report.info(f"genieSources: {len(data)} records")
    for i, item in enumerate(data):
        org_id = item.get("orgId") or item.get("organizationId", "")
        label = f"genieSources[{i}] (id={item.get('_id', '?')})"

        if not org_id:
            report.error(f"{label} — missing orgId (will be skipped)")
        elif known_org_ids and org_id not in known_org_ids:
            report.warn(f"{label} — references unknown org '{org_id}'")

        source_type = item.get("type") or item.get("source_type", "document")
        if source_type not in VALID_SOURCE_TYPES:
            report.warn(f"{label} — unknown type '{source_type}', will use 'document'")


def validate_genie_pipelines(data: list, report: ValidationReport, known_org_ids: set[str]):
    report.info(f"geniePipelines: {len(data)} records")
    for i, item in enumerate(data):
        org_id = item.get("orgId") or item.get("organizationId", "")
        label = f"geniePipelines[{i}] (id={item.get('_id', '?')})"

        if not org_id:
            report.error(f"{label} — missing orgId (will be skipped)")
        elif known_org_ids and org_id not in known_org_ids:
            report.warn(f"{label} — references unknown org '{org_id}'")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(description="Validate Firestore export JSON")
    parser.add_argument("--input", default="firestore_export.json",
                        help="Path to the Firestore export JSON file")
    return parser.parse_args()


def main():
    args = parse_args()
    report = ValidationReport()

    print(f"Loading: {args.input}")
    try:
        with open(args.input, "r", encoding="utf-8") as f:
            export = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: File not found: {args.input}")
        sys.exit(2)
    except json.JSONDecodeError as exc:
        print(f"ERROR: Invalid JSON: {exc}")
        sys.exit(2)

    collections = export.get("collections", export)
    exported_at = export.get("exported_at", "unknown")
    print(f"Exported at: {exported_at}")
    print(f"Collections present: {', '.join(collections.keys())}\n")

    # Validate in dependency order — build up known ID sets as we go
    known_uids = validate_users(collections.get("users", []), report)
    known_org_ids = validate_organizations(collections.get("organizations", []), report)
    validate_org_members(
        collections.get("orgMembers", []), report, known_uids, known_org_ids
    )
    known_course_ids = validate_courses(
        collections.get("courses", []), report, known_org_ids
    )
    validate_enrollments(
        collections.get("enrollments", []), report,
        known_uids, known_course_ids, known_org_ids
    )
    validate_progress(
        collections.get("progress", []), report, known_uids, known_course_ids
    )
    validate_genie_sources(collections.get("genieSources", []), report, known_org_ids)
    validate_genie_pipelines(collections.get("geniePipelines", []), report, known_org_ids)

    sys.exit(report.summary())


if __name__ == "__main__":
    main()
