# ELS Studio Integration Plan for TuuttaWebApp

## Executive Summary

This document outlines a comprehensive plan to integrate **ELS Studio (Enterprise Learning System)** into the existing TuuttaWebApp with full Firebase/Firestore synchronization. The goal is to transform ELS from a UI-only mock into a fully functional, data-driven enterprise learning management system that seamlessly integrates with all existing Tuutta features.

---

## Current State Analysis

### What Exists Now

1. **ELS Studio UI Components** (`src/components/els/`)
   - `ELSStudio.tsx` - Main 9-phase pipeline UI
   - `ELSAnimations.tsx` - Animation components
   - `elsMockData.ts` - Static mock data
   - `els.ts` - TypeScript types

2. **ELS 9-Phase Pipeline**
   - Phase 1: Content Ingestion
   - Phase 2: Needs Analysis
   - Phase 3: Course Design
   - Phase 4: AI Development
   - Phase 5: Implementation
   - Phase 6: Evaluation
   - Phase 7: Personalization
   - Phase 8: Manager Portal
   - Phase 9: Governance

3. **Existing Tuutta Infrastructure**
   - Firebase Auth (Authentication)
   - Firestore Database
   - LMS Service Layer (`src/lib/lmsService.ts`)
   - Firestore Service (`src/lib/firestoreService.ts`)
   - Organization/Multi-tenancy support
   - User roles & permissions
   - Course/Enrollment/Progress tracking

### Current Limitations

1. ELS uses **static mock data** - no persistence
2. **No user authentication** integration
3. **No real-time sync** with Firestore
4. **No connection** to existing courses, users, or enrollments
5. **Linear navigation only** - no state management
6. **No audit logging** for ELS actions

---

## Integration Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ELS STUDIO UI Layer                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ 9-Phase     │ │  Content    │ │   Course    │ │   Manager Portal    │   │
│  │  Pipeline   │ │  Ingestion  │ │   Builder   │ │   & Analytics       │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                              ┌───────┴───────┐
                              │   ELS Hooks   │
                              │  (React Query)│
                              └───────┬───────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ELS Service Layer                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Content   │ │    User     │ │   Course    │ │   Analytics         │   │
│  │   Service   │ │   Service   │ │   Service   │ │   Service           │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                              ┌───────┴───────┐
                              │  Firestore DB │
                              └───────┬───────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Existing Tuutta Services                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │    Auth     │ │    LMS      │ │    User     │ │   Organization      │   │
│  │   Service   │ │   Service   │ │   Service   │ │   Service           │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Firestore Schema Design

### New Collections

#### 1. `elsProjects` (Organization-scoped)
```typescript
interface ELSProject {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'archived' | 'completed';
  
  // Phase tracking
  phases: {
    [key in ELSPhase]: {
      status: 'pending' | 'in_progress' | 'completed' | 'skipped';
      startedAt?: number;
      completedAt?: number;
      data?: any; // Phase-specific data
    }
  };
  
  // References to created resources
  createdCourseIds: string[];
  createdLearningPathIds: string[];
  createdAssessmentIds: string[];
  
  // Audit
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  lastModifiedBy: string;
}
```

#### 2. `elsContent` (Content Ingestion)
```typescript
interface ELSContent {
  id: string;
  orgId: string;
  projectId: string;
  
  // File metadata
  name: string;
  type: 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx' | 'audio' | 'video';
  size: number;
  fileUrl: string;
  
  // Processing
  status: 'uploading' | 'processing' | 'completed' | 'error';
  processingOptions: {
    nlp: boolean;
    ocr: boolean;
    tagging: boolean;
  };
  
  // Extracted data
  extractedContent?: string;
  extractedMetadata?: {
    title?: string;
    author?: string;
    keywords?: string[];
    summary?: string;
  };
  tags: string[];
  
  // AI analysis
  aiAnalysis?: {
    topics: string[];
    keyConcepts: string[];
    suggestedLearningOutcomes: string[];
    contentGaps: string[];
  };
  
  uploadedBy: string;
  uploadedAt: number;
}
```

