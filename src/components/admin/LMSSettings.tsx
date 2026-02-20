import React, { useEffect, useState } from 'react';
import {
  Settings,
  Globe,
  Bell,
  Mail,
  Shield,
  Palette,
  Award,
  Database,
  Save,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Image,
  Users,
  Lock,
} from 'lucide-react';
import { ROLE_PERMISSIONS, UserRole, RetentionPolicy } from '../../types/lms';
import { useLMSStore } from '../../store/lmsStore';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { db, functions } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { enrollmentService } from '../../services';

interface LMSSettingsProps {
  isDarkMode?: boolean;
}

type SettingsCategory = 'general' | 'appearance' | 'notifications' | 'certificates' | 'compliance' | 'privacy' | 'advanced' | 'permissions';

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const mapWebhookDoc = (docRef: { id: string; data: () => unknown }) => {
  const data = asRecord(docRef.data());
  const events = Array.isArray(data.events)
    ? data.events.filter((item): item is string => typeof item === 'string')
    : undefined;
  return {
    id: docRef.id,
    url: typeof data.url === 'string' ? data.url : '',
    secret: typeof data.secret === 'string' ? data.secret : undefined,
    events,
    enabled: typeof data.enabled === 'boolean' ? data.enabled : undefined
  };
};

const mapConnectionDoc = (docRef: { id: string; data: () => unknown }) => {
  const data = asRecord(docRef.data());
  return {
    id: docRef.id,
    provider: typeof data.provider === 'string' ? data.provider : '',
    enabled: typeof data.enabled === 'boolean' ? data.enabled : false
  };
};

const mapWebhookLogDoc = (docRef: { id: string; data: () => unknown }) => {
  const data = asRecord(docRef.data());
  return {
    id: docRef.id,
    event: typeof data.event === 'string' ? data.event : '',
    status: typeof data.status === 'string' ? data.status : '',
    statusCode: typeof data.statusCode === 'number' ? data.statusCode : undefined,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : undefined,
    url: typeof data.url === 'string' ? data.url : undefined
  };
};

