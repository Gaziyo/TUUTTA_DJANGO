export type FeatureFlagKey =
  | 'enterprise'
  | 'sso'
  | 'mfa'
  | 'auditLogs'
  | 'dataExports'
  | 'bulkImport'
  | 'ff_contextual_routing_v2'
  | 'ff_workspace_switcher_v1'
  | 'ff_onboarding_wizard_v1'
  | 'ff_master_workspace_v1'
  | 'ff_legacy_route_aliases';

export const featureFlags: Record<FeatureFlagKey, boolean> = {
  enterprise: true,
  sso: true,
  mfa: true,
  auditLogs: true,
  dataExports: true,
  bulkImport: true,
  ff_contextual_routing_v2: true,
  ff_workspace_switcher_v1: true,
  ff_onboarding_wizard_v1: true,
  ff_master_workspace_v1: true,
  ff_legacy_route_aliases: true,
};

export const navFeatureMap: Record<string, FeatureFlagKey> = {
  integrations: 'sso',
  security: 'mfa',
  audit_logs: 'auditLogs',
  exports: 'dataExports',
  bulk_import: 'bulkImport'
};

export function isEnterpriseFeatureEnabled(flag: FeatureFlagKey): boolean {
  if (!featureFlags.enterprise) return false;
  return featureFlags[flag];
}