#### 3. `elsNeedsAnalysis`
```typescript
interface ELSNeedsAnalysis {
  id: string;
  orgId: string;
  projectId: string;
  
  // Learner profiles
  targetAudience: {
    departments: string[];
    roles: UserRole[];
    teams: string[];
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  
  // Skill gap analysis
  skillGaps: {
    skillId: string;
    skillName: string;
    currentLevel: number;
    targetLevel: number;
    gap: number;
    affectedUsers: string[];
  }[];
  
  // Compliance requirements
  complianceRequirements: {
    id: string;
    name: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: number;
    regulationRef?: string;
  }[];
  
  // Generated objectives
  learningObjectives: {
    id: string;
    description: string;
    taxonomy: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
    measurable: boolean;
    measurementCriteria?: string;
  }[];
  
  createdAt: number;
  updatedAt: number;
}
```

#### 4. `elsCourseDesign`
```typescript
interface ELSCourseDesign {
  id: string;
  orgId: string;
  projectId: string;
  
  // Blueprint
  title: string;
  description: string;
  estimatedDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  
  // Structure
  modules: {
    id: string;
    title: string;
    description: string;
    order: number;
    units: {
      id: string;
      title: string;
      type: 'text' | 'video' | 'audio' | 'interactive';
      duration: number;
      content?: string;
      order: number;
    }[];
  }[];
  
  // Learning outcomes (linked to NeedsAnalysis)
  learningOutcomes: string[]; // IDs
  
  // Instructional design
  instructionalStrategies: {
    practiceActivities: boolean;
    groupDiscussions: boolean;
    teachBackTasks: boolean;
    caseStudies: boolean;
  };
  
  // Adult learning principles
  adultLearningPrinciples: {
    practicalRelevance: boolean;
    selfDirected: boolean;
    experiential: boolean;
    problemCentered: boolean;
  };
  
  // Bloom's taxonomy distribution
  taxonomyDistribution: {
    remember: number;
    understand: number;
    apply: number;
    analyze: number;
    evaluate: number;
    create: number;
  };
  
  createdAt: number;
  updatedAt: number;
}
```

#### 5. `elsAIGeneration`
```typescript
interface ELSAIGeneration {
  id: string;
  orgId: string;
  projectId: string;
  designId: string;
  
  // Generation requests and outputs
  generations: {
    id: string;
    type: 'lesson' | 'slides' | 'audio' | 'assessment';
    prompt: string;
    parameters: Record<string, any>;
    status: 'pending' | 'generating' | 'completed' | 'error';
    output?: string;
    metadata?: {
      tokensUsed: number;
      model: string;
      confidence: number;
    };
    createdAt: number;
    completedAt?: number;
  }[];
  
  // Generated assessments
  assessments: {
    id: string;
    type: 'mcq' | 'listening' | 'reading' | 'math' | 'speaking';
    title: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    questions: any[];
    timeLimit?: number;
  }[];
  
  createdAt: number;
  updatedAt: number;
}
```

#### 6. `elsImplementation`
```typescript
interface ELSImplementation {
  id: string;
  orgId: string;
  projectId: string;
  courseId?: string;
  learningPathId?: string;
  
  // Enrollment rules
  enrollmentRules: {
    id: string;
    type: 'role' | 'department' | 'team' | 'individual';
    targetId: string;
    targetName: string;
    dueDate?: number;
    priority: 'required' | 'recommended' | 'optional';
  }[];
  
  // Schedule
  schedule: {
    startDate?: number;
    endDate?: number;
    selfEnrollment: boolean;
    allowLateEnrollment: boolean;
  };
  
  // Notifications
  notifications: {
    enrollmentNotification: boolean;
    reminderDays: number[];
    completionNotification: boolean;
    overdueAlerts: boolean;
  };
  
  // Tutor assignment
  assignedTutors: string[]; // User IDs
  
  // Enrollment tracking
  enrolledCount: number;
  completedCount: number;
  
  status: 'scheduled' | 'active' | 'paused' | 'completed';
  createdAt: number;
  updatedAt: number;
}
```