export const LMSSettings: React.FC<LMSSettingsProps> = ({ isDarkMode = false }) => {
  const {
    currentOrg,
    currentMember,
    updateOrganization,
    loadMembers,
    loadTeams,
    loadDepartments,
    loadCourses,
    loadEnrollments,
    addMember,
    updateMember,
    removeMember,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    createTeam,
    updateTeam,
    deleteTeam,
    createCourse,
    updateCourse,
    publishCourse,
    deleteCourse,
    bulkEnroll
  } = useLMSStore();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [webhooks, setWebhooks] = useState<Array<{ id: string; url: string; secret?: string; events?: string[]; enabled?: boolean }>>([]);
  const [ssoConnections, setSsoConnections] = useState<Array<{ id: string; provider: string; enabled: boolean }>>([]);
  const [hrisIntegrations, setHrisIntegrations] = useState<Array<{ id: string; provider: string; enabled: boolean }>>([]);
  const [webhookLogs, setWebhookLogs] = useState<Array<{ id: string; event: string; status: string; statusCode?: number; createdAt?: number; url?: string }>>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('enrollment.completed,assessment.passed,assessment.failed,course.published,certificate.issued');
  const [ssoProvider, setSsoProvider] = useState('azure_ad');
  const [ssoConfig, setSsoConfig] = useState('{}');
  const [hrisProvider, setHrisProvider] = useState('workday');
  const [hrisConfig, setHrisConfig] = useState('{}');

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Learning Management System',
    siteDescription: 'Enterprise learning platform for professional development',
    supportEmail: 'support@company.com',
    timezone: 'America/New_York',
    language: 'en-US',
    dateFormat: 'MM/DD/YYYY',
    defaultCourseLanguage: 'en',
    selfRegistration: true,
    guestAccess: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5
  });

  // Appearance Settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    primaryColor: '#4F46E5',
    secondaryColor: '#7C3AED',
    logoUrl: '',
    faviconUrl: '',
    headerStyle: 'default',
    footerText: '© 2024 Company Name. All rights reserved.',
    showBranding: true,
    customCSS: ''
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    inAppEnabled: true,
    pushEnabled: false,
    digestFrequency: 'daily',
    courseEnrollment: true,
    courseCompletion: true,
    assignmentDue: true,
    certificateIssued: true,
    newAnnouncements: true,
    discussionReplies: true,
    gradePosted: true,
    reminderDaysBefore: 3,
    managerDigestEnabled: false,
    managerDigestFrequency: 'weekly',
    managerDigestRoles: ['team_lead', 'ld_manager'] as UserRole[],
    webhookUrl: ''
  });

  const [genieReportSettings, setGenieReportSettings] = useState({
    provider: 'sendgrid',
    senderName: 'Tuutta Reports',
    senderEmail: 'reports@company.com',
    apiKey: '',
    defaultRecipients: ''
  });
  const [genieReportSettingsId, setGenieReportSettingsId] = useState<string | null>(null);

  // Certificate Settings
  const [certificateSettings, setCertificateSettings] = useState({
    autoIssue: true,
    requireApproval: false,
    expirationEnabled: false,
    defaultExpiration: 12,
    includeQRCode: true,
    includeSignature: true,
    signatureName: 'Training Director',
    signatureTitle: 'Director of Learning & Development',
    templateId: 'default',
    verificationEnabled: true
  });

  // Compliance Settings
  const [complianceSettings, setComplianceSettings] = useState({
    trackingEnabled: true,
    retentionPeriod: 7,
    auditLogEnabled: true,
    scormVersion: '1.2',
    xapiEnabled: true,
    lrsEndpoint: '',
    complianceReminders: true,
    overdueEscalation: true,
    escalationDays: 7,
    reportingSchedule: 'weekly'
  });
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);

  // Privacy Settings
  const [privacySettings, setPrivacySettings] = useState({
    dataRetention: 36,
    anonymizeInactive: true,
    anonymizeAfterMonths: 24,
    cookieConsent: true,
    gdprCompliance: true,
    dataExportEnabled: true,
    dataDeletionEnabled: true,
    privacyPolicyUrl: '',
    termsOfServiceUrl: ''
  });

  // Advanced Settings
  const [advancedSettings, setAdvancedSettings] = useState({
    debugMode: false,
    maintenanceMode: false,
    maintenanceMessage: 'The system is currently undergoing maintenance. Please check back later.',
    apiRateLimit: 1000,
    maxUploadSize: 100,
    allowedFileTypes: 'pdf,doc,docx,ppt,pptx,xls,xlsx,mp4,mp3,zip',
    cacheEnabled: true,
    cacheDuration: 60,
    cdnEnabled: false,
    cdnUrl: ''
  });

  const demoKey = currentOrg?.id ? `tuutta_demo_seed_${currentOrg.id}` : 'tuutta_demo_seed';

  const saveDemoIds = (payload: {
    departments: string[];
    teams: string[];
    members: string[];
    courses: string[];
    enrollments: string[];
  }) => {
    localStorage.setItem(demoKey, JSON.stringify(payload));
  };

  const loadDemoIds = () => {
    const raw = localStorage.getItem(demoKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as {
        departments: string[];
        teams: string[];
        members: string[];
        courses: string[];
        enrollments: string[];
      };
    } catch {
      return null;
    }
  };

  const parseJsonObject = (value: string): Record<string, unknown> | null => {
    try {
      const parsed: unknown = JSON.parse(value || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  };

  const seedDemoData = async () => {
    if (!currentOrg || !currentMember) {
      alert('Select an organization and ensure you are logged in.');
      return;
    }
    if (!window.confirm('Create demo data for this org?')) return;

    setIsSeeding(true);
    try {
      const demoBatchId = `demo_${Date.now()}`;
      const departments: string[] = [];
      const teams: string[] = [];
      const members: string[] = [];
      const courses: string[] = [];
      const enrollments: string[] = [];

      const hr = await createDepartment({ name: 'Human Resources', description: 'People Ops' });
      const eng = await createDepartment({ name: 'Engineering', description: 'Product + Platform' });
      departments.push(hr.id, eng.id);
      const demoDepartmentUpdate = { isDemo: true, demoBatchId };
      await updateDepartment(hr.id, demoDepartmentUpdate);
      await updateDepartment(eng.id, demoDepartmentUpdate);

      const peopleOps = await createTeam({ name: 'People Ops', departmentId: hr.id });
      const platform = await createTeam({ name: 'Platform', departmentId: eng.id });
      teams.push(peopleOps.id, platform.id);
      const demoTeamUpdate = { isDemo: true, demoBatchId };
      await updateTeam(peopleOps.id, demoTeamUpdate);
      await updateTeam(platform.id, demoTeamUpdate);

      const demoMembers: Array<{ name: string; email: string; role: UserRole; departmentId: string; teamId: string }> = [
        { name: 'Ava Brooks', email: 'ava.demo@tuutta.app', role: 'org_admin', departmentId: hr.id, teamId: peopleOps.id },
        { name: 'Liam Chen', email: 'liam.demo@tuutta.app', role: 'ld_manager', departmentId: hr.id, teamId: peopleOps.id },
        { name: 'Maya Singh', email: 'maya.demo@tuutta.app', role: 'instructor', departmentId: eng.id, teamId: platform.id },
        { name: 'Noah Patel', email: 'noah.demo@tuutta.app', role: 'team_lead', departmentId: eng.id, teamId: platform.id },
        { name: 'Zoe Carter', email: 'zoe.demo@tuutta.app', role: 'learner', departmentId: eng.id, teamId: platform.id },
        { name: 'Ethan Ruiz', email: 'ethan.demo@tuutta.app', role: 'learner', departmentId: hr.id, teamId: peopleOps.id }
      ];

      for (const member of demoMembers) {
        const created = await addMember(member.email, member.name, member.role, member.departmentId);
        const demoMemberUpdate = { teamId: member.teamId, isDemo: true, demoBatchId };
        await updateMember(created.id, demoMemberUpdate);
        members.push(created.id);
      }

      const demoCourse = await createCourse({
        title: 'Workplace Compliance Essentials',
        description: 'Demo course generated for the Genie pipeline.',
        category: 'Compliance',
        tags: ['Compliance', 'Safety', 'Policy'],
        difficulty: 'beginner',
        estimatedDuration: 60,
        modules: [
          {
            id: `module_${Date.now()}_1`,
            title: 'Core Policies',
            order: 1,
            lessons: [
              {
                id: `lesson_${Date.now()}_1`,
                title: 'Code of Conduct Overview',
                type: 'text',
                content: { htmlContent: '<p>Overview of code of conduct.</p>' },
                duration: 10,
                order: 1,
                isRequired: true
              }
            ]
          },
          {
            id: `module_${Date.now()}_2`,
            title: 'Safety Basics',
            order: 2,
            lessons: [
              {
                id: `lesson_${Date.now()}_2`,
                title: 'Safety Procedures',
                type: 'text',
                content: { htmlContent: '<p>Safety procedures and reporting.</p>' },
                duration: 10,
                order: 1,
                isRequired: true
              }
            ]
          }
        ]
      });
      courses.push(demoCourse.id);
      const demoCourseUpdate = { isDemo: true, demoBatchId };
      await updateCourse(demoCourse.id, demoCourseUpdate);
      await publishCourse(demoCourse.id);

      const createdEnrollments = await bulkEnroll(members, demoCourse.id, { priority: 'required' });
      createdEnrollments.forEach((enrollment) => enrollments.push(enrollment.id));
      await Promise.all(
        createdEnrollments.map((enrollment) =>
          enrollmentService.update(enrollment.id, { isDemo: true, demoBatchId })
        )
      );

      saveDemoIds({ departments, teams, members, courses, enrollments });
      alert('Demo data created.');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsSeeding(false);
    }
  };

  const removeDemoData = async () => {
    if (!currentOrg) {
      alert('Select an organization first.');
      return;
    }
    if (!window.confirm('Remove demo data for this org?')) return;

    setIsRemoving(true);
    try {
      await Promise.all([loadMembers(), loadTeams(), loadDepartments(), loadCourses(), loadEnrollments()]);

      const demoIds = loadDemoIds();
      const membersToRemove = demoIds?.members || [];
      const teamsToRemove = demoIds?.teams || [];
      const departmentsToRemove = demoIds?.departments || [];
      const coursesToRemove = demoIds?.courses || [];
      const enrollmentsToRemove = demoIds?.enrollments || [];

      for (const enrollmentId of enrollmentsToRemove) {
        await enrollmentService.remove(enrollmentId);
      }
      for (const courseId of coursesToRemove) {
        await deleteCourse(courseId);
      }
      for (const teamId of teamsToRemove) {
        await deleteTeam(teamId);
      }
      for (const departmentId of departmentsToRemove) {
        await deleteDepartment(departmentId);
      }
      for (const memberId of membersToRemove) {
        await removeMember(memberId);
      }

      localStorage.removeItem(demoKey);
      alert('Demo data removed.');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsRemoving(false);
    }
  };

  const categories = [
    { id: 'general', label: 'General', icon: Settings, description: 'Basic LMS configuration' },
    { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Branding and theme settings' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and alert preferences' },
    { id: 'certificates', label: 'Certificates', icon: Award, description: 'Certificate generation settings' },
    { id: 'compliance', label: 'Compliance', icon: Shield, description: 'Tracking and reporting settings' },
    { id: 'privacy', label: 'Privacy', icon: Lock, description: 'Data protection and GDPR' },
    { id: 'permissions', label: 'Permissions', icon: Users, description: 'Role-based access overview' },
    { id: 'advanced', label: 'Advanced', icon: Database, description: 'System and performance settings' }
  ];

  const handleSave = async () => {
    setSaving(true);
    if (currentOrg?.id) {
      const payload = {
        orgId: currentOrg.id,
        ...genieReportSettings,
        updatedAt: Date.now()
      };
      if (genieReportSettingsId) {
        await updateDoc(doc(db, 'genieReportEmailSettings', genieReportSettingsId), payload);
      } else {
        const created = await addDoc(collection(db, 'genieReportEmailSettings'), {
          ...payload,
          createdAt: Date.now()
        });
        setGenieReportSettingsId(created.id);
      }

      await updateOrganization({
        settings: {
          ...currentOrg.settings,
          apiKey: apiKey || currentOrg.settings?.apiKey,
          notifications: {
            ...currentOrg.settings.notifications,
            emailEnabled: notificationSettings.emailEnabled,
            inAppEnabled: notificationSettings.inAppEnabled,
            pushEnabled: notificationSettings.pushEnabled,
            digestFrequency: notificationSettings.digestFrequency,
            courseEnrollment: notificationSettings.courseEnrollment,
            courseCompletion: notificationSettings.courseCompletion,
            assignmentDue: notificationSettings.assignmentDue,
            certificateIssued: notificationSettings.certificateIssued,
            newAnnouncements: notificationSettings.newAnnouncements,
            discussionReplies: notificationSettings.discussionReplies,
            gradePosted: notificationSettings.gradePosted,
            reminderDaysBefore: notificationSettings.reminderDaysBefore,
            managerDigestEnabled: notificationSettings.managerDigestEnabled,
            managerDigestFrequency: notificationSettings.managerDigestFrequency,
            managerDigestRoles: notificationSettings.managerDigestRoles,
            webhookUrl: notificationSettings.webhookUrl,
          },
          compliance: {
            ...currentOrg.settings.compliance,
            autoIssueCertificates: certificateSettings.autoIssue,
            requireCertificateApproval: certificateSettings.requireApproval,
            logCompletionEvents: complianceSettings.auditLogEnabled,
            retentionPolicies
          }
        }
      });
    }
    setSaving(false);
    setHasChanges(false);
  };

  const updateSettings = (updater: () => void) => {
    updater();
    setHasChanges(true);
  };

  const saveWebhook = async () => {
    if (!currentOrg?.id || !webhookUrl.trim()) return;
    const events = webhookEvents
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    const created = await addDoc(collection(db, 'orgWebhooks'), {
      orgId: currentOrg.id,
      url: webhookUrl.trim(),
      secret: webhookSecret.trim() || null,
      events,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setWebhooks((prev) => ([
      ...prev,
      { id: created.id, url: webhookUrl.trim(), secret: webhookSecret.trim() || undefined, events, enabled: true }
    ]));
    setWebhookUrl('');
    setWebhookSecret('');
  };

  const removeWebhook = async (id: string) => {
    await deleteDoc(doc(db, 'orgWebhooks', id));
    setWebhooks((prev) => prev.filter(item => item.id !== id));
  };

  const toggleWebhook = async (id: string, enabled: boolean) => {
    await updateDoc(doc(db, 'orgWebhooks', id), { enabled, updatedAt: Date.now() });
    setWebhooks((prev) => prev.map(item => item.id === id ? { ...item, enabled } : item));
  };

  const testWebhook = async () => {
    if (!currentOrg?.id) return;
    const call = httpsCallable(functions, 'testOrgWebhook');
    await call({ orgId: currentOrg.id });
  };

  const refreshWebhookLogs = async () => {
    if (!currentOrg?.id) return;
    const logSnap = await getDocs(query(
      collection(db, 'webhookDeliveries'),
      where('orgId', '==', currentOrg.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    ));
    setWebhookLogs(logSnap.docs.map(mapWebhookLogDoc));
  };

  const saveSSOConnection = async () => {
    if (!currentOrg?.id) return;
    const config = parseJsonObject(ssoConfig);
    if (!config) {
      alert('Invalid SSO config JSON.');
      return;
    }
    const created = await addDoc(collection(db, 'ssoConnections'), {
      orgId: currentOrg.id,
      provider: ssoProvider,
      config,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setSsoConnections((prev) => ([...prev, { id: created.id, provider: ssoProvider, enabled: true }]));
  };

  const removeSSOConnection = async (id: string) => {
    await deleteDoc(doc(db, 'ssoConnections', id));
    setSsoConnections((prev) => prev.filter(item => item.id !== id));
  };

  const saveHRISIntegration = async () => {
    if (!currentOrg?.id) return;
    const config = parseJsonObject(hrisConfig);
    if (!config) {
      alert('Invalid HRIS config JSON.');
      return;
    }
    const created = await addDoc(collection(db, 'hrisIntegrations'), {
      orgId: currentOrg.id,
      provider: hrisProvider,
      config,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setHrisIntegrations((prev) => ([...prev, { id: created.id, provider: hrisProvider, enabled: true }]));
  };

  const removeHRISIntegration = async (id: string) => {
    await deleteDoc(doc(db, 'hrisIntegrations', id));
    setHrisIntegrations((prev) => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    const loadGenieSettings = async () => {
      if (!currentOrg?.id) return;
      const settingsQuery = query(
        collection(db, 'genieReportEmailSettings'),
        where('orgId', '==', currentOrg.id)
      );
      const snapshot = await getDocs(settingsQuery);
      if (snapshot.empty) return;
      const docRef = snapshot.docs[0];
      const data = docRef.data() as typeof genieReportSettings;
      setGenieReportSettingsId(docRef.id);
      setGenieReportSettings({
        provider: data.provider || 'sendgrid',
        senderName: data.senderName || 'Tuutta Reports',
        senderEmail: data.senderEmail || 'reports@company.com',
        apiKey: data.apiKey || '',
        defaultRecipients: data.defaultRecipients || ''
      });
    };
    loadGenieSettings();
  }, [currentOrg?.id, currentOrg?.settings?.apiKey]);

  useEffect(() => {
    if (!currentOrg?.id) return;
    setApiKey(currentOrg.settings?.apiKey || '');
    const loadIntegrations = async () => {
      const webhookSnap = await getDocs(query(collection(db, 'orgWebhooks'), where('orgId', '==', currentOrg.id)));
      setWebhooks(webhookSnap.docs.map(mapWebhookDoc));
      const ssoSnap = await getDocs(query(collection(db, 'ssoConnections'), where('orgId', '==', currentOrg.id)));
      setSsoConnections(ssoSnap.docs.map(mapConnectionDoc));
      const hrisSnap = await getDocs(query(collection(db, 'hrisIntegrations'), where('orgId', '==', currentOrg.id)));
      setHrisIntegrations(hrisSnap.docs.map(mapConnectionDoc));
      const logSnap = await getDocs(query(
        collection(db, 'webhookDeliveries'),
        where('orgId', '==', currentOrg.id),
        orderBy('createdAt', 'desc'),
        limit(20)
      ));
      setWebhookLogs(logSnap.docs.map(mapWebhookLogDoc));
    };
    void loadIntegrations();
  }, [currentOrg?.id, currentOrg?.settings?.apiKey]);

  useEffect(() => {
    if (!currentOrg) return;
    if (currentOrg.settings?.notifications) {
      setNotificationSettings((prev) => ({
        ...prev,
        ...currentOrg.settings.notifications
      }));
    }
    setCertificateSettings((prev) => ({
      ...prev,
      autoIssue: currentOrg.settings?.compliance?.autoIssueCertificates ?? prev.autoIssue,
      requireApproval: currentOrg.settings?.compliance?.requireCertificateApproval ?? prev.requireApproval,
    }));
    setComplianceSettings((prev) => ({
      ...prev,
      auditLogEnabled: currentOrg.settings?.compliance?.logCompletionEvents ?? prev.auditLogEnabled,
    }));
    setRetentionPolicies(currentOrg.settings?.compliance?.retentionPolicies ?? []);
  }, [currentOrg]);

  const renderToggle = (checked: boolean, onChange: (value: boolean) => void, disabled?: boolean) => (
    <label className={`relative inline-flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
    </label>
  );

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Site Name
          </label>
          <input
            type="text"
            value={generalSettings.siteName}
            onChange={(e) => updateSettings(() => setGeneralSettings({ ...generalSettings, siteName: e.target.value }))}
            className="input-min w-full"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Support Email
          </label>
          <input
            type="email"
            value={generalSettings.supportEmail}
            onChange={(e) => updateSettings(() => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value }))}
            className="input-min w-full"
          />
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Site Description
        </label>
        <textarea
          rows={2}
          value={generalSettings.siteDescription}
          onChange={(e) => updateSettings(() => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value }))}
          className="input-min w-full"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Timezone
          </label>
          <select
            value={generalSettings.timezone}
            onChange={(e) => updateSettings(() => setGeneralSettings({ ...generalSettings, timezone: e.target.value }))}
            className="input-min w-full"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="UTC">UTC</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
          </select>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Language
          </label>
          <select
            value={generalSettings.language}
            onChange={(e) => updateSettings(() => setGeneralSettings({ ...generalSettings, language: e.target.value }))}
            className="input-min w-full"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
            <option value="zh">Chinese</option>
          </select>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Date Format
          </label>
          <select
            value={generalSettings.dateFormat}
            onChange={(e) => updateSettings(() => setGeneralSettings({ ...generalSettings, dateFormat: e.target.value }))}
            className="input-min w-full"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Access Control</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Self Registration</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Allow users to create their own accounts</p>
            </div>
            {renderToggle(generalSettings.selfRegistration, (v) => updateSettings(() => setGeneralSettings({ ...generalSettings, selfRegistration: v })))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Guest Access</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Allow browsing course catalog without login</p>
            </div>
            {renderToggle(generalSettings.guestAccess, (v) => updateSettings(() => setGeneralSettings({ ...generalSettings, guestAccess: v })))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={generalSettings.sessionTimeout}
                onChange={(e) => updateSettings(() => setGeneralSettings({ ...generalSettings, sessionTimeout: parseInt(e.target.value) }))}
                className="input-min w-full"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Max Login Attempts
              </label>
              <input
                type="number"
                value={generalSettings.maxLoginAttempts}
                onChange={(e) => updateSettings(() => setGeneralSettings({ ...generalSettings, maxLoginAttempts: parseInt(e.target.value) }))}
                className="input-min w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Primary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={appearanceSettings.primaryColor}
              onChange={(e) => updateSettings(() => setAppearanceSettings({ ...appearanceSettings, primaryColor: e.target.value }))}
              className="w-12 h-10 rounded cursor-pointer"
            />
            <input
              type="text"
              value={appearanceSettings.primaryColor}
              onChange={(e) => updateSettings(() => setAppearanceSettings({ ...appearanceSettings, primaryColor: e.target.value }))}
              className="input-min flex-1"
            />
          </div>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Secondary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={appearanceSettings.secondaryColor}
              onChange={(e) => updateSettings(() => setAppearanceSettings({ ...appearanceSettings, secondaryColor: e.target.value }))}
              className="w-12 h-10 rounded cursor-pointer"
            />
            <input
              type="text"
              value={appearanceSettings.secondaryColor}
              onChange={(e) => updateSettings(() => setAppearanceSettings({ ...appearanceSettings, secondaryColor: e.target.value }))}
              className="input-min flex-1"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Logo
          </label>
          <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
            isDarkMode ? 'border-gray-600' : 'border-gray-300'
          }`}>
            <Image className={`w-10 h-10 mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Drop logo here or click to upload
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Recommended: 200x50px, PNG or SVG
            </p>
          </div>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Favicon
          </label>
          <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
            isDarkMode ? 'border-gray-600' : 'border-gray-300'
          }`}>
            <Image className={`w-10 h-10 mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Drop favicon here or click to upload
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Recommended: 32x32px, ICO or PNG
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Footer Text
        </label>
        <input
          type="text"
          value={appearanceSettings.footerText}
          onChange={(e) => updateSettings(() => setAppearanceSettings({ ...appearanceSettings, footerText: e.target.value }))}
          className="input-min w-full"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Show LMS Branding</p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Display "Powered by" footer branding</p>
        </div>
        {renderToggle(appearanceSettings.showBranding, (v) => updateSettings(() => setAppearanceSettings({ ...appearanceSettings, showBranding: v })))}
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Custom CSS
        </label>
        <textarea
          rows={4}
          value={appearanceSettings.customCSS}
          onChange={(e) => updateSettings(() => setAppearanceSettings({ ...appearanceSettings, customCSS: e.target.value }))}
          placeholder="/* Add custom CSS here */"
          className="input-min w-full font-mono text-sm"
        />
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Notification Channels</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Email Notifications</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Send notifications via email</p>
              </div>
            </div>
            {renderToggle(notificationSettings.emailEnabled, (v) => updateSettings(() => setNotificationSettings({ ...notificationSettings, emailEnabled: v })))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>In-App Notifications</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Show notifications within the platform</p>
              </div>
            </div>
            {renderToggle(notificationSettings.inAppEnabled, (v) => updateSettings(() => setNotificationSettings({ ...notificationSettings, inAppEnabled: v })))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Push Notifications</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Browser push notifications</p>
              </div>
            </div>
            {renderToggle(notificationSettings.pushEnabled, (v) => updateSettings(() => setNotificationSettings({ ...notificationSettings, pushEnabled: v })))}
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Webhook Delivery (Slack/Teams)</h4>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Webhook URL
          </label>
          <input
            type="url"
            value={notificationSettings.webhookUrl}
            onChange={(e) => updateSettings(() => setNotificationSettings({ ...notificationSettings, webhookUrl: e.target.value }))}
            placeholder="https://hooks.slack.com/services/..."
            className="input-min w-full"
          />
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Optional. Sends a JSON payload to Slack/Teams for every notification.
          </p>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Email Digest Frequency
        </label>
        <select
          value={notificationSettings.digestFrequency}
          onChange={(e) => updateSettings(() => setNotificationSettings({ ...notificationSettings, digestFrequency: e.target.value }))}
          className="input-min w-full"
        >
          <option value="realtime">Real-time (no digest)</option>
          <option value="hourly">Hourly digest</option>
          <option value="daily">Daily digest</option>
          <option value="weekly">Weekly digest</option>
        </select>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Notification Events</h4>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'courseEnrollment', label: 'Course Enrollment' },
            { key: 'courseCompletion', label: 'Course Completion' },
            { key: 'assignmentDue', label: 'Assignment Due' },
            { key: 'certificateIssued', label: 'Certificate Issued' },
            { key: 'newAnnouncements', label: 'New Announcements' },
            { key: 'discussionReplies', label: 'Discussion Replies' },
            { key: 'gradePosted', label: 'Grade Posted' }
          ].map(event => (
            <div key={event.key} className="flex items-center justify-between">
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{event.label}</span>
              {renderToggle(
                notificationSettings[event.key as keyof typeof notificationSettings] as boolean,
                (v) => updateSettings(() => setNotificationSettings({ ...notificationSettings, [event.key]: v }))
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Manager Digest Emails</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Enable Manager Digest</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Send a summary to managers on a schedule</p>
            </div>
            {renderToggle(
              notificationSettings.managerDigestEnabled,
              (v) => updateSettings(() => setNotificationSettings({ ...notificationSettings, managerDigestEnabled: v }))
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Frequency
              </label>
              <select
                value={notificationSettings.managerDigestFrequency}
                onChange={(e) => updateSettings(() => setNotificationSettings({ ...notificationSettings, managerDigestFrequency: e.target.value }))}
                className="input-min w-full"
                disabled={!notificationSettings.managerDigestEnabled}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Target Roles
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'team_lead', label: 'Team Leads' },
                  { id: 'ld_manager', label: 'L&D Managers' },
                  { id: 'org_admin', label: 'Org Admins' }
                ].map(role => (
                  <label key={role.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notificationSettings.managerDigestRoles.includes(role.id as UserRole)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...notificationSettings.managerDigestRoles, role.id as UserRole]
                          : notificationSettings.managerDigestRoles.filter((r) => r !== role.id);
                        updateSettings(() => setNotificationSettings({ ...notificationSettings, managerDigestRoles: next }));
                      }}
                      disabled={!notificationSettings.managerDigestEnabled}
                      className="accent-indigo-500"
                    />
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{role.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Digest delivery is queued by scheduler (stub) and can be triggered manually in Genie Notifications.
          </p>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Genie Reports Email Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Provider
            </label>
            <select
              value={genieReportSettings.provider}
              onChange={(e) => updateSettings(() => setGenieReportSettings({ ...genieReportSettings, provider: e.target.value }))}
              className="input-min w-full"
            >
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
              <option value="resend">Resend</option>
              <option value="smtp">SMTP</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Sender Name
            </label>
            <input
              type="text"
              value={genieReportSettings.senderName}
              onChange={(e) => updateSettings(() => setGenieReportSettings({ ...genieReportSettings, senderName: e.target.value }))}
              className="input-min w-full"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Sender Email
            </label>
            <input
              type="email"
              value={genieReportSettings.senderEmail}
              onChange={(e) => updateSettings(() => setGenieReportSettings({ ...genieReportSettings, senderEmail: e.target.value }))}
              className="input-min w-full"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              API Key / SMTP Token
            </label>
            <input
              type="password"
              value={genieReportSettings.apiKey}
              onChange={(e) => updateSettings(() => setGenieReportSettings({ ...genieReportSettings, apiKey: e.target.value }))}
              placeholder="Paste provider key"
              className="input-min w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Default Recipients
            </label>
            <input
              type="text"
              value={genieReportSettings.defaultRecipients}
              onChange={(e) => updateSettings(() => setGenieReportSettings({ ...genieReportSettings, defaultRecipients: e.target.value }))}
              placeholder="comma-separated emails"
              className="input-min w-full"
            />
          </div>
        </div>
        <p className={`mt-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Used when sending scheduled Genie analytics reports.
        </p>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Due Date Reminder (days before)
        </label>
        <input
          type="number"
          value={notificationSettings.reminderDaysBefore}
          onChange={(e) => updateSettings(() => setNotificationSettings({ ...notificationSettings, reminderDaysBefore: parseInt(e.target.value) }))}
          className="input-min w-32"
        />
      </div>
    </div>
  );

  const renderCertificateSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Auto-Issue Certificates</p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Automatically issue certificates upon course completion</p>
        </div>
        {renderToggle(certificateSettings.autoIssue, (v) => updateSettings(() => setCertificateSettings({ ...certificateSettings, autoIssue: v })))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Require Approval</p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Admin approval before certificate issuance</p>
        </div>
        {renderToggle(
          certificateSettings.requireApproval,
          (v) => updateSettings(() => setCertificateSettings({ ...certificateSettings, requireApproval: v }))
        )}
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Certificate Expiration</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Enable expiration dates on certificates</p>
          </div>
          {renderToggle(certificateSettings.expirationEnabled, (v) => updateSettings(() => setCertificateSettings({ ...certificateSettings, expirationEnabled: v })))}
        </div>
        {certificateSettings.expirationEnabled && (
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Default Expiration (months)
            </label>
            <input
              type="number"
              value={certificateSettings.defaultExpiration}
              onChange={(e) => updateSettings(() => setCertificateSettings({ ...certificateSettings, defaultExpiration: parseInt(e.target.value) }))}
              className="input-min w-32"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Include QR Code</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Add QR code for verification</p>
          </div>
          {renderToggle(certificateSettings.includeQRCode, (v) => updateSettings(() => setCertificateSettings({ ...certificateSettings, includeQRCode: v })))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Include Signature</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Add digital signature</p>
          </div>
          {renderToggle(certificateSettings.includeSignature, (v) => updateSettings(() => setCertificateSettings({ ...certificateSettings, includeSignature: v })))}
        </div>
      </div>

      {certificateSettings.includeSignature && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Signatory Name
            </label>
            <input
              type="text"
              value={certificateSettings.signatureName}
              onChange={(e) => updateSettings(() => setCertificateSettings({ ...certificateSettings, signatureName: e.target.value }))}
              className="input-min w-full"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Signatory Title
            </label>
            <input
              type="text"
              value={certificateSettings.signatureTitle}
              onChange={(e) => updateSettings(() => setCertificateSettings({ ...certificateSettings, signatureTitle: e.target.value }))}
              className="input-min w-full"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Online Verification</p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Allow public verification of certificates</p>
        </div>
        {renderToggle(certificateSettings.verificationEnabled, (v) => updateSettings(() => setCertificateSettings({ ...certificateSettings, verificationEnabled: v })))}
      </div>
    </div>
  );

  const renderComplianceSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Compliance Tracking</p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Track compliance training completion</p>
        </div>
        {renderToggle(complianceSettings.trackingEnabled, (v) => updateSettings(() => setComplianceSettings({ ...complianceSettings, trackingEnabled: v })))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Record Retention Period (years)
          </label>
          <input
            type="number"
            value={complianceSettings.retentionPeriod}
            onChange={(e) => updateSettings(() => setComplianceSettings({ ...complianceSettings, retentionPeriod: parseInt(e.target.value) }))}
            className="input-min w-32"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Reporting Schedule
          </label>
          <select
            value={complianceSettings.reportingSchedule}
            onChange={(e) => updateSettings(() => setComplianceSettings({ ...complianceSettings, reportingSchedule: e.target.value }))}
            className="input-min w-full"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Retention Policies</h4>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Configure per-entity data retention windows.
            </p>
          </div>
          <button
            onClick={() => updateSettings(() => setRetentionPolicies((prev) => ([
              ...prev,
              { entityType: 'enrollment', retentionPeriod: 365, action: 'archive' }
            ])))}
            className={`px-3 py-1 rounded-lg text-xs border ${
              isDarkMode ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            Add policy
          </button>
        </div>
        {retentionPolicies.length === 0 ? (
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No retention policies configured.
          </p>
        ) : (
          <div className="space-y-3">
            {retentionPolicies.map((policy, index) => (
              <div
                key={`${policy.entityType}-${index}`}
                className={`p-3 rounded-lg border flex flex-wrap gap-3 items-center ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex flex-col">
                  <label className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Entity</label>
                  <select
                    value={policy.entityType}
                    onChange={(e) => updateSettings(() => setRetentionPolicies((prev) => prev.map((item, i) => (
                      i === index ? { ...item, entityType: e.target.value } : item
                    ))))}
                    className="input-min text-sm"
                  >
                    <option value="enrollment">Enrollment</option>
                    <option value="assessment">Assessment</option>
                    <option value="certificate">Certificate</option>
                    <option value="auditLog">Audit Log</option>
                    <option value="course">Course</option>
                    <option value="user">User</option>
                    <option value="progress">Progress</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Retention (days)</label>
                  <input
                    type="number"
                    value={policy.retentionPeriod}
                    onChange={(e) => updateSettings(() => setRetentionPolicies((prev) => prev.map((item, i) => (
                      i === index ? { ...item, retentionPeriod: parseInt(e.target.value) } : item
                    ))))}
                    className="input-min w-32"
                  />
                </div>
                <div className="flex flex-col">
                  <label className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Action</label>
                  <select
                    value={policy.action}
                    onChange={(e) => updateSettings(() => setRetentionPolicies((prev) => prev.map((item, i) => (
                      i === index ? { ...item, action: e.target.value as RetentionPolicy['action'] } : item
                    ))))}
                    className="input-min text-sm"
                  >
                    <option value="archive">Archive</option>
                    <option value="delete">Delete</option>
                    <option value="anonymize">Anonymize</option>
                  </select>
                </div>
                <button
                  onClick={() => updateSettings(() => setRetentionPolicies((prev) => prev.filter((_, i) => i !== index)))}
                  className="ml-auto px-3 py-2 rounded-lg text-xs border border-rose-400/50 text-rose-500 hover:bg-rose-500/10"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Audit Logging</p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Log all user and admin actions</p>
        </div>
        {renderToggle(complianceSettings.auditLogEnabled, (v) => updateSettings(() => setComplianceSettings({ ...complianceSettings, auditLogEnabled: v })))}
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>E-Learning Standards</h4>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              SCORM Version
            </label>
            <select
              value={complianceSettings.scormVersion}
              onChange={(e) => updateSettings(() => setComplianceSettings({ ...complianceSettings, scormVersion: e.target.value }))}
              className="input-min w-48"
            >
              <option value="1.2">SCORM 1.2</option>
              <option value="2004">SCORM 2004</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>xAPI (Tin Can)</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Enable xAPI statement tracking</p>
            </div>
            {renderToggle(complianceSettings.xapiEnabled, (v) => updateSettings(() => setComplianceSettings({ ...complianceSettings, xapiEnabled: v })))}
          </div>
          {complianceSettings.xapiEnabled && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                LRS Endpoint
              </label>
              <input
                type="url"
                value={complianceSettings.lrsEndpoint}
                onChange={(e) => updateSettings(() => setComplianceSettings({ ...complianceSettings, lrsEndpoint: e.target.value }))}
                placeholder="https://lrs.example.com/xapi"
                className="input-min w-full"
              />
            </div>
          )}
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Overdue Handling</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Compliance Reminders</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Send reminders for upcoming deadlines</p>
            </div>
            {renderToggle(complianceSettings.complianceReminders, (v) => updateSettings(() => setComplianceSettings({ ...complianceSettings, complianceReminders: v })))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Overdue Escalation</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Escalate to manager when overdue</p>
            </div>
            {renderToggle(complianceSettings.overdueEscalation, (v) => updateSettings(() => setComplianceSettings({ ...complianceSettings, overdueEscalation: v })))}
          </div>
          {complianceSettings.overdueEscalation && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Escalate After (days overdue)
              </label>
              <input
                type="number"
                value={complianceSettings.escalationDays}
                onChange={(e) => updateSettings(() => setComplianceSettings({ ...complianceSettings, escalationDays: parseInt(e.target.value) }))}
                className="input-min w-32"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPermissionsSettings = () => (
    <div className={`rounded-xl border p-5 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Role Permissions Matrix</h4>
      <div className="space-y-3">
        {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map(role => (
          <div key={role} className={`p-3 rounded-lg border ${
            isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                {role.replace('_', ' ')}
              </span>
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {ROLE_PERMISSIONS[role].includes('*') ? 'Full access' : `${ROLE_PERMISSIONS[role].length} permissions`}
              </span>
            </div>
            <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {ROLE_PERMISSIONS[role].includes('*')
                ? 'All permissions granted'
                : ROLE_PERMISSIONS[role].slice(0, 6).join(', ') +
                  (ROLE_PERMISSIONS[role].length > 6 ? '…' : '')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Data Retention</h4>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              User Data Retention (months)
            </label>
            <input
              type="number"
              value={privacySettings.dataRetention}
              onChange={(e) => updateSettings(() => setPrivacySettings({ ...privacySettings, dataRetention: parseInt(e.target.value) }))}
              className="input-min w-32"
            />
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              How long to keep user data after account deletion
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Anonymize Inactive Users</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Anonymize data for inactive accounts</p>
            </div>
            {renderToggle(privacySettings.anonymizeInactive, (v) => updateSettings(() => setPrivacySettings({ ...privacySettings, anonymizeInactive: v })))}
          </div>
          {privacySettings.anonymizeInactive && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Anonymize After (months of inactivity)
              </label>
              <input
                type="number"
                value={privacySettings.anonymizeAfterMonths}
                onChange={(e) => updateSettings(() => setPrivacySettings({ ...privacySettings, anonymizeAfterMonths: parseInt(e.target.value) }))}
                className="input-min w-32"
              />
            </div>
          )}
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Compliance</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Cookie Consent Banner</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Show cookie consent for visitors</p>
            </div>
            {renderToggle(privacySettings.cookieConsent, (v) => updateSettings(() => setPrivacySettings({ ...privacySettings, cookieConsent: v })))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>GDPR Compliance Mode</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Enable GDPR features and controls</p>
            </div>
            {renderToggle(privacySettings.gdprCompliance, (v) => updateSettings(() => setPrivacySettings({ ...privacySettings, gdprCompliance: v })))}
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>User Rights</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Data Export</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Allow users to export their data</p>
            </div>
            {renderToggle(privacySettings.dataExportEnabled, (v) => updateSettings(() => setPrivacySettings({ ...privacySettings, dataExportEnabled: v })))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Data Deletion</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Allow users to request account deletion</p>
            </div>
            {renderToggle(privacySettings.dataDeletionEnabled, (v) => updateSettings(() => setPrivacySettings({ ...privacySettings, dataDeletionEnabled: v })))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Privacy Policy URL
          </label>
          <input
            type="url"
            value={privacySettings.privacyPolicyUrl}
            onChange={(e) => updateSettings(() => setPrivacySettings({ ...privacySettings, privacyPolicyUrl: e.target.value }))}
            placeholder="https://example.com/privacy"
            className="input-min w-full"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Terms of Service URL
          </label>
          <input
            type="url"
            value={privacySettings.termsOfServiceUrl}
            onChange={(e) => updateSettings(() => setPrivacySettings({ ...privacySettings, termsOfServiceUrl: e.target.value }))}
            placeholder="https://example.com/terms"
            className="input-min w-full"
          />
        </div>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg border border-yellow-500/50 ${isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className={`font-medium ${isDarkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>Advanced Settings</p>
            <p className={`text-sm ${isDarkMode ? 'text-yellow-400/80' : 'text-yellow-700'}`}>
              These settings can affect system performance and stability. Change with caution.
            </p>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>System Mode</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Debug Mode</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Enable detailed error logging</p>
            </div>
            {renderToggle(advancedSettings.debugMode, (v) => updateSettings(() => setAdvancedSettings({ ...advancedSettings, debugMode: v })))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium text-red-500`}>Maintenance Mode</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Take the LMS offline for maintenance</p>
            </div>
            {renderToggle(advancedSettings.maintenanceMode, (v) => updateSettings(() => setAdvancedSettings({ ...advancedSettings, maintenanceMode: v })))}
          </div>
          {advancedSettings.maintenanceMode && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Maintenance Message
              </label>
              <textarea
                rows={2}
                value={advancedSettings.maintenanceMessage}
                onChange={(e) => updateSettings(() => setAdvancedSettings({ ...advancedSettings, maintenanceMessage: e.target.value }))}
                className="input-min w-full"
              />
            </div>
          )}
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Performance</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                API Rate Limit (requests/hour)
              </label>
              <input
                type="number"
                value={advancedSettings.apiRateLimit}
                onChange={(e) => updateSettings(() => setAdvancedSettings({ ...advancedSettings, apiRateLimit: parseInt(e.target.value) }))}
                className="input-min w-full"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Max Upload Size (MB)
              </label>
              <input
                type="number"
                value={advancedSettings.maxUploadSize}
                onChange={(e) => updateSettings(() => setAdvancedSettings({ ...advancedSettings, maxUploadSize: parseInt(e.target.value) }))}
                className="input-min w-full"
              />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Allowed File Types
            </label>
            <input
              type="text"
              value={advancedSettings.allowedFileTypes}
              onChange={(e) => updateSettings(() => setAdvancedSettings({ ...advancedSettings, allowedFileTypes: e.target.value }))}
              className="input-min w-full"
            />
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Comma-separated list of file extensions
            </p>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>API Access Key</h4>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={apiKey}
            onChange={(e) => updateSettings(() => setApiKey(e.target.value))}
            placeholder="Set org API key for REST access"
            className="input-min flex-1"
          />
          <button
            onClick={() => updateSettings(() => setApiKey(`tuutta_${Math.random().toString(36).slice(2, 12)}`))}
            className="px-3 py-2 rounded-lg border text-xs"
          >
            Generate
          </button>
        </div>
        <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          Use headers: <span className="font-mono">x-api-key</span> + <span className="font-mono">x-org-id</span>.
        </p>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Webhook Endpoints</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="input-min"
          />
          <input
            type="text"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="Signing secret (optional)"
            className="input-min"
          />
          <input
            type="text"
            value={webhookEvents}
            onChange={(e) => setWebhookEvents(e.target.value)}
            placeholder="Comma-separated events"
            className="input-min"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={saveWebhook} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs">
            Add webhook
          </button>
          <button onClick={testWebhook} className="px-3 py-2 rounded-lg border text-xs">
            Send signed test
          </button>
          <button onClick={refreshWebhookLogs} className="px-3 py-2 rounded-lg border text-xs">
            Refresh logs
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {webhooks.length === 0 ? (
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No webhooks configured.</p>
          ) : (
            webhooks.map((hook) => (
              <div key={hook.id} className={`flex items-center justify-between rounded-lg border p-2 text-xs ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div>
                  <p className="font-semibold">{hook.url}</p>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Events: {(hook.events || []).join(', ') || 'all'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {renderToggle(Boolean(hook.enabled), (v) => toggleWebhook(hook.id, v))}
                  <button onClick={() => removeWebhook(hook.id)} className="px-2 py-1 rounded-lg border text-xs">
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4">
          <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Delivery Logs</p>
          {webhookLogs.length === 0 ? (
            <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No delivery logs yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {webhookLogs.map((log) => (
                <div key={log.id} className={`flex items-center justify-between rounded-lg border p-2 text-xs ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                  <div>
                    <p className="font-semibold">{log.event}</p>
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{log.url || '-'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      log.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {log.status}
                    </span>
                    <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>SSO Connections</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <select value={ssoProvider} onChange={(e) => setSsoProvider(e.target.value)} className="input-min">
            <option value="azure_ad">Azure AD</option>
            <option value="okta">Okta</option>
            <option value="google">Google Workspace</option>
          </select>
          <input
            type="text"
            value={ssoConfig}
            onChange={(e) => setSsoConfig(e.target.value)}
            placeholder='{"clientId":"...","tenantId":"..."}'
            className="input-min"
          />
          <button onClick={saveSSOConnection} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs">
            Save SSO
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {ssoConnections.length === 0 ? (
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No SSO connections.</p>
          ) : (
            ssoConnections.map((conn) => (
              <div key={conn.id} className={`flex items-center justify-between rounded-lg border p-2 text-xs ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div>
                  <p className="font-semibold">{conn.provider}</p>
                </div>
                <button onClick={() => removeSSOConnection(conn.id)} className="px-2 py-1 rounded-lg border text-xs">
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>HRIS Integrations</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <select value={hrisProvider} onChange={(e) => setHrisProvider(e.target.value)} className="input-min">
            <option value="workday">Workday</option>
            <option value="bamboohr">BambooHR</option>
            <option value="rippling">Rippling</option>
          </select>
          <input
            type="text"
            value={hrisConfig}
            onChange={(e) => setHrisConfig(e.target.value)}
            placeholder='{"token":"..."}'
            className="input-min"
          />
          <button onClick={saveHRISIntegration} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs">
            Save HRIS
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {hrisIntegrations.length === 0 ? (
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No HRIS integrations.</p>
          ) : (
            hrisIntegrations.map((conn) => (
              <div key={conn.id} className={`flex items-center justify-between rounded-lg border p-2 text-xs ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div>
                  <p className="font-semibold">{conn.provider}</p>
                </div>
                <button onClick={() => removeHRISIntegration(conn.id)} className="px-2 py-1 rounded-lg border text-xs">
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Caching</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Enable Caching</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cache content for faster loading</p>
            </div>
            {renderToggle(advancedSettings.cacheEnabled, (v) => updateSettings(() => setAdvancedSettings({ ...advancedSettings, cacheEnabled: v })))}
          </div>
          {advancedSettings.cacheEnabled && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Cache Duration (minutes)
              </label>
              <input
                type="number"
                value={advancedSettings.cacheDuration}
                onChange={(e) => updateSettings(() => setAdvancedSettings({ ...advancedSettings, cacheDuration: parseInt(e.target.value) }))}
                className="input-min w-32"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>CDN Enabled</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Serve static assets via CDN</p>
            </div>
            {renderToggle(advancedSettings.cdnEnabled, (v) => updateSettings(() => setAdvancedSettings({ ...advancedSettings, cdnEnabled: v })))}
          </div>
          {advancedSettings.cdnEnabled && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                CDN URL
              </label>
              <input
                type="url"
                value={advancedSettings.cdnUrl}
                onChange={(e) => updateSettings(() => setAdvancedSettings({ ...advancedSettings, cdnUrl: e.target.value }))}
                placeholder="https://cdn.example.com"
                className="input-min w-full"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <button className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
          isDarkMode
            ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}>
          <RefreshCw className="w-4 h-4" />
          Clear Cache
        </button>
        <button className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
          isDarkMode
            ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}>
          <Database className="w-4 h-4" />
          Export Settings
        </button>
      </div>
    </div>
  );

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'general': return renderGeneralSettings();
      case 'appearance': return renderAppearanceSettings();
      case 'notifications': return renderNotificationSettings();
      case 'certificates': return renderCertificateSettings();
      case 'compliance': return renderComplianceSettings();
      case 'privacy': return renderPrivacySettings();
      case 'permissions': return renderPermissionsSettings();
      case 'advanced': return renderAdvancedSettings();
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      {/* Header */}
      <div className="px-6 py-4 border-b border-app-border bg-app-surface">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              LMS Settings
            </h1>
            <p className="text-sm text-app-muted">
              Configure your learning management system
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={seedDemoData}
              disabled={isSeeding}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                isSeeding
                  ? 'bg-indigo-500/40 text-white cursor-wait'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isSeeding ? 'Creating Demo…' : 'Create Demo Data'}
            </button>
            <button
              onClick={removeDemoData}
              disabled={isRemoving}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                isRemoving
                  ? 'bg-gray-500/40 text-white cursor-wait'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isRemoving ? 'Removing Demo…' : 'Remove Demo Data'}
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`btn-primary-min flex items-center gap-2 ${
                hasChanges ? '' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r overflow-y-auto bg-app-surface border-app-border">
          <nav className="p-4 space-y-1">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id as SettingsCategory)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeCategory === category.id
                    ? 'bg-app-accent text-app-bg'
                    : 'text-app-muted hover:bg-app-surface2'
                }`}
              >
                <category.icon className="w-5 h-5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{category.label}</p>
                  <p className={`text-xs truncate ${activeCategory === category.id ? 'text-app-bg/80' : 'text-app-muted'}`}>
                    {category.description}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 ${activeCategory === category.id ? 'text-app-bg' : 'opacity-0'}`} />
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              {React.createElement(categories.find(c => c.id === activeCategory)?.icon || Settings, {
                className: 'w-6 h-6 text-app-accent'
              })}
              <div>
                <h2 className="text-xl font-semibold">
                  {categories.find(c => c.id === activeCategory)?.label}
                </h2>
                <p className="text-sm text-app-muted">
                  {categories.find(c => c.id === activeCategory)?.description}
                </p>
              </div>
            </div>

            {renderCategoryContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LMSSettings;
