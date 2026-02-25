#!/usr/bin/env node
/**
 * ELS Data Migration Script
 * 
 * This script migrates existing mock ELS data to Firebase Firestore.
 * It should be run once when upgrading from the mock-based ELS to the Firebase-integrated version.
 * 
 * Usage:
 *   npx tsx scripts/migrate-els-data.ts --orgId=<ORG_ID> --userId=<USER_ID>
 * 
 * Or with Firebase Admin SDK credentials:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npx tsx scripts/migrate-els-data.ts --orgId=<ORG_ID> --userId=<USER_ID>
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    acc[key.replace(/^--/, '')] = value;
  }
  return acc;
}, {} as Record<string, string>);

const ORG_ID = args.orgId;
const USER_ID = args.userId;

if (!ORG_ID || !USER_ID) {
  console.error('Usage: npx tsx scripts/migrate-els-data.ts --orgId=<ORG_ID> --userId=<USER_ID>');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (serviceAccountPath) {
  initializeApp({
    credential: cert(serviceAccountPath),
  });
} else {
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();

// ============================================================================
// MOCK DATA (from elsMockData.ts)
// ============================================================================

const mockPhases = [
  { id: 1, name: 'Content Ingestion', status: 'completed', progress: 100 },
  { id: 2, name: 'Analyze', status: 'completed', progress: 100 },
  { id: 3, name: 'Design', status: 'in_progress', progress: 65 },
  { id: 4, name: 'Develop', status: 'pending', progress: 0 },
  { id: 5, name: 'Implement', status: 'pending', progress: 0 },
  { id: 6, name: 'Evaluate', status: 'pending', progress: 0 },
  { id: 7, name: 'Personalize', status: 'pending', progress: 0 },
  { id: 8, name: 'Manager Portal', status: 'pending', progress: 0 },
  { id: 9, name: 'Governance', status: 'pending', progress: 0 },
];

const mockUsers = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', role: 'Training Manager', department: 'Human Resources', skills: [{ id: '1', name: 'Leadership', level: 85, category: 'Management' }, { id: '2', name: 'Compliance', level: 92, category: 'Regulatory' }, { id: '3', name: 'Communication', level: 78, category: 'Soft Skills' }], progress: 87, lastActive: new Date('2024-01-30') },
  { id: '2', name: 'Michael Chen', email: 'michael.chen@company.com', role: 'Software Engineer', department: 'Engineering', skills: [{ id: '4', name: 'JavaScript', level: 95, category: 'Technical' }, { id: '5', name: 'System Design', level: 72, category: 'Technical' }, { id: '6', name: 'Security', level: 65, category: 'Compliance' }], progress: 62, lastActive: new Date('2024-01-31') },
  { id: '3', name: 'Emily Rodriguez', email: 'emily.rodriguez@company.com', role: 'Compliance Officer', department: 'Legal', skills: [{ id: '7', name: 'GDPR', level: 98, category: 'Regulatory' }, { id: '8', name: 'Risk Assessment', level: 88, category: 'Compliance' }, { id: '9', name: 'Audit', level: 91, category: 'Compliance' }], progress: 94, lastActive: new Date('2024-01-29') },
];

const mockFiles = [
  { id: '1', name: 'Employee_Handbook_2024.pdf', type: 'pdf', size: 4523456, status: 'completed', progress: 100, extractedContent: 'Employee handbook content...', tags: ['HR', 'Policy', 'Onboarding'], uploadedAt: new Date('2024-01-25') },
  { id: '2', name: 'Security_Policies.docx', type: 'docx', size: 2345678, status: 'completed', progress: 100, extractedContent: 'Security policy content...', tags: ['Security', 'Compliance', 'IT'], uploadedAt: new Date('2024-01-26') },
  { id: '3', name: 'Compliance_Training.pptx', type: 'pptx', size: 8912345, status: 'processing', progress: 67, tags: ['Compliance', 'Training'], uploadedAt: new Date('2024-01-30') },
];

const mockCourses = [
  {
    id: '1',
    title: 'Information Security Awareness',
    description: 'Comprehensive security training for all employees',
    modules: [
      { id: 'm1', title: 'Introduction to Information Security', description: 'Basic concepts and importance', units: [{ id: 'u1', title: 'What is Information Security?', content: '...', type: 'text', duration: 15, order: 1 }, { id: 'u2', title: 'Common Threats', content: '...', type: 'video', duration: 20, order: 2 }], order: 1 },
      { id: 'm2', title: 'Password Security', description: 'Best practices for password management', units: [{ id: 'u3', title: 'Creating Strong Passwords', content: '...', type: 'interactive', duration: 10, order: 1 }, { id: 'u4', title: 'Multi-Factor Authentication', content: '...', type: 'text', duration: 15, order: 2 }], order: 2 }
    ],
    learningOutcomes: [
      { id: 'lo1', description: 'Identify common security threats', taxonomy: 'understand', measurable: true },
      { id: 'lo2', description: 'Implement strong password practices', taxonomy: 'apply', measurable: true },
      { id: 'lo3', description: 'Recognize phishing attempts', taxonomy: 'analyze', measurable: true }
    ],
    status: 'published',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-25')
  }
];

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

async function migrateProject() {
  console.log('🚀 Creating sample ELS project...');

  const projectRef = db.collection('organizations').doc(ORG_ID).collection('elsProjects').doc();
  const now = Date.now();

  const projectData = {
    id: projectRef.id,
    orgId: ORG_ID,
    name: 'Sample ELS Project (Migrated)',
    description: 'This project was created automatically by the migration script from legacy mock data.',
    status: 'active',
    phases: {
      ingest: { status: 'completed', startedAt: now - 86400000 * 10, completedAt: now - 86400000 * 9 },
      analyze: { status: 'completed', startedAt: now - 86400000 * 8, completedAt: now - 86400000 * 7 },
      design: { status: 'in_progress', startedAt: now - 86400000 * 6 },
      develop: { status: 'pending' },
      implement: { status: 'pending' },
      evaluate: { status: 'pending' },
      personalize: { status: 'pending' },
      portal: { status: 'pending' },
      govern: { status: 'pending' }
    },
    currentPhase: 'design',
    createdCourseIds: [],
    createdLearningPathIds: [],
    createdAssessmentIds: [],
    createdBy: USER_ID,
    createdAt: now - 86400000 * 10,
    updatedAt: now,
    lastModifiedBy: USER_ID
  };

  await projectRef.set(projectData);
  console.log(`✅ Created project: ${projectRef.id}`);

  return projectRef.id;
}

async function migrateContent(projectId: string) {
  console.log('📁 Migrating content...');

  for (const file of mockFiles) {
    const contentRef = db.collection('organizations').doc(ORG_ID).collection('elsContent').doc();
    const contentData = {
      id: contentRef.id,
      orgId: ORG_ID,
      projectId,
      name: file.name,
      type: file.type,
      size: file.size,
      fileUrl: `placeholder://${file.name}`,
      status: file.status,
      progress: file.progress,
      processingOptions: { nlp: true, ocr: true, tagging: true },
      extractedContent: file.extractedContent,
      tags: file.tags,
      uploadedBy: USER_ID,
      uploadedAt: file.uploadedAt.getTime()
    };

    await contentRef.set(contentData);
    console.log(`  📄 ${file.name}`);
  }
}

async function migrateAnalysis(projectId: string) {
  console.log('📊 Migrating needs analysis...');

  const analysisRef = db.collection('organizations').doc(ORG_ID).collection('elsNeedsAnalysis').doc();
  const now = Date.now();

  const analysisData = {
    id: analysisRef.id,
    orgId: ORG_ID,
    projectId,
    targetAudience: {
      departments: ['Engineering', 'HR', 'Sales', 'Legal'],
      roles: ['Training Manager', 'Software Engineer', 'Compliance Officer', 'Sales Representative'],
      teams: [],
      individualUsers: mockUsers.map(u => u.id),
      experienceLevel: 'mixed',
      estimatedLearners: mockUsers.length
    },
    skillGaps: [
      {
        skillId: 'skill_1',
        skillName: 'Security Awareness',
        category: 'Compliance',
        currentLevel: 65,
        targetLevel: 90,
        gap: 25,
        priority: 'high',
        affectedDepartments: ['Engineering', 'Sales'],
        affectedUsers: ['2', '4']
      },
      {
        skillId: 'skill_2',
        skillName: 'GDPR Compliance',
        category: 'Regulatory',
        currentLevel: 45,
        targetLevel: 95,
        gap: 50,
        priority: 'high',
        affectedDepartments: ['HR', 'Legal'],
        affectedUsers: ['1', '3']
      }
    ],
    complianceRequirements: [
      {
        id: 'req_1',
        name: 'Annual Security Training',
        description: 'All employees must complete security awareness training annually',
        priority: 'high',
        deadline: now + 86400000 * 60,
        regulationRef: 'ISO-27001',
        applicableRoles: ['All Employees'],
        applicableDepartments: ['All']
      },
      {
        id: 'req_2',
        name: 'GDPR Certification',
        description: 'Data handlers must complete GDPR compliance certification',
        priority: 'high',
        deadline: now + 86400000 * 30,
        regulationRef: 'GDPR-Article-39',
        applicableRoles: ['HR', 'Legal', 'IT'],
        applicableDepartments: ['HR', 'Legal', 'Engineering']
      }
    ],
    learningObjectives: [
      {
        id: 'obj_1',
        description: 'Identify and mitigate common security threats in the workplace',
        taxonomy: 'understand',
        measurable: true,
        measurementCriteria: 'Score 80% or higher on security threat identification quiz',
        linkedContentIds: []
      },
      {
        id: 'obj_2',
        description: 'Apply data protection principles in daily operations',
        taxonomy: 'apply',
        measurable: true,
        measurementCriteria: 'Successfully complete data handling scenario assessment',
        linkedContentIds: []
      },
      {
        id: 'obj_3',
        description: 'Demonstrate effective communication in cross-functional teams',
        taxonomy: 'apply',
        measurable: true,
        measurementCriteria: 'Peer evaluation score of 4/5 or higher',
        linkedContentIds: []
      }
    ],
    createdAt: now - 86400000 * 7,
    updatedAt: now - 86400000 * 7
  };

  await analysisRef.set(analysisData);
  console.log(`✅ Created analysis: ${analysisRef.id}`);

  return analysisRef.id;
}

async function migrateDesign(projectId: string, analysisId: string) {
  console.log('🎨 Migrating course design...');

  const course = mockCourses[0];
  const designRef = db.collection('organizations').doc(ORG_ID).collection('elsCourseDesign').doc();
  const now = Date.now();

  const designData = {
    id: designRef.id,
    orgId: ORG_ID,
    projectId,
    analysisId,
    title: course.title,
    description: course.description,
    shortDescription: course.description.slice(0, 100) + '...',
    estimatedDuration: 120,
    difficulty: 'intermediate',
    category: 'Compliance',
    tags: ['Security', 'Compliance', 'Training'],
    modules: course.modules.map((m, idx) => ({
      id: `mod_${idx}`,
      title: m.title,
      description: m.description,
      order: m.order,
      estimatedDuration: m.units.reduce((sum, u) => sum + u.duration, 0),
      units: m.units.map((u, uidx) => ({
        id: u.id,
        title: u.title,
        description: '',
        type: u.type,
        duration: u.duration,
        content: u.content,
        order: u.order,
        isRequired: true,
        resources: []
      }))
    })),
    learningObjectiveIds: ['obj_1', 'obj_2', 'obj_3'],
    instructionalStrategies: {
      practiceActivities: true,
      groupDiscussions: false,
      teachBackTasks: true,
      caseStudies: true,
      simulations: false
    },
    adultLearningPrinciples: {
      practicalRelevance: true,
      selfDirected: true,
      experiential: true,
      problemCentered: false
    },
    taxonomyDistribution: {
      remember: 10,
      understand: 30,
      apply: 30,
      analyze: 20,
      evaluate: 5,
      create: 5
    },
    prerequisiteCourseIds: [],
    requiredSkills: ['skill_1'],
    createdAt: now - 86400000 * 6,
    updatedAt: now - 86400000 * 6
  };

  await designRef.set(designData);
  console.log(`✅ Created design: ${designRef.id}`);

  return designRef.id;
}

async function migrateAIGeneration(projectId: string, designId: string) {
  console.log('🤖 Migrating AI generation data...');

  const genRef = db.collection('organizations').doc(ORG_ID).collection('elsAIGeneration').doc();
  const now = Date.now();

  const genData = {
    id: genRef.id,
    orgId: ORG_ID,
    projectId,
    designId,
    generations: [
      {
        id: 'gen_1',
        type: 'lesson',
        targetModuleId: 'mod_0',
        prompt: 'Create a lesson about information security fundamentals',
        parameters: { tone: 'professional', length: 'medium' },
        status: 'completed',
        output: '# Information Security Fundamentals\n\n## Introduction\nInformation security is critical...',
        outputMetadata: {
          tokensUsed: 1250,
          model: 'gpt-4',
          confidence: 0.92,
          generationTime: 3200
        },
        reviewed: true,
        reviewedBy: USER_ID,
        reviewedAt: now - 86400000 * 5,
        createdAt: now - 86400000 * 5,
        completedAt: now - 86400000 * 5
      }
    ],
    assessments: [
      {
        id: 'assess_1',
        type: 'mcq',
        title: 'Security Awareness Quiz',
        description: 'Test your knowledge of security fundamentals',
        difficulty: 'intermediate',
        questions: [
          {
            id: 'q1',
            text: 'What is the most secure way to create a password?',
            type: 'mcq',
            options: ['Use personal information', 'Use a mix of letters, numbers, and symbols', 'Use the same password everywhere'],
            correctAnswer: 'Use a mix of letters, numbers, and symbols',
            points: 10,
            explanation: 'Strong passwords should be complex and unique.',
            difficulty: 'easy'
          }
        ],
        timeLimit: 20,
        passingScore: 80,
        maxAttempts: 3,
        linkedModuleId: 'mod_1'
      }
    ],
    createdAt: now - 86400000 * 5,
    updatedAt: now - 86400000 * 5
  };

  await genRef.set(genData);
  console.log(`✅ Created AI generation: ${genRef.id}`);
}

async function migrateImplementation(projectId: string, designId: string) {
  console.log('🚀 Migrating implementation data...');

  const implRef = db.collection('organizations').doc(ORG_ID).collection('elsImplementation').doc();
  const now = Date.now();

  const implData = {
    id: implRef.id,
    orgId: ORG_ID,
    projectId,
    designId,
    enrollmentRules: [
      {
        id: 'rule_1',
        type: 'department',
        targetId: 'Engineering',
        targetName: 'Engineering Department',
        dueDate: now + 86400000 * 30,
        priority: 'required',
        autoEnroll: true
      },
      {
        id: 'rule_2',
        type: 'department',
        targetId: 'HR',
        targetName: 'Human Resources',
        dueDate: now + 86400000 * 30,
        priority: 'required',
        autoEnroll: true
      }
    ],
    schedule: {
      startDate: now,
      endDate: now + 86400000 * 90,
      selfEnrollment: false,
      allowLateEnrollment: true,
      enrollmentDeadline: now + 86400000 * 60
    },
    notifications: {
      enrollmentNotification: true,
      reminderDays: [7, 3, 1],
      completionNotification: true,
      overdueAlerts: true,
      managerNotifications: true
    },
    assignedTutors: [USER_ID],
    enrollmentStats: {
      enrolledCount: 0,
      completedCount: 0,
      inProgressCount: 0,
      notStartedCount: 0,
      overdueCount: 0
    },
    status: 'scheduled',
    createdAt: now - 86400000 * 4,
    updatedAt: now - 86400000 * 4
  };

  await implRef.set(implData);
  console.log(`✅ Created implementation: ${implRef.id}`);
}

async function migrateAnalytics(projectId: string) {
  console.log('📈 Migrating analytics data...');

  const analyticsRef = db.collection('organizations').doc(ORG_ID).collection('elsAnalytics').doc();
  const now = Date.now();

  const analyticsData = {
    id: analyticsRef.id,
    orgId: ORG_ID,
    projectId,
    implementationId: '',
    metrics: {
      totalLearners: 0,
      activeLearners: 0,
      completionRate: 0,
      averageScore: 0,
      averageTimeToComplete: 0,
      dropoutRate: 0
    },
    timeSeriesData: [],
    engagementMetrics: [],
    complianceMetrics: [],
    skillImprovement: [],
    departmentStats: [],
    learnerStats: [],
    updatedAt: now
  };

  await analyticsRef.set(analyticsData);
  console.log(`✅ Created analytics: ${analyticsRef.id}`);
}

async function migrateGovernance(projectId: string) {
  console.log('🛡️ Migrating governance data...');

  const govRef = db.collection('organizations').doc(ORG_ID).collection('elsGovernance').doc();
  const now = Date.now();

  const govData = {
    id: govRef.id,
    orgId: ORG_ID,
    projectId,
    privacySettings: {
      dataRetentionPeriod: 2555,
      anonymizeAfterCompletion: false,
      allowDataExport: true,
      gdprCompliant: true
    },
    securitySettings: {
      requireApprovalForPublishing: true,
      approverRoles: ['org_admin', 'ld_manager'],
      contentReviewRequired: true,
      automaticArchiving: false,
      archiveAfterDays: 365,
      encryptionEnabled: true,
      accessLogEnabled: true
    },
    aiMonitoring: {
      contentReviewed: true,
      reviewedBy: USER_ID,
      reviewedAt: now - 86400000 * 5,
      biasCheckCompleted: true,
      accuracyScore: 0.92,
      fairnessScore: 0.88,
      contentQualityScore: 0.90
    },
    approvalWorkflow: {
      enabled: true,
      stages: [
        {
          id: 'stage_1',
          name: 'Content Review',
          order: 1,
          requiredRoles: ['ld_manager'],
          approvedBy: USER_ID,
          approvedAt: now - 86400000 * 5,
          status: 'approved'
        },
        {
          id: 'stage_2',
          name: 'Final Approval',
          order: 2,
          requiredRoles: ['org_admin'],
          status: 'pending'
        }
      ]
    },
    retentionPolicy: {
      learnerDataRetention: 2555,
      assessmentDataRetention: 2555,
      auditLogRetention: 3650,
      contentVersionRetention: 730,
      action: 'archive'
    },
    updatedAt: now - 86400000 * 4
  };

  await govRef.set(govData);
  console.log(`✅ Created governance: ${govRef.id}`);
}

async function createAuditLog(projectId: string) {
  console.log('📝 Creating initial audit log...');

  const auditRef = db.collection('organizations').doc(ORG_ID).collection('elsAuditLogs').doc();
  const now = Date.now();

  const auditData = {
    id: auditRef.id,
    orgId: ORG_ID,
    projectId,
    timestamp: now,
    actorId: USER_ID,
    actorName: 'Migration Script',
    actorRole: 'system',
    action: 'els.migration.completed',
    entityType: 'project',
    entityId: projectId,
    changes: [],
    metadata: {
      source: 'mock_data_migration',
      version: '1.0'
    }
  };

  await auditRef.set(auditData);
  console.log(`✅ Created audit log: ${auditRef.id}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('ELS Data Migration Script');
  console.log('='.repeat(60));
  console.log(`Organization ID: ${ORG_ID}`);
  console.log(`User ID: ${USER_ID}`);
  console.log('='.repeat(60));
  console.log();

  try {
    // Create project
    const projectId = await migrateProject();

    // Migrate all related data
    await migrateContent(projectId);
    const analysisId = await migrateAnalysis(projectId);
    const designId = await migrateDesign(projectId, analysisId);
    await migrateAIGeneration(projectId, designId);
    await migrateImplementation(projectId, designId);
    await migrateAnalytics(projectId);
    await migrateGovernance(projectId);
    await createAuditLog(projectId);

    console.log();
    console.log('='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`Project ID: ${projectId}`);
    console.log();
    console.log('Next steps:');
    console.log('1. Update your app to use the integrated ELS components');
    console.log('2. Wrap your app with ELSProvider');
    console.log('3. Start using real data!');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('❌ Migration failed!');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