#### 7. `elsAnalytics` (Evaluation & Analytics)
```typescript
interface ELSAnalytics {
  id: string;
  orgId: string;
  projectId: string;
  courseId?: string;
  
  // Metrics
  metrics: {
    totalLearners: number;
    activeLearners: number;
    completionRate: number;
    averageScore: number;
    averageTimeToComplete: number;
    dropoutRate: number;
  };
  
  // Time series data
  timeSeriesData: {
    date: string;
    completions: number;
    activeUsers: number;
    averageScore: number;
    newEnrollments: number;
  }[];
  
  // Engagement metrics
  engagementMetrics: {
    metric: string;
    value: number;
    change: number; // Percentage change
    period: string;
  }[];
  
  // Compliance tracking
  complianceMetrics: {
    requirementId: string;
    requirementName: string;
    completionRate: number;
    overdueCount: number;
    atRiskUsers: string[];
  }[];
  
  // Skill improvement
  skillImprovement: {
    skillId: string;
    skillName: string;
    beforeAverage: number;
    afterAverage: number;
    improvement: number;
  }[];
  
  updatedAt: number;
}
```

#### 8. `elsGovernance`
```typescript
interface ELSGovernance {
  id: string;
  orgId: string;
  projectId: string;
  
  // Audit logs (separate collection, referenced here)
  auditLogRetention: number; // days
  
  // Data privacy
  privacySettings: {
    dataRetentionPeriod: number;
    anonymizeAfterCompletion: boolean;
    allowDataExport: boolean;
    gdprCompliant: boolean;
  };
  
  // Security
  securitySettings: {
    requireApprovalForPublishing: boolean;
    approverRoles: UserRole[];
    contentReviewRequired: boolean;
    automaticArchiving: boolean;
    archiveAfterDays: number;
  };
  
  // Model monitoring (for AI-generated content)
  aiMonitoring: {
    contentReviewed: boolean;
    reviewedBy?: string;
    reviewedAt?: number;
    biasCheckCompleted: boolean;
    accuracyScore?: number;
  };
  
  updatedAt: number;
}
```

---

## Phase 2: Service Layer Implementation

### File Structure

```
src/
├── services/
│   ├── els/
│   │   ├── index.ts           # Export all ELS services
│   │   ├── elsProjectService.ts
│   │   ├── elsContentService.ts
│   │   ├── elsAnalysisService.ts
│   │   ├── elsDesignService.ts
│   │   ├── elsAIGenerationService.ts
│   │   ├── elsImplementationService.ts
│   │   ├── elsAnalyticsService.ts
│   │   └── elsGovernanceService.ts
│   └── events.ts              # Extend existing event system
├── hooks/
│   ├── els/
│   │   ├── index.ts
│   │   ├── useELSProject.ts
│   │   ├── useELSContent.ts
│   │   ├── useELSAnalysis.ts
│   │   ├── useELSDesign.ts
│   │   ├── useELSAIGeneration.ts
│   │   ├── useELSImplementation.ts
│   │   ├── useELSAnalytics.ts
│   │   └── useELSGovernance.ts
│   └── index.ts
├── context/
│   └── ELSContext.tsx         # ELS state management
└── types/
    └── els.ts                 # Extend existing types
```

### Core Service Implementation Pattern

