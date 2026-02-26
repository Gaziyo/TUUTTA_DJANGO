from __future__ import annotations

import uuid
from typing import Any

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

from .models import Organization


def _error_response(status: int, code: str, detail: str) -> JsonResponse:
    return JsonResponse(
        {
            'error': {
                'status': status,
                'code': code,
                'detail': detail,
            }
        },
        status=status,
    )


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, TypeError):
        return False


class OrgSlugResolutionMiddleware(MiddlewareMixin):
    """
    Resolve org route kwargs that may be UUIDs or org slugs.
    Applies to `organization_pk` and `org_id` kwargs for API endpoints.
    """

    def process_view(self, request: Any, view_func: Any, view_args: list[Any], view_kwargs: dict[str, Any]):
        key = None
        if 'organization_pk' in view_kwargs:
            key = 'organization_pk'
        elif 'org_id' in view_kwargs:
            key = 'org_id'

        if not key:
            return None

        raw_value = view_kwargs.get(key)
        if not raw_value:
            return None

        if _is_uuid(str(raw_value)):
            org = Organization.objects.filter(id=raw_value, is_active=True).first()
        else:
            org = Organization.objects.filter(slug=raw_value, is_active=True).first()

        if not org:
            return _error_response(404, 'not_found', 'Organization not found.')

        org_slug_param = request.GET.get('orgSlug')
        if org_slug_param and org_slug_param != org.slug:
            return _error_response(404, 'not_found', 'Organization slug does not match route context.')

        view_kwargs[key] = str(org.id)
        request.organization = org
        request.org_slug = org.slug
        return None
