import { workspaceService } from './workspaceService';

export interface WorkspaceAccess {
  canAccessPersonal: boolean;
  canAccessOrg: boolean;
  canAccessOrgAdmin: boolean;
  canAccessMaster: boolean;
  defaultRoute: string;
}

export function getDefaultRouteForRole(role: string, context: 'personal' | 'org' | 'master', orgSlug?: string | null): string {
  if (context === 'master') return '/master/dashboard';
  if (context === 'org' && orgSlug) {
    if (role === 'org_admin' || role === 'ld_manager' || role === 'super_admin') {
      return `/org/${orgSlug}/admin/dashboard`;
    }
    return `/org/${orgSlug}/home`;
  }
  return '/me/home';
}

export async function resolveWorkspaceAccess(orgSlug?: string): Promise<WorkspaceAccess> {
  try {
    const resolved = await workspaceService.resolve(orgSlug);
    const orgRecord = orgSlug
      ? resolved.authorizedWorkspaces.organizations.find(item => item.slug === orgSlug)
      : null;
    const role = orgRecord?.role || 'learner';
    return {
      canAccessPersonal: resolved.authorizedWorkspaces.personal,
      canAccessOrg: orgSlug ? Boolean(orgRecord) || resolved.isMaster : resolved.authorizedWorkspaces.organizations.length > 0,
      canAccessOrgAdmin: orgSlug
        ? Boolean(orgRecord && ['org_admin', 'ld_manager', 'super_admin'].includes(orgRecord.role)) || resolved.isMaster
        : false,
      canAccessMaster: resolved.isMaster,
      defaultRoute: getDefaultRouteForRole(role, resolved.activeContext, resolved.activeOrgSlug),
    };
  } catch {
    return {
      canAccessPersonal: true,
      canAccessOrg: false,
      canAccessOrgAdmin: false,
      canAccessMaster: false,
      defaultRoute: '/me/home',
    };
  }
}