```typescript
// src/services/els/elsProjectService.ts
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import type { ELSProject, ELSPhase } from '@/types/els';

const COLLECTIONS = {
  ELS_PROJECTS: 'elsProjects',
  ELS_CONTENT: 'elsContent',
  ELS_ANALYSIS: 'elsNeedsAnalysis',
  ELS_DESIGN: 'elsCourseDesign',
  ELS_AI_GENERATION: 'elsAIGeneration',
  ELS_IMPLEMENTATION: 'elsImplementation',
  ELS_ANALYTICS: 'elsAnalytics',
  ELS_GOVERNANCE: 'elsGovernance'
};

// Organization-scoped collection helper
const orgCollection = (orgId: string, name: string) =>
  collection(db, 'organizations', orgId, name);

const orgDoc = (orgId: string, name: string, docId: string) =>
  doc(db, 'organizations', orgId, name, docId);

export const elsProjectService = {
  // Create new ELS project
  create: async (
    orgId: string,
    data: Omit<ELSProject, 'id' | 'createdAt' | 'updatedAt' | 'orgId'>
  ): Promise<ELSProject> => {
    const projectRef = doc(orgCollection(orgId, COLLECTIONS.ELS_PROJECTS));
    const newProject: ELSProject = {
      ...data,
      id: projectRef.id,
      orgId,
      phases: {
        ingest: { status: 'pending' },
        analyze: { status: 'pending' },
        design: { status: 'pending' },
        develop: { status: 'pending' },
        implement: { status: 'pending' },
        evaluate: { status: 'pending' },
        personalize: { status: 'pending' },
        portal: { status: 'pending' },
        govern: { status: 'pending' }
      },
      createdCourseIds: [],
      createdLearningPathIds: [],
      createdAssessmentIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await setDoc(projectRef, newProject);
    return newProject;
  },

  // Get project by ID
  get: async (orgId: string, projectId: string): Promise<ELSProject | null> => {
    const docSnap = await getDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId));
    return docSnap.exists() ? (docSnap.data() as ELSProject) : null;
  },

  // List all projects for organization
  list: async (orgId: string): Promise<ELSProject[]> => {
    const q = query(
      orgCollection(orgId, COLLECTIONS.ELS_PROJECTS),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as ELSProject);
  },

  // Update project
  update: async (
    orgId: string,
    projectId: string,
    updates: Partial<ELSProject>,
    userId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), {
      ...updates,
      updatedAt: Date.now(),
      lastModifiedBy: userId
    });
  },

  // Update phase status
  updatePhase: async (
    orgId: string,
    projectId: string,
    phase: ELSPhase,
    status: ELSProject['phases'][ELSPhase],
    userId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), {
      [`phases.${phase}`]: status,
      updatedAt: Date.now(),
      lastModifiedBy: userId
    });
  },

  // Delete project and all related data
  delete: async (orgId: string, projectId: string): Promise<void> => {
    const batch = writeBatch(db);
    
    // Delete project
    batch.delete(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId));
    
    // Delete all related data
    const collections = [
      COLLECTIONS.ELS_CONTENT,
      COLLECTIONS.ELS_ANALYSIS,
      COLLECTIONS.ELS_DESIGN,
      COLLECTIONS.ELS_AI_GENERATION,
      COLLECTIONS.ELS_IMPLEMENTATION,
      COLLECTIONS.ELS_ANALYTICS,
      COLLECTIONS.ELS_GOVERNANCE
    ];
    
    for (const col of collections) {
      const q = query(orgCollection(orgId, col), where('projectId', '==', projectId));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => batch.delete(d.ref));
    }
    
    await batch.commit();
  },

  // Link created course to project
  linkCourse: async (
    orgId: string,
    projectId: string,
    courseId: string,
    userId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), {
      createdCourseIds: arrayUnion(courseId),
      updatedAt: Date.now(),
      lastModifiedBy: userId
    });
  }
};
```

---

## Phase 3: React Hooks Implementation

### useELSProject Hook

```typescript
// src/hooks/els/useELSProject.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elsProjectService } from '@/services/els';
import type { ELSProject } from '@/types/els';

const QUERY_KEYS = {
  projects: (orgId: string) => ['els', 'projects', orgId],
  project: (orgId: string, projectId: string) => ['els', 'projects', orgId, projectId]
};

export function useELSProjects(orgId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.projects(orgId),
    queryFn: () => elsProjectService.list(orgId),
    enabled: !!orgId
  });
}

export function useELSProject(orgId: string, projectId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.project(orgId, projectId),
    queryFn: () => elsProjectService.get(orgId, projectId),
    enabled: !!orgId && !!projectId
  });
}

export function useCreateELSProject(orgId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<ELSProject, 'id' | 'createdAt' | 'updatedAt' | 'orgId'>) =>
      elsProjectService.create(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects(orgId) });
    }
  });
}

export function useUpdateELSPhase(orgId: string, projectId: string, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      phase,
      status
    }: {
      phase: ELSPhase;
      status: ELSProject['phases'][ELSPhase];
    }) => elsProjectService.updatePhase(orgId, projectId, phase, status, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(orgId, projectId) });
    }
  });
}
```

