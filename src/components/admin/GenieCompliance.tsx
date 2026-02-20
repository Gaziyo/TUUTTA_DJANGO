import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, ClipboardCheck, FileCheck2, Shield, Download } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';
import {
  exportCertificatesTemplate,
  exportToCSV,
  exportToExcel,
  exportToJSON,
  exportToPDF,
  generateFilename
} from '../../lib/reportExport';
import GenieTutorPanel from './GenieTutorPanel';
import { buildGenieTutorContext } from '../../lib/genieTutorContext';
import { assessmentService } from '../../services/assessmentService';
import type { AssessmentResult } from '../../types/lms';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

interface GenieComplianceProps {
  isDarkMode?: boolean;
  embedded?: boolean;
}

const COMPLIANCE_ACTIONS = new Set([
  'certificate_issued',
  'certificate.issued',
  'enrollment_completed',
  'enrollment.completed',
  'enrollment.failed',
  'enrollment.overdue',
  'assessment.submitted',
  'assessment.passed',
  'assessment.failed',
  'compliance_log',
  'certificate_approval_requested',
  'certificate_approval_approved',
  'certificate_approval_rejected'
]);

const GenieCompliance: React.FC<GenieComplianceProps> = ({ isDarkMode = false, embedded = false }) => {
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    currentOrg,
    members,
    courses,
    enrollments,
    certificates,
    certificateApprovals,
    auditLogs,
    genieSources,
    genieDrafts,
    genieAssessments,
    loadMembers,
    loadCourses,
    loadEnrollments,
    loadCertificates,
    loadCertificateApprovals,
    loadAuditLogs,
    issueCertificate,
    approveCertificateApproval,
    rejectCertificateApproval
  } = useLMSStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approvalSearchQuery, setApprovalSearchQuery] = useState('');
  const [issueUserId, setIssueUserId] = useState('');
  const [issueCourseId, setIssueCourseId] = useState('');
  const [expiryDays, setExpiryDays] = useState('');
  const [issueMessage, setIssueMessage] = useState<string | null>(null);
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const tutorContext = buildGenieTutorContext({
    step: 'governance',
    sources: genieSources,
    drafts: genieDrafts,
    assessments: genieAssessments
  });

  useEffect(() => {
    if (!currentOrg?.id) return;
    loadMembers();
    loadCourses();
    loadEnrollments();
    loadCertificates();
    loadCertificateApprovals();
    loadAuditLogs();
  }, [currentOrg?.id, loadMembers, loadCourses, loadEnrollments, loadCertificates, loadCertificateApprovals, loadAuditLogs]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    const el = document.querySelector(`[data-section="${section}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('section-highlight');
      window.setTimeout(() => el.classList.remove('section-highlight'), 1600);
    }
  }, [searchParams]);

  const jumpTo = (section: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('section', section);
      return next;
    });
  };

  useEffect(() => {
    if (!currentOrg?.id) return;
    let active = true;
    assessmentService.listForOrg(currentOrg.id, 500).then((results) => {
      if (!active) return;
      setAssessmentResults(results);
    });
    return () => {
      active = false;
    };
  }, [currentOrg?.id]);

  const filteredCertificates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter((cert) => {
      const member = members.find(m => m.userId === cert.userId);
      const course = courses.find(c => c.id === cert.courseId);
      return (
        cert.title.toLowerCase().includes(q) ||
        member?.name.toLowerCase().includes(q) ||
        member?.email.toLowerCase().includes(q) ||
        course?.title.toLowerCase().includes(q)
      );
    });
  }, [certificates, searchQuery, members, courses]);

  const complianceLogs = useMemo(() => {
    return auditLogs.filter((log) => COMPLIANCE_ACTIONS.has(log.action));
  }, [auditLogs]);

  const filteredApprovals = useMemo(() => {
    const q = approvalSearchQuery.trim().toLowerCase();
    return certificateApprovals.filter((approval) => {
      if (approvalStatusFilter !== 'all' && approval.status !== approvalStatusFilter) return false;
      if (!q) return true;
      const member = members.find(m => m.userId === approval.userId);
      const course = courses.find(c => c.id === approval.courseId);
      return (
        member?.name.toLowerCase().includes(q) ||
        member?.email.toLowerCase().includes(q) ||
        course?.title.toLowerCase().includes(q) ||
        approval.courseId.toLowerCase().includes(q)
      );
    });
  }, [certificateApprovals, approvalStatusFilter, approvalSearchQuery, members, courses]);

  const dateRange = useMemo(() => {
    if (!reportStart && !reportEnd) return null;
    const start = reportStart ? new Date(reportStart) : null;
    const end = reportEnd ? new Date(reportEnd) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [reportStart, reportEnd]);

  const isInRange = useCallback((timestamp?: number | null) => {
    if (!dateRange) return true;
    if (!timestamp) return false;
    if (dateRange.start && timestamp < dateRange.start.getTime()) return false;
    if (dateRange.end && timestamp > dateRange.end.getTime()) return false;
    return true;
  }, [dateRange]);
  const tutorActions = [
    {
      label: 'Download branded certificates',
      description: 'Export all issued certificates.',
      onClick: () => exportCertificatePDF(),
      variant: 'primary' as const
    },
    {
      label: 'Export evidence package',
      description: 'Bundle summary, certificates, and audit trail.',
      onClick: () => { void exportEvidencePackage(); },
      variant: 'secondary' as const
    },
    {
      label: 'Export compliance logs (CSV)',
      description: 'Audit trail export.',
      onClick: () => exportComplianceLogs('csv')
    },
    {
      label: 'Export approvals (PDF)',
      description: 'Approval history snapshot.',
      onClick: () => exportApprovalHistory('pdf'),
      disabled: filteredApprovals.length === 0
    }
  ];

  const stats = useMemo(() => {
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const overdue = enrollments.filter(e => e.status === 'overdue').length;
    return {
      certificates: certificates.length,
      completed,
      overdue,
      complianceLogs: complianceLogs.length
    };
  }, [certificates, enrollments, complianceLogs]);

  const trainingCompletionColumns = [
    { id: 'learner', label: 'Learner' },
    { id: 'email', label: 'Email' },
    { id: 'course', label: 'Course' },
    { id: 'status', label: 'Status' },
    { id: 'completedAt', label: 'Completed At' },
    { id: 'dueDate', label: 'Due Date' }
  ];

  const overdueColumns = [
    { id: 'learner', label: 'Learner' },
    { id: 'email', label: 'Email' },
    { id: 'course', label: 'Course' },
    { id: 'dueDate', label: 'Due Date' },
    { id: 'daysOverdue', label: 'Days Overdue' },
    { id: 'progress', label: 'Progress (%)' }
  ];

  const assessmentColumns = [
    { id: 'learner', label: 'Learner' },
    { id: 'email', label: 'Email' },
    { id: 'course', label: 'Course' },
    { id: 'assessmentId', label: 'Assessment' },
    { id: 'score', label: 'Score' },
    { id: 'attempts', label: 'Attempts' },
    { id: 'passed', label: 'Passed' },
    { id: 'submittedAt', label: 'Submitted At' }
  ];

  const complianceColumns = [
    { id: 'learner', label: 'Learner' },
    { id: 'email', label: 'Email' },
    { id: 'required', label: 'Required' },
    { id: 'completed', label: 'Completed' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'complianceRate', label: 'Compliance Rate (%)' },
    { id: 'status', label: 'Status' }
  ];

  const auditColumns = [
    { id: 'timestamp', label: 'Timestamp' },
    { id: 'actor', label: 'Actor' },
    { id: 'actorType', label: 'Actor Type' },
    { id: 'action', label: 'Action' },
    { id: 'entityType', label: 'Entity Type' },
    { id: 'entityId', label: 'Entity ID' },
    { id: 'metadata', label: 'Metadata' }
  ];

  const trainingCompletionData = useMemo(() => {
    return enrollments
      .filter((enrollment) => enrollment.status === 'completed' && isInRange(enrollment.completedAt ?? enrollment.assignedAt))
      .map((enrollment) => {
        const member = members.find(m => m.userId === enrollment.userId);
        const course = courses.find(c => c.id === enrollment.courseId);
        return {
          learner: member?.name || 'Learner',
          email: member?.email || '-',
          course: course?.title || enrollment.courseId,
          status: enrollment.status,
          completedAt: enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleString() : '-',
          dueDate: enrollment.dueDate ? new Date(enrollment.dueDate).toLocaleDateString() : '-'
        };
      });
  }, [enrollments, members, courses, isInRange]);

  const overdueReportData = useMemo(() => {
    return enrollments
      .filter((enrollment) => enrollment.status === 'overdue' && isInRange(enrollment.dueDate ?? enrollment.assignedAt))
      .map((enrollment) => {
        const member = members.find(m => m.userId === enrollment.userId);
        const course = courses.find(c => c.id === enrollment.courseId);
        const dueDate = enrollment.dueDate ? new Date(enrollment.dueDate) : null;
        const daysOverdue = dueDate ? Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
        return {
          learner: member?.name || 'Learner',
          email: member?.email || '-',
          course: course?.title || enrollment.courseId,
          dueDate: enrollment.dueDate ? new Date(enrollment.dueDate).toLocaleDateString() : '-',
          daysOverdue,
          progress: enrollment.progress
        };
      });
  }, [enrollments, members, courses, isInRange]);

  const assessmentReportData = useMemo(() => {
    return assessmentResults
      .filter((result) => isInRange(result.createdAt))
      .map((result) => {
        const member = members.find(m => m.userId === result.userId);
        const course = courses.find(c => c.id === result.courseId);
        return {
          learner: member?.name || 'Learner',
          email: member?.email || '-',
          course: course?.title || result.courseId,
          assessmentId: result.assessmentId,
          score: result.score,
          attempts: result.attempts,
          passed: result.passed ? 'Yes' : 'No',
          submittedAt: new Date(result.createdAt).toLocaleString()
        };
      });
  }, [assessmentResults, members, courses, isInRange]);

  const complianceStatusData = useMemo(() => {
    return members.map((member) => {
      const memberId = member.userId || member.id;
      const memberEnrollments = enrollments.filter(e => e.userId === memberId);
      const required = memberEnrollments.filter(e => e.priority === 'required');
      const completed = required.filter(e => e.status === 'completed');
      const overdue = required.filter(e => e.status === 'overdue');
      const complianceRate = required.length
        ? Math.round((completed.length / required.length) * 100)
        : 100;
      const status = required.length === 0
        ? 'No required training'
        : overdue.length > 0
          ? 'At risk'
          : completed.length === required.length
            ? 'Compliant'
            : 'In progress';
      return {
        learner: member.name,
        email: member.email,
        required: required.length,
        completed: completed.length,
        overdue: overdue.length,
        complianceRate,
        status
      };
    });
  }, [members, enrollments]);

  const auditTrailData = useMemo(() => {
    return auditLogs
      .filter((log) => {
        const ts = log.timestamp ?? log.createdAt ?? 0;
        return isInRange(ts);
      })
      .map((log) => ({
        timestamp: new Date(log.timestamp ?? log.createdAt ?? Date.now()).toLocaleString(),
        actor: log.actorName || log.actorId || 'System',
        actorType: log.actorType || 'system',
        action: log.action,
        entityType: log.entityType || log.targetType || '-',
        entityId: log.entityId || log.targetId || '-',
        metadata: log.metadata ? JSON.stringify(log.metadata) : ''
      }));
  }, [auditLogs, isInRange]);

  const handleIssue = async () => {
    setIssueMessage(null);
    if (!issueUserId || !issueCourseId) {
      setIssueMessage('Select a learner and a course.');
      return;
    }
    const course = courses.find(c => c.id === issueCourseId);
    const days = expiryDays ? parseInt(expiryDays) : null;
    const expiresAt = days ? Date.now() + days * 24 * 60 * 60 * 1000 : undefined;
    const result = await issueCertificate({
      userId: issueUserId,
      courseId: issueCourseId,
      title: course?.title || 'Course Completion',
      expiresAt,
      reason: 'manual'
    });
    if (result) {
      setIssueMessage(`Certificate issued for ${course?.title || 'course'}.`);
      setIssueUserId('');
      setIssueCourseId('');
      setExpiryDays('');
    } else {
      setIssueMessage('Failed to issue certificate.');
    }
  };

  const autoIssueEnabled = currentOrg?.settings?.compliance?.autoIssueCertificates ?? true;

  const exportComplianceLogs = (format: 'csv' | 'pdf') => {
    if (!currentOrg) return;
    const data = complianceLogs.map((log) => ({
      action: log.action,
      actor: log.actorName,
      target: log.targetName || '-',
      createdAt: new Date(log.timestamp ?? log.createdAt ?? Date.now()).toLocaleString(),
      metadata: log.metadata ? JSON.stringify(log.metadata) : ''
    }));
    const options = {
      filename: `compliance-logs-${new Date().toISOString().slice(0, 10)}`,
      title: 'Compliance Logs',
      subtitle: `Org: ${currentOrg.name}`,
      columns: [
        { id: 'action', label: 'Action' },
        { id: 'actor', label: 'Actor' },
        { id: 'target', label: 'Target' },
        { id: 'createdAt', label: 'Timestamp' },
        { id: 'metadata', label: 'Metadata' }
      ],
      data
    };
    if (format === 'csv') exportToCSV(options);
    if (format === 'pdf') exportToPDF(options);
  };

  const exportTrainingCompletion = (format: 'csv' | 'excel' | 'pdf') => {
    const options = {
      filename: generateFilename('training-completion'),
      title: 'Training Completion Report',
      subtitle: currentOrg ? `Org: ${currentOrg.name}` : undefined,
      columns: trainingCompletionColumns,
      data: trainingCompletionData,
      dateRange: dateRange ? { start: dateRange.start ?? new Date(0), end: dateRange.end ?? new Date() } : undefined
    };
    if (format === 'csv') exportToCSV(options);
    if (format === 'excel') exportToExcel(options);
    if (format === 'pdf') exportToPDF(options);
  };

  const exportOverdueTraining = (format: 'csv' | 'excel' | 'pdf') => {
    const options = {
      filename: generateFilename('overdue-training'),
      title: 'Overdue Training Report',
      subtitle: currentOrg ? `Org: ${currentOrg.name}` : undefined,
      columns: overdueColumns,
      data: overdueReportData,
      dateRange: dateRange ? { start: dateRange.start ?? new Date(0), end: dateRange.end ?? new Date() } : undefined
    };
    if (format === 'csv') exportToCSV(options);
    if (format === 'excel') exportToExcel(options);
    if (format === 'pdf') exportToPDF(options);
  };

  const exportAssessmentResults = (format: 'csv' | 'excel' | 'pdf') => {
    const options = {
      filename: generateFilename('assessment-results'),
      title: 'Assessment Results Report',
      subtitle: currentOrg ? `Org: ${currentOrg.name}` : undefined,
      columns: assessmentColumns,
      data: assessmentReportData,
      dateRange: dateRange ? { start: dateRange.start ?? new Date(0), end: dateRange.end ?? new Date() } : undefined
    };
    if (format === 'csv') exportToCSV(options);
    if (format === 'excel') exportToExcel(options);
    if (format === 'pdf') exportToPDF(options);
  };

  const exportComplianceStatus = (format: 'csv' | 'excel' | 'pdf') => {
    const options = {
      filename: generateFilename('compliance-status'),
      title: 'Compliance Status Report',
      subtitle: currentOrg ? `Org: ${currentOrg.name}` : undefined,
      columns: complianceColumns,
      data: complianceStatusData,
      dateRange: dateRange ? { start: dateRange.start ?? new Date(0), end: dateRange.end ?? new Date() } : undefined
    };
    if (format === 'csv') exportToCSV(options);
    if (format === 'excel') exportToExcel(options);
    if (format === 'pdf') exportToPDF(options);
  };

  const exportAuditTrail = (format: 'csv' | 'pdf' | 'json') => {
    const options = {
      filename: generateFilename('audit-trail'),
      title: 'Audit Trail',
      subtitle: currentOrg ? `Org: ${currentOrg.name}` : undefined,
      columns: auditColumns,
      data: auditTrailData,
      dateRange: dateRange ? { start: dateRange.start ?? new Date(0), end: dateRange.end ?? new Date() } : undefined
    };
    if (format === 'csv') exportToCSV(options);
    if (format === 'pdf') exportToPDF(options);
    if (format === 'json') exportToJSON(options.filename, auditTrailData);
  };

  const exportCertificatePDF = async (certificateId?: string) => {
    if (!currentOrg) return;
    const certs = certificateId
      ? certificates.filter((c) => c.id === certificateId)
      : certificates;
    const data = certs.map((cert) => {
      const member = members.find(m => m.userId === cert.userId);
      const course = courses.find(c => c.id === cert.courseId);
      return {
        orgName: currentOrg.name,
        orgLogo: currentOrg.settings?.branding?.logo,
        primaryColor: currentOrg.settings?.branding?.primaryColor,
        secondaryColor: currentOrg.settings?.branding?.secondaryColor,
        certificateTitle: cert.title,
        learnerName: member?.name || 'Learner',
        courseTitle: course?.title || 'Course',
        issuedAt: new Date(cert.issuedAt).toLocaleDateString(),
        expiresAt: cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : null,
        certificateNumber: cert.certificateNumber,
        verificationUrl: cert.verificationUrl,
        courseVersion: cert.evidence?.courseVersion,
        assessmentScore: cert.evidence?.assessmentScore
      };
    });
    exportCertificatesTemplate(
      `certificates-${new Date().toISOString().slice(0, 10)}`,
      data
    );
  };

  const exportEvidencePackage = async () => {
    if (!currentOrg) return;
    setEvidenceMessage(null);
    setEvidenceBusy(true);
    try {
      const call = httpsCallable(functions, 'genieEvidenceExport');
      const payload = {
        orgId: currentOrg.id,
        startDate: dateRange?.start ? dateRange.start.getTime() : null,
        endDate: dateRange?.end ? dateRange.end.getTime() : null,
      };
      const result = await call(payload);
      const data = result.data as { url?: string };
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
        setEvidenceMessage('Evidence package generated.');
      } else {
        setEvidenceMessage('Export completed, but no URL returned.');
      }
    } catch {
      setEvidenceMessage('Failed to generate evidence package.');
    } finally {
      setEvidenceBusy(false);
    }
  };

  const exportApprovalHistory = (format: 'csv' | 'pdf') => {
    if (!currentOrg) return;
    const data = filteredApprovals.map((approval) => {
      const member = members.find(m => m.userId === approval.userId);
      const course = courses.find(c => c.id === approval.courseId);
      return {
        learner: member?.name || 'Learner',
        email: member?.email || '-',
        course: course?.title || 'Course',
        status: approval.status,
        requestedAt: new Date(approval.requestedAt).toLocaleString(),
        decidedAt: approval.decidedAt ? new Date(approval.decidedAt).toLocaleString() : '-',
        decidedBy: approval.decidedBy || '-',
        reason: approval.reason || '-'
      };
    });
    const options = {
      filename: `certificate-approvals-${new Date().toISOString().slice(0, 10)}`,
      title: 'Certificate Approvals',
      subtitle: `Org: ${currentOrg.name}`,
      columns: [
        { id: 'learner', label: 'Learner' },
        { id: 'email', label: 'Email' },
        { id: 'course', label: 'Course' },
        { id: 'status', label: 'Status' },
        { id: 'requestedAt', label: 'Requested' },
        { id: 'decidedAt', label: 'Decided' },
        { id: 'decidedBy', label: 'Decided By' },
        { id: 'reason', label: 'Reason' }
      ],
      data
    };
    if (format === 'csv') exportToCSV(options);
    if (format === 'pdf') exportToPDF(options);
  };

  return (
    <div className={`${embedded ? '' : 'h-full'} flex flex-col bg-app-bg text-app-text`} data-section="evidence">
      {!embedded && (
        <>
          <AdminPageHeader
            title="Genie Certification & Compliance"
            subtitle="Auto-issue certificates, track completion, and keep audit trails."
            isDarkMode={themeDark}
            badge="Compliance"
            actions={(
              <div className="text-xs">
                <span className={`px-3 py-1 rounded-full ${
                  autoIssueEnabled
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                }`}>
                  Auto certificates {autoIssueEnabled ? 'On' : 'Off'}
                </span>
              </div>
            )}
          />
          <div className="px-6 pb-4">
            <div className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs">
              <button
                type="button"
                onClick={() => jumpTo('evidence')}
                className="rounded-full px-3 py-1 font-medium text-muted-foreground hover:text-foreground"
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => jumpTo('evidence')}
                className="rounded-full px-3 py-1 font-medium text-muted-foreground hover:text-foreground"
              >
                Evidence
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <AdminSection title="AI Tutor" subtitle="Guidance for compliance, certificates, and audit trails." isDarkMode={themeDark} minHeight="200px">
          <GenieTutorPanel context={tutorContext} actions={tutorActions} isDarkMode={themeDark} />
        </AdminSection>

        <AdminSection title="Overview" isDarkMode={themeDark} minHeight="120px">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Certificates Issued', value: stats.certificates, icon: Award },
              { label: 'Completed Enrollments', value: stats.completed, icon: FileCheck2 },
              { label: 'Overdue', value: stats.overdue, icon: Shield },
              { label: 'Compliance Logs', value: stats.complianceLogs, icon: ClipboardCheck }
            ].map((card) => (
              <div key={card.label} className={`p-4 rounded-xl border ${
                themeDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
                  <card.icon className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="Compliance Reports & Evidence" subtitle="Generate exports and audit-ready evidence packages." isDarkMode={themeDark} minHeight="200px">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>Start date</label>
              <input
                type="date"
                value={reportStart}
                onChange={(e) => setReportStart(e.target.value)}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>End date</label>
              <input
                type="date"
                value={reportEnd}
                onChange={(e) => setReportEnd(e.target.value)}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <button
              onClick={() => { setReportStart(''); setReportEnd(''); }}
              className={`px-3 py-2 rounded-lg border text-xs ${
                themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              Clear dates
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className={`p-3 rounded-xl border ${themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <p className="text-sm font-semibold">Training Completion</p>
              <p className={`text-xs mb-2 ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>Who completed what by when.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => exportTrainingCompletion('csv')} className="px-3 py-1 rounded-lg text-xs border">CSV</button>
                <button onClick={() => exportTrainingCompletion('excel')} className="px-3 py-1 rounded-lg text-xs border">Excel</button>
                <button onClick={() => exportTrainingCompletion('pdf')} className="px-3 py-1 rounded-lg text-xs border">PDF</button>
              </div>
            </div>
            <div className={`p-3 rounded-xl border ${themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <p className="text-sm font-semibold">Overdue Training</p>
              <p className={`text-xs mb-2 ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>Learners missing deadlines.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => exportOverdueTraining('csv')} className="px-3 py-1 rounded-lg text-xs border">CSV</button>
                <button onClick={() => exportOverdueTraining('excel')} className="px-3 py-1 rounded-lg text-xs border">Excel</button>
                <button onClick={() => exportOverdueTraining('pdf')} className="px-3 py-1 rounded-lg text-xs border">PDF</button>
              </div>
            </div>
            <div className={`p-3 rounded-xl border ${themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <p className="text-sm font-semibold">Assessment Results</p>
              <p className={`text-xs mb-2 ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>Scores and attempts across courses.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => exportAssessmentResults('csv')} className="px-3 py-1 rounded-lg text-xs border">CSV</button>
                <button onClick={() => exportAssessmentResults('excel')} className="px-3 py-1 rounded-lg text-xs border">Excel</button>
                <button onClick={() => exportAssessmentResults('pdf')} className="px-3 py-1 rounded-lg text-xs border">PDF</button>
              </div>
            </div>
            <div className={`p-3 rounded-xl border ${themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <p className="text-sm font-semibold">Compliance Status</p>
              <p className={`text-xs mb-2 ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>Pass/fail by required training.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => exportComplianceStatus('csv')} className="px-3 py-1 rounded-lg text-xs border">CSV</button>
                <button onClick={() => exportComplianceStatus('excel')} className="px-3 py-1 rounded-lg text-xs border">Excel</button>
                <button onClick={() => exportComplianceStatus('pdf')} className="px-3 py-1 rounded-lg text-xs border">PDF</button>
              </div>
            </div>
            <div className={`p-3 rounded-xl border ${themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <p className="text-sm font-semibold">Audit Trail</p>
              <p className={`text-xs mb-2 ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>Detailed activity logs.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => exportAuditTrail('csv')} className="px-3 py-1 rounded-lg text-xs border">CSV</button>
                <button onClick={() => exportAuditTrail('pdf')} className="px-3 py-1 rounded-lg text-xs border">PDF</button>
                <button onClick={() => exportAuditTrail('json')} className="px-3 py-1 rounded-lg text-xs border">JSON</button>
              </div>
            </div>
            <div className={`p-3 rounded-xl border ${themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <p className="text-sm font-semibold">Evidence Package</p>
              <p className={`text-xs mb-2 ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>ZIP with reports + certificates.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { void exportEvidencePackage(); }}
                  className="px-3 py-1 rounded-lg text-xs border"
                  disabled={evidenceBusy}
                >
                  {evidenceBusy ? 'Preparing…' : 'Download ZIP'}
                </button>
              </div>
              {evidenceMessage && (
                <p className={`text-xs mt-2 ${evidenceMessage.includes('Failed') ? 'text-red-500' : 'text-emerald-500'}`}>
                  {evidenceMessage}
                </p>
              )}
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Manual Certificate Issuance" subtitle="Grant certificates for exceptional completions." isDarkMode={themeDark} minHeight="180px">
          <div className="flex flex-wrap gap-3 items-end">
            <select
              value={issueUserId}
              onChange={(e) => setIssueUserId(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm min-w-[220px] ${
                themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Select learner</option>
              {members.map((member) => (
                <option key={member.id} value={member.userId || member.id}>{member.name}</option>
              ))}
            </select>
            <select
              value={issueCourseId}
              onChange={(e) => setIssueCourseId(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm min-w-[220px] ${
                themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <input
              type="number"
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              placeholder="Expiry days (optional)"
              className={`px-3 py-2 rounded-lg border text-sm w-44 ${
                themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            <button
              onClick={handleIssue}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
            >
              Issue certificate
            </button>
            {issueMessage && (
              <span className={`text-xs ${issueMessage.includes('failed') ? 'text-red-500' : 'text-emerald-500'}`}>
                {issueMessage}
              </span>
            )}
          </div>
        </AdminSection>

        <AdminSection title="Approval History" subtitle="Review and approve certificate requests." isDarkMode={themeDark} minHeight="240px">
          <AdminToolbar
            isDarkMode={themeDark}
            searchValue={approvalSearchQuery}
            onSearchChange={setApprovalSearchQuery}
            searchPlaceholder="Search approvals..."
            rightContent={(
              <>
                <select
                  value={approvalStatusFilter}
                  onChange={(e) => setApprovalStatusFilter(e.target.value as typeof approvalStatusFilter)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  onClick={() => exportApprovalHistory('csv')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                    themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => exportApprovalHistory('pdf')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                    themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </>
            )}
          />
          <div className="mt-4">
          {filteredApprovals.length === 0 ? (
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No approvals found.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredApprovals.map((approval) => {
                const member = members.find(m => m.userId === approval.userId);
                const course = courses.find(c => c.id === approval.courseId);
                return (
                  <div
                    key={approval.id}
                    className={`rounded-lg border p-3 flex items-center justify-between ${
                      themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{member?.name || 'Learner'} • {course?.title || 'Course'}</p>
                      <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Requested {new Date(approval.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {approval.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => approveCertificateApproval(approval.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectCertificateApproval(approval.id)}
                            className="px-3 py-1 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          approval.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {approval.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </AdminSection>

        <AdminSection title="Certificates" subtitle="Issued certificates across the organization." isDarkMode={themeDark} minHeight="240px">
          <div className="flex items-center justify-end mb-3">
            <button
              onClick={() => { void exportCertificatePDF(); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Download className="w-4 h-4" />
              Export certificates PDF
            </button>
          </div>
          <AdminToolbar
            isDarkMode={themeDark}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search certificates, learners, or courses..."
          />
          <div className="mt-4 space-y-2">
            {filteredCertificates.length === 0 ? (
              <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No certificates issued yet.
              </p>
            ) : (
              filteredCertificates.slice(0, 20).map((cert) => {
                const member = members.find(m => m.userId === cert.userId);
                const course = courses.find(c => c.id === cert.courseId);
                return (
                  <div
                    key={cert.id}
                    className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
                      themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{cert.title}</p>
                      <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {member?.name || 'Learner'} • {course?.title || 'Course'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs">{new Date(cert.issuedAt).toLocaleDateString()}</p>
                      <p className={`text-xs ${themeDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {cert.certificateNumber}
                      </p>
                    </div>
                    <button
                      onClick={() => { void exportCertificatePDF(cert.id); }}
                      className={`px-3 py-1 rounded-lg border text-xs ${
                        themeDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Download PDF
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </AdminSection>

        <AdminSection title="Compliance Logs" subtitle="Key completion and certificate events." isDarkMode={themeDark} minHeight="220px">
          <div className="flex items-center justify-end gap-2 mb-3">
            <button
              onClick={() => exportComplianceLogs('csv')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => exportComplianceLogs('pdf')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
          {complianceLogs.length === 0 ? (
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No compliance events yet.
            </p>
          ) : (
            <div className="space-y-2">
              {complianceLogs.slice(0, 15).map((log) => (
                <div
                  key={log.id}
                  className={`rounded-lg border p-3 text-xs ${
                    themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <p className="font-semibold">{log.action.replace(/[_\\.]/g, ' ')}</p>
                  <p className={`${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {log.actorName} • {new Date(log.createdAt).toLocaleString()}
                  </p>
                  {log.metadata?.courseId && (
                    <p className={`${themeDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Course: {log.metadata.courseId}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      </div>
    </div>
  );
};

export default GenieCompliance;
