#!/usr/bin/env python3
"""
Phase 6 – Data Migration: Import Firestore JSON export into PostgreSQL via Django ORM.

Usage (from the backend/ directory with venv active):
    DJANGO_SETTINGS_MODULE=tuutta_backend.settings.development \\
        python scripts/import_to_postgres.py \\
        --input firestore_export.json \\
        [--dry-run]

Run after:
    python manage.py migrate

Options:
    --input    Path to the JSON file produced by export_firestore.py
    --dry-run  Validate and count records without writing to the database
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Bootstrap Django before importing models
# ---------------------------------------------------------------------------
def bootstrap_django():
    os.environ.setdefault(
        "DJANGO_SETTINGS_MODULE", "tuutta_backend.settings.development"
    )
    # Ensure the backend/ directory is on the path when run from backend/
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import django
    django.setup()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def parse_dt(value):
    """Parse an ISO-8601 datetime string, returning None on failure."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def parse_args():
    parser = argparse.ArgumentParser(
        description="Import Firestore export JSON into PostgreSQL via Django ORM"
    )
    parser.add_argument(
        "--input",
        default="firestore_export.json",
        help="Path to the Firestore export JSON file",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate input without writing to the database",
    )
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Importers (one per Firestore collection)
# ---------------------------------------------------------------------------

def import_users(data: list, dry_run: bool) -> int:
    from apps.accounts.models import User

    created = updated = skipped = 0
    for item in data:
        firebase_uid = item.get("_id") or item.get("uid")
        email = item.get("email", "").strip()
        if not email:
            skipped += 1
            continue

        defaults = {
            "email": email,
            "username": email,  # Django requires username; use email as default
            "display_name": item.get("displayName") or item.get("display_name", ""),
            "photo_url": item.get("photoUrl") or item.get("photo_url", ""),
            "bio": item.get("bio", ""),
            "settings": item.get("settings") or {},
            "subscription_tier": item.get("subscriptionTier") or item.get("subscription_tier", "free"),
            "stripe_customer_id": item.get("stripeCustomerId") or item.get("stripe_customer_id", ""),
            "last_active_at": parse_dt(item.get("lastActiveAt") or item.get("last_active_at")),
            "is_active": item.get("isActive", True),
        }

        if not dry_run:
            _, was_created = User.objects.update_or_create(
                firebase_uid=firebase_uid,
                defaults=defaults,
            )
            if was_created:
                created += 1
            else:
                updated += 1
        else:
            created += 1  # count as "would create" in dry-run

    return created + updated


def import_organizations(data: list, dry_run: bool) -> int:
    from django.utils.text import slugify
    from apps.organizations.models import Organization

    count = 0
    for item in data:
        org_id = item.get("_id")
        if not org_id:
            continue

        name = item.get("name", "Unnamed Org")
        slug = item.get("slug") or slugify(name) or f"org-{org_id[:8]}"

        defaults = {
            "name": name,
            "slug": slug,
            "description": item.get("description", ""),
            "logo_url": item.get("logoUrl") or item.get("logo_url", ""),
            "plan": item.get("plan", "free"),
            "settings": item.get("settings") or {},
            "is_active": item.get("isActive", True),
        }

        if not dry_run:
            Organization.objects.update_or_create(id=org_id, defaults=defaults)
        count += 1

    return count


def import_org_members(data: list, dry_run: bool) -> int:
    from apps.accounts.models import User
    from apps.organizations.models import Organization, OrganizationMember

    VALID_ROLES = {"learner", "instructor", "team_lead", "ld_manager", "org_admin", "super_admin"}
    count = 0
    for item in data:
        org_id = item.get("orgId") or item.get("organizationId")
        firebase_uid = item.get("userId") or item.get("uid")
        if not org_id or not firebase_uid:
            continue

        if not dry_run:
            try:
                org = Organization.objects.get(id=org_id)
                user = User.objects.get(firebase_uid=firebase_uid)
            except (Organization.DoesNotExist, User.DoesNotExist):
                continue

            role = item.get("role", "learner")
            if role not in VALID_ROLES:
                role = "learner"

            OrganizationMember.objects.update_or_create(
                organization=org,
                user=user,
                defaults={
                    "role": role,
                    "job_title": item.get("jobTitle") or item.get("job_title", ""),
                    "status": item.get("status", "active"),
                },
            )
        count += 1

    return count


