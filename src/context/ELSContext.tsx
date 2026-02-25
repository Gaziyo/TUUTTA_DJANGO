/**
 * ELS Context Provider
 * 
 * Provides state management and data access for the Enterprise Learning System (ELS).
 * This context integrates with Django-backed services for ELS workflows.
 */

import React, { createContext, useContext, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '@/store';
import { useLMSStore } from '@/store/lmsStore';
import { useToast } from '@/hooks/use-toast';
import { userService } from '@/services/userService';
import type { ELSProject, ELSPhase, ELSContent, ELSNeedsAnalysis, ELSCourseDesign } from '@/types/els';
import { uploadFile } from '@/lib/storage';

// Import services
import {
  elsProjectService,
  elsContentService,
  elsAnalysisService,
  elsDesignService,
} from '@/services/els';

// ============================================================================
// Context Types
// ============================================================================

interface ELSContextValue {
  // Current project
  currentProject: ELSProject | null;
  currentProjectId: string | null;
  setCurrentProject: (projectId: string | null) => void;
  
  // Project data
  project: ELSProject | null;
  content: ELSContent[];
  analysis: ELSNeedsAnalysis | null;
  design: ELSCourseDesign | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Error state
  error: Error | null;
  
  // Project actions
  createProject: (name: string, description?: string) => Promise<string>;
  updateProject: (updates: Partial<ELSProject>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  archiveProject: (projectId: string) => Promise<void>;
  
  // Phase actions
  startPhase: (phase: ELSPhase) => Promise<void>;
  completePhase: (phase: ELSPhase, phaseData?: unknown) => Promise<void>;
  
  // Content actions
  uploadContent: (file: File, processingOptions?: ELSContent['processingOptions']) => Promise<string>;
  deleteContent: (contentId: string) => Promise<void>;
  
  // Refresh data
  refreshData: () => Promise<void>;
  
  // Permissions
  canEdit: boolean;
  canPublish: boolean;
  canDelete: boolean;
}

// ============================================================================
// Context Creation
// ============================================================================

const ELSContext = createContext<ELSContextValue | null>(null);

// ============================================================================
// Hook
// ============================================================================

export function useELS() {
  const context = useContext(ELSContext);
  if (!context) {
    throw new Error('useELS must be used within an ELSProvider');
  }
  return context;
}

// ============================================================================
// Provider Component
// ============================================================================

interface ELSProviderProps {
  children: React.ReactNode;
}

export function ELSProvider({ children }: ELSProviderProps) {
  // Get current user and org from global stores
  const { user } = useStore();
  const { currentOrg, currentMember } = useLMSStore();
  const { toast } = useToast();
  
  // State
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<ELSProject | null>(null);
  const [content, setContent] = useState<ELSContent[]>([]);
  const [analysis, setAnalysis] = useState<ELSNeedsAnalysis | null>(null);
  const [design, setDesign] = useState<ELSCourseDesign | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Unsubscribe refs for cleanup
  const unsubscribersRef = useRef<(() => void)[]>([]);
  const membershipSyncKeyRef = useRef<string | null>(null);
  
  // ============================================================================
  // Permissions
  // ============================================================================
  
  const canEdit = useMemo(() => {
    if (!currentMember) return false;
    return ['super_admin', 'org_admin', 'ld_manager'].includes(currentMember.role);
  }, [currentMember]);
  
  const canPublish = useMemo(() => {
    if (!currentMember) return false;
    return ['super_admin', 'org_admin'].includes(currentMember.role);
  }, [currentMember]);
  
  const canDelete = useMemo(() => {
    if (!currentMember) return false;
    return ['super_admin', 'org_admin'].includes(currentMember.role);
  }, [currentMember]);
  
  // ============================================================================
  // Data Loading
  // ============================================================================
  
  const loadProjectData = useCallback(async (projectId: string) => {
    if (!currentOrg) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load project
      const projectData = await elsProjectService.get(currentOrg.id, projectId);
      setProject(projectData);
      
      if (projectData) {
        // Load related data in parallel
        const [contentData, analysisData, designData] = await Promise.all([
          elsContentService.list(currentOrg.id, projectId),
          elsAnalysisService.getByProject(currentOrg.id, projectId),
          elsDesignService.getByProject(currentOrg.id, projectId),
        ]);
        
        setContent(contentData);
        setAnalysis(analysisData);
        setDesign(designData);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load project data'));
      toast({
        title: 'Error',
        description: 'Failed to load project data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, toast]);
  
  // ============================================================================
  // Real-time Subscriptions
  // ============================================================================
  
  const setupSubscriptions = useCallback((projectId: string) => {
    if (!currentOrg) return;
    
    // Clean up existing subscriptions
    unsubscribersRef.current.forEach(unsub => unsub());
    
    const newUnsubscribers: (() => void)[] = [];
    
    // Subscribe to project
    const projectUnsub = elsProjectService.subscribe(
      currentOrg.id,
      projectId,
      (data) => setProject(data)
    );
    newUnsubscribers.push(projectUnsub);
    
    // Subscribe to content
    const contentUnsub = elsContentService.subscribeToProject(
      currentOrg.id,
      projectId,
      (data) => setContent(data)
    );
    newUnsubscribers.push(contentUnsub);
    
    // Subscribe to analysis
    const analysisUnsub = elsAnalysisService.subscribeByProject(
      currentOrg.id,
      projectId,
      (data) => setAnalysis(data)
    );
    newUnsubscribers.push(analysisUnsub);
    
    // Subscribe to design
    const designUnsub = elsDesignService.subscribeByProject(
      currentOrg.id,
      projectId,
      (data) => setDesign(data)
    );
    newUnsubscribers.push(designUnsub);
    
    unsubscribersRef.current = newUnsubscribers;
  }, [currentOrg]);
  
  // ============================================================================
  // Effects
  // ============================================================================
  
  // Load data when project ID changes
  useEffect(() => {
    if (currentProjectId && currentOrg) {
      loadProjectData(currentProjectId);
      setupSubscriptions(currentProjectId);
    } else {
      setProject(null);
      setContent([]);
      setAnalysis(null);
      setDesign(null);
    }
    
    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
    };
  }, [currentProjectId, currentOrg, loadProjectData, setupSubscriptions]);

  // Ensure canonical orgMembers doc exists (rules check this path)
  useEffect(() => {
    if (!currentOrg?.id || !user?.id || !currentMember) return;

    const key = `${currentOrg.id}_${user.id}`;
    if (membershipSyncKeyRef.current === key) return;
    membershipSyncKeyRef.current = key;

    void (async () => {
      try {
        const existing = await userService.getMember(key);
        if (existing) return;

        await userService.addMember({
          odId: currentOrg.id,
          orgId: currentOrg.id,
          userId: user.id,
          email: currentMember.email || user.email || `${user.id}@local.tuutta`,
          name: currentMember.name || user.name || 'User',
          role: currentMember.role,
          status: currentMember.status || 'active',
          joinedAt: currentMember.joinedAt || Date.now(),
        });
      } catch (syncError) {
        console.warn('ELS membership sync skipped:', syncError);
      }
    })();
  }, [
    currentOrg?.id,
    currentMember,
    user?.email,
    user?.id,
    user?.name
  ]);
  
  // ============================================================================
  // Actions
  // ============================================================================
  
  const createProject = useCallback(async (name: string, description?: string): Promise<string> => {
    if (!currentOrg || !user) {
      throw new Error('User or organization not available');
    }
    
    setIsSaving(true);
    
    try {
      const project = await elsProjectService.create(currentOrg.id, user.id, {
        name,
        description,
      });
      
      toast({
        title: 'Project Created',
        description: `Successfully created "${name}"`,
      });
      
      setCurrentProjectId(project.id);
      return project.id;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create project',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [currentOrg, user, toast]);
  
  const updateProject = useCallback(async (updates: Partial<ELSProject>) => {
    if (!currentOrg || !user || !currentProjectId || !project) {
      throw new Error('Project not available');
    }
    
    setIsSaving(true);
    
    try {
      await elsProjectService.update(currentOrg.id, currentProjectId, user.id, updates);
      
      toast({
        title: 'Project Updated',
        description: 'Changes saved successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update project',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [currentOrg, user, currentProjectId, project, toast]);
  
  const deleteProject = useCallback(async (projectId: string) => {
    if (!currentOrg) {
      throw new Error('Organization not available');
    }
    
    setIsSaving(true);
    
    try {
      await elsProjectService.delete(currentOrg.id, projectId);
      
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }
      
      toast({
        title: 'Project Deleted',
        description: 'Project has been permanently deleted',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [currentOrg, currentProjectId, toast]);
  
  const archiveProject = useCallback(async (projectId: string) => {
    if (!currentOrg || !user) {
      throw new Error('User or organization not available');
    }
    
    setIsSaving(true);
    
    try {
      await elsProjectService.archive(currentOrg.id, projectId, user.id);
      
      toast({
        title: 'Project Archived',
        description: 'Project has been archived',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to archive project',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [currentOrg, user, toast]);
  
  const startPhase = useCallback(async (phase: ELSPhase) => {
    if (!currentOrg || !user || !currentProjectId) {
      throw new Error('Project not available');
    }
    
    setIsSaving(true);
    
    try {
      await elsProjectService.startPhase(currentOrg.id, currentProjectId, user.id, phase);
      
      toast({
        title: 'Phase Started',
        description: `Started ${phase} phase`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to start phase',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [currentOrg, currentProjectId, project?.phases?.ingest?.status, toast, user]);
  
  const completePhase = useCallback(async (phase: ELSPhase, phaseData?: unknown) => {
    if (!currentOrg || !user || !currentProjectId) {
      throw new Error('Project not available');
    }
    
    setIsSaving(true);
    
    try {
      const phaseUpdate: Record<string, unknown> = {
        status: 'completed',
        completedAt: Date.now()
      };
      if (phaseData !== undefined) {
        phaseUpdate.data = phaseData;
      }
      await elsProjectService.updatePhase(
        currentOrg.id,
        currentProjectId,
        user.id,
        phase,
        phaseUpdate as { status?: ELSPhaseStatus['status']; completedAt?: number; data?: unknown }
      );
      
      toast({
        title: 'Phase Completed',
        description: `Completed ${phase} phase`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to complete phase',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [currentOrg, user, currentProjectId, toast]);
  
  const uploadContent = useCallback(async (
    file: File,
    processingOptions?: ELSContent['processingOptions']
  ): Promise<string> => {
    if (!currentOrg || !user || !currentProjectId) {
      throw new Error('Project not available');
    }
    
    const storagePath = `organizations/${currentOrg.id}/els/${currentProjectId}/${Date.now()}_${file.name}`;
    const uploaded = await uploadFile(file, user.id, storagePath);
    const fileUrl = uploaded.content;
    
    const content = await elsContentService.create(
      currentOrg.id,
      currentProjectId,
      user.id,
      {
        name: file.name,
        type: file.name.split('.').pop()?.toLowerCase() as ELSContent['type'] || 'pdf',
        size: file.size,
        fileUrl,
        storagePath,
        processingOptions,
      }
    );
    
    try {
      await elsContentService.markProcessed(currentOrg.id, content.id, {
        extractedContent: uploaded.extractedText || '',
        extractedMetadata: { title: file.name }
      });
    } catch (error) {
      await elsContentService.markError(
        currentOrg.id,
        content.id,
        (error as Error).message
      );
    }

    if (project?.phases?.ingest?.status !== 'completed') {
      await elsProjectService.updatePhase(currentOrg.id, currentProjectId, user.id, 'ingest', {
        status: 'completed',
        completedAt: Date.now()
      });
    }

    toast({
      title: 'File Uploaded',
      description: `${file.name} has been uploaded and processed`,
    });
    
    return content.id;
  }, [currentOrg, user, currentProjectId, toast]);
  
  const deleteContent = useCallback(async (contentId: string) => {
    if (!currentOrg) {
      throw new Error('Organization not available');
    }
    
    try {
      await elsContentService.delete(currentOrg.id, contentId);
      
      toast({
        title: 'File Deleted',
        description: 'File has been removed',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
      throw err;
    }
  }, [currentOrg, toast]);
  
  const refreshData = useCallback(async () => {
    if (currentProjectId) {
      await loadProjectData(currentProjectId);
    }
  }, [currentProjectId, loadProjectData]);
  
  // ============================================================================
  // Context Value
  // ============================================================================
  
  const value: ELSContextValue = {
    currentProject: project,
    currentProjectId,
    setCurrentProject: setCurrentProjectId,
    project,
    content,
    analysis,
    design,
    isLoading,
    isSaving,
    error,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    startPhase,
    completePhase,
    uploadContent,
    deleteContent,
    refreshData,
    canEdit,
    canPublish,
    canDelete,
  };
  
  return (
    <ELSContext.Provider value={value}>
      {children}
    </ELSContext.Provider>
  );
}

export default ELSContext;
