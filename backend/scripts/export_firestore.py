#!/usr/bin/env python3
"""
Phase 6 – Data Migration: Export Firestore collections to JSON.

Usage:
    pip install firebase-admin
    python scripts/export_firestore.py \
        --credentials firebase-service-account.json \
        --output firestore_export.json

Prerequisites:
    - Download your Firebase service account JSON from:
      Firebase Console → Project Settings → Service Accounts → Generate new private key
    - Place it at firebase-service-account.json (never commit this file)
"""

import argparse
import json
import sys
from datetime import datetime, timezone


def parse_args():
    parser = argparse.ArgumentParser(description="Export Firestore data to JSON")
    parser.add_argument(
        "--credentials",
        default="firebase-service-account.json",
        help="Path to Firebase service account credentials JSON",
    )
    parser.add_argument(
        "--output",
        default="firestore_export.json",
        help="Output file path for exported JSON data",
    )
    parser.add_argument(
        "--collections",
        nargs="*",
        default=None,
        help="Specific collections to export (default: all)",
    )
    return parser.parse_args()


def serialize_value(value):
    """Recursively convert Firestore-specific types to JSON-serializable values."""
    # Firestore DatetimeWithNanoseconds → ISO string
    if hasattr(value, "isoformat"):
        return value.isoformat()
    # Firestore DocumentReference → its path string
    if hasattr(value, "path"):
        return value.path
    # Firestore GeoPoint → dict
    if hasattr(value, "latitude") and hasattr(value, "longitude"):
        return {"latitude": value.latitude, "longitude": value.longitude}
    if isinstance(value, dict):
        return {k: serialize_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [serialize_value(item) for item in value]
    return value


def export_collection(db, collection_name: str) -> list:
    """Stream all documents from a Firestore collection."""
    docs = db.collection(collection_name).stream()
    data = []
    for doc in docs:
        item = serialize_value(doc.to_dict())
        item["_id"] = doc.id
        data.append(item)
    return data


DEFAULT_COLLECTIONS = [
    "users",
    "organizations",
    "orgMembers",
    "departments",
    "teams",
    "courses",
    "assessments",
    "enrollments",
    "progress",
    "genieSources",
    "geniePipelines",
]


def export_all(db, collections: list, output_path: str):
    export_data = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "collections": {},
    }

    for collection_name in collections:
        print(f"  Exporting '{collection_name}'...", end="", flush=True)
        try:
            docs = export_collection(db, collection_name)
            export_data["collections"][collection_name] = docs
            print(f" {len(docs)} documents")
        except Exception as exc:
            print(f" ERROR: {exc}")
            export_data["collections"][collection_name] = []

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, default=str, indent=2, ensure_ascii=False)

    total = sum(len(v) for v in export_data["collections"].values())
    print(f"\nExport complete → {output_path}  ({total} total documents)")


def main():
    args = parse_args()

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        print("ERROR: firebase-admin is not installed.")
        print("       Run: pip install firebase-admin")
        sys.exit(1)

    try:
        cred = credentials.Certificate(args.credentials)
        firebase_admin.initialize_app(cred)
    except Exception as exc:
        print(f"ERROR initializing Firebase Admin SDK: {exc}")
        sys.exit(1)

    db = firestore.client()
    collections = args.collections or DEFAULT_COLLECTIONS

    print(f"Starting Firestore export → {args.output}")
    print(f"Collections: {', '.join(collections)}\n")
    export_all(db, collections, args.output)


if __name__ == "__main__":
    main()
