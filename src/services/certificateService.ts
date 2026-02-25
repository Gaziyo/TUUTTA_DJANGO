import type { Certificate, CertificateApproval } from '../types/lms';
import { apiClient } from '../lib/api';
import { serviceEvents } from './events';

function mapCert(data: Record<string, unknown>): Certificate {
  return {
    id: data.id as string,
    orgId: data.organization as string,
    userId: data.user as string,
    courseId: data.course as string,
    title: (data.course_title as string) || '',
    certificateNumber: data.certificate_number as string,
    issuedAt: data.issued_at ? new Date(data.issued_at as string).getTime() : Date.now(),
    expiresAt: data.expires_at ? new Date(data.expires_at as string).getTime() : undefined,
    status: (data.status as Certificate['status']) || 'active',
    evidence: undefined,
    createdAt: data.issued_at ? new Date(data.issued_at as string).getTime() : Date.now(),
  };
}

export const certificateService = {
  issue: async (request: {
    orgId: string;
    userId: string;
    courseId: string;
    title: string;
    expiresAt?: number;
  }): Promise<Certificate> => {
    const { data } = await apiClient.post('/certificates/', {
      organization: request.orgId,
      user: request.userId,
      course: request.courseId,
      expires_at: request.expiresAt ? new Date(request.expiresAt).toISOString() : null,
    });
    const cert = mapCert(data);
    serviceEvents.emit('certificate.issued', { certificateId: cert.id, userId: cert.userId });
    return cert;
  },

  listForUser: async (_orgId: string, userId: string): Promise<Certificate[]> => {
    try {
      const { data } = await apiClient.get('/certificates/', { params: { user: userId } });
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapCert);
    } catch { return []; }
  },

  listForOrg: async (orgId: string): Promise<Certificate[]> => {
    try {
      const { data } = await apiClient.get('/certificates/', { params: { organization: orgId } });
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapCert);
    } catch { return []; }
  },

  verify: async (_certificateNumber: string): Promise<Certificate | null> => null,
  requestApproval: async (_approval: Omit<CertificateApproval, 'id'>): Promise<CertificateApproval> => {
    throw new Error('Certificate approvals not yet implemented on Django backend');
  },
  listApprovals: async (_orgId: string, _status?: string): Promise<CertificateApproval[]> => [],
  updateApproval: async (_approvalId: string, _updates: Partial<CertificateApproval>): Promise<void> => {},
};
