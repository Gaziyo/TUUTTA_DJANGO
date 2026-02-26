import { apiClient } from '../lib/api';
import type { Organization } from '../types/lms';

export interface MasterOrganizationRequest {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by_email?: string;
  created_org_slug?: string;
  created_at: string;
}

export interface MasterUser {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  is_superuser?: boolean;
}

export interface MasterSummary {
  timestamp: string;
  organizations: number;
  users: number;
  active_memberships: number;
  courses: number;
  enrollments: number;
  completions_last_7d: number;
  audit_events_last_7d: number;
}

export interface MasterGovernanceAudit {
  summary: {
    active_policies: number;
    open_bias_scans: number;
    recent_overrides: number;
    recent_audit_events: number;
  };
  recent_audits: Array<{
    id: string;
    organization: string;
    organization_id: string | null;
    action: string;
    actor_name: string;
    timestamp: string | null;
  }>;
}

export const masterService = {
  listOrganizations: async (): Promise<Organization[]> => {
    const { data } = await apiClient.get('/organizations/');
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    return rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      settings: (row.settings as Organization['settings']) || {
        branding: { primaryColor: '#4f46e5', secondaryColor: '#06b6d4' },
        features: {
          enableGamification: true,
          enableCertificates: true,
          enableDiscussions: true,
          enableLeaderboards: true,
          enableCustomBranding: false,
        },
        compliance: { requireCompletionDeadlines: false, autoRemindDays: [], overdueEscalation: false },
        defaults: { defaultLanguage: 'en', timezone: 'UTC', dateFormat: 'YYYY-MM-DD' },
      },
      subscription: (row.plan as Organization['subscription']) || 'free',
      createdBy: '',
      createdAt: row.created_at ? new Date(row.created_at as string).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : Date.now(),
    }));
  },
  listOrganizationRequests: async (): Promise<MasterOrganizationRequest[]> => {
    const { data } = await apiClient.get('/organization-requests/');
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    return rows as MasterOrganizationRequest[];
  },
  approveOrganizationRequest: async (requestId: string, reviewNote?: string): Promise<void> => {
    await apiClient.post(`/organization-requests/${requestId}/approve/`, { review_note: reviewNote ?? '' });
  },
  rejectOrganizationRequest: async (requestId: string, reviewNote?: string): Promise<void> => {
    await apiClient.post(`/organization-requests/${requestId}/reject/`, { review_note: reviewNote ?? '' });
  },
  listUsers: async (): Promise<MasterUser[]> => {
    const { data } = await apiClient.get('/master/users/');
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    return rows as MasterUser[];
  },
  getSummary: async (): Promise<MasterSummary> => {
    const { data } = await apiClient.get('/master/reports/summary/');
    return data as MasterSummary;
  },
  getGovernanceAudit: async (): Promise<MasterGovernanceAudit> => {
    const { data } = await apiClient.get('/master/governance/audit/');
    return data as MasterGovernanceAudit;
  },
  submitOrganizationRequest: async (payload: { name: string; slug: string; plan?: string; description?: string }): Promise<void> => {
    await apiClient.post('/organization-requests/', payload);
  },
};
