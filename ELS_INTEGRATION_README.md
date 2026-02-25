# ELS Studio Firebase Integration

This document describes the Firebase integration for ELS Studio (Enterprise Learning System).

## Overview

The ELS Studio has been integrated with Firebase/Firestore to provide:

- **Real-time data synchronization** across all users
- **Persistent data storage** in Firestore
- **Organization-scoped data** isolation
- **Full audit trail** for compliance
- **Integration with existing Tuutta features** (courses, enrollments, users)

## Architecture

```
ELS Studio UI
      │
      ▼
ELS Context (React Context)
      │
      ▼
ELS Hooks (React Query)
      │
      ▼
ELS Services (Firebase SDK)
      │
      ▼
Firestore Database
      │
      ▼
Existing LMS Services
```

## File Structure

```
src/
├── context/
│   └── ELSContext.tsx          # ELS state management
├── hooks/els/
│   ├── index.ts                # Export all ELS hooks
│   ├── useELSProject.ts        # Project CRUD hooks
│   ├── useELSContent.ts        # Content management hooks
│   ├── useELSAnalysis.ts       # Needs analysis hooks
│   ├── useELSDesign.ts         # Course design hooks
│   ├── useELSAIGeneration.ts   # AI generation hooks
│   ├── useELSImplementation.ts # Implementation hooks
│   ├── useELSAnalytics.ts      # Analytics hooks
│   ├── useELSGovernance.ts     # Governance hooks
│   └── useELSProjectData.ts    # Combined data hook
├── services/els/
│   ├── index.ts                # Export all ELS services
│   ├── elsProjectService.ts    # Project operations
│   ├── elsContentService.ts    # Content operations
│   ├── elsAnalysisService.ts   # Analysis operations
│   ├── elsDesignService.ts     # Design operations
│   ├── elsAIGenerationService.ts # AI generation operations
│   ├── elsImplementationService.ts # Implementation operations
│   ├── elsAnalyticsService.ts  # Analytics operations
│   └── elsGovernanceService.ts # Governance operations
├── components/els/
│   ├── ELSStudio.tsx           # Legacy mock-based component
│   ├── ELSStudioIntegrated.tsx # New Firebase-integrated component
│   └── index.ts                # Exports
└── types/
    └── els.ts                  # Extended ELS types
```

## Firestore Collections

All ELS data is stored in organization-scoped collections:

### `/organizations/{orgId}/elsProjects`
Main project documents containing:
- Project metadata (name, description, status)
- Phase tracking (status, timestamps for all 9 phases)
- References to created courses, learning paths, assessments

### `/organizations/{orgId}/elsContent`
Uploaded content files:
- File metadata (name, type, size, URL)
- Processing status and progress
- Extracted content and AI analysis

### `/organizations/{orgId}/elsNeedsAnalysis`
Needs analysis documents:
- Target audience (departments, roles, users)
- Skill gaps
- Compliance requirements
- Learning objectives

### `/organizations/{orgId}/elsCourseDesign`
Course design documents:
- Course blueprint (title, description, duration)
- Module and unit structure
- Learning outcomes
- Instructional strategies

### `/organizations/{orgId}/elsAIGeneration`
AI generation records:
- Generation requests and outputs
- Generated assessments
- Review status

### `/organizations/{orgId}/elsImplementation`
Implementation records:
- Enrollment rules
- Schedule configuration
- Notification settings
- Enrollment statistics

### `/organizations/{orgId}/elsAnalytics`
Analytics documents:
- Metrics (completion rate, scores, etc.)
- Time-series data
- Engagement metrics
- Compliance tracking

### `/organizations/{orgId}/elsGovernance`
Governance documents:
- Privacy settings
- Security settings
- AI monitoring results
- Approval workflows

### `/organizations/{orgId}/elsAuditLogs`
Audit log entries:
- All ELS actions with timestamps
- Actor information
- Change details

## Usage

### 1. Wrap your app with ELSProvider

```tsx
import { ELSProvider } from '@/context/ELSContext';

function App() {
  return (
    <ELSProvider>
      <YourApp />
    </ELSProvider>
  );
}
```

### 2. Use the ELS component

```tsx
import ELSStudio from '@/components/els';

function AdminPage() {
  return <ELSStudio />;
}
```

### 3. Use ELS hooks in custom components

```tsx
import { useELSProject, useELSContent } from '@/hooks/els';

function MyComponent() {
  const { data: project } = useELSProject(orgId, projectId);
  const { data: content } = useELSContent(orgId, projectId);
  
  // ...
}
```

### 4. Access ELS context

```tsx
import { useELS } from '@/context/ELSContext';

function MyComponent() {
  const { 
    currentProject, 
    content, 
    analysis, 
    design,
    createProject,
    uploadContent,
    canEdit 
  } = useELS();
  
  // ...
}
```

## Migration from Mock Data

To migrate existing mock data to Firebase:

1. **Install Firebase Admin SDK** (if not already installed):
   ```bash
   npm install firebase-admin
   ```

2. **Set up Firebase credentials**:
   - Download service account key from Firebase Console
   - Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

3. **Run the migration script**:
   ```bash
   npx tsx scripts/migrate-els-data.ts --orgId=<YOUR_ORG_ID> --userId=<YOUR_USER_ID>
   ```

## Security Rules

The Firestore security rules for ELS collections are in `firestore.rules`:

- **Read**: All org members can read ELS data
- **Write**: Only org admins and L&D managers can create/update/delete
- **Audit logs**: Immutable (write-once)

## Integration with Existing Features

### Course Creation
When a course is published from ELS, it creates a course using the existing LMS service:

```typescript
import { createCourse } from '@/lib/lmsService';

// In elsImplementationService.ts
const course = await createCourse({
  orgId,
  title: design.title,
  description: design.description,
  modules: design.modules.map(m => ({ ... })),
  // ...
});
```

### Enrollments
When implementation is activated, it uses the existing enrollment system:

```typescript
import { bulkEnroll } from '@/lib/lmsService';

// Enroll users based on rules
await bulkEnroll(orgId, userIds, courseId, userId, {
  dueDate: rule.dueDate,
  priority: rule.priority
});
```

### Audit Logging
All ELS actions create audit logs:

```typescript
import { createAuditLog } from '@/lib/lmsService';

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

## Feature Flags

To gradually roll out the integrated ELS:

```tsx
const { isELSIntegrationEnabled } = useFeatureFlags();

if (isELSIntegrationEnabled) {
  return <ELSStudioIntegrated />;
} else {
  return <ELSStudioLegacy />;
}
```

## Environment Variables

Make sure these environment variables are set:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Troubleshooting

### "Permission denied" errors
- Check that the user has the correct role (org_admin or ld_manager)
- Verify Firestore security rules are deployed: `firebase deploy --only firestore:rules`

### Data not syncing
- Check network connectivity
- Verify organization ID is correct
- Check browser console for Firebase errors

### Missing data
- Ensure migration script has been run
- Check Firestore console to verify data exists
- Verify project ID is correct

## Future Enhancements

- [ ] Real-time collaboration (multiple users editing same project)
- [ ] Version control for course designs
- [ ] AI-powered content suggestions
- [ ] Advanced analytics dashboards
- [ ] Integration with external LMS systems
- [ ] Automated compliance reporting

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firestore security rules
3. Check browser console for errors
4. Review Firebase logs in Firebase Console
