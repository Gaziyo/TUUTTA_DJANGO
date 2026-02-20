"""
Pytest configuration for the Django test suite.

Run tests with:
    pytest                          # all tests
    pytest apps/accounts/tests/     # specific app
    pytest -v --tb=short            # verbose with short tracebacks
"""
import os

# Tell pytest-django which settings module to use.
# The development settings use SQLite so tests run without any external DB.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tuutta_backend.settings.development")