def import_courses(data: list, dry_run: bool) -> int:
    from apps.accounts.models import User
    from apps.organizations.models import Organization
    from apps.courses.models import Course, CourseModule, Lesson

    VALID_LESSON_TYPES = {
        "text", "video", "audio", "quiz", "assignment",
        "scorm", "iframe",
    }
    count = 0

    for item in data:
        org_id = item.get("orgId") or item.get("organizationId")
        if not org_id:
            continue

        if not dry_run:
            try:
                org = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                continue

            created_by = None
            if item.get("createdBy"):
                created_by = User.objects.filter(firebase_uid=item["createdBy"]).first()

            course, _ = Course.objects.update_or_create(
                id=item["_id"],
                defaults={
                    "organization": org,
                    "title": item.get("title", "Untitled Course"),
                    "description": item.get("description", ""),
                    "status": item.get("status", "draft"),
                    "thumbnail_url": item.get("thumbnailUrl") or item.get("thumbnail_url", ""),
                    "tags": item.get("tags") or [],
                    "learning_objectives": item.get("learningObjectives") or item.get("learning_objectives") or [],
                    "created_by": created_by,
                },
            )

            # Import modules
            for i, module_data in enumerate(item.get("modules", []) or []):
                module, _ = CourseModule.objects.update_or_create(
                    id=module_data.get("id") or f"{item['_id']}_mod_{i}",
                    defaults={
                        "course": course,
                        "title": module_data.get("title", f"Module {i + 1}"),
                        "description": module_data.get("description", ""),
                        "order_index": module_data.get("orderIndex", i),
                    },
                )

                # Import lessons
                for j, lesson_data in enumerate(module_data.get("lessons", []) or []):
                    lesson_type = lesson_data.get("type") or lesson_data.get("lesson_type", "text")
                    if lesson_type not in VALID_LESSON_TYPES:
                        lesson_type = "text"

                    Lesson.objects.update_or_create(
                        id=lesson_data.get("id") or f"{module.id}_les_{j}",
                        defaults={
                            "module": module,
                            "title": lesson_data.get("title", f"Lesson {j + 1}"),
                            "lesson_type": lesson_type,
                            "order_index": lesson_data.get("orderIndex", j),
                            "content": lesson_data.get("content") or {},
                            "duration_minutes": lesson_data.get("durationMinutes") or 0,
                        },
                    )

        count += 1

    return count


def import_enrollments(data: list, dry_run: bool) -> int:
    from apps.accounts.models import User
    from apps.courses.models import Course
    from apps.enrollments.models import Enrollment
    from apps.organizations.models import Organization

    VALID_STATUSES = {"pending", "enrolled", "in_progress", "completed", "dropped", "expired"}
    count = 0

    for item in data:
        firebase_uid = item.get("userId") or item.get("uid")
        course_id = item.get("courseId")
        org_id = item.get("orgId") or item.get("organizationId")
        if not (firebase_uid and course_id and org_id):
            continue

        if not dry_run:
            try:
                user = User.objects.get(firebase_uid=firebase_uid)
                course = Course.objects.get(id=course_id)
                org = Organization.objects.get(id=org_id)
            except (User.DoesNotExist, Course.DoesNotExist, Organization.DoesNotExist):
                continue

            status = item.get("status", "enrolled")
            if status not in VALID_STATUSES:
                status = "enrolled"

            Enrollment.objects.update_or_create(
                user=user,
                course=course,
                organization=org,
                defaults={
                    "status": status,
                    "progress_percentage": item.get("progressPercentage") or item.get("progress_percentage", 0),
                    "started_at": parse_dt(item.get("startedAt") or item.get("started_at")),
                    "completed_at": parse_dt(item.get("completedAt") or item.get("completed_at")),
                    "due_date": parse_dt(item.get("dueDate") or item.get("due_date")),
                },
            )
        count += 1

    return count


def import_progress(data: list, dry_run: bool) -> int:
    from apps.accounts.models import User
    from apps.courses.models import Course
    from apps.progress.models import ProgressRecord

    count = 0
    for item in data:
        firebase_uid = item.get("userId") or item.get("uid")
        course_id = item.get("courseId")
        if not (firebase_uid and course_id):
            continue

        if not dry_run:
            try:
                user = User.objects.get(firebase_uid=firebase_uid)
                course = Course.objects.get(id=course_id)
            except (User.DoesNotExist, Course.DoesNotExist):
                continue

            ProgressRecord.objects.update_or_create(
                user=user,
                course=course,
                defaults={
                    "completion_percentage": item.get("completionPercentage") or item.get("completion_percentage", 0),
                    "total_time_spent": item.get("totalTimeSpent") or item.get("total_time_spent", 0),
                    "last_accessed_at": parse_dt(item.get("lastAccessedAt") or item.get("last_accessed_at")),
                    "completed_at": parse_dt(item.get("completedAt") or item.get("completed_at")),
                },
            )
        count += 1

    return count


