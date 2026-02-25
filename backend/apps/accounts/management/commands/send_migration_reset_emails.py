"""
Management command: send_migration_reset_emails

Sends Django password-reset emails to all users imported from Firebase
(identified by a non-null firebase_uid). These users have no usable password
and cannot log in until they complete a reset.

Usage (from backend/ with venv active):
    python manage.py send_migration_reset_emails [options]

Options:
    --dry-run        List affected users without sending emails
    --batch-size N   Number of users per batch (default: 50)
    --email EMAIL    Send only to this specific email address (testing)
    --mark-unusable  Set unusable passwords before sending (recommended for
                     security — prevents login attempts with empty passwords)

Prerequisites:
    EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD must be
    set in your Django settings (or DEFAULT_FROM_EMAIL at minimum for console backend).
"""

from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.tokens import default_token_generator
from django.core.management.base import BaseCommand, CommandError
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


class Command(BaseCommand):
    help = "Send password-reset emails to all Firebase-migrated users"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List affected users without sending emails",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=50,
            help="Number of users to process per batch (default: 50)",
        )
        parser.add_argument(
            "--email",
            type=str,
            default=None,
            help="Restrict to a single email address (for testing)",
        )
        parser.add_argument(
            "--mark-unusable",
            action="store_true",
            help="Set unusable password on each user before sending reset email",
        )

    def handle(self, *args, **options):
        from apps.accounts.models import User

        dry_run = options["dry_run"]
        batch_size = options["batch_size"]
        target_email = options["email"]
        mark_unusable = options["mark_unusable"]

        qs = User.objects.filter(firebase_uid__isnull=False, is_active=True)
        if target_email:
            qs = qs.filter(email__iexact=target_email)

        total = qs.count()
        if total == 0:
            self.stdout.write("No Firebase-migrated users found.")
            return

        self.stdout.write(
            f"{'[DRY RUN] ' if dry_run else ''}Found {total} user(s) to process."
        )

        if dry_run:
            self.stdout.write("\nWould send reset emails to:")
            for user in qs.iterator():
                self.stdout.write(f"  - {user.email}  (firebase_uid={user.firebase_uid})")
            self.stdout.write(
                f"\nRun without --dry-run to send {total} password-reset email(s)."
            )
            return

        sent = failed = 0
        for i in range(0, total, batch_size):
            batch = list(qs[i: i + batch_size])
            for user in batch:
                try:
                    if mark_unusable:
                        user.set_unusable_password()
                        user.save(update_fields=["password"])

                    # Use Django's built-in PasswordResetForm to compose and send
                    form = PasswordResetForm({"email": user.email})
                    if form.is_valid():
                        form.save(
                            request=None,
                            use_https=True,
                            token_generator=default_token_generator,
                            from_email=None,  # uses DEFAULT_FROM_EMAIL
                            email_template_name="registration/password_reset_email.html",
                            subject_template_name="registration/password_reset_subject.txt",
                        )
                        sent += 1
                        self.stdout.write(f"  Sent → {user.email}")
                    else:
                        failed += 1
                        self.stderr.write(f"  SKIP  → {user.email} (invalid form)")
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    self.stderr.write(f"  FAIL  → {user.email}: {exc}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Sent: {sent}  Failed/skipped: {failed}  Total: {total}"
            )
        )
        if failed:
            raise CommandError(f"{failed} email(s) failed to send — check output above.")
