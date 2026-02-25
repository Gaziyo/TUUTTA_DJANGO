from typing import Optional, Dict, Any, List
from .models import AuditLog


def create_audit_log(
    *,
    org_id: str,
    actor_id: str,
    actor_name: str = '',
    actor_type: str = 'system',
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    target_name: Optional[str] = None,
    changes: Optional[List[dict]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    return AuditLog.objects.create(
        organization_id=org_id,
        actor_id=actor_id,
        actor_name=actor_name,
        actor_type=actor_type,
        action=action,
        entity_type=entity_type or '',
        entity_id=entity_id or '',
        target_type=target_type or '',
        target_id=target_id or '',
        target_name=target_name or '',
        changes=changes or [],
        metadata=metadata or {},
    )
