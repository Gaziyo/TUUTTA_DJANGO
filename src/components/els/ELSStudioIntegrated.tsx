/**
 * ELS Studio - Integrated Version
 * 
 * This is the refactored version of ELS Studio that uses real Firebase data
 * instead of mock data. It uses the ELS Context for state management.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow, isSameDay, subDays } from 'date-fns';
import {
  Upload, Search, Pencil, Sparkles, Rocket, BarChart3,
  UserCog, Users, Shield, Check, ChevronRight, Plus,
  FileText, FileType, Music, Video, X, Loader2, Eye,
  Building, GraduationCap, AlertCircle, CheckCircle2,
  BookOpen, GripVertical, ChevronDown, Clock,
  TrendingUp, Target,
  FolderOpen,
  Settings, PanelLeft, Play, Trash2
} from 'lucide-react';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

// Utilities & Context
import { cn } from '@/lib/utils';
import { useELS } from '@/context/ELSContext';
import { useLMSStore } from '@/store/lmsStore';
import { useToast } from '@/hooks/use-toast';
import { elsAnalysisService, elsDesignService, elsAIGenerationService, elsImplementationService, elsAnalyticsService, elsGovernanceService } from '@/services/els';
import type {
  ELSPhase,
  ELSSkillGap,
  ELSLearningObjective,
  ELSCourseDesign,
  ELSAIGeneration,
  ELSGenerationItem,
  ELSImplementation,
  ELSEnrollmentRule,
  ELSAnalytics,
  ELSGovernance,
  ELSAuditLogEntry
} from '@/types/els';

// ============================================
// STAGE CONFIGURATION
// ============================================
const STAGES = [
  { id: 1, key: 'ingest' as ELSPhase, short: 'Ingest', title: 'Content Ingestion', description: 'Upload policies, SOPs, manuals, and training media.', icon: Upload, color: 'blue' },
  { id: 2, key: 'analyze' as ELSPhase, short: 'Analyze', title: 'Needs Analysis', description: 'Map learner needs, skill gaps, compliance requirements.', icon: Search, color: 'purple' },
  { id: 3, key: 'design' as ELSPhase, short: 'Design', title: 'Course Design', description: 'Define course blueprint, outcomes, sequencing.', icon: Pencil, color: 'amber' },
  { id: 4, key: 'develop' as ELSPhase, short: 'Develop', title: 'AI Development', description: 'Generate lessons, multimedia, AI assessments.', icon: Sparkles, color: 'emerald' },
  { id: 5, key: 'implement' as ELSPhase, short: 'Implement', title: 'Implementation', description: 'Assign cohorts, schedule deadlines, activate tutors.', icon: Rocket, color: 'orange' },
  { id: 6, key: 'evaluate' as ELSPhase, short: 'Evaluate', title: 'Evaluation', description: 'Track completion, scores, engagement, feedback.', icon: BarChart3, color: 'cyan' },
  { id: 7, key: 'personalize' as ELSPhase, short: 'Personalize', title: 'Personalization', description: 'Adapt learning paths, recommend refreshers.', icon: UserCog, color: 'pink' },
  { id: 8, key: 'portal' as ELSPhase, short: 'Portal', title: 'Manager Portal', description: 'Dashboards, alerts, compliance reports.', icon: Users, color: 'indigo' },
  { id: 9, key: 'govern' as ELSPhase, short: 'Governance', title: 'Governance', description: 'Model audits, security, privacy monitoring.', icon: Shield, color: 'slate' },
];

// ============================================
// ANIMATION COMPONENTS
// ============================================
const ScrollReveal = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay, duration: 0.5 }} className={className}>
    {children}
  </motion.div>
);

// ============================================
// SIDEBAR COMPONENT
// ============================================
interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  currentPhase: ELSPhase;
  onPhaseChange: (phase: ELSPhase) => void;
  projectName: string;
}

function Sidebar({ open, onToggle, currentPhase, onPhaseChange, projectName }: SidebarProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />
      )}
      
      <motion.aside
        initial={false}
        animate={{ width: open ? 280 : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 bg-card border-r overflow-hidden',
          'flex flex-col'
        )}
      >
        {open && (
          <>
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-bold text-lg truncate">{projectName || 'ELS Studio'}</h1>
                    <p className="text-xs text-muted-foreground">Enterprise Learning</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onToggle} className="lg:hidden">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Pipeline Stages */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">Pipeline</p>
              <div className="space-y-1">
                {STAGES.map((stage) => {
                  const isActive = currentPhase === stage.key;
                  const Icon = stage.icon;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => onPhaseChange(stage.key)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isActive ? 'bg-white/20' : 'bg-muted'
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{stage.short}</p>
                        <p className="text-xs opacity-70 truncate">{stage.title}</p>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t space-y-2">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors text-left">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </button>
            </div>
          </>
        )}
      </motion.aside>
    </>
  );
}

