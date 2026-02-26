from __future__ import annotations

from typing import Any

from django.http import Http404
from rest_framework.response import Response
from rest_framework.views import exception_handler


def _normalize(status_code: int, detail: Any) -> dict[str, Any]:
    code = 'forbidden' if status_code == 403 else 'not_found'
    message = str(detail) if detail else ('Forbidden' if status_code == 403 else 'Not found')
    return {
        'error': {
            'status': status_code,
            'code': code,
            'detail': message,
        }
    }


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = exception_handler(exc, context)

    if response is None and isinstance(exc, Http404):
        return Response(_normalize(404, str(exc)), status=404)

    if response is None:
        return None

    if response.status_code in (403, 404):
        detail = response.data.get('detail') if isinstance(response.data, dict) else response.data
        response.data = _normalize(response.status_code, detail)

    return response
