import type { Certificate, CertificateApproval } from '../types/lms';
import * as lmsService from '../lib/lmsService';
import { serviceEvents } from './events';

export const certificateService = {
  issue: async (request: {
    orgId: string;
    userId: string;
    courseId: string;
    title: string;
    expiresAt?: number;
    evidence?: Certificate['evidence'];
  }) => {
    const certificate = await lmsService.issueCertificate(
      request.orgId,
      request.userId,
      request.courseId,
      request.title,
      request.expiresAt,
      request.evidence
    );
    serviceEvents.emit('certificate.issued', { certificateId: certificate.id, userId: certificate.userId });
    return certificate;
  },
  listForUser: (orgId: string, userId: string) => lmsService.getUserCertificates(orgId, userId),
  listForOrg: (orgId: string) => lmsService.getOrgCertificates(orgId),
  verify: (certificateNumber: string) => lmsService.verifyCertificate(certificateNumber),
  requestApproval: (approval: Omit<CertificateApproval, 'id'>) => lmsService.createCertificateApproval(approval),
  listApprovals: (orgId: string, status?: 'pending' | 'approved' | 'rejected') =>
    lmsService.getCertificateApprovals(orgId, status),
  updateApproval: (approvalId: string, updates: Partial<CertificateApproval>) =>
    lmsService.updateCertificateApproval(approvalId, updates),
};