// ============================================
// PHASE 1: CONTENT INGESTION
// ============================================
function Phase1Ingestion() {
  const { content, uploadContent, deleteContent, canEdit, isSaving } = useELS();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({ nlp: true, ocr: true, tagging: true });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const processingOptions = [
    { id: 'nlp', label: 'NLP Extraction', description: 'Extract text and structure using NLP' },
    { id: 'ocr', label: 'OCR for Scanned Docs', description: 'Convert scanned documents to text' },
    { id: 'tagging', label: 'Topic Tagging', description: 'Auto-generate tags and metadata' },
  ];

  const fileTypes = [
    { type: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-500', bgColor: 'bg-red-50' },
    { type: 'doc', label: 'Word', icon: FileType, color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { type: 'ppt', label: 'PowerPoint', icon: FileType, color: 'text-orange-500', bgColor: 'bg-orange-50' },
    { type: 'audio', label: 'Audio', icon: Music, color: 'text-purple-500', bgColor: 'bg-purple-50' },
    { type: 'video', label: 'Video', icon: Video, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
  ];

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !canEdit) return;
    
    for (const file of Array.from(files)) {
      await uploadContent(file, selectedOptions);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => fileTypes.find(ft => type.includes(ft.type)) || fileTypes[0];

  return (
    <div className="space-y-6">
      {/* AI Processing Options */}
      <ScrollReveal>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Processing Options
            </CardTitle>
            <CardDescription>Configure how uploaded content is processed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {processingOptions.map((option) => (
                <div
                  key={option.id}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer',
                    selectedOptions[option.id as keyof typeof selectedOptions]
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  )}
                  onClick={() => canEdit && setSelectedOptions(prev => ({ ...prev, [option.id]: !prev[option.id as keyof typeof prev] }))}
                >
                  <Switch
                    checked={selectedOptions[option.id as keyof typeof selectedOptions]}
                    onCheckedChange={(checked) => canEdit && setSelectedOptions(prev => ({ ...prev, [option.id]: checked }))}
                  />
                  <div className="flex-1">
                    <Label className="font-medium cursor-pointer">{option.label}</Label>
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Upload Zone */}
      <ScrollReveal>
        <Card>
          <CardContent className="p-8">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <div
              className={cn(
                'border-2 border-dashed rounded-2xl p-12 text-center transition-all',
                isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
                !canEdit && 'opacity-50 pointer-events-none'
              )}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileSelect(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Drag & drop files here</h3>
              <p className="text-muted-foreground mb-6">or click to browse from your computer</p>
              <Button
                size="lg"
                className="rounded-full px-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canEdit || isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Browse Files
              </Button>
            </div>
            <div className="mt-8">
              <p className="text-sm font-medium text-muted-foreground mb-4">Supported formats</p>
              <div className="flex flex-wrap gap-3">
                {fileTypes.map((ft) => (
                  <div key={ft.type} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border', ft.bgColor)}>
                    <ft.icon className={cn('w-4 h-4', ft.color)} />
                    <span className={cn('text-sm font-medium', ft.color)}>{ft.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* File List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Uploaded Files ({content.length})</h2>
        </div>
        <div className="grid gap-3">
          {content.length === 0 ? (
            <Card className="p-8 text-center">
              <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No files uploaded yet</p>
              <p className="text-sm text-muted-foreground mt-1">Upload files to get started</p>
            </Card>
          ) : (
            content.map((file) => {
              const fileType = getFileIcon(file.type);
              return (
                <Card key={file.id} className="border-l-4" style={{ borderLeftColor: file.status === 'completed' ? '#10b981' : file.status === 'processing' ? '#f59e0b' : '#6b7280' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', fileType.bgColor)}>
                        <fileType.icon className={cn('w-6 h-6', fileType.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{file.name}</p>
                          {file.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(file.uploadedAt, { addSuffix: true })}</span>
                          {file.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex gap-1">
                                {file.tags.slice(0, 3).map((tag, i) => (<Badge key={i} variant="outline" className="text-xs">{tag}</Badge>))}
                              </div>
                            </>
                          )}
                        </div>
                        {file.status !== 'completed' && (
                          <div className="mt-3 flex items-center gap-3">
                            <Progress value={file.progress} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-10 font-medium">{file.progress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="rounded-full" disabled={!canEdit}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full text-destructive"
                          onClick={() => deleteContent(file.id)}
                          disabled={!canEdit || isSaving}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PHASE 2: ANALYZE
// ============================================
function Phase2Analyze() {
  const { analysis, content, project, canEdit, completePhase } = useELS();
  const { toast } = useToast();
  const {
    currentOrg,
    members,
    departments,
    loadMembers,
    loadDepartments
  } = useLMSStore();
  const [activeTab, setActiveTab] = useState('profiles');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'mixed'>('mixed');
  const [savingAudience, setSavingAudience] = useState(false);
  const [savingGap, setSavingGap] = useState(false);
  const [savingObjective, setSavingObjective] = useState(false);
  const [savingCompliance, setSavingCompliance] = useState(false);
  const [gapDraft, setGapDraft] = useState({
    skillName: '',
    category: '',
    currentLevel: 40,
    targetLevel: 80,
    priority: 'medium' as ELSSkillGap['priority']
  });
  const [complianceDraft, setComplianceDraft] = useState({
    name: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    deadline: '',
    regulationRef: '',
    applicableRoles: [] as string[],
    applicableDepartments: [] as string[]
  });
  const [objectiveDraft, setObjectiveDraft] = useState({
    description: '',
    taxonomy: 'understand' as ELSLearningObjective['taxonomy'],
    measurable: true
  });
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    if (members.length === 0) {
      void loadMembers();
    }
    if (departments.length === 0) {
      void loadDepartments();
    }
  }, [currentOrg, departments.length, loadDepartments, loadMembers, members.length]);

  useEffect(() => {
    if (!analysis?.targetAudience) return;
    setSelectedDepartments(analysis.targetAudience.departments || []);
    setSelectedRoles(analysis.targetAudience.roles || []);
    setSelectedUsers(analysis.targetAudience.individualUsers || []);
    setExperienceLevel(analysis.targetAudience.experienceLevel || 'mixed');
  }, [analysis?.id, analysis?.targetAudience]);

  const roleOptions = useMemo(() => {
    const roles = members.map(member => member.role).filter(Boolean);
    return Array.from(new Set(roles));
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const deptMatch = selectedDepartments.length === 0 || (member.departmentId && selectedDepartments.includes(member.departmentId));
      const roleMatch = selectedRoles.length === 0 || selectedRoles.includes(member.role);
      return deptMatch && roleMatch;
    });
  }, [members, selectedDepartments, selectedRoles]);

  const estimatedLearners = selectedUsers.length > 0 ? selectedUsers.length : filteredMembers.length;

  const ensureAnalysis = async () => {
    if (!currentOrg?.id || !project?.id) {
      throw new Error('Organization or project not available.');
    }
    if (analysis) return analysis;
    return elsAnalysisService.create(currentOrg.id, project.id, {});
  };

  const handleSaveAudience = async () => {
    if (!canEdit) return;
    setSavingAudience(true);
    try {
      const currentAnalysis = await ensureAnalysis();
      await elsAnalysisService.updateTargetAudience(currentOrg!.id, currentAnalysis.id, {
        departments: selectedDepartments,
        roles: selectedRoles,
        teams: [],
        individualUsers: selectedUsers,
        experienceLevel,
        estimatedLearners
      });
      toast({ title: 'Target audience saved', description: 'Audience details updated.' });
    } catch (error) {
      toast({ title: 'Unable to save audience', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSavingAudience(false);
    }
  };

  const handleAddSkillGap = async () => {
    if (!canEdit) return;
    if (!gapDraft.skillName.trim()) {
      toast({ title: 'Skill name required', description: 'Add a skill name to continue.', variant: 'destructive' });
      return;
    }
    setSavingGap(true);
    try {
      const currentAnalysis = await ensureAnalysis();
      const currentLevel = Math.max(0, Math.min(100, gapDraft.currentLevel));
      const targetLevel = Math.max(0, Math.min(100, gapDraft.targetLevel));
      await elsAnalysisService.addSkillGap(currentOrg!.id, currentAnalysis.id, {
        skillName: gapDraft.skillName.trim(),
        category: gapDraft.category.trim() || 'General',
        currentLevel,
        targetLevel,
        gap: Math.max(0, targetLevel - currentLevel),
        priority: gapDraft.priority,
        affectedDepartments: selectedDepartments,
        affectedUsers: selectedUsers
      });
      setGapDraft({ skillName: '', category: '', currentLevel: 40, targetLevel: 80, priority: 'medium' });
      toast({ title: 'Skill gap saved', description: 'Gap added to analysis.' });
    } catch (error) {
      toast({ title: 'Unable to save skill gap', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSavingGap(false);
    }
  };

  const handleGenerateObjectives = async () => {
    if (!canEdit) return;
    setSavingObjective(true);
    try {
      const currentAnalysis = await ensureAnalysis();
      const contentIds = content.map(item => item.id);
      if (contentIds.length === 0) {
        throw new Error('Upload at least one source before generating objectives.');
      }
      await elsAnalysisService.generateObjectives(currentOrg!.id, currentAnalysis.id, contentIds);
      toast({ title: 'Objectives generated', description: 'Draft objectives added.' });
    } catch (error) {
      toast({ title: 'Unable to generate objectives', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSavingObjective(false);
    }
  };

  const handleAddCompliance = async () => {
    if (!canEdit) return;
    if (!complianceDraft.name.trim()) {
      toast({ title: 'Name required', description: 'Add a compliance name to continue.', variant: 'destructive' });
      return;
    }
    setSavingCompliance(true);
    try {
      const currentAnalysis = await ensureAnalysis();
      await elsAnalysisService.addComplianceRequirement(currentOrg!.id, currentAnalysis.id, {
        name: complianceDraft.name.trim(),
        description: complianceDraft.description.trim(),
        priority: complianceDraft.priority,
        deadline: complianceDraft.deadline ? new Date(complianceDraft.deadline).getTime() : undefined,
        regulationRef: complianceDraft.regulationRef.trim() || undefined,
        applicableRoles: complianceDraft.applicableRoles,
        applicableDepartments: complianceDraft.applicableDepartments
      });
      setComplianceDraft({
        name: '',
        description: '',
        priority: 'medium',
        deadline: '',
        regulationRef: '',
        applicableRoles: [],
        applicableDepartments: []
      });
      toast({ title: 'Compliance saved', description: 'Compliance requirement added.' });
    } catch (error) {
      toast({ title: 'Unable to save compliance', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSavingCompliance(false);
    }
  };

  const handleRemoveCompliance = async (id: string) => {
    if (!canEdit) return;
    setSavingCompliance(true);
    try {
      const currentAnalysis = await ensureAnalysis();
      await elsAnalysisService.removeComplianceRequirement(currentOrg!.id, currentAnalysis.id, id);
    } catch (error) {
      toast({ title: 'Unable to remove compliance', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSavingCompliance(false);
    }
  };

  const handleCompleteAnalyze = async () => {
    if (!canEdit) return;
    if (!analysis) {
      toast({ title: 'Complete analysis first', description: 'Save at least one analysis section before completing.', variant: 'destructive' });
      return;
    }
    if (content.length === 0) {
      toast({ title: 'Upload content first', description: 'Ingest at least one file before completing Analyze.', variant: 'destructive' });
      return;
    }
    setIsCompleting(true);
    try {
      await completePhase('analyze');
      toast({ title: 'Analyze completed', description: 'Design phase is now unlocked.' });
    } catch (error) {
      toast({ title: 'Unable to complete Analyze', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleAddObjective = async () => {
    if (!canEdit) return;
    if (!objectiveDraft.description.trim()) {
      toast({ title: 'Objective required', description: 'Add an objective description.', variant: 'destructive' });
      return;
    }
    setSavingObjective(true);
    try {
      const currentAnalysis = await ensureAnalysis();
      await elsAnalysisService.addLearningObjective(currentOrg!.id, currentAnalysis.id, {
        description: objectiveDraft.description.trim(),
        taxonomy: objectiveDraft.taxonomy,
        measurable: objectiveDraft.measurable,
        linkedContentIds: content.map(item => item.id)
      });
      setObjectiveDraft({ description: '', taxonomy: 'understand', measurable: true });
      toast({ title: 'Objective saved', description: 'Objective added.' });
    } catch (error) {
      toast({ title: 'Unable to save objective', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSavingObjective(false);
    }
  };

  const tabs = [
    { id: 'profiles', label: 'Learner Profiles' },
    { id: 'gaps', label: 'Skill Gap Analysis' },
    { id: 'compliance', label: 'Compliance Mapping' },
    { id: 'objectives', label: 'Learning Objectives' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Target Learners', value: analysis?.targetAudience?.estimatedLearners || estimatedLearners || 0, icon: Users },
          { label: 'Departments', value: analysis?.targetAudience?.departments?.length || selectedDepartments.length || 0, icon: Building },
          { label: 'Skill Gaps', value: analysis?.skillGaps?.length || 0, icon: TrendingUp },
          { label: 'Compliance Items', value: analysis?.complianceRequirements?.length || 0, icon: CheckCircle2 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card>
        <div className="border-b">
          <div className="flex p-2 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                  activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-6">
          {activeTab === 'profiles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Target Audience</h3>
                <p className="text-sm text-muted-foreground mb-4">Select departments, roles, and individual users for this program.</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Departments</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {departments.map((dept) => (
                            <Button
                              key={dept.id}
                              type="button"
                              variant={selectedDepartments.includes(dept.id) ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                if (!canEdit) return;
                                setSelectedDepartments(prev =>
                                  prev.includes(dept.id) ? prev.filter(id => id !== dept.id) : [...prev, dept.id]
                                );
                              }}
                            >
                              {dept.name}
                            </Button>
                          ))}
                          {departments.length === 0 && (
                            <span className="text-xs text-muted-foreground">No departments found.</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Roles</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {roleOptions.map((role) => (
                            <Button
                              key={role}
                              type="button"
                              variant={selectedRoles.includes(role) ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                if (!canEdit) return;
                                setSelectedRoles(prev =>
                                  prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
                                );
                              }}
                            >
                              {role}
                            </Button>
                          ))}
                          {roleOptions.length === 0 && (
                            <span className="text-xs text-muted-foreground">No roles found.</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Experience Level</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {['beginner', 'intermediate', 'advanced', 'mixed'].map(level => (
                            <Button
                              key={level}
                              type="button"
                              variant={experienceLevel === level ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => canEdit && setExperienceLevel(level as typeof experienceLevel)}
                            >
                              {level}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Individual Users</Label>
                      <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                        {filteredMembers.map((member) => {
                          const memberId = member.userId || member.id;
                          const isSelected = selectedUsers.includes(memberId);
                          return (
                            <label key={member.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (!canEdit) return;
                                  setSelectedUsers(prev =>
                                    prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
                                  );
                                }}
                              />
                              <span className="flex-1 truncate">{member.name || member.email || memberId}</span>
                              <span className="text-xs text-muted-foreground">{member.role}</span>
                            </label>
                          );
                        })}
                        {filteredMembers.length === 0 && (
                          <p className="text-xs text-muted-foreground">No members match the filters.</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Estimated learners</span>
                        <span className="font-semibold">{estimatedLearners}</span>
                      </div>
                      <Button type="button" onClick={handleSaveAudience} disabled={!canEdit || savingAudience}>
                        {savingAudience ? 'Saving...' : 'Save Audience'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gaps' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Skill Gap Analysis</h3>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Skill Name</Label>
                      <input
                        value={gapDraft.skillName}
                        onChange={(event) => setGapDraft(prev => ({ ...prev, skillName: event.target.value }))}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="e.g. Data Privacy"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <input
                        value={gapDraft.category}
                        onChange={(event) => setGapDraft(prev => ({ ...prev, category: event.target.value }))}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Compliance"
                      />
                    </div>
                    <div>
                      <Label>Current Level</Label>
                      <input
                        type="number"
                        value={gapDraft.currentLevel}
                        onChange={(event) => setGapDraft(prev => ({ ...prev, currentLevel: Number(event.target.value) }))}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        min={0}
                        max={100}
                      />
                    </div>
                    <div>
                      <Label>Target Level</Label>
                      <input
                        type="number"
                        value={gapDraft.targetLevel}
                        onChange={(event) => setGapDraft(prev => ({ ...prev, targetLevel: Number(event.target.value) }))}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        min={0}
                        max={100}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {['low', 'medium', 'high'].map(level => (
                      <Button
                        key={level}
                        type="button"
                        variant={gapDraft.priority === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setGapDraft(prev => ({ ...prev, priority: level as ELSSkillGap['priority'] }))}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                  <Button type="button" onClick={handleAddSkillGap} disabled={!canEdit || savingGap}>
                    {savingGap ? 'Saving...' : 'Add Skill Gap'}
                  </Button>
                </CardContent>
              </Card>
              {analysis?.skillGaps && analysis.skillGaps.length > 0 ? (
                analysis.skillGaps.map((gap) => (
                  <Card key={gap.skillId}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{gap.skillName}</p>
                          <p className="text-sm text-muted-foreground">{gap.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">Gap: <span className="font-medium">{gap.gap}%</span></p>
                          <p className="text-xs text-muted-foreground">{gap.currentLevel}% → {gap.targetLevel}%</p>
                        </div>
                      </div>
                      <Progress value={gap.gap} className="h-2 mt-3" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No skill gaps defined yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Compliance Requirements</h3>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <input
                        value={complianceDraft.name}
                        onChange={(event) => setComplianceDraft(prev => ({ ...prev, name: event.target.value }))}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="e.g. GDPR Data Handling"
                      />
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <select
                        value={complianceDraft.priority}
                        onChange={(event) => setComplianceDraft(prev => ({ ...prev, priority: event.target.value as 'high' | 'medium' | 'low' }))}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <Label>Deadline</Label>
                      <input
                        type="date"
                        value={complianceDraft.deadline}
                        onChange={(event) => setComplianceDraft(prev => ({ ...prev, deadline: event.target.value }))}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <Label>Regulation Reference</Label>
                      <input
                        value={complianceDraft.regulationRef}
                        onChange={(event) => setComplianceDraft(prev => ({ ...prev, regulationRef: event.target.value }))}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="e.g. GDPR Art. 32"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <textarea
                      value={complianceDraft.description}
                      onChange={(event) => setComplianceDraft(prev => ({ ...prev, description: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      rows={3}
                      placeholder="Describe the compliance requirement"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Applicable Roles</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {roleOptions.map(role => (
                          <Button
                            key={role}
                            type="button"
                            size="sm"
                            variant={complianceDraft.applicableRoles.includes(role) ? 'default' : 'outline'}
                            onClick={() => {
                              setComplianceDraft(prev => ({
                                ...prev,
                                applicableRoles: prev.applicableRoles.includes(role)
                                  ? prev.applicableRoles.filter(r => r !== role)
                                  : [...prev.applicableRoles, role]
                              }));
                            }}
                          >
                            {role}
                          </Button>
                        ))}
                        {roleOptions.length === 0 && (
                          <span className="text-xs text-muted-foreground">No roles loaded</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Applicable Departments</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {departments.map(dept => (
                          <Button
                            key={dept.id}
                            type="button"
                            size="sm"
                            variant={complianceDraft.applicableDepartments.includes(dept.id) ? 'default' : 'outline'}
                            onClick={() => {
                              setComplianceDraft(prev => ({
                                ...prev,
                                applicableDepartments: prev.applicableDepartments.includes(dept.id)
                                  ? prev.applicableDepartments.filter(d => d !== dept.id)
                                  : [...prev.applicableDepartments, dept.id]
                              }));
                            }}
                          >
                            {dept.name}
                          </Button>
                        ))}
                        {departments.length === 0 && (
                          <span className="text-xs text-muted-foreground">No departments loaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button type="button" onClick={handleAddCompliance} disabled={!canEdit || savingCompliance}>
                    {savingCompliance ? 'Saving...' : 'Add Compliance Requirement'}
                  </Button>
                </CardContent>
              </Card>
              {analysis?.complianceRequirements && analysis.complianceRequirements.length > 0 ? (
                analysis.complianceRequirements.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{req.name}</p>
                            <Badge variant={req.priority === 'high' ? 'destructive' : 'secondary'}>
                              {req.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {req.deadline && (
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Deadline</p>
                              <p className="text-sm font-medium">{format(req.deadline, 'MMM d, yyyy')}</p>
                            </div>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveCompliance(req.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No compliance requirements defined yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'objectives' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Learning Objectives</h3>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <Label>Description</Label>
                    <input
                      value={objectiveDraft.description}
                      onChange={(event) => setObjectiveDraft(prev => ({ ...prev, description: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="e.g. Apply data handling procedures"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'].map(level => (
                      <Button
                        key={level}
                        type="button"
                        variant={objectiveDraft.taxonomy === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setObjectiveDraft(prev => ({ ...prev, taxonomy: level as ELSLearningObjective['taxonomy'] }))}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={objectiveDraft.measurable}
                      onChange={(event) => setObjectiveDraft(prev => ({ ...prev, measurable: event.target.checked }))}
                    />
                    <span>Measurable</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleAddObjective} disabled={!canEdit || savingObjective}>
                      {savingObjective ? 'Saving...' : 'Add Objective'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleGenerateObjectives} disabled={!canEdit || savingObjective}>
                      Generate Objectives
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {analysis?.learningObjectives && analysis.learningObjectives.length > 0 ? (
                analysis.learningObjectives.map((obj, index) => (
                  <Card key={obj.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{obj.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="capitalize">{obj.taxonomy}</Badge>
                            {obj.measurable && <Badge variant="outline">Measurable</Badge>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No learning objectives defined yet</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleCompleteAnalyze} disabled={!canEdit || isCompleting}>
          {isCompleting ? 'Completing...' : 'Complete Analyze'}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// PHASE 3: DESIGN
// ============================================
function Phase3Design() {
  const { design, project, analysis, canEdit } = useELS();
  const { toast } = useToast();
  const { currentOrg } = useLMSStore();
  const [activeTab, setActiveTab] = useState('structure');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(design?.title || '');
  const [description, setDescription] = useState(design?.description || '');
  const [estimatedDuration, setEstimatedDuration] = useState(design?.estimatedDuration || 60);
  const [difficulty, setDifficulty] = useState<ELSCourseDesign['difficulty']>(design?.difficulty || 'beginner');
  const [learningObjectiveIds, setLearningObjectiveIds] = useState<string[]>(design?.learningObjectiveIds || []);
  const [instructionalStrategies, setInstructionalStrategies] = useState(
    design?.instructionalStrategies || {
      practiceActivities: true,
      groupDiscussions: false,
      teachBackTasks: false,
      caseStudies: true,
      simulations: false
    }
  );
  const [adultLearningPrinciples, setAdultLearningPrinciples] = useState(
    design?.adultLearningPrinciples || {
      practicalRelevance: true,
      selfDirected: true,
      experiential: true,
      problemCentered: false
    }
  );
  const [taxonomyDistribution, setTaxonomyDistribution] = useState(
    design?.taxonomyDistribution || {
      remember: 10,
      understand: 20,
      apply: 30,
      analyze: 20,
      evaluate: 15,
      create: 5
    }
  );
  const [moduleDraft, setModuleDraft] = useState({ title: '', description: '' });
  const [unitDrafts, setUnitDrafts] = useState<Record<string, { title: string; duration: number; type: 'text' | 'video' | 'audio' | 'interactive' }>>({});

  useEffect(() => {
    if (!design) return;
    setTitle(design.title || '');
    setDescription(design.description || '');
    setEstimatedDuration(design.estimatedDuration || 0);
    setDifficulty(design.difficulty || 'beginner');
    setLearningObjectiveIds(design.learningObjectiveIds || []);
    setInstructionalStrategies(design.instructionalStrategies);
    setAdultLearningPrinciples(design.adultLearningPrinciples);
    setTaxonomyDistribution(design.taxonomyDistribution);
  }, [design]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const bloomTaxonomy = [
    { level: 'remember', label: 'Remember', color: 'bg-blue-500' },
    { level: 'understand', label: 'Understand', color: 'bg-cyan-500' },
    { level: 'apply', label: 'Apply', color: 'bg-emerald-500' },
    { level: 'analyze', label: 'Analyze', color: 'bg-amber-500' },
    { level: 'evaluate', label: 'Evaluate', color: 'bg-orange-500' },
    { level: 'create', label: 'Create', color: 'bg-red-500' },
  ];

  const ensureDesign = async () => {
    if (!currentOrg?.id || !project?.id || !analysis?.id) {
      throw new Error('Complete analysis before creating the design.');
    }
    if (design) return design;
    return elsDesignService.create(currentOrg.id, project.id, analysis.id, {});
  };

  const handleSaveDesign = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      const currentDesign = await ensureDesign();
      const payload: Partial<ELSCourseDesign> = {
        title: title.trim() || 'Untitled Course',
        description,
        estimatedDuration,
        difficulty,
        learningObjectiveIds,
        instructionalStrategies,
        adultLearningPrinciples,
        taxonomyDistribution
      };
      await elsDesignService.update(currentOrg!.id, currentDesign.id, payload);
      toast({ title: 'Design saved', description: 'Course blueprint updated.' });
    } catch (error) {
      toast({ title: 'Unable to save design', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddModule = async () => {
    if (!canEdit) return;
    if (!moduleDraft.title.trim()) {
      toast({ title: 'Module title required', description: 'Add a title to create a module.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const currentDesign = await ensureDesign();
      await elsDesignService.addModule(currentOrg!.id, currentDesign.id, {
        title: moduleDraft.title.trim(),
        description: moduleDraft.description.trim(),
        units: [],
        order: currentDesign.modules.length
      });
      setModuleDraft({ title: '', description: '' });
      toast({ title: 'Module added', description: 'Module saved to design.' });
    } catch (error) {
      toast({ title: 'Unable to add module', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUnit = async (moduleId: string) => {
    if (!canEdit) return;
    const draft = unitDrafts[moduleId];
    if (!draft?.title?.trim()) {
      toast({ title: 'Unit title required', description: 'Add a unit title.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const currentDesign = await ensureDesign();
      await elsDesignService.addUnit(currentOrg!.id, currentDesign.id, moduleId, {
        title: draft.title.trim(),
        content: '',
        type: draft.type,
        duration: draft.duration,
        order: currentDesign.modules.find(m => m.id === moduleId)?.units.length || 0
      });
      setUnitDrafts(prev => ({ ...prev, [moduleId]: { title: '', duration: 10, type: 'text' } }));
      toast({ title: 'Unit added', description: 'Unit added to module.' });
    } catch (error) {
      toast({ title: 'Unable to add unit', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {design ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="structure">Course Structure</TabsTrigger>
            <TabsTrigger value="outcomes">Learning Outcomes</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="principles">Adult Learning</TabsTrigger>
          </TabsList>

          <TabsContent value="structure" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Course Blueprint</CardTitle>
                <CardDescription>Modules and units structure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Course Title</Label>
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label>Estimated Duration (min)</Label>
                      <input
                        type="number"
                        value={estimatedDuration}
                        onChange={(event) => setEstimatedDuration(Number(event.target.value))}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        min={0}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[90px]"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <div className="mt-2 flex gap-2">
                        {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                          <Button
                            key={level}
                            type="button"
                            size="sm"
                            variant={difficulty === level ? 'default' : 'outline'}
                            onClick={() => canEdit && setDifficulty(level)}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button type="button" onClick={handleSaveDesign} disabled={!canEdit || isSaving}>
                        {isSaving ? 'Saving...' : 'Save Design'}
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{design.title}</p>
                        <p className="text-sm text-muted-foreground">{design.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {design.estimatedDuration} min</span>
                      <span className="capitalize">{design.difficulty}</span>
                      <span>{design.modules.length} modules</span>
                    </div>
                  </div>
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span className="font-medium">Add Module</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Module Title</Label>
                          <input
                            value={moduleDraft.title}
                            onChange={(event) => setModuleDraft(prev => ({ ...prev, title: event.target.value }))}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <Label>Module Description</Label>
                          <input
                            value={moduleDraft.description}
                            onChange={(event) => setModuleDraft(prev => ({ ...prev, description: event.target.value }))}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <Button type="button" onClick={handleAddModule} disabled={!canEdit || isSaving}>
                        Add Module
                      </Button>
                    </CardContent>
                  </Card>
                  <div className="space-y-2">
                    {design.modules.map((module, moduleIndex) => (
                      <div key={module.id} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleModule(module.id)}
                          className="w-full flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          {expandedModules.includes(module.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="font-medium">Module {moduleIndex + 1}</span>
                          <span className="flex-1 text-left">{module.title}</span>
                          <Badge variant="secondary">{module.units.length} units</Badge>
                        </button>
                        {expandedModules.includes(module.id) && (
                          <div className="p-3 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="md:col-span-2">
                                <Label className="text-xs">Unit Title</Label>
                                <input
                                  value={unitDrafts[module.id]?.title || ''}
                                  onChange={(event) => setUnitDrafts(prev => ({
                                    ...prev,
                                    [module.id]: { ...(prev[module.id] || { duration: 10, type: 'text' }), title: event.target.value }
                                  }))}
                                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Type</Label>
                                <select
                                  value={unitDrafts[module.id]?.type || 'text'}
                                  onChange={(event) => setUnitDrafts(prev => ({
                                    ...prev,
                                    [module.id]: { ...(prev[module.id] || { title: '', duration: 10 }), type: event.target.value as 'text' | 'video' | 'audio' | 'interactive' }
                                  }))}
                                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                  {['text', 'video', 'audio', 'interactive'].map(type => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <Label className="text-xs">Duration (min)</Label>
                                <input
                                  type="number"
                                  value={unitDrafts[module.id]?.duration || 10}
                                  onChange={(event) => setUnitDrafts(prev => ({
                                    ...prev,
                                    [module.id]: { ...(prev[module.id] || { title: '', type: 'text' }), duration: Number(event.target.value) }
                                  }))}
                                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  min={1}
                                />
                              </div>
                            </div>
                            <Button type="button" size="sm" onClick={() => handleAddUnit(module.id)} disabled={!canEdit || isSaving}>
                              Add Unit
                            </Button>
                            {module.units.map((unit) => (
                              <div key={unit.id} className="flex items-center gap-3 p-2 bg-card rounded border">
                                <GripVertical className="w-4 h-4 text-muted-foreground" />
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground w-12">{unit.duration} min</span>
                                <span className="text-sm">{unit.title}</span>
                                <Badge variant="outline" className="ml-auto text-xs capitalize">{unit.type}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outcomes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Outcomes</CardTitle>
                <CardDescription>Bloom's Taxonomy distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis?.learningObjectives?.length ? (
                    <div className="space-y-2">
                      {analysis.learningObjectives.map(obj => {
                        const checked = learningObjectiveIds.includes(obj.id);
                        return (
                          <label key={obj.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (!canEdit) return;
                                setLearningObjectiveIds(prev =>
                                  prev.includes(obj.id) ? prev.filter(id => id !== obj.id) : [...prev, obj.id]
                                );
                              }}
                            />
                            <span className="flex-1">{obj.description}</span>
                            <Badge variant="outline" className="capitalize">{obj.taxonomy}</Badge>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No learning objectives found. Create them in Analyze.</p>
                  )}
                  <Button type="button" onClick={handleSaveDesign} disabled={!canEdit || isSaving}>
                    {isSaving ? 'Saving...' : 'Save Outcomes'}
                  </Button>
                </div>
                <Separator className="my-6" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {bloomTaxonomy.map((level) => (
                    <div key={level.level} className={cn('p-3 rounded-lg text-center text-white', level.color)}>
                      <p className="font-medium text-sm">{level.label}</p>
                      <p className="text-2xl font-bold">{taxonomyDistribution[level.level as keyof typeof taxonomyDistribution]}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Instructional Strategies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(instructionalStrategies).map(([key, enabled]) => (
                    <div key={key} className={cn('flex items-start gap-3 p-4 rounded-lg border', enabled ? 'border-primary bg-primary/5' : 'border-border')}>
                      <Switch
                        checked={enabled}
                        disabled={!canEdit}
                        onCheckedChange={(checked) => setInstructionalStrategies(prev => ({ ...prev, [key]: checked }))}
                      />
                      <div className="flex-1">
                        <Label className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                        <p className="text-sm text-muted-foreground">
                          {enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                      {enabled && <CheckCircle2 className="w-5 h-5 text-primary" />}
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button type="button" onClick={handleSaveDesign} disabled={!canEdit || isSaving}>
                    {isSaving ? 'Saving...' : 'Save Strategies'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="principles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Adult Learning Principles</CardTitle>
                <CardDescription>Malcolm Knowles' andragogy principles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(adultLearningPrinciples).map(([key, enabled]) => (
                    <div key={key} className={cn('flex items-start gap-4 p-4 rounded-lg border', enabled ? 'border-primary bg-primary/5' : 'border-border')}>
                      <Switch
                        checked={enabled}
                        disabled={!canEdit}
                        onCheckedChange={(checked) => setAdultLearningPrinciples(prev => ({ ...prev, [key]: checked }))}
                      />
                      <div className="flex-1">
                        <Label className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                      </div>
                      {enabled && <CheckCircle2 className="w-5 h-5 text-primary" />}
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button type="button" onClick={handleSaveDesign} disabled={!canEdit || isSaving}>
                    {isSaving ? 'Saving...' : 'Save Principles'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="p-12 text-center">
          <Pencil className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Course Design Yet</h3>
          <p className="text-muted-foreground">Create a design blueprint once analysis is ready.</p>
          <Button
            className="mt-4"
            disabled={!analysis || !canEdit || isSaving}
            onClick={handleSaveDesign}
          >
            {analysis ? (isSaving ? 'Creating...' : 'Create Design') : 'Complete Analysis First'}
          </Button>
        </Card>
      )}
    </div>
  );
}

// ============================================
// PHASE 4: DEVELOP (AI Generation)
// ============================================
function Phase4Develop() {
  const { project, design, analysis, content, canEdit } = useELS();
  const { currentOrg } = useLMSStore();
  const { toast } = useToast();
  const [generation, setGeneration] = useState<ELSAIGeneration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!currentOrg?.id || !project?.id || !design?.id) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        let record = await elsAIGenerationService.getByProject(currentOrg.id, project.id);
        if (!record && canEdit) {
          record = await elsAIGenerationService.create(currentOrg.id, project.id, design.id);
        }
        if (cancelled) return;
        setGeneration(record ?? null);
        unsub = elsAIGenerationService.subscribeByProject(currentOrg.id, project.id, (data) => {
          setGeneration(data ?? null);
        });
      } catch (error) {
        if (cancelled) return;
        toast({
          title: 'Unable to load AI generation',
          description: (error as Error).message,
          variant: 'destructive'
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [canEdit, currentOrg?.id, design?.id, project?.id, toast]);

  const buildPrompt = (type: ELSGenerationItem['type']) => {
    const objectives = analysis?.learningObjectives?.map(obj => `- ${obj.description}`).join('\n') || 'No objectives yet.';
    const sourceNames = content.map(item => item.name).join(', ') || 'No sources uploaded.';
    return `Course: ${design?.title}\nDescription: ${design?.description}\n\nObjectives:\n${objectives}\n\nSources: ${sourceNames}\n\nGenerate ${type} content that aligns to the objectives.`;
  };

  const handleGenerate = async (type: ELSGenerationItem['type']) => {
    if (!generation || !currentOrg?.id || !design?.id || !canEdit) return;
    setIsGenerating(prev => ({ ...prev, [type]: true }));
    try {
      await elsAIGenerationService.generateContent(
        currentOrg.id,
        generation.id,
        type,
        buildPrompt(type),
        { designId: design.id }
      );
      toast({ title: 'Generation started', description: `${type} generation queued.` });
    } catch (error) {
      toast({ title: 'Generation failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsGenerating(prev => ({ ...prev, [type]: false }));
    }
  };

  const items = useMemo(() => {
    if (!generation?.generations?.length) return [];
    return [...generation.generations].sort((a, b) => b.createdAt - a.createdAt);
  }, [generation?.generations]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Development</CardTitle>
          <CardDescription>Generate lesson content, slides, audio scripts, and interactive outlines.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(['lesson', 'slides', 'audio', 'interactive', 'video_script'] as ELSGenerationItem['type'][]).map(type => (
              <Button
                key={type}
                onClick={() => handleGenerate(type)}
                disabled={!canEdit || isGenerating[type] || !design || !generation}
              >
                {isGenerating[type] ? 'Generating...' : `Generate ${type.replace('_', ' ')}`}
              </Button>
            ))}
          </div>
          {!design && (
            <Alert className="mt-4">
              <AlertDescription>Complete Phase 3 (Design) before generating content.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generation Outputs</CardTitle>
          <CardDescription>Latest AI outputs for this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading generations…</p>}
          {!isLoading && items.length === 0 && (
            <p className="text-sm text-muted-foreground">No generations yet.</p>
          )}
          {items.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{item.type.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.status} · {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                  {item.status === 'completed' && <Badge variant="secondary">Completed</Badge>}
                  {item.status === 'generating' && <Badge variant="outline">Generating</Badge>}
                  {item.status === 'error' && <Badge variant="destructive">Error</Badge>}
                </div>
                {item.output && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                    {item.output.slice(0, 1200)}
                    {item.output.length > 1200 ? '…' : ''}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// PHASE 5: IMPLEMENT
// ============================================
function Phase5Implement() {
  const { project, design, canEdit } = useELS();
  const { currentOrg, members, departments, teams, bulkEnroll } = useLMSStore();
  const { toast } = useToast();
  const [implementation, setImplementation] = useState<ELSImplementation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [enrollmentDeadline, setEnrollmentDeadline] = useState('');
  const [selfEnrollment, setSelfEnrollment] = useState(false);
  const [allowLateEnrollment, setAllowLateEnrollment] = useState(true);
  const [notifications, setNotifications] = useState({
    enrollmentNotification: true,
    reminderDays: [7, 3, 1],
    completionNotification: true,
    overdueAlerts: true,
    managerNotifications: true
  });
  const [reminderDaysInput, setReminderDaysInput] = useState('7, 3, 1');
  const [assignedTutors, setAssignedTutors] = useState<string[]>([]);
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [launchPreview, setLaunchPreview] = useState<{
    total: number;
    totalMatched: number;
    byRule: Array<{
      rule: ELSEnrollmentRule;
      count: number;
      matchedCount: number;
      duplicateCount: number;
      sampleNames: string[];
    }>;
    uniqueMembers: Array<{ id: string; name: string; email?: string; role?: string; department?: string; team?: string }>;
  } | null>(null);
  const [showFullList, setShowFullList] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(10);
  const [ruleDraft, setRuleDraft] = useState<{
    type: ELSEnrollmentRule['type'];
    targetId: string;
    targetName: string;
    priority: ELSEnrollmentRule['priority'];
    autoEnroll: boolean;
    dueDate: string;
  }>({
    type: 'department',
    targetId: '',
    targetName: '',
    priority: 'required',
    autoEnroll: true,
    dueDate: ''
  });

  const memberOptions = useMemo(() => {
    return members.map(member => ({
      id: member.id,
      name: member.name || member.email || member.userId || member.id
    }));
  }, [members]);

  const roleOptions = useMemo(() => {
    return Array.from(new Set(members.map(member => member.role))).sort();
  }, [members]);

  const targetOptions = useMemo(() => {
    switch (ruleDraft.type) {
      case 'role':
        return roleOptions.map(role => ({ id: role, name: role }));
      case 'department':
        return departments.map(dept => ({ id: dept.id, name: dept.name }));
      case 'team':
        return teams.map(team => ({ id: team.id, name: team.name }));
      case 'individual':
        return memberOptions;
      case 'all':
        return [{ id: 'all', name: 'All learners' }];
      default:
        return [];
    }
  }, [departments, memberOptions, roleOptions, ruleDraft.type, teams]);

  useEffect(() => {
    if (!currentOrg?.id || !project?.id) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        let record = await elsImplementationService.getByProject(currentOrg.id, project.id);
        if (!record && canEdit && design?.id) {
          record = await elsImplementationService.create(currentOrg.id, project.id, design.id, {});
        }
        if (cancelled) return;
        setImplementation(record ?? null);
        unsub = elsImplementationService.subscribeByProject(currentOrg.id, project.id, (data) => {
          setImplementation(data ?? null);
        });
      } catch (error) {
        if (cancelled) return;
        toast({
          title: 'Unable to load implementation',
          description: (error as Error).message,
          variant: 'destructive'
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [canEdit, currentOrg?.id, design?.id, project?.id, toast]);

  useEffect(() => {
    if (!implementation) return;
    setStartDate(implementation.schedule.startDate ? format(implementation.schedule.startDate, 'yyyy-MM-dd') : '');
    setEndDate(implementation.schedule.endDate ? format(implementation.schedule.endDate, 'yyyy-MM-dd') : '');
    setEnrollmentDeadline(implementation.schedule.enrollmentDeadline ? format(implementation.schedule.enrollmentDeadline, 'yyyy-MM-dd') : '');
    setSelfEnrollment(implementation.schedule.selfEnrollment);
    setAllowLateEnrollment(implementation.schedule.allowLateEnrollment);
    setNotifications(implementation.notifications);
    setReminderDaysInput(implementation.notifications.reminderDays.join(', '));
    setAssignedTutors(implementation.assignedTutors || []);
  }, [implementation]);

  const handleSaveImplementation = async () => {
    if (!implementation || !currentOrg?.id) return;
    setIsSaving(true);
    try {
      const reminderDays = reminderDaysInput
        .split(',')
        .map(value => Number(value.trim()))
        .filter(value => Number.isFinite(value) && value >= 0);

      const schedule: ELSImplementation['schedule'] = {
        selfEnrollment,
        allowLateEnrollment
      };

      if (startDate) schedule.startDate = new Date(startDate).getTime();
      if (endDate) schedule.endDate = new Date(endDate).getTime();
      if (enrollmentDeadline) schedule.enrollmentDeadline = new Date(enrollmentDeadline).getTime();

      await elsImplementationService.update(currentOrg.id, implementation.id, {
        schedule,
        notifications: {
          ...notifications,
          reminderDays: reminderDays.length ? reminderDays : notifications.reminderDays
        },
        assignedTutors,
        courseId: project?.courseId || implementation.courseId
      });

      toast({ title: 'Implementation saved', description: 'Enrollment settings updated.' });
    } catch (error) {
      toast({ title: 'Save failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRule = async () => {
    if (!implementation || !currentOrg?.id) return;
    if (ruleDraft.type !== 'all' && !ruleDraft.targetId) {
      toast({ title: 'Select a target', description: 'Choose a valid target before adding rule.', variant: 'destructive' });
      return;
    }

    try {
      const target = ruleDraft.type === 'all'
        ? { id: 'all', name: 'All learners' }
        : targetOptions.find(option => option.id === ruleDraft.targetId);

      if (!target) {
        toast({ title: 'Select a target', description: 'Choose a valid target before adding rule.', variant: 'destructive' });
        return;
      }

      await elsImplementationService.addEnrollmentRule(currentOrg.id, implementation.id, {
        type: ruleDraft.type,
        targetId: target.id,
        targetName: target.name,
        priority: ruleDraft.priority,
        autoEnroll: ruleDraft.autoEnroll,
        dueDate: ruleDraft.dueDate ? new Date(ruleDraft.dueDate).getTime() : undefined
      });

      setRuleDraft(prev => ({ ...prev, targetId: '', targetName: '', dueDate: '' }));
    } catch (error) {
      toast({ title: 'Unable to add rule', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleRemoveRule = async (ruleId: string) => {
    if (!implementation || !currentOrg?.id) return;
    try {
      await elsImplementationService.removeEnrollmentRule(currentOrg.id, implementation.id, ruleId);
    } catch (error) {
      toast({ title: 'Unable to remove rule', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleStatusUpdate = async (action: 'activate' | 'pause') => {
    if (!implementation || !currentOrg?.id) return;
    try {
      if (action === 'activate') {
        await elsImplementationService.activate(currentOrg.id, implementation.id);
      } else {
        await elsImplementationService.pause(currentOrg.id, implementation.id);
      }
    } catch (error) {
      toast({ title: 'Status update failed', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const resolveTargetsForRule = useCallback((rule: ELSEnrollmentRule) => {
    const activeMembers = members.filter(member => member.status !== 'inactive');
    switch (rule.type) {
      case 'all':
        return activeMembers;
      case 'department':
        return activeMembers.filter(member => member.departmentId === rule.targetId);
      case 'team':
        return activeMembers.filter(member => member.teamId === rule.targetId);
      case 'role':
        return activeMembers.filter(member => member.role === rule.targetId);
      case 'individual':
        return activeMembers.filter(member => member.id === rule.targetId || member.userId === rule.targetId);
      default:
        return [];
    }
  }, [members]);

  const handleLaunchEnrollments = async () => {
    if (!implementation || !currentOrg?.id) return;
    if (!project?.courseId && !implementation.courseId) {
      toast({ title: 'Link a course first', description: 'Complete Phase 3 to create or link a course.', variant: 'destructive' });
      return;
    }

    const courseId = project?.courseId || implementation.courseId;
    if (!courseId) return;

    setIsSaving(true);
    try {
      let totalNewEnrollments = 0;
      const enrolledUserIds = new Set<string>();

      for (const rule of implementation.enrollmentRules) {
        const targets = resolveTargetsForRule(rule);
        const userIds = targets
          .map(member => member.id)
          .filter(id => !enrolledUserIds.has(id));

        if (userIds.length === 0) continue;

        const enrollments = await bulkEnroll(userIds, courseId, {
          dueDate: rule.dueDate,
          priority: rule.priority,
          role: 'student'
        });

        enrollments.forEach(enrollment => enrolledUserIds.add(enrollment.userId));
        totalNewEnrollments += enrollments.length;
      }

      await elsImplementationService.updateEnrollmentStats(currentOrg.id, implementation.id, {
        enrolledCount: implementation.enrollmentStats.enrolledCount + totalNewEnrollments,
        notStartedCount: implementation.enrollmentStats.notStartedCount + totalNewEnrollments
      });

      if (totalNewEnrollments === 0) {
        toast({ title: 'No new enrollments', description: 'All targets are already enrolled or no targets matched.' });
      } else {
        toast({ title: 'Enrollments launched', description: `${totalNewEnrollments} learners enrolled.` });
      }
    } catch (error) {
      toast({ title: 'Enrollment failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const buildEnrollmentPreview = useCallback(() => {
    if (!implementation) return null;
    const enrolledUserIds = new Set<string>();
    let totalMatched = 0;
    const byRule = implementation.enrollmentRules.map(rule => {
      const targets = resolveTargetsForRule(rule);
      totalMatched += targets.length;
      const uniqueTargets = targets.filter(member => {
        if (enrolledUserIds.has(member.id)) return false;
        enrolledUserIds.add(member.id);
        return true;
      });
      const duplicateCount = targets.length - uniqueTargets.length;
      const sampleNames = uniqueTargets.slice(0, 5).map(member => member.name || member.email || member.userId || member.id);
      return {
        rule,
        count: uniqueTargets.length,
        matchedCount: targets.length,
        duplicateCount,
        sampleNames
      };
    });
    const total = byRule.reduce((sum, entry) => sum + entry.count, 0);
    const uniqueMembers = members
      .filter(member => enrolledUserIds.has(member.id))
      .map(member => ({
        id: member.id,
        name: member.name || member.email || member.userId || member.id,
        email: member.email,
        role: member.role,
        department: departments.find(dept => dept.id === member.departmentId)?.name,
        team: teams.find(team => team.id === member.teamId)?.name
      }));

    return { total, totalMatched, byRule, uniqueMembers };
  }, [implementation, members, departments, teams, resolveTargetsForRule]);

  const handleExportCsv = () => {
    if (!launchPreview) return;
    const header = ['User ID', 'Name', 'Email', 'Role', 'Department', 'Team'];
    const rows = launchPreview.uniqueMembers.map(member => ([
      member.id,
      member.name,
      member.email ?? '',
      member.role ?? '',
      member.department ?? '',
      member.team ?? ''
    ]));
    const csv = [header, ...rows]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `els-enrollment-preview-${project?.name?.replace(/\s+/g, '-') || 'project'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const pagedMembers = useMemo(() => {
    if (!launchPreview) return [];
    const start = (previewPage - 1) * previewPageSize;
    return launchPreview.uniqueMembers.slice(start, start + previewPageSize);
  }, [launchPreview, previewPage, previewPageSize]);

  const totalPages = launchPreview ? Math.max(1, Math.ceil(launchPreview.uniqueMembers.length / previewPageSize)) : 1;

  if (!design) {
    return (
      <Card className="p-12 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Design Required</h3>
        <p className="text-muted-foreground">Complete Phase 3 (Design) before implementation planning.</p>
      </Card>
    );
  }

  if (isLoading && !implementation) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!implementation) {
    return (
      <Card className="p-10 text-center">
        <Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Implementation Plan Yet</h3>
        <p className="text-muted-foreground">Create an implementation plan to configure enrollments and schedules.</p>
        <Button
          className="mt-4"
          disabled={!canEdit}
          onClick={async () => {
            if (!currentOrg?.id || !project?.id || !design?.id) return;
            const record = await elsImplementationService.create(currentOrg.id, project.id, design.id, {});
            setImplementation(record);
          }}
        >
          Create Implementation
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Implementation Overview</CardTitle>
              <CardDescription>Configure enrollment, scheduling, and tutor support.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">{implementation.status}</Badge>
              {canEdit && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusUpdate('activate')}
                    disabled={implementation.status === 'active'}
                  >
                    Activate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusUpdate('pause')}
                    disabled={implementation.status === 'paused'}
                  >
                    Pause
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Linked course</span>
            <span className="font-medium">{project?.courseId || implementation.courseId || 'Not linked'}</span>
          </div>
          {!project?.courseId && (
            <Alert>
              <AlertDescription>Link a course in Phase 3 to enable LMS enrollments.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment Rules</CardTitle>
          <CardDescription>Define who should be enrolled and when.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>Rule Type</Label>
              <select
                value={ruleDraft.type}
                onChange={(event) => setRuleDraft(prev => ({ ...prev, type: event.target.value as ELSEnrollmentRule['type'], targetId: '' }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              >
                {['department', 'team', 'role', 'individual', 'all'].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Target</Label>
              <select
                value={ruleDraft.targetId}
                onChange={(event) => {
                  const target = targetOptions.find(option => option.id === event.target.value);
                  setRuleDraft(prev => ({
                    ...prev,
                    targetId: event.target.value,
                    targetName: target?.name || ''
                  }));
                }}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit || ruleDraft.type === 'all'}
              >
                <option value="">{ruleDraft.type === 'all' ? 'All learners' : 'Select target'}</option>
                {targetOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Priority</Label>
              <select
                value={ruleDraft.priority}
                onChange={(event) => setRuleDraft(prev => ({ ...prev, priority: event.target.value as ELSEnrollmentRule['priority'] }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              >
                {['required', 'recommended', 'optional'].map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Due Date</Label>
              <input
                type="date"
                value={ruleDraft.dueDate}
                onChange={(event) => setRuleDraft(prev => ({ ...prev, dueDate: event.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ruleDraft.autoEnroll}
                onChange={(event) => setRuleDraft(prev => ({ ...prev, autoEnroll: event.target.checked }))}
                disabled={!canEdit}
              />
              Auto-enroll when active
            </label>
            <Button type="button" onClick={handleAddRule} disabled={!canEdit}>
              Add Rule
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            {implementation.enrollmentRules.length === 0 && (
              <p className="text-sm text-muted-foreground">No enrollment rules yet.</p>
            )}
            {implementation.enrollmentRules.map(rule => (
              <div key={rule.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <Badge variant="outline" className="capitalize">{rule.type}</Badge>
                <span className="font-medium">{rule.targetName}</span>
                <Badge variant="secondary" className="capitalize">{rule.priority}</Badge>
                {rule.dueDate && (
                  <span className="text-xs text-muted-foreground">Due {format(rule.dueDate, 'MMM d, yyyy')}</span>
                )}
                {rule.autoEnroll && <Badge variant="outline">Auto</Badge>}
                {canEdit && (
                  <Button variant="ghost" size="icon" className="ml-auto" onClick={() => handleRemoveRule(rule.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule & Notifications</CardTitle>
          <CardDescription>Configure rollout timing and alerts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Start Date</Label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Enrollment Deadline</Label>
              <input
                type="date"
                value={enrollmentDeadline}
                onChange={(event) => setEnrollmentDeadline(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={selfEnrollment} onCheckedChange={setSelfEnrollment} disabled={!canEdit} />
              <span>Allow self-enrollment</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={allowLateEnrollment} onCheckedChange={setAllowLateEnrollment} disabled={!canEdit} />
              <span>Allow late enrollment</span>
            </label>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={notifications.enrollmentNotification}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, enrollmentNotification: checked }))}
                disabled={!canEdit}
              />
              <span>Enrollment notification</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={notifications.completionNotification}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, completionNotification: checked }))}
                disabled={!canEdit}
              />
              <span>Completion notification</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={notifications.overdueAlerts}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, overdueAlerts: checked }))}
                disabled={!canEdit}
              />
              <span>Overdue alerts</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={notifications.managerNotifications}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, managerNotifications: checked }))}
                disabled={!canEdit}
              />
              <span>Manager notifications</span>
            </label>
          </div>

          <div className="max-w-sm">
            <Label>Reminder Days (comma separated)</Label>
            <input
              value={reminderDaysInput}
              onChange={(event) => setReminderDaysInput(event.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="7, 3, 1"
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tutor Assignment</CardTitle>
          <CardDescription>Assign tutors or facilitators to this program.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {memberOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">No members available.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {memberOptions.map(member => (
              <label key={member.id} className="flex items-center gap-2 text-sm rounded border p-2">
                <input
                  type="checkbox"
                  checked={assignedTutors.includes(member.id)}
                  onChange={(event) => {
                    setAssignedTutors(prev => (
                      event.target.checked
                        ? [...prev, member.id]
                        : prev.filter(id => id !== member.id)
                    ));
                  }}
                  disabled={!canEdit}
                />
                <span>{member.name}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment Snapshot</CardTitle>
          <CardDescription>Current enrollment status from implementation record.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            {[
              { label: 'Enrolled', value: implementation.enrollmentStats.enrolledCount },
              { label: 'In Progress', value: implementation.enrollmentStats.inProgressCount },
              { label: 'Completed', value: implementation.enrollmentStats.completedCount },
              { label: 'Not Started', value: implementation.enrollmentStats.notStartedCount },
              { label: 'Overdue', value: implementation.enrollmentStats.overdueCount }
            ].map(stat => (
              <div key={stat.label} className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSaveImplementation} disabled={!canEdit || isSaving}>
            {isSaving ? 'Saving...' : 'Save Implementation'}
          </Button>
          <Button
            onClick={() => {
              if (!project?.courseId && !implementation.courseId) {
                toast({ title: 'Link a course first', description: 'Complete Phase 3 to create or link a course.', variant: 'destructive' });
                return;
              }
              const preview = buildEnrollmentPreview();
              setLaunchPreview(preview);
              setShowLaunchConfirm(true);
            }}
            disabled={!canEdit || isSaving || implementation.enrollmentRules.length === 0}
          >
            {isSaving ? 'Launching...' : 'Launch Enrollments'}
          </Button>
        </div>
      </div>

      <Dialog open={showLaunchConfirm} onOpenChange={setShowLaunchConfirm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Enrollment Launch</DialogTitle>
            <DialogDescription>
              This will create real enrollments and trigger notifications for matching learners.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Total learners to enroll</p>
              <p className="text-2xl font-semibold">{launchPreview?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Matched {launchPreview?.totalMatched ?? 0} targets, filtered {Math.max((launchPreview?.totalMatched ?? 0) - (launchPreview?.total ?? 0), 0)} duplicates.
              </p>
            </div>
            <div className="flex justify-end">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewPage(1);
                    setShowFullList(prev => !prev);
                  }}
                  disabled={!launchPreview || (launchPreview?.total ?? 0) === 0}
                >
                  {showFullList ? 'Hide Full List' : 'Show Full List'}
                </Button>
                <Button variant="outline" onClick={handleExportCsv} disabled={!launchPreview || (launchPreview?.total ?? 0) === 0}>
                  Export CSV
                </Button>
              </div>
            </div>
            {showFullList && launchPreview && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Enrollments Preview</p>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Rows</Label>
                    <select
                      value={previewPageSize}
                      onChange={(event) => {
                        setPreviewPage(1);
                        setPreviewPageSize(Number(event.target.value));
                      }}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      {[10, 20, 50].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Role</th>
                        <th className="px-3 py-2 text-left">Department</th>
                        <th className="px-3 py-2 text-left">Team</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedMembers.map(member => (
                        <tr key={member.id} className="border-t">
                          <td className="px-3 py-2">{member.name}</td>
                          <td className="px-3 py-2">{member.email ?? '-'}</td>
                          <td className="px-3 py-2">{member.role ?? '-'}</td>
                          <td className="px-3 py-2">{member.department ?? '-'}</td>
                          <td className="px-3 py-2">{member.team ?? '-'}</td>
                        </tr>
                      ))}
                      {pagedMembers.length === 0 && (
                        <tr>
                          <td className="px-3 py-2 text-muted-foreground" colSpan={5}>No learners to display.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Showing {(previewPage - 1) * previewPageSize + 1}-
                    {Math.min(previewPage * previewPageSize, launchPreview.uniqueMembers.length)} of {launchPreview.uniqueMembers.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewPage(prev => Math.max(1, prev - 1))}
                      disabled={previewPage <= 1}
                    >
                      Prev
                    </Button>
                    <span>Page {previewPage} of {totalPages}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={previewPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {launchPreview?.byRule.map(entry => (
                <div key={entry.rule.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">{entry.rule.type}</Badge>
                    <span className="font-medium">{entry.rule.targetName}</span>
                    <Badge variant="secondary" className="capitalize">{entry.rule.priority}</Badge>
                    <span className="text-xs text-muted-foreground">{entry.count} learners</span>
                    {entry.duplicateCount > 0 && (
                      <Badge variant="outline">{entry.duplicateCount} duplicate{entry.duplicateCount === 1 ? '' : 's'} filtered</Badge>
                    )}
                  </div>
                  {entry.sampleNames.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Examples: {entry.sampleNames.join(', ')}{entry.count > entry.sampleNames.length ? ` +${entry.count - entry.sampleNames.length} more` : ''}
                    </p>
                  )}
                  {entry.count === 0 && (
                    <p className="text-xs text-muted-foreground">No matching learners for this rule.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLaunchConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setShowLaunchConfirm(false);
                await handleLaunchEnrollments();
              }}
              disabled={!canEdit || isSaving || (launchPreview?.total ?? 0) === 0}
            >
              Confirm & Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// PHASE 6: EVALUATE
// ============================================
function Phase6Evaluate() {
  const { project, canEdit } = useELS();
  const { currentOrg, enrollments, members, departments } = useLMSStore();
  const { toast } = useToast();
  const [implementation, setImplementation] = useState<ELSImplementation | null>(null);
  const [analytics, setAnalytics] = useState<ELSAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const courseId = project?.courseId || implementation?.courseId;

  useEffect(() => {
    if (!currentOrg?.id || !project?.id) return;
    let unsubImpl: (() => void) | null = null;
    let unsubAnalytics: (() => void) | null = null;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const impl = await elsImplementationService.getByProject(currentOrg.id, project.id);
        if (cancelled) return;
        setImplementation(impl ?? null);
        if (impl) {
          unsubImpl = elsImplementationService.subscribeByProject(currentOrg.id, project.id, (data) => {
            setImplementation(data ?? null);
          });
        }

        let record = await elsAnalyticsService.getByProject(currentOrg.id, project.id);
        if (!record && impl) {
          record = await elsAnalyticsService.create(currentOrg.id, project.id, impl.id, impl.courseId || project?.courseId);
        }
        if (cancelled) return;
        setAnalytics(record ?? null);
        if (record) {
          unsubAnalytics = elsAnalyticsService.subscribeByProject(currentOrg.id, project.id, (data) => {
            setAnalytics(data ?? null);
          });
        }
      } catch (error) {
        if (cancelled) return;
        toast({
          title: 'Unable to load analytics',
          description: (error as Error).message,
          variant: 'destructive'
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (unsubImpl) unsubImpl();
      if (unsubAnalytics) unsubAnalytics();
    };
  }, [currentOrg?.id, project?.courseId, project?.id, toast]);

  const courseEnrollments = useMemo(() => {
    if (!courseId) return [];
    return enrollments.filter(enrollment => enrollment.courseId === courseId);
  }, [courseId, enrollments]);

  const metrics = useMemo(() => {
    if (courseEnrollments.length === 0) {
      return {
        totalLearners: 0,
        activeLearners: 0,
        completionRate: 0,
        averageScore: 0,
        averageTimeToComplete: 0,
        dropoutRate: 0
      };
    }
    const completed = courseEnrollments.filter(e => e.status === 'completed');
    const inProgress = courseEnrollments.filter(e => e.status === 'in_progress');
    const notStarted = courseEnrollments.filter(e => e.status === 'not_started');
    const scores = completed.map(e => e.score || 0).filter(score => score > 0);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const completionTimes = completed
      .filter(e => e.startedAt && e.completedAt)
      .map(e => e.completedAt! - e.startedAt!);
    const averageTimeToComplete = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length / (1000 * 60)
      : 0;

    return {
      totalLearners: courseEnrollments.length,
      activeLearners: inProgress.length,
      completionRate: (completed.length / courseEnrollments.length) * 100,
      averageScore,
      averageTimeToComplete,
      dropoutRate: (notStarted.length / courseEnrollments.length) * 100
    };
  }, [courseEnrollments]);

  useEffect(() => {
    if (!analytics || !currentOrg?.id || courseEnrollments.length === 0) return;
    void elsAnalyticsService.updateMetrics(currentOrg.id, analytics.id, {
      totalLearners: metrics.totalLearners,
      activeLearners: metrics.activeLearners,
      completionRate: metrics.completionRate,
      averageScore: metrics.averageScore,
      averageTimeToComplete: metrics.averageTimeToComplete,
      dropoutRate: metrics.dropoutRate
    });
  }, [analytics, courseEnrollments.length, currentOrg?.id, metrics]);

  const completionTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => subDays(new Date(), 6 - index));
    return days.map(day => ({
      date: format(day, 'MMM d'),
      completions: courseEnrollments.filter(enrollment => enrollment.completedAt && isSameDay(enrollment.completedAt, day)).length
    }));
  }, [courseEnrollments]);

  const departmentStats = useMemo(() => {
    if (courseEnrollments.length === 0) return [];
    return departments.map(dept => {
      const deptMembers = members.filter(member => member.departmentId === dept.id);
      const deptEnrollments = courseEnrollments.filter(enrollment => deptMembers.some(member => member.id === enrollment.userId));
      const completed = deptEnrollments.filter(enrollment => enrollment.status === 'completed').length;
      return {
        id: dept.id,
        name: dept.name,
        enrolled: deptEnrollments.length,
        completionRate: deptEnrollments.length > 0 ? (completed / deptEnrollments.length) * 100 : 0
      };
    }).filter(stat => stat.enrolled > 0);
  }, [courseEnrollments, departments, members]);

  const recentCompletions = useMemo(() => {
    return [...courseEnrollments]
      .filter(enrollment => enrollment.completedAt)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, 5)
      .map(enrollment => {
        const member = members.find(m => m.id === enrollment.userId);
        return {
          id: enrollment.id,
          name: member?.name || member?.email || enrollment.userId,
          completedAt: enrollment.completedAt!
        };
      });
  }, [courseEnrollments, members]);

  if (!courseId) {
    return (
      <Card className="p-12 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Course Linked</h3>
        <p className="text-muted-foreground">Complete Phase 3 to create or link a course before evaluation.</p>
      </Card>
    );
  }

  if (isLoading && !analytics) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Learners', value: metrics.totalLearners.toString() },
          { label: 'Completion Rate', value: `${metrics.completionRate.toFixed(1)}%` },
          { label: 'Avg Score', value: `${metrics.averageScore.toFixed(1)}%` },
          { label: 'Avg Time to Complete', value: `${metrics.averageTimeToComplete.toFixed(0)} min` }
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completion Trend (Last 7 Days)</CardTitle>
          <CardDescription>Daily completions for this course.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-end gap-2">
            {completionTrend.map(day => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-primary/20 rounded-t" style={{ height: `${Math.max(day.completions * 12, 6)}px` }}>
                  <div className="w-full h-full bg-primary rounded-t opacity-80" />
                </div>
                <span className="text-xs text-muted-foreground">{day.date}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Department Breakdown</CardTitle>
            <CardDescription>Completion rate by department.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {departmentStats.length === 0 && (
              <p className="text-sm text-muted-foreground">No departmental enrollments yet.</p>
            )}
            {departmentStats.map(stat => (
              <div key={stat.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{stat.name}</span>
                  <span className="text-muted-foreground">{stat.enrolled} learners</span>
                </div>
                <Progress value={stat.completionRate} className="h-2" />
                <p className="text-xs text-muted-foreground">{stat.completionRate.toFixed(1)}% complete</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Completions</CardTitle>
            <CardDescription>Latest learners who completed the course.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCompletions.length === 0 && (
              <p className="text-sm text-muted-foreground">No completions yet.</p>
            )}
            {recentCompletions.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground">{formatDistanceToNow(item.completedAt, { addSuffix: true })}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// PHASE 7: PERSONALIZE
// ============================================
function Phase7Personalize() {
  const { project, canEdit } = useELS();
  const { currentOrg, enrollments } = useLMSStore();
  const { toast } = useToast();
  const [implementation, setImplementation] = useState<ELSImplementation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [personalisation, setPersonalisation] = useState({
    adaptivePacing: true,
    prerequisiteEnforcement: false,
    remedialPaths: true,
    advancedPaths: false
  });

  const courseId = project?.courseId || implementation?.courseId;

  useEffect(() => {
    if (!currentOrg?.id || !project?.id) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const impl = await elsImplementationService.getByProject(currentOrg.id, project.id);
        if (cancelled) return;
        setImplementation(impl ?? null);
        if (impl?.personalisation) {
          setPersonalisation(impl.personalisation);
        }
        if (impl) {
          unsub = elsImplementationService.subscribeByProject(currentOrg.id, project.id, (data) => {
            setImplementation(data ?? null);
            if (data?.personalisation) {
              setPersonalisation(data.personalisation);
            }
          });
        }
      } catch (error) {
        if (cancelled) return;
        toast({
          title: 'Unable to load personalization',
          description: (error as Error).message,
          variant: 'destructive'
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [currentOrg?.id, project?.id, toast]);

  const courseEnrollments = useMemo(() => {
    if (!courseId) return [];
    return enrollments.filter(enrollment => enrollment.courseId === courseId);
  }, [courseId, enrollments]);

  const progressBands = useMemo(() => {
    const bands = [
      { label: '0-25%', min: 0, max: 25, count: 0 },
      { label: '26-50%', min: 26, max: 50, count: 0 },
      { label: '51-75%', min: 51, max: 75, count: 0 },
      { label: '76-100%', min: 76, max: 100, count: 0 }
    ];
    courseEnrollments.forEach(enrollment => {
      const band = bands.find(b => enrollment.progress >= b.min && enrollment.progress <= b.max);
      if (band) band.count += 1;
    });
    return bands;
  }, [courseEnrollments]);

  const handleSavePersonalisation = async () => {
    if (!implementation || !currentOrg?.id) return;
    try {
      await elsImplementationService.update(currentOrg.id, implementation.id, {
        personalisation
      });
      toast({ title: 'Personalization saved', description: 'Adaptive settings updated.' });
    } catch (error) {
      toast({ title: 'Save failed', description: (error as Error).message, variant: 'destructive' });
    }
  };

  if (!courseId) {
    return (
      <Card className="p-12 text-center">
        <UserCog className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Course Linked</h3>
        <p className="text-muted-foreground">Link a course before configuring personalization.</p>
      </Card>
    );
  }

  if (isLoading && !implementation) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adaptive Settings</CardTitle>
          <CardDescription>Control how learners receive personalized content and pacing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'adaptivePacing', label: 'Adaptive pacing', description: 'Adjust pacing based on learner progress.' },
            { key: 'prerequisiteEnforcement', label: 'Prerequisite enforcement', description: 'Require completion of prerequisite modules.' },
            { key: 'remedialPaths', label: 'Remedial paths', description: 'Offer remediation for struggling learners.' },
            { key: 'advancedPaths', label: 'Advanced paths', description: 'Unlock advanced content for high performers.' }
          ].map(setting => (
            <div key={setting.key} className="flex items-start gap-3 p-4 rounded-lg border">
              <Switch
                checked={personalisation[setting.key as keyof typeof personalisation]}
                onCheckedChange={(checked) => setPersonalisation(prev => ({
                  ...prev,
                  [setting.key]: checked
                }))}
                disabled={!canEdit}
              />
              <div>
                <Label className="font-medium">{setting.label}</Label>
                <p className="text-sm text-muted-foreground">{setting.description}</p>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={handleSavePersonalisation} disabled={!canEdit || !implementation}>
              Save Personalization
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learner Progress Distribution</CardTitle>
          <CardDescription>See how learners are progressing through the course.</CardDescription>
        </CardHeader>
        <CardContent>
          {courseEnrollments.length === 0 && (
            <p className="text-sm text-muted-foreground">No enrollments yet.</p>
          )}
          {courseEnrollments.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {progressBands.map(band => (
                <div key={band.label} className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">{band.label}</p>
                  <p className="text-2xl font-semibold">{band.count}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// PHASE 8: PORTAL
// ============================================
function Phase8Portal() {
  const { project } = useELS();
  const { currentOrg, enrollments, members, departments } = useLMSStore();

  const courseId = project?.courseId;

  const courseEnrollments = useMemo(() => {
    if (!courseId) return [];
    return enrollments.filter(enrollment => enrollment.courseId === courseId);
  }, [courseId, enrollments]);

  const departmentStats = useMemo(() => {
    if (courseEnrollments.length === 0) return [];
    return departments.map(dept => {
      const deptMembers = members.filter(member => member.departmentId === dept.id);
      const deptEnrollments = courseEnrollments.filter(enrollment => deptMembers.some(member => member.id === enrollment.userId));
      const completed = deptEnrollments.filter(enrollment => enrollment.status === 'completed').length;
      const overdue = deptEnrollments.filter(enrollment => enrollment.status === 'overdue').length;
      return {
        id: dept.id,
        name: dept.name,
        enrolled: deptEnrollments.length,
        completed,
        overdue,
        completionRate: deptEnrollments.length > 0 ? (completed / deptEnrollments.length) * 100 : 0
      };
    }).filter(stat => stat.enrolled > 0);
  }, [courseEnrollments, departments, members]);

  const overdueAlerts = useMemo(() => {
    return courseEnrollments
      .filter(enrollment => enrollment.dueDate && enrollment.dueDate < Date.now() && enrollment.status !== 'completed')
      .slice(0, 5)
      .map(enrollment => {
        const member = members.find(m => m.id === enrollment.userId);
        const daysOverdue = Math.ceil((Date.now() - (enrollment.dueDate || Date.now())) / (1000 * 60 * 60 * 24));
        return {
          id: enrollment.id,
          name: member?.name || member?.email || enrollment.userId,
          daysOverdue
        };
      });
  }, [courseEnrollments, members]);

  if (!courseId) {
    return (
      <Card className="p-12 text-center">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Course Linked</h3>
        <p className="text-muted-foreground">Link a course to view the manager portal.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Department Completion Overview</CardTitle>
          <CardDescription>Enrollment and completion by department.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {departmentStats.length === 0 && (
            <p className="text-sm text-muted-foreground">No department enrollments yet.</p>
          )}
          {departmentStats.map(stat => (
            <div key={stat.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{stat.name}</p>
                  <p className="text-xs text-muted-foreground">{stat.enrolled} enrolled · {stat.completed} completed · {stat.overdue} overdue</p>
                </div>
                <Badge variant="secondary">{stat.completionRate.toFixed(1)}% complete</Badge>
              </div>
              <Progress value={stat.completionRate} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overdue Alerts</CardTitle>
          <CardDescription>Learners who are past due.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overdueAlerts.length === 0 && (
            <p className="text-sm text-muted-foreground">No overdue learners.</p>
          )}
          {overdueAlerts.map(alert => (
            <div key={alert.id} className="flex items-center justify-between text-sm">
              <span className="font-medium">{alert.name}</span>
              <Badge variant="destructive">{alert.daysOverdue} days overdue</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// PHASE 9: GOVERNANCE
// ============================================
function Phase9Governance() {
  const { project, canEdit } = useELS();
  const { currentOrg } = useLMSStore();
  const { toast } = useToast();
  const [governance, setGovernance] = useState<ELSGovernance | null>(null);
  const [auditLogs, setAuditLogs] = useState<ELSAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<ELSGovernance['privacySettings'] | null>(null);
  const [securitySettings, setSecuritySettings] = useState<ELSGovernance['securitySettings'] | null>(null);
  const [aiMonitoring, setAiMonitoring] = useState<ELSGovernance['aiMonitoring'] | null>(null);
  const [retentionPolicy, setRetentionPolicy] = useState<ELSGovernance['retentionPolicy'] | null>(null);

  useEffect(() => {
    if (!currentOrg?.id || !project?.id) return;
    let unsubGov: (() => void) | null = null;
    let unsubAudit: (() => void) | null = null;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        let record = await elsGovernanceService.getByProject(currentOrg.id, project.id);
        if (!record && canEdit) {
          record = await elsGovernanceService.create(currentOrg.id, project.id);
        }
        if (cancelled) return;
        setGovernance(record ?? null);
        if (record) {
          setPrivacySettings(record.privacySettings);
          setSecuritySettings(record.securitySettings);
          setAiMonitoring(record.aiMonitoring);
          setRetentionPolicy(record.retentionPolicy);
          unsubGov = elsGovernanceService.subscribeByProject(currentOrg.id, project.id, (data) => {
            setGovernance(data ?? null);
            if (data) {
              setPrivacySettings(data.privacySettings);
              setSecuritySettings(data.securitySettings);
              setAiMonitoring(data.aiMonitoring);
              setRetentionPolicy(data.retentionPolicy);
            }
          });
          unsubAudit = elsGovernanceService.subscribeToAuditLogs(currentOrg.id, project.id, (logs) => {
            setAuditLogs(logs.slice(0, 25));
          });
        }
      } catch (error) {
        if (cancelled) return;
        toast({
          title: 'Unable to load governance',
          description: (error as Error).message,
          variant: 'destructive'
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (unsubGov) unsubGov();
      if (unsubAudit) unsubAudit();
    };
  }, [canEdit, currentOrg?.id, project?.id, toast]);

  const handleSaveGovernance = async () => {
    if (!governance || !currentOrg?.id || !privacySettings || !securitySettings || !aiMonitoring || !retentionPolicy) return;
    setIsSaving(true);
    try {
      await elsGovernanceService.update(currentOrg.id, governance.id, {
        privacySettings,
        securitySettings,
        aiMonitoring,
        retentionPolicy
      });
      toast({ title: 'Governance saved', description: 'Settings updated successfully.' });
    } catch (error) {
      toast({ title: 'Save failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !governance) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!governance || !privacySettings || !securitySettings || !aiMonitoring || !retentionPolicy) {
    return (
      <Card className="p-12 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Governance Not Ready</h3>
        <p className="text-muted-foreground">Create governance settings to continue.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>Data retention and privacy controls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Data Retention (days)</Label>
              <input
                type="number"
                value={privacySettings.dataRetentionPeriod}
                onChange={(event) => setPrivacySettings(prev => prev ? ({ ...prev, dataRetentionPeriod: Number(event.target.value) }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Privacy Officer</Label>
              <input
                value={privacySettings.privacyOfficer || ''}
                onChange={(event) => setPrivacySettings(prev => prev ? ({ ...prev, privacyOfficer: event.target.value }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: 'anonymizeAfterCompletion', label: 'Anonymize after completion' },
              { key: 'allowDataExport', label: 'Allow data export' },
              { key: 'gdprCompliant', label: 'GDPR compliant' }
            ].map(setting => (
              <label key={setting.key} className="flex items-center gap-2 text-sm">
                <Switch
                  checked={privacySettings[setting.key as keyof typeof privacySettings]}
                  onCheckedChange={(checked) => setPrivacySettings(prev => prev ? ({ ...prev, [setting.key]: checked }) : prev)}
                  disabled={!canEdit}
                />
                <span>{setting.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Access and publishing safeguards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: 'requireApprovalForPublishing', label: 'Require approval for publishing' },
              { key: 'contentReviewRequired', label: 'Content review required' },
              { key: 'automaticArchiving', label: 'Automatic archiving' },
              { key: 'encryptionEnabled', label: 'Encryption enabled' },
              { key: 'accessLogEnabled', label: 'Access logging' }
            ].map(setting => (
              <label key={setting.key} className="flex items-center gap-2 text-sm">
                <Switch
                  checked={securitySettings[setting.key as keyof typeof securitySettings]}
                  onCheckedChange={(checked) => setSecuritySettings(prev => prev ? ({ ...prev, [setting.key]: checked }) : prev)}
                  disabled={!canEdit}
                />
                <span>{setting.label}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Archive After (days)</Label>
              <input
                type="number"
                value={securitySettings.archiveAfterDays}
                onChange={(event) => setSecuritySettings(prev => prev ? ({ ...prev, archiveAfterDays: Number(event.target.value) }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit || !securitySettings.automaticArchiving}
              />
            </div>
            <div>
              <Label>Approver Roles (comma separated)</Label>
              <input
                value={securitySettings.approverRoles.join(', ')}
                onChange={(event) => setSecuritySettings(prev => prev ? ({
                  ...prev,
                  approverRoles: event.target.value.split(',').map(role => role.trim()).filter(Boolean)
                }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Monitoring</CardTitle>
          <CardDescription>Oversight of AI-generated content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: 'contentReviewed', label: 'Content reviewed' },
              { key: 'biasCheckCompleted', label: 'Bias check completed' }
            ].map(setting => (
              <label key={setting.key} className="flex items-center gap-2 text-sm">
                <Switch
                  checked={aiMonitoring[setting.key as keyof typeof aiMonitoring]}
                  onCheckedChange={(checked) => setAiMonitoring(prev => prev ? ({ ...prev, [setting.key]: checked }) : prev)}
                  disabled={!canEdit}
                />
                <span>{setting.label}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Accuracy Score</Label>
              <input
                type="number"
                value={aiMonitoring.accuracyScore ?? ''}
                onChange={(event) => setAiMonitoring(prev => prev ? ({ ...prev, accuracyScore: Number(event.target.value) }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Fairness Score</Label>
              <input
                type="number"
                value={aiMonitoring.fairnessScore ?? ''}
                onChange={(event) => setAiMonitoring(prev => prev ? ({ ...prev, fairnessScore: Number(event.target.value) }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Content Quality Score</Label>
              <input
                type="number"
                value={aiMonitoring.contentQualityScore ?? ''}
                onChange={(event) => setAiMonitoring(prev => prev ? ({ ...prev, contentQualityScore: Number(event.target.value) }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retention Policy</CardTitle>
          <CardDescription>Lifecycle rules for data, audits, and versions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Learner Data Retention (days)</Label>
              <input
                type="number"
                value={retentionPolicy.learnerDataRetention}
                onChange={(event) => setRetentionPolicy(prev => prev ? ({ ...prev, learnerDataRetention: Number(event.target.value) }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Assessment Data Retention (days)</Label>
              <input
                type="number"
                value={retentionPolicy.assessmentDataRetention}
                onChange={(event) => setRetentionPolicy(prev => prev ? ({ ...prev, assessmentDataRetention: Number(event.target.value) }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Audit Log Retention (days)</Label>
              <input
                type="number"
                value={retentionPolicy.auditLogRetention}
                onChange={(event) => setRetentionPolicy(prev => prev ? ({ ...prev, auditLogRetention: Number(event.target.value) }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Content Version Retention (days)</Label>
              <input
                type="number"
                value={retentionPolicy.contentVersionRetention}
                onChange={(event) => setRetentionPolicy(prev => prev ? ({ ...prev, contentVersionRetention: Number(event.target.value) }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Retention Action</Label>
              <select
                value={retentionPolicy.action}
                onChange={(event) => setRetentionPolicy(prev => prev ? ({ ...prev, action: event.target.value as ELSGovernance['retentionPolicy']['action'] }) : prev)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
              >
                <option value="archive">archive</option>
                <option value="delete">delete</option>
                <option value="anonymize">anonymize</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log (Latest 25)</CardTitle>
          <CardDescription>Recent governance and compliance actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditLogs.length === 0 && (
            <p className="text-sm text-muted-foreground">No audit logs yet.</p>
          )}
          {auditLogs.map(log => (
            <div key={log.id} className="flex items-start justify-between gap-3 text-sm border-b pb-2 last:border-b-0">
              <div>
                <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">{log.actorName} · {log.entityType}</p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDistanceToNow(log.timestamp, { addSuffix: true })}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveGovernance} disabled={!canEdit || isSaving}>
          {isSaving ? 'Saving...' : 'Save Governance'}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// PLACEHOLDER PHASES (none)
// ============================================
function PhasePlaceholder({ phase, title, description }: { phase: ELSPhase; title: string; description: string }) {
  const { project, startPhase, completePhase, canEdit } = useELS();
  const phaseStatus = project?.phases[phase];
  
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Sparkles className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">{description}</p>
      
      {phaseStatus?.status === 'pending' && canEdit && (
        <Button size="lg" onClick={() => startPhase(phase)}>
          <Play className="w-4 h-4 mr-2" />
          Start Phase
        </Button>
      )}
      
      {phaseStatus?.status === 'in_progress' && canEdit && (
        <Button size="lg" onClick={() => completePhase(phase)}>
          <Check className="w-4 h-4 mr-2" />
          Complete Phase
        </Button>
      )}
      
      {phaseStatus?.status === 'completed' && (
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Phase Completed</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function ELSStudioIntegrated() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { projects, currentProject, currentProjectId, setCurrentProject, createProject, isLoading, isSaving, error, canEdit } = useELS();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);
  const { toast } = useToast();

  const currentPhase = currentProject?.currentPhase || 'ingest';

  const handlePhaseChange = (_phase: ELSPhase) => {
    if (!currentProject || !canEdit) return;
    setCurrentProject(currentProject.id);
  };

  const handleCreateProject = async () => {
    if (!canEdit) {
      setCreateProjectError('You need org admin or L&D manager access to create ELS projects.');
      return;
    }

    const name = newProjectName.trim();
    const description = newProjectDescription.trim();
    setCreateProjectError(null);

    if (!name) {
      setCreateProjectError('Project name is required.');
      return;
    }

    try {
      const projectId = await createProject(name, description || undefined);
      setCurrentProject(projectId);
      setShowCreateProjectDialog(false);
      setShowProjectSelector(false);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Please try again.';
      setCreateProjectError(message);
      toast({ title: 'Unable to create project', description: message, variant: 'destructive' });
    }
  };

  const openCreateProjectDialog = () => {
    setCreateProjectError(null);
    setShowProjectSelector(false);
    setShowCreateProjectDialog(true);
  };

  const renderPhase = () => {
    switch (currentPhase) {
      case 'ingest':
        return <Phase1Ingestion />;
      case 'analyze':
        return <Phase2Analyze />;
      case 'design':
        return <Phase3Design />;
      case 'develop':
        return <Phase4Develop />;
      case 'implement':
        return <Phase5Implement />;
      case 'evaluate':
        return <Phase6Evaluate />;
      case 'personalize':
        return <Phase7Personalize />;
      case 'portal':
        return <Phase8Portal />;
      case 'govern':
        return <Phase9Governance />;
      default:
        return <Phase1Ingestion />;
    }
  };

  if (isLoading && !currentProject) {
    return (
      <div className="flex h-screen">
        <div className="w-64 border-r p-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentPhase={currentPhase}
        onPhaseChange={handlePhaseChange}
        projectName={currentProject?.name || 'ELS Studio'}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <PanelLeft className="w-5 h-5" />
            </Button>
            
            {currentProject ? (
              <div className="flex items-center gap-3">
                <h2 className="font-semibold">{currentProject.name}</h2>
                <Badge variant={currentProject.status === 'active' ? 'default' : 'secondary'}>
                  {currentProject.status}
                </Badge>
              </div>
            ) : (
              <h2 className="font-semibold text-muted-foreground">No Project Selected</h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowProjectSelector(true)}>
              <FolderOpen className="w-4 h-4 mr-2" />
              {currentProject ? 'Switch Project' : 'Select Project'}
            </Button>
          </div>
        </header>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {!currentProject ? (
              <div className="flex flex-col items-center justify-center py-20">
                <GraduationCap className="w-24 h-24 text-muted-foreground mb-6" />
                <h2 className="text-2xl font-bold mb-2">Welcome to ELS Studio</h2>
                <p className="text-muted-foreground text-center max-w-md mb-8">
                  Create a new project or select an existing one to start building enterprise learning content.
                </p>
                <Button
                  size="lg"
                  onClick={() => (projects && projects.length > 0 ? setShowProjectSelector(true) : openCreateProjectDialog())}
                  disabled={!canEdit}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Get Started
                </Button>
                {!canEdit && (
                  <p className="text-sm text-muted-foreground mt-3">
                    Project creation requires org admin or L&amp;D manager access.
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Phase Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span>Phase {STAGES.find(s => s.key === currentPhase)?.id} of 9</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="font-medium text-foreground">{STAGES.find(s => s.key === currentPhase)?.title}</span>
                  </div>
                  <h1 className="text-3xl font-bold">{STAGES.find(s => s.key === currentPhase)?.title}</h1>
                  <p className="text-muted-foreground mt-1">{STAGES.find(s => s.key === currentPhase)?.description}</p>
                </div>

                {/* Phase Content */}
                {renderPhase()}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Project Selector Dialog */}
      <Dialog open={showProjectSelector} onOpenChange={setShowProjectSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Project</DialogTitle>
            <DialogDescription>Choose an existing project or create a new one</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {projects?.map((project) => (
              <Card
                key={project.id}
                className={cn(
                  'cursor-pointer transition-all',
                  currentProjectId === project.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                )}
                onClick={() => {
                  setCurrentProject(project.id);
                  setShowProjectSelector(false);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Phase: {project.currentPhase}</span>
                    <span>•</span>
                    <span>Updated {formatDistanceToNow(project.updatedAt, { addSuffix: true })}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {(!projects || projects.length === 0) && (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No projects yet</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectSelector(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              openCreateProjectDialog();
            }} disabled={!canEdit}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProjectDialog} onOpenChange={setShowCreateProjectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Set up a project to start building enterprise learning content.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="els-project-name">Project Name</Label>
              <Input
                id="els-project-name"
                placeholder="e.g. Safety Onboarding 2026"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="els-project-description">Description (Optional)</Label>
              <Textarea
                id="els-project-description"
                placeholder="Add context for this project..."
                value={newProjectDescription}
                onChange={(event) => setNewProjectDescription(event.target.value)}
                disabled={isSaving}
              />
            </div>
            {createProjectError && (
              <Alert variant="destructive">
                <AlertDescription>{createProjectError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateProjectDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