---

## Phase 4: Integration Points

### 1. Auth Integration

ELS Studio should respect existing auth:

```typescript
// In ELSStudio.tsx
const { user } = useStore();
const { currentOrg, currentMember } = useLMSStore();

// Check permissions
const canEdit = currentMember?.role === 'org_admin' || 
                currentMember?.role === 'ld_manager';
const canPublish = currentMember?.role === 'org_admin';
```

### 2. Course Creation Integration

When Phase 5 (Implementation) creates a course, it should use existing LMS service:

```typescript
// In elsImplementationService.ts
import { createCourse, publishCourse } from '@/lib/lmsService';

export const publishELSCourse = async (
  orgId: string,
  projectId: string,
  designId: string,
  userId: string
) => {
  // 1. Get design
  const design = await elsDesignService.get(orgId, designId);
  
  // 2. Create course using existing LMS service
  const course = await createCourse({
    orgId,
    title: design.title,
    description: design.description,
    modules: design.modules.map(m => ({
      ...m,
      lessons: m.units.map(u => ({
        id: u.id,
        title: u.title,
        type: u.type,
        content: { htmlContent: u.content },
        duration: u.duration,
        order: u.order,
        isRequired: true
      }))
    })),
    // ... other fields
  });
  
  // 3. Link to project
  await elsProjectService.linkCourse(orgId, projectId, course.id, userId);
  
  // 4. Auto-enroll based on rules
  const implementation = await elsImplementationService.getByProject(orgId, projectId);
  for (const rule of implementation.enrollmentRules) {
    await bulkEnroll(orgId, rule.targetUserIds, course.id, userId, {
      dueDate: rule.dueDate,
      priority: rule.priority
    });
  }
  
  return course;
};
```

### 3. Analytics Integration

ELS Analytics should aggregate from existing enrollment data:

```typescript
// In elsAnalyticsService.ts
import { getCourseEnrollments, getOrgEnrollments } from '@/lib/lmsService';

export const computeELSAnalytics = async (
  orgId: string,
  projectId: string
): Promise<ELSAnalytics> => {
  const project = await elsProjectService.get(orgId, projectId);
  
  // Get all enrollments for courses created by this project
  let allEnrollments = [];
  for (const courseId of project.createdCourseIds) {
    const enrollments = await getCourseEnrollments(orgId, courseId);
    allEnrollments.push(...enrollments);
  }
  
  // Compute metrics
  const totalLearners = allEnrollments.length;
  const completed = allEnrollments.filter(e => e.status === 'completed');
  const completionRate = (completed.length / totalLearners) * 100;
  const averageScore = completed.reduce((sum, e) => sum + (e.score || 0), 0) / completed.length;
  
  return {
    metrics: {
      totalLearners,
      activeLearners: allEnrollments.filter(e => e.status === 'in_progress').length,
      completionRate,
      averageScore,
      // ...
    },
    // ...
  };
};
```

### 4. Audit Log Integration

All ELS actions should create audit logs:

```typescript
// In els services
import { createAuditLog } from '@/lib/lmsService';

// After any significant action:
await createAuditLog({
  orgId,
  timestamp: Date.now(),
  actorId: userId,
  action: 'els.phase.completed',
  entityType: 'els_project',
  entityId: projectId,
  metadata: { phase, projectName: project.name }
});
```

---

## Phase 5: Component Refactoring

### ELSStudio.tsx Refactoring Strategy

1. **Extract Phase Components** (already done)
   - Keep Phase1Ingestion, Phase2Analyze, etc.

