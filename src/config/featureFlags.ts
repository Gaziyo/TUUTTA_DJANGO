export type FeatureFlagKey =
  | 'enterprise'
  | 'sso'
  | 'mfa'
  | 'auditLogs'
  | 'dataExports'
  | 'bulkImport';

export const featureFlags: Record<FeatureFlagKey, boolean> = {
  enterprise: true,
  sso: true,
  mfa: true,
  auditLogs: true,
  dataExports: true,
  bulkImport: true
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