def import_genie_sources(data: list, dry_run: bool) -> int:
    from apps.accounts.models import User
    from apps.genie.models import GenieSource
    from apps.organizations.models import Organization

    VALID_TYPES = {"document", "url", "video", "audio", "text"}
    count = 0

    for item in data:
        org_id = item.get("orgId") or item.get("organizationId")
        if not org_id:
            continue

        if not dry_run:
            try:
                org = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                continue

            created_by = None
            if item.get("uploadedBy") or item.get("createdBy"):
                uid = item.get("uploadedBy") or item.get("createdBy")
                created_by = User.objects.filter(firebase_uid=uid).first()

            source_type = item.get("type") or item.get("source_type", "document")
            if source_type not in VALID_TYPES:
                source_type = "document"

            GenieSource.objects.update_or_create(
                id=item["_id"],
                defaults={
                    "organization": org,
                    "created_by": created_by,
                    "name": item.get("title") or item.get("name", "Untitled Source"),
                    "source_type": source_type,
                    "url": item.get("fileUrl") or item.get("url", ""),
                    "file_path": item.get("fileName") or item.get("file_path", ""),
                    "status": item.get("status", "pending"),
                    "metadata": {
                        "tags": item.get("tags", []),
                        "description": item.get("description", ""),
                        "fileType": item.get("fileType", ""),
                        "fileSize": item.get("fileSize"),
                        "version": item.get("version", 1),
                        "sourceKey": item.get("sourceKey", ""),
                    },
                },
            )
        count += 1

    return count


def import_genie_pipelines(data: list, dry_run: bool) -> int:
    from apps.accounts.models import User
    from apps.genie.models import GeniePipeline, GenieSource
    from apps.organizations.models import Organization

    count = 0
    for item in data:
        org_id = item.get("orgId") or item.get("organizationId")
        if not org_id:
            continue

        if not dry_run:
            try:
                org = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                continue

            created_by = None
            if item.get("createdBy"):
                created_by = User.objects.filter(firebase_uid=item["createdBy"]).first()

            pipeline, _ = GeniePipeline.objects.update_or_create(
                id=item["_id"],
                defaults={
                    "organization": org,
                    "created_by": created_by,
                    "name": item.get("name", "Untitled Pipeline"),
                    "status": item.get("status", "draft"),
                    "config": item.get("config") or {},
                },
            )

            # Link sources by ID
            source_ids = item.get("sourceIds") or item.get("sources") or []
            if source_ids and isinstance(source_ids[0], str):
                sources = GenieSource.objects.filter(id__in=source_ids)
                pipeline.sources.set(sources)

        count += 1

    return count


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

IMPORTERS = [
    ("users", import_users),
    ("organizations", import_organizations),
    ("orgMembers", import_org_members),
    ("courses", import_courses),
    ("enrollments", import_enrollments),
    ("progress", import_progress),
    ("genieSources", import_genie_sources),
    ("geniePipelines", import_genie_pipelines),
]


def main():
    args = parse_args()

    bootstrap_django()

    print(f"Loading export file: {args.input}")
    try:
        with open(args.input, "r", encoding="utf-8") as f:
            export = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: File not found: {args.input}")
        sys.exit(1)

    collections = export.get("collections", export)  # support both formats
    exported_at = export.get("exported_at", "unknown")
    print(f"Exported at: {exported_at}")

    if args.dry_run:
        print("\n*** DRY RUN — no data will be written ***\n")

    total_imported = 0
    for collection_key, importer_fn in IMPORTERS:
        data = collections.get(collection_key, [])
        if not data:
            print(f"  [{collection_key}] skipped (no data)")
            continue

        print(f"  [{collection_key}] importing {len(data)} records...", end="", flush=True)
        count = importer_fn(data, dry_run=args.dry_run)
        print(f" done ({count} processed)")
        total_imported += count

    print(f"\nImport {'simulation' if args.dry_run else 'complete'} — {total_imported} total records processed.")

    if not args.dry_run:
        print("\nNOTE: Users imported without passwords.")
        print("      Trigger a password-reset email flow for all migrated users.")


if __name__ == "__main__":
    main()
