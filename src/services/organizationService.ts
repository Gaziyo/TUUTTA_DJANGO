import { apiClient } from '../lib/api';
import type { Organization, OrganizationSettings, SubscriptionTier } from '../types/lms';

// ─── Field mappers ────────────────────────────────────────────────────────────

function mapPlan(plan: string): SubscriptionTier {
  const map: Record<string, SubscriptionTier> = {
    free: 'free',
    starter: 'starter',
    professional: 'professional',
    enterprise: 'enterprise',
  };
  return (map[plan] ?? 'free') as SubscriptionTier;
}

function defaultSettings(): OrganizationSettings {
  return {
    branding: { primaryColor: '#6366f1', secondaryColor: '#818cf8' },
    features: {
      enableGamification: false,
      enableCertificates: true,
      enableDiscussions: false,
      enableLeaderboards: false,
      enableCustomBranding: false,
    },
  };
}

function mapOrg(data: Record<string, unknown>): Organization {
  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    logo: (data.logo_url as string) || undefined,
    settings: (data.settings as OrganizationSettings) || defaultSettings(),
    subscription: mapPlan(data.plan as string),
    createdBy: '',
    createdAt: data.created_at ? new Date(data.created_at as string).getTime() : Date.now(),
    updatedAt: data.updated_at ? new Date(data.updated_at as string).getTime() : Date.now(),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const organizationService = {
  create: async (org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization> => {
    const payload = {
      name: org.name,
      slug: org.slug,
      logo_url: org.logo ?? '',
      plan: org.subscription ?? 'free',
      settings: org.settings ?? defaultSettings(),
    };
    const { data } = await apiClient.post('/organizations/', payload);
    return mapOrg(data);
  },

  get: async (orgId: string): Promise<Organization | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/`);
      return mapOrg(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number } };
      if (axiosErr?.response?.status === 404) return null;
      throw err;
    }
  },

  getBySlug: async (slug: string): Promise<Organization | null> => {
    try {
      const { data } = await apiClient.get('/organizations/');
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      const match = results.find((o) => o.slug === slug);
      return match ? mapOrg(match) : null;
    } catch {
      return null;
    }
  },

  update: async (orgId: string, updates: Partial<Organization>): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.logo !== undefined) payload.logo_url = updates.logo;
    if (updates.subscription !== undefined) payload.plan = updates.subscription;
    if (updates.settings !== undefined) payload.settings = updates.settings;
    await apiClient.patch(`/organizations/${orgId}/`, payload);
  },

  updateSettings: async (orgId: string, settings: Partial<OrganizationSettings>): Promise<void> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/`);
    const merged = { ...(data.settings ?? defaultSettings()), ...settings };
    await apiClient.patch(`/organizations/${orgId}/`, { settings: merged });
  },

  requestCreation: async (payload: {
    name: string;
    slug: string;
    plan?: SubscriptionTier;
    description?: string;
  }): Promise<void> => {
    await apiClient.post('/organization-requests/', {
      name: payload.name,
      slug: payload.slug,
      plan: payload.plan ?? 'free',
      description: payload.description ?? '',
    });
  },

  requestJoin: async (orgIdOrSlug: string, note?: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgIdOrSlug}/join-requests/`, { note: note ?? '' });
  },

  redeemInviteCode: async (code: string): Promise<{ organization: Organization; member: Record<string, unknown> | null }> => {
    const { data } = await apiClient.post('/invite-codes/redeem/', { code });
    return {
      organization: mapOrg(data.organization as Record<string, unknown>),
      member: (data.member as Record<string, unknown>) || null,
    };
  },
};