2. **Add Data Layer**
   ```typescript
   // Replace mock data hooks
   const { data: project } = useELSProject(orgId, projectId);
   const { data: content } = useELSContent(orgId, projectId);
   const { data: analysis } = useELSAnalysis(orgId, projectId);
   // etc.
   ```

3. **Add Mutations**
   ```typescript
   const updatePhase = useUpdateELSPhase(orgId, projectId, user.id);
   const uploadContent = useUploadELSContent(orgId, projectId, user.id);
   // etc.
   ```

4. **Real-time Updates**
   ```typescript
   // Add Firestore real-time listeners for active phases
   useEffect(() => {
     if (!orgId || !projectId) return;
     
     const unsubscribe = onSnapshot(
       orgDoc(orgId, 'elsProjects', projectId),
       (doc) => {
         if (doc.exists()) {
           queryClient.setQueryData(
             QUERY_KEYS.project(orgId, projectId),
             doc.data()
           );
         }
       }
     );
     
     return () => unsubscribe();
   }, [orgId, projectId]);
   ```

---

## Phase 6: Migration Strategy

### Step 1: Create Firestore Collections (No Downtime)

```bash
# Deploy Firestore security rules for new collections
firebase deploy --only firestore:rules
```

### Step 2: Deploy Services (Backward Compatible)

- Deploy new services without UI changes
- No impact on existing users

### Step 3: Feature Flag Rollout

```typescript
// In ELSStudio.tsx
const { isELSIntegrationEnabled } = useFeatureFlags();

if (isELSIntegrationEnabled) {
  return <ELSStudioIntegrated />;
} else {
  return <ELSStudioMock />; // Current implementation
}
```

### Step 4: Gradual Migration

1. **Week 1**: Enable for beta users
2. **Week 2**: Enable for org_admins only
3. **Week 3**: General availability
4. **Week 4**: Remove feature flag and mock data

---

## Phase 7: Testing Strategy

### Unit Tests

```typescript
// elsProjectService.test.ts
describe('elsProjectService', () => {
  it('should create a project with all phases initialized', async () => {
    const project = await elsProjectService.create(orgId, {
      name: 'Test Project',
      description: 'Test'
    });
    
    expect(project.phases.ingest.status).toBe('pending');
    expect(project.phases.analyze.status).toBe('pending');
    // ... all phases
  });
});
```

### Integration Tests

```typescript
// elsIntegration.test.ts
describe('ELS Integration', () => {
  it('should create a course from ELS and link it', async () => {
    // 1. Create ELS project
    // 2. Add content
    // 3. Complete phases 1-4
    // 4. Implement (create course)
    // 5. Verify course exists in LMS
    // 6. Verify enrollment rules applied
  });
});
```

### E2E Tests

- Full pipeline walkthrough
- Multi-user collaboration
- Real-time updates
- Error handling

---

## Implementation Timeline

| Week | Deliverable |
|------|-------------|
| 1 | Firestore schema, security rules |
| 2 | ELS Service layer (all 8 services) |
| 3 | React hooks, ELSContext |
| 4 | Component refactoring (Phase 1-3) |
| 5 | Component refactoring (Phase 4-6) |
| 6 | Component refactoring (Phase 7-9) |
| 7 | Integration testing, bug fixes |
| 8 | Feature flag rollout, monitoring |

---

## Benefits of This Integration

1. **Single Source of Truth**: All ELS data in Firestore
2. **Real-time Collaboration**: Multiple users can work on same project
3. **Audit Trail**: Complete history of all ELS actions
4. **Scalability**: Organization-scoped data isolation
5. **Feature Parity**: ELS features work with existing LMS features
6. **Data Persistence**: No data loss on page refresh
7. **Analytics**: Cross-platform analytics and reporting

---

## Next Steps

1. Review and approve this plan
2. Set up feature flag system (if not exists)
3. Begin Phase 1: Firestore schema implementation
4. Create detailed task breakdown for each phase

---

*Document Version: 1.0*
*Created: 2024*
*Author: AI Assistant*
