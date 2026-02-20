import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Upload, Search, Pencil, Sparkles, Rocket, BarChart3, 
  UserCog, Users, Shield, Check, ChevronRight, Plus,
  FileText, FileType, Music, Video, X, Loader2, Eye,
  Building, GraduationCap, CheckCircle2,
  BookOpen, GripVertical, ChevronDown, Clock, Layout,
  TrendingUp, Calendar, Target, Brain,
  MessageSquare, Star,
  BarChart2,
  RotateCcw, Image, Volume2, MousePointer, Wand2,
  Headphones, Calculator, Mic, 
  AlignLeft, Settings, LogOut,
  ChevronLeft, PanelLeft, Flame, Award, Zap, Moon, Trophy,
  Monitor, Play, Info, Lightbulb
} from 'lucide-react';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

// Utilities
import { cn } from '@/lib/utils';

// ============================================
// MOCK DATA
// ============================================
const users = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', role: 'Training Manager', department: 'Human Resources', skills: [{ id: '1', name: 'Leadership', level: 85 }, { id: '2', name: 'Compliance', level: 92 }, { id: '3', name: 'Communication', level: 78 }], progress: 87, lastActive: new Date('2024-01-30') },
  { id: '2', name: 'Michael Chen', email: 'michael.chen@company.com', role: 'Software Engineer', department: 'Engineering', skills: [{ id: '4', name: 'JavaScript', level: 95 }, { id: '5', name: 'System Design', level: 72 }, { id: '6', name: 'Security', level: 65 }], progress: 62, lastActive: new Date('2024-01-31') },
  { id: '3', name: 'Emily Rodriguez', email: 'emily.rodriguez@company.com', role: 'Compliance Officer', department: 'Legal', skills: [{ id: '7', name: 'GDPR', level: 98 }, { id: '8', name: 'Risk Assessment', level: 88 }, { id: '9', name: 'Audit', level: 91 }], progress: 94, lastActive: new Date('2024-01-29') },
  { id: '4', name: 'David Kim', email: 'david.kim@company.com', role: 'Sales Representative', department: 'Sales', skills: [{ id: '10', name: 'Negotiation', level: 82 }, { id: '11', name: 'Product Knowledge', level: 75 }, { id: '12', name: 'CRM', level: 68 }], progress: 45, lastActive: new Date('2024-01-31') },
  { id: '5', name: 'Lisa Thompson', email: 'lisa.thompson@company.com', role: 'HR Specialist', department: 'Human Resources', skills: [{ id: '13', name: 'Recruitment', level: 89 }, { id: '14', name: 'Onboarding', level: 93 }, { id: '15', name: 'Conflict Resolution', level: 77 }], progress: 71, lastActive: new Date('2024-01-30') },
  { id: '6', name: 'James Wilson', email: 'james.wilson@company.com', role: 'Data Analyst', department: 'Analytics', skills: [{ id: '16', name: 'SQL', level: 88 }, { id: '17', name: 'Python', level: 82 }, { id: '18', name: 'Data Visualization', level: 76 }], progress: 58, lastActive: new Date('2024-01-28') }
];

const uploadedFiles = [
  { id: '1', name: 'Employee_Handbook_2024.pdf', type: 'pdf', size: 4523456, status: 'completed', progress: 100, extractedContent: 'Employee handbook content...', tags: ['HR', 'Policy', 'Onboarding'], uploadedAt: new Date('2024-01-25') },
  { id: '2', name: 'Security_Policies.docx', type: 'docx', size: 2345678, status: 'completed', progress: 100, extractedContent: 'Security policy content...', tags: ['Security', 'Compliance', 'IT'], uploadedAt: new Date('2024-01-26') },
  { id: '3', name: 'Compliance_Training.pptx', type: 'pptx', size: 8912345, status: 'processing', progress: 67, tags: ['Compliance', 'Training'], uploadedAt: new Date('2024-01-30') },
  { id: '4', name: 'Safety_Procedures.mp4', type: 'video', size: 456789012, status: 'completed', progress: 100, tags: ['Safety', 'Training', 'Video'], uploadedAt: new Date('2024-01-27') },
  { id: '5', name: 'Code_of_Conduct.pdf', type: 'pdf', size: 1234567, status: 'completed', progress: 100, extractedContent: 'Code of conduct content...', tags: ['Ethics', 'Compliance', 'Policy'], uploadedAt: new Date('2024-01-28') }
];

const courses = [
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
    status: 'published'
  }
];

const complianceRequirements = [
  { id: '1', name: 'Annual Security Training', description: 'All employees must complete security awareness training annually', priority: 'high', deadline: new Date('2024-03-31'), assignedRoles: ['All Employees'], completionRate: 78 },
  { id: '2', name: 'GDPR Certification', description: 'Data handlers must complete GDPR compliance certification', priority: 'high', deadline: new Date('2024-02-28'), assignedRoles: ['HR', 'Legal', 'IT', 'Sales'], completionRate: 92 },
  { id: '3', name: 'Workplace Safety', description: 'Basic workplace safety procedures training', priority: 'medium', deadline: new Date('2024-06-30'), assignedRoles: ['All Employees'], completionRate: 45 },
  { id: '4', name: 'Anti-Harassment Training', description: 'Preventing and responding to workplace harassment', priority: 'high', deadline: new Date('2024-04-15'), assignedRoles: ['All Employees', 'Managers'], completionRate: 63 }
];

const skillGapMatrix = {
  roles: ['Engineering', 'HR', 'Sales', 'Legal', 'Analytics'],
  skills: ['Security', 'Compliance', 'Communication', 'Technical', 'Leadership'],
  data: [
    [65, 45, 70, 95, 55],
    [55, 85, 90, 40, 75],
    [50, 60, 95, 50, 70],
    [60, 98, 85, 45, 80],
    [70, 55, 65, 90, 50]
  ]
};

const departments = ['Engineering', 'HR', 'Sales', 'Legal', 'Analytics'];

// ============================================
// STAGE CONFIGURATION
// ============================================
const STAGES = [
  { id: 1, short: 'Ingest', title: 'Content Ingestion', description: 'Upload policies, SOPs, manuals, and training media.', icon: Upload, color: 'blue' },
  { id: 2, short: 'Analyze', title: 'Needs Analysis', description: 'Map learner needs, skill gaps, compliance requirements.', icon: Search, color: 'purple' },
  { id: 3, short: 'Design', title: 'Course Design', description: 'Define course blueprint, outcomes, sequencing.', icon: Pencil, color: 'amber' },
  { id: 4, short: 'Develop', title: 'AI Development', description: 'Generate lessons, multimedia, AI assessments.', icon: Sparkles, color: 'emerald' },
  { id: 5, short: 'Implement', title: 'Implementation', description: 'Assign cohorts, schedule deadlines, activate tutors.', icon: Rocket, color: 'orange' },
  { id: 6, short: 'Evaluate', title: 'Evaluation', description: 'Track completion, scores, engagement, feedback.', icon: BarChart3, color: 'cyan' },
  { id: 7, short: 'Personalize', title: 'Personalization', description: 'Adapt learning paths, recommend refreshers.', icon: UserCog, color: 'pink' },
  { id: 8, short: 'Portal', title: 'Manager Portal', description: 'Dashboards, alerts, compliance reports.', icon: Users, color: 'indigo' },
  { id: 9, short: 'Governance', title: 'Governance', description: 'Model audits, security, privacy monitoring.', icon: Shield, color: 'slate' },
];

// ============================================
// ANIMATION COMPONENTS
// ============================================
const ScrollReveal = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay, duration: 0.5 }} className={className}>
    {children}
  </motion.div>
);

const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  React.useEffect(() => {
    const timer = setTimeout(() => setCount(value), 100);
    return () => clearTimeout(timer);
  }, [value]);
  return <span>{count}{suffix}</span>;
};

// ============================================
// SIDEBAR COMPONENT
// ============================================
interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  currentView: string;
  onViewChange: (view: 'studio' | 'scenarios' | 'analytics') => void;
  currentPhase?: number;
  onPhaseChange?: (phase: number) => void;
}

function Sidebar({ open, onToggle, currentView, onViewChange, currentPhase = 1, onPhaseChange }: SidebarProps) {

  const menuItems = [
    { id: 'studio', label: 'ELS Studio', icon: Layout, color: 'blue' },
    { id: 'scenarios', label: 'Scenarios', icon: Target, color: 'purple' },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, color: 'emerald' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onToggle}
        />
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
                  <div>
                    <h1 className="font-bold text-lg">ELS Studio</h1>
                    <p className="text-xs text-muted-foreground">Enterprise Learning</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onToggle} className="lg:hidden">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Main Menu */}
            <div className="p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Main</p>
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id as 'studio' | 'scenarios' | 'analytics')}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                    currentView === item.id
                      ? `bg-${item.color}-500/10 text-${item.color}-600`
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Pipeline Stages - Only show in Studio view */}
            {currentView === 'studio' && (
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">Pipeline</p>
                <div className="space-y-1">
                  {STAGES.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => onPhaseChange?.(stage.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                        currentPhase === stage.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        currentPhase === stage.id ? 'bg-white/20' : 'bg-muted'
                      )}>
                        <stage.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{stage.short}</p>
                        <p className="text-xs opacity-70 truncate">{stage.title}</p>
                      </div>
                      {currentPhase === stage.id && (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t space-y-2">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors text-left">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors text-left">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
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
  const [files, setFiles] = useState(uploadedFiles);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({ nlp: true, ocr: true, tagging: true });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const deleteFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => fileTypes.find(ft => type.includes(ft.type)) || fileTypes[0];

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const now = new Date();
    const newFiles = Array.from(incoming).map((file) => ({
      id: `${file.name}-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
      size: file.size,
      status: 'processing',
      progress: 0,
      tags: [],
      uploadedAt: now
    }));

    setFiles(prev => [...newFiles, ...prev]);

    // Simulate processing completion
    newFiles.forEach((file) => {
      setTimeout(() => {
        setFiles(prev => prev.map(item => (
          item.id === file.id
            ? { ...item, status: 'completed', progress: 100 }
            : item
        )));
      }, 1200);
    });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

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
                <div key={option.id} className={cn('flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer', selectedOptions[option.id as keyof typeof selectedOptions] ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')} onClick={() => setSelectedOptions(prev => ({ ...prev, [option.id]: !prev[option.id as keyof typeof prev] }))}>
                  <Switch checked={selectedOptions[option.id as keyof typeof selectedOptions]} onCheckedChange={(checked) => setSelectedOptions(prev => ({ ...prev, [option.id]: checked }))} />
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
              onChange={(event) => addFiles(event.target.files)}
            />
            <div
              className={cn('border-2 border-dashed rounded-2xl p-12 text-center transition-all', isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30')}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Drag & drop files here</h3>
              <p className="text-muted-foreground mb-6">or click to browse from your computer</p>
              <Button
                size="lg"
                className="rounded-full px-8"
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
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
          <h2 className="text-xl font-semibold">Uploaded Files ({files.length})</h2>
        </div>
        <div className="grid gap-3">
          {files.map((file) => {
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
                        <span>{format(file.uploadedAt, 'MMM d, yyyy')}</span>
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
                      <Button variant="ghost" size="icon" className="rounded-full"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => deleteFile(file.id)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ============================================
// PHASE 2: ANALYZE - FULL IMPLEMENTATION
// ============================================
function Phase2Analyze() {
  const [generatingObjectives, setGeneratingObjectives] = useState(false);
  const [generatedObjectives, setGeneratedObjectives] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('profiles');

  const generateObjectives = () => {
    setGeneratingObjectives(true);
    setTimeout(() => {
      setGeneratedObjectives([
        'Identify and mitigate common security threats in the workplace',
        'Apply data protection principles in daily operations',
        'Demonstrate effective communication in cross-functional teams',
        'Analyze compliance requirements for specific job roles',
        'Evaluate risk scenarios and recommend appropriate actions',
      ]);
      setGeneratingObjectives(false);
    }, 2000);
  };

  const getSkillColor = (level: number) => {
    if (level >= 80) return 'bg-emerald-500';
    if (level >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Group users by department
  const groupedUsers = departments.map(dept => {
    const deptUsers = users.filter(u => u.department === dept);
    const avgProgress = deptUsers.length > 0 ? Math.round(deptUsers.reduce((sum, u) => sum + u.progress, 0) / deptUsers.length) : 0;
    return { department: dept, users: deptUsers, avgProgress, count: deptUsers.length };
  }).filter(g => g.count > 0);

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
          { label: 'Total Learners', value: users.length, icon: Users },
          { label: 'Departments', value: 5, icon: Building },
          { label: 'Avg Skill Level', value: 72, suffix: '%', icon: TrendingUp },
          { label: 'Compliance Items', value: complianceRequirements.length, icon: CheckCircle2 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1"><AnimatedCounter value={stat.value} suffix={stat.suffix || ''} /></p>
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
                className={cn('px-4 py-2.5 rounded-lg text-sm font-medium transition-all', activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-6">
          {activeTab === 'profiles' && (
            <div className="space-y-6">
              {/* Learner Profiles by Department */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Learner Profiles by Department</h3>
                <p className="text-sm text-muted-foreground mb-4">Overview of learners across different departments</p>
                
                <div className="space-y-4">
                  {groupedUsers.map((group) => (
                    <Card key={group.department} className="overflow-hidden">
                      <CardContent className="p-0">
                        {/* Department Header */}
                        <div className="p-4 bg-muted/30 border-b">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{group.department}</span>
                              <Badge variant="secondary">{group.count} learners</Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">Avg Progress: {group.avgProgress}%</span>
                          </div>
                          <Progress value={group.avgProgress} className="h-2" />
                        </div>
                        
                        {/* Users Grid */}
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {group.users.map((user) => (
                            <Card key={user.id} className="border shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <Avatar className="w-10 h-10">
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                                      {user.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.role}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">{user.department}</Badge>
                                      <span className="text-xs text-muted-foreground">{user.progress}% complete</span>
                                    </div>
                                  </div>
                                </div>
                                <Separator className="my-3" />
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Top Skills</p>
                                  <div className="flex flex-wrap gap-1">
                                    {user.skills.slice(0, 3).map((skill) => (
                                      <Badge key={skill.id} variant="outline" className="text-xs">
                                        {skill.name} ({skill.level}%)
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gaps' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Skill Gap Heatmap</CardTitle>
                  <CardDescription>Skill levels by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {skillGapMatrix.roles.map((role, rowIndex) => (
                      <div key={role} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{role}</span>
                          <span className="text-xs text-muted-foreground">
                            Avg: {Math.round(skillGapMatrix.data[rowIndex].reduce((a, b) => a + b, 0) / skillGapMatrix.data[rowIndex].length)}%
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {skillGapMatrix.data[rowIndex].map((level, colIndex) => (
                            <Tooltip key={colIndex}>
                              <TooltipTrigger>
                                <div className={cn('flex-1 h-10 rounded-md flex items-center justify-center text-xs font-medium text-white cursor-pointer', getSkillColor(level))}>
                                  {level}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{skillGapMatrix.skills[colIndex]}: {level}%</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-xs text-muted-foreground px-1">
                    {skillGapMatrix.skills.map((skill) => (
                      <span key={skill} className="flex-1 text-center font-medium">{skill}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department Comparison</CardTitle>
                  <CardDescription>Average skill levels across departments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {skillGapMatrix.roles.map((role, i) => {
                      const avg = Math.round(skillGapMatrix.data[i].reduce((a, b) => a + b, 0) / skillGapMatrix.data[i].length);
                      return (
                        <div key={role}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{role}</span>
                            <span className={cn('text-sm font-bold', avg >= 80 ? 'text-emerald-600' : avg >= 60 ? 'text-amber-600' : 'text-red-600')}>{avg}%</span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', getSkillColor(avg))} style={{ width: `${avg}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-4">
              {complianceRequirements.map((req, _index) => (
                <Card key={req.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{req.name}</h4>
                          <Badge variant={req.priority === 'high' ? 'destructive' : 'secondary'}>{req.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{req.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Building className="w-4 h-4" />{req.assignedRoles.join(', ')}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Due {format(req.deadline, 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <div className={cn('text-3xl font-bold', req.completionRate >= 80 ? 'text-emerald-600' : req.completionRate >= 50 ? 'text-amber-600' : 'text-red-600')}>{req.completionRate}%</div>
                        <p className="text-xs text-muted-foreground">completed</p>
                      </div>
                    </div>
                    <Progress value={req.completionRate} className="h-2 mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'objectives' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      AI Learning Objective Generator
                    </CardTitle>
                    <CardDescription>Generate measurable learning objectives from analyzed content</CardDescription>
                  </div>
                  <Button onClick={generateObjectives} disabled={generatingObjectives}>
                    {generatingObjectives ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate</>}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {generatedObjectives.length > 0 ? (
                  <div className="space-y-3">
                    {generatedObjectives.map((objective, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl border">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{objective}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">Measurable</Badge>
                            <Badge variant="outline" className="text-xs">Bloom's: Apply</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Click Generate to create AI-powered learning objectives</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


// ============================================
// PHASE 3: DESIGN
// ============================================
function Phase3Design() {
  const [selectedCourse] = useState(courses[0]);
  const [expandedModules, setExpandedModules] = useState<string[]>([courses[0].modules[0].id]);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(['practice', 'case']);
  const [activeTab, setActiveTab] = useState('structure');

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]);
  };

  const toggleStrategy = (id: string) => {
    setSelectedStrategies(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const bloomTaxonomy = [
    { level: 'remember', label: 'Remember', color: 'bg-blue-500' },
    { level: 'understand', label: 'Understand', color: 'bg-cyan-500' },
    { level: 'apply', label: 'Apply', color: 'bg-emerald-500' },
    { level: 'analyze', label: 'Analyze', color: 'bg-amber-500' },
    { level: 'evaluate', label: 'Evaluate', color: 'bg-orange-500' },
    { level: 'create', label: 'Create', color: 'bg-red-500' },
  ];

  const instructionalStrategies = [
    { id: 'practice', label: 'Practice Activities', icon: RotateCcw, description: 'Hands-on exercises and simulations' },
    { id: 'discussion', label: 'Group Discussions', icon: MessageSquare, description: 'Collaborative learning sessions' },
    { id: 'teachback', label: 'Teach-Back Tasks', icon: Users, description: 'Learners explain concepts to others' },
    { id: 'case', label: 'Case Studies', icon: FileText, description: 'Real-world scenario analysis' },
  ];

  return (
    <div className="space-y-6">
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
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <Input defaultValue={selectedCourse.title} className="font-semibold bg-transparent border-0 p-0 text-lg" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedCourse.modules.map((module, moduleIndex) => (
                    <div key={module.id} className="border rounded-lg overflow-hidden">
                      <button onClick={() => toggleModule(module.id)} className="w-full flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        {expandedModules.includes(module.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-medium">Module {moduleIndex + 1}</span>
                        <span className="flex-1 text-left">{module.title}</span>
                        <Badge variant="secondary">{module.units.length} units</Badge>
                      </button>
                      {expandedModules.includes(module.id) && (
                        <div className="p-3 space-y-2">
                          {module.units.map((unit) => (
                            <div key={unit.id} className="flex items-center gap-3 p-2 bg-card rounded border">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground w-12">{unit.duration} min</span>
                              <span className="text-sm">{unit.title}</span>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" className="w-full"><Plus className="w-4 h-4 mr-2" />Add Unit</Button>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2" />Add Module</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Outcomes</CardTitle>
              <CardDescription>Define measurable learning objectives using Bloom's Taxonomy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedCourse.learningOutcomes.map((outcome, index) => {
                  const taxonomy = bloomTaxonomy.find(t => t.level === outcome.taxonomy);
                  return (
                    <div key={outcome.id} className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{outcome.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={cn('text-xs text-white', taxonomy?.color)}>{taxonomy?.label}</Badge>
                          {outcome.measurable && <Badge variant="outline" className="text-xs">Measurable</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Bloom's Taxonomy Reference</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {bloomTaxonomy.map((level) => (
                  <div key={level.level} className={cn('p-3 rounded-lg text-center text-white', level.color)}>
                    <p className="font-medium text-sm">{level.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Learning Elements</CardTitle>
                <CardDescription>Select strategies to engage learners</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {instructionalStrategies.map((strategy) => (
                    <div key={strategy.id} onClick={() => toggleStrategy(strategy.id)} className={cn('flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors', selectedStrategies.includes(strategy.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30')}>
                      <div className={cn('w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5', selectedStrategies.includes(strategy.id) ? 'bg-primary border-primary' : 'border-muted-foreground')}>
                        {selectedStrategies.includes(strategy.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <strategy.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{strategy.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="principles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Adult Learning Principles</CardTitle>
              <CardDescription>Configure Malcolm Knowles' andragogy principles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: 'relevance', label: 'Practical Relevance', description: 'Connect learning to real-world job tasks', enabled: true },
                  { id: 'selfdirected', label: 'Self-Directed Pathways', description: 'Allow learners to control their learning pace', enabled: true },
                  { id: 'experiential', label: 'Experiential Activities', description: 'Include hands-on practice and reflection', enabled: true },
                  { id: 'problem', label: 'Problem-Centered', description: 'Focus on solving real problems', enabled: false },
                ].map((principle) => (
                  <div key={principle.id} className={cn('flex items-start gap-4 p-4 rounded-lg border', principle.enabled ? 'border-primary bg-primary/5' : 'border-border')}>
                    <Switch checked={principle.enabled} />
                    <div className="flex-1">
                      <Label className="font-medium">{principle.label}</Label>
                      <p className="text-sm text-muted-foreground mt-1">{principle.description}</p>
                    </div>
                    {principle.enabled && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// PHASE 4: DEVELOP
// ============================================
function Phase4Develop() {
  const [activeTab, setActiveTab] = useState('content');
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [selectedAssessmentTypes, setSelectedAssessmentTypes] = useState<string[]>(['mcq']);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [questionCount, setQuestionCount] = useState(5);
  const [aiFeedback, setAiFeedback] = useState(true);
  const [prompt, setPrompt] = useState('');

  const generationTypes = [
    { id: 'lesson', label: 'Lesson Materials', icon: BookOpen, description: 'Generate learner-friendly lesson content' },
    { id: 'slides', label: 'Visual Slides', icon: Image, description: 'Create presentation slides and diagrams' },
    { id: 'audio', label: 'Audio Narration', icon: Volume2, description: 'Generate AI voice narration' },
    { id: 'interactive', label: 'Interactive Elements', icon: MousePointer, description: 'Create interactive activities' },
  ];

  const assessmentTypes = [
    { id: 'mcq', label: 'Multiple Choice', icon: CheckCircle2 },
    { id: 'listening', label: 'Listening Tasks', icon: Headphones },
    { id: 'reading', label: 'Reading Comprehension', icon: AlignLeft },
    { id: 'math', label: 'Math/Logic Problems', icon: Calculator },
    { id: 'speaking', label: 'Speaking Tasks', icon: Mic },
  ];

  const generateContent = async (type: string) => {
    setGenerating(type);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const contentMap: Record<string, string> = {
      lesson: `# Information Security Fundamentals\n\n## Introduction\nInformation security is critical for protecting organizational assets.\n\n## Key Concepts\n### 1. Confidentiality\nEnsuring information is accessible only to authorized users.\n\n### 2. Integrity\nSafeguarding the accuracy of information.\n\n### 3. Availability\nEnsuring authorized users have access when required.`,
      slides: `Slide 1: Title - Information Security Awareness\nSlide 2: Agenda - What we'll cover\nSlide 3: The CIA Triad\nSlide 4: Common Threats\nSlide 5: Password Security\nSlide 6: Multi-Factor Authentication`,
      audio: `[AI Voice Narration]\n\n"Welcome to Information Security Awareness training..."\n\nDuration: 8 minutes 30 seconds`,
      interactive: `Interactive Elements:\n1. Drag & Drop: Match security terms\n2. Scenario Quiz: Phishing identification\n3. Hotspot Image: Find security risks`,
    };
    setGeneratedContent(prev => ({ ...prev, [type]: contentMap[type] }));
    setGenerating(null);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content">AI Content Generation</TabsTrigger>
          <TabsTrigger value="assessment">Assessment Engine</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generation Prompt</CardTitle>
              <CardDescription>Describe what you want to generate</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="e.g., Create a lesson about information security fundamentals..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[100px]" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generationTypes.map((type) => (
              <Card key={type.id} className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <type.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{type.label}</CardTitle>
                        <CardDescription>{type.description}</CardDescription>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => generateContent(type.id)} disabled={generating === type.id || !prompt}>
                      {generating === type.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-2" />Generate</>}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {generatedContent[type.id] && (
                    <div className="bg-muted rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap font-mono">{generatedContent[type.id]}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assessment" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Assessment Configuration</CardTitle>
                <CardDescription>Customize your assessment parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Assessment Types</Label>
                  <div className="space-y-2">
                    {assessmentTypes.map((type) => (
                      <div key={type.id} onClick={() => setSelectedAssessmentTypes(prev => prev.includes(type.id) ? prev.filter(t => t !== type.id) : [...prev, type.id])} className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors', selectedAssessmentTypes.includes(type.id) ? 'border-primary bg-primary/5' : 'border-border')}>
                        <type.icon className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{type.label}</p>
                        </div>
                        {selectedAssessmentTypes.includes(type.id) && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-3 block">Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-3 block">Questions: {questionCount}</Label>
                  <Slider value={[questionCount]} onValueChange={(value) => setQuestionCount(value[0])} min={3} max={20} step={1} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">AI Feedback & Scoring</Label>
                    <p className="text-xs text-muted-foreground">Provide automated feedback</p>
                  </div>
                  <Switch checked={aiFeedback} onCheckedChange={setAiFeedback} />
                </div>
                <Button className="w-full"><Sparkles className="w-4 h-4 mr-2" />Generate Assessment</Button>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Assessment Preview</CardTitle>
                <CardDescription>Preview generated questions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { q: 'What is the primary purpose of multi-factor authentication?', options: ['To make login slower', 'To add an extra layer of security', 'To remember passwords', 'To share accounts'], correct: 1 },
                    { q: 'Which of the following is a strong password?', options: ['password123', 'MyP@ssw0rd!2024', 'qwerty', 'yourname'], correct: 1 },
                  ].map((q, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">{index + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium mb-2">{q.q}</p>
                          <div className="space-y-2">
                            {q.options.map((option, i) => (
                              <div key={i} className={cn('flex items-center gap-2 p-2 rounded', i === q.correct ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted')}>
                                <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center', i === q.correct ? 'border-emerald-500' : 'border-muted-foreground')}>
                                  {i === q.correct && <Check className="w-3 h-3" />}
                                </div>
                                <span className="text-sm">{option}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


// ============================================
// PHASE 5: IMPLEMENT
// ============================================
function Phase5Implement() {
  const [activeTab, setActiveTab] = useState('training');
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [showInstructor, setShowInstructor] = useState(false);

  const sessions = [
    { id: '1', type: 'training', title: 'Information Security Fundamentals', instructor: 'Sarah Johnson', time: '10:00 AM - 12:00 PM', status: 'live', duration: 120 },
    { id: '2', type: 'training', title: 'Compliance Training - Session 2', instructor: 'Michael Chen', time: '2:00 PM - 4:00 PM', status: 'scheduled', duration: 120 },
    { id: '3', type: 'video', title: 'Data Privacy Best Practices', duration: 25, progress: 0 },
    { id: '4', type: 'video', title: 'Recognizing Phishing Attempts', duration: 18, progress: 45 },
  ];

  const activeTraining = sessions.find(s => s.id === activeSession);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="training">Live Training</TabsTrigger>
          <TabsTrigger value="video">Video Content</TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="space-y-4">
          {activeSession && activeTraining ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="mb-2 bg-red-500 animate-pulse">LIVE</Badge>
                    <CardTitle>{activeTraining.title}</CardTitle>
                    <CardDescription>Instructor: {activeTraining.instructor}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setActiveSession(null)}>End Session</Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex">
                <div className="flex-1 bg-muted/30 p-8 flex flex-col items-center justify-center">
                  <div className="w-full max-w-2xl aspect-video bg-slate-900 rounded-xl flex items-center justify-center relative">
                    <div className="text-white text-center">
                      <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Live Training Session</p>
                      <p className="text-sm opacity-70">Content being delivered by instructor</p>
                    </div>
                    {showInstructor && (
                      <div className="absolute bottom-4 right-4 w-48 aspect-video bg-slate-800 rounded-lg flex items-center justify-center">
                        <div className="text-center text-white">
                          <Avatar className="w-12 h-12 mx-auto mb-2">
                            <AvatarFallback className="bg-primary">SJ</AvatarFallback>
                          </Avatar>
                          <p className="text-xs">{activeTraining.instructor}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-80 border-l p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Show Instructor</Label>
                    <Switch checked={showInstructor} onCheckedChange={setShowInstructor} />
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Session Controls</h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start"><Video className="w-4 h-4 mr-2" />Share Screen</Button>
                      <Button variant="outline" size="sm" className="w-full justify-start"><MessageSquare className="w-4 h-4 mr-2" />Open Chat</Button>
                      <Button variant="outline" size="sm" className="w-full justify-start"><FileText className="w-4 h-4 mr-2" />Share Materials</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.filter(s => s.type === 'training').map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Badge variant={session.status === 'live' ? 'destructive' : 'secondary'}>{session.status === 'live' ? 'LIVE NOW' : 'Scheduled'}</Badge>
                      <div className="text-right">
                        <p className="text-sm font-medium">{session.time}</p>
                        <p className="text-xs text-muted-foreground">{session.duration} minutes</p>
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{session.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Users className="w-4 h-4" />
                      <span>Instructor: {session.instructor}</span>
                    </div>
                    <Button className="w-full" onClick={() => setActiveSession(session.id)} variant={session.status === 'live' ? 'default' : 'outline'}>
                      {session.status === 'live' ? <><Monitor className="w-4 h-4 mr-2" />Join Session</> : <><Clock className="w-4 h-4 mr-2" />Schedule</>}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center">
                    <div className="text-white text-center">
                      <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Select a video to play</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Video Library</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sessions.filter(s => s.type === 'video').map((video) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                        <div className="w-16 h-12 bg-slate-200 rounded flex items-center justify-center">
                          <Play className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{video.title}</p>
                          <p className="text-xs text-muted-foreground">{video.duration} min</p>
                        </div>
                        {video.progress > 0 && (
                          <div className="w-12 h-12">
                            <svg viewBox="0 0 36 36" className="w-full h-full">
                              <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                              <circle cx="18" cy="18" r="16" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray={`${video.progress}, 100`} transform="rotate(-90 18 18)" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// PHASE 6: EVALUATE
// ============================================
function Phase6Evaluate() {
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);

  const assessments = [
    { id: '1', title: 'Information Security Quiz', type: 'quiz', moduleId: '1', duration: 20, passingScore: 80, questions: [
      { id: '1', question: 'What does MFA stand for?', options: ['Multi-Factor Authentication', 'Main Function Access', 'Multi-File Archive', 'Main Frame Authentication'], correctAnswer: 0 },
      { id: '2', question: 'Which is a phishing indicator?', options: ['Urgent tone', 'Known sender', 'Correct spelling', 'Expected attachment'], correctAnswer: 0 },
    ], maxAttempts: 3 },
    { id: '2', title: 'Compliance Assessment', type: 'practical', moduleId: '2', duration: 45, passingScore: 70, questions: [], maxAttempts: 2 },
    { id: '3', title: 'Security Practices Final', type: 'written', moduleId: '3', duration: 60, passingScore: 75, questions: [], maxAttempts: 3 },
  ];

  const analytics = {
    avgScore: 78,
    passRate: 82,
    engagement: 94,
    completion: 87,
    insights: [
      'Learners struggle with advanced security concepts (avg 65%)',
      'Video content has highest engagement (95% completion)',
      'Assessment scores improved 12% after revision',
    ],
    recommendations: [
      'Add more interactive examples for complex topics',
      'Introduce spaced repetition for retention',
      'Create practice assessments before final tests',
    ],
  };

  const startAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResults(false);
  };

  const selectAnswer = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

  const submitAssessment = () => {
    setShowResults(true);
  };

  if (selectedAssessment && !showResults) {
    const question = selectedAssessment.questions[currentQuestion];
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{selectedAssessment.title}</CardTitle>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Question {currentQuestion + 1} of {selectedAssessment.questions.length}</span>
              <div className="w-32">
                <Progress value={((currentQuestion + 1) / selectedAssessment.questions.length) * 100} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg font-medium">{question.question}</p>
          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button key={i} onClick={() => selectAnswer(i)} className={cn('w-full p-4 text-left border rounded-lg transition-colors', answers[currentQuestion] === i ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30')}>
                <div className="flex items-center gap-3">
                  <div className={cn('w-5 h-5 rounded-full border flex items-center justify-center', answers[currentQuestion] === i ? 'border-primary bg-primary' : 'border-muted-foreground')}>
                    {answers[currentQuestion] === i && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}>Previous</Button>
            {currentQuestion < selectedAssessment.questions.length - 1 ? (
              <Button onClick={() => setCurrentQuestion(currentQuestion + 1)} disabled={answers[currentQuestion] === undefined}>Next</Button>
            ) : (
              <Button onClick={submitAssessment} disabled={answers.length !== selectedAssessment.questions.length}>Submit</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showResults && selectedAssessment) {
    const score = answers.reduce((acc, answer, i) => acc + (answer === selectedAssessment.questions[i].correctAnswer ? 1 : 0), 0);
    const percentage = Math.round((score / selectedAssessment.questions.length) * 100);
    const passed = percentage >= selectedAssessment.passingScore;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Assessment Results</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className={cn('w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center', passed ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
            <span className={cn('text-4xl font-bold', passed ? 'text-emerald-600' : 'text-red-600')}>{percentage}%</span>
          </div>
          <h3 className={cn('text-2xl font-bold mb-2', passed ? 'text-emerald-600' : 'text-red-600')}>{passed ? 'Congratulations!' : 'Keep Learning'}</h3>
          <p className="text-muted-foreground mb-6">{passed ? 'You have passed this assessment.' : `You need ${selectedAssessment.passingScore}% to pass. Try again!`}</p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => { setSelectedAssessment(null); setShowResults(false); }}>Back to Assessments</Button>
            {!passed && <Button onClick={() => startAssessment(selectedAssessment)}>Retry</Button>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Score', value: analytics.avgScore, suffix: '%', icon: BarChart3 },
          { label: 'Pass Rate', value: analytics.passRate, suffix: '%', icon: CheckCircle2 },
          { label: 'Engagement', value: analytics.engagement, suffix: '%', icon: Users },
          { label: 'Completion', value: analytics.completion, suffix: '%', icon: GraduationCap },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1"><AnimatedCounter value={stat.value} suffix={stat.suffix} /></p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Available Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{assessment.title}</p>
                    <p className="text-sm text-muted-foreground">{assessment.questions.length > 0 ? `${assessment.questions.length} questions` : 'Practical task'} • {assessment.duration} min</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm">Pass: {assessment.passingScore}%</p>
                    <p className="text-xs text-muted-foreground">{assessment.maxAttempts} attempts</p>
                  </div>
                  <Button size="sm" onClick={() => startAssessment(assessment)}>Start</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Learning Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Key Insights</h4>
              <ul className="space-y-2">
                {analytics.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">AI Recommendations</h4>
              <ul className="space-y-2">
                {analytics.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
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
  const [activeTab, setActiveTab] = useState('spaced');
  const [showSchedule, setShowSchedule] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [masteryGoals, setMasteryGoals] = useState(true);
  const [progressVisible, setProgressVisible] = useState(true);
  const [feedbackStyle, setFeedbackStyle] = useState('immediate');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="spaced">Spaced Repetition</TabsTrigger>
          <TabsTrigger value="adaptive">Adaptive Learning</TabsTrigger>
          <TabsTrigger value="gamification">Gamification</TabsTrigger>
        </TabsList>

        <TabsContent value="spaced" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Spaced Repetition System</CardTitle>
                  <CardDescription>Optimize knowledge retention with scientifically-timed reviews</CardDescription>
                </div>
                <Button onClick={() => setShowSchedule(!showSchedule)}>
                  <Brain className="w-4 h-4 mr-2" />Generate Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showSchedule ? (
                <div className="space-y-4">
                  {[
                    { day: 'Day 1', topic: 'Introduction to Information Security', type: 'learn', status: 'completed' },
                    { day: 'Day 2', topic: 'The CIA Triad', type: 'learn', status: 'completed' },
                    { day: 'Day 4', topic: 'Introduction to Information Security', type: 'review', status: 'due' },
                    { day: 'Day 7', topic: 'The CIA Triad', type: 'review', status: 'scheduled' },
                    { day: 'Day 16', topic: 'Introduction to Information Security', type: 'review', status: 'scheduled' },
                    { day: 'Day 30', topic: 'The CIA Triad', type: 'review', status: 'scheduled' },
                  ].map((item, index) => (
                    <div key={index} className={cn('flex items-center gap-4 p-4 rounded-lg border', item.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20' : item.status === 'due' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted')}>
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', item.status === 'completed' ? 'bg-emerald-500 text-white' : item.status === 'due' ? 'bg-amber-500 text-white' : 'bg-muted-foreground/20')}>
                        {item.status === 'completed' ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.topic}</p>
                        <p className="text-sm text-muted-foreground">{item.day} • {item.type === 'learn' ? 'New Learning' : 'Review Session'}</p>
                      </div>
                      <Badge variant={item.status === 'completed' ? 'default' : item.status === 'due' ? 'secondary' : 'outline'}>{item.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Generate a personalized spaced repetition schedule based on your learning content</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adaptive" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Learning Path Visualization</CardTitle>
                <CardDescription>AI-powered adaptive learning pathway</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { level: 1, title: 'Foundation', status: 'completed', items: ['Security Basics', 'Policy Overview'], accuracy: 92 },
                    { level: 2, title: 'Intermediate', status: 'in_progress', items: ['Threat Identification', 'Risk Assessment'], accuracy: 78 },
                    { level: 3, title: 'Advanced', status: 'locked', items: ['Advanced Threats', 'Incident Response'], accuracy: 0 },
                    { level: 4, title: 'Expert', status: 'locked', items: ['Security Architecture', 'Compliance Mastery'], accuracy: 0 },
                  ].map((level, index) => (
                    <div key={index} className="relative">
                      <div className="flex items-center gap-4">
                        <div className={cn('w-12 h-12 rounded-full flex items-center justify-center font-bold', level.status === 'completed' ? 'bg-emerald-500 text-white' : level.status === 'in_progress' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                          {level.level}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{level.title}</span>
                            {level.status === 'completed' && <Badge variant="default">Completed</Badge>}
                            {level.status === 'in_progress' && <Badge variant="secondary">In Progress</Badge>}
                            {level.status === 'locked' && <Badge variant="outline">Locked</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{level.items.join(' • ')}</p>
                        </div>
                        {level.accuracy > 0 && <div className="text-sm font-medium">{level.accuracy}% accuracy</div>}
                      </div>
                      {index < 3 && <div className="absolute left-6 top-12 w-0.5 h-6 bg-border" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Personalization</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setCustomizationOpen(!customizationOpen)}>
                    {customizationOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {customizationOpen && (
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Mastery Goals</Label>
                        <p className="text-xs text-muted-foreground">Aim for 90%+ mastery before advancing</p>
                      </div>
                      <Switch checked={masteryGoals} onCheckedChange={setMasteryGoals} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Progress Visibility</Label>
                        <p className="text-xs text-muted-foreground">Show progress indicators</p>
                      </div>
                      <Switch checked={progressVisible} onCheckedChange={setProgressVisible} />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="font-medium">Feedback Style</Label>
                      <Select value={feedbackStyle} onValueChange={setFeedbackStyle}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                          <SelectItem value="summary">End of Session</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gamification" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-amber-500" />
                </div>
                <CardTitle>2,450</CardTitle>
                <CardDescription>Total Points Earned</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Flame className="w-10 h-10 text-purple-500" />
                </div>
                <CardTitle>12 Days</CardTitle>
                <CardDescription>Current Streak</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Award className="w-10 h-10 text-blue-500" />
                </div>
                <CardTitle>8</CardTitle>
                <CardDescription>Badges Earned</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Badges & Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'First Steps', description: 'Complete your first module', earned: true, icon: Star },
                  { name: 'Speed Learner', description: 'Complete 5 modules in one day', earned: true, icon: Zap },
                  { name: 'Perfect Score', description: 'Get 100% on an assessment', earned: true, icon: Target },
                  { name: 'Streak Master', description: 'Maintain a 7-day streak', earned: true, icon: Flame },
                  { name: 'Knowledge Seeker', description: 'Read all reference materials', earned: false, icon: BookOpen },
                  { name: 'Team Player', description: 'Participate in group discussion', earned: true, icon: Users },
                  { name: 'Early Bird', description: 'Study before 8 AM', earned: false, icon: Clock },
                  { name: 'Night Owl', description: 'Study after 10 PM', earned: false, icon: Moon },
                ].map((badge, index) => (
                  <div key={index} className={cn('text-center p-4 rounded-xl border', badge.earned ? 'border-primary/30 bg-primary/5' : 'border-border opacity-50')}>
                    <div className={cn('w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center', badge.earned ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                      <badge.icon className="w-6 h-6" />
                    </div>
                    <p className="font-medium text-sm">{badge.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// PHASE 8: PORTAL
// ============================================
function Phase8Portal() {
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [progress] = useState([
    { course: 'Information Security', progress: 85, modules: '6/7 completed' },
    { course: 'Data Privacy', progress: 60, modules: '3/5 completed' },
    { course: 'Compliance Training', progress: 30, modules: '2/6 completed' },
  ]);

  const faqs = [
    { id: '1', q: 'How do I reset my password?', a: 'Go to Settings > Security > Change Password. Follow the prompts to reset.' },
    { id: '2', q: 'Can I access courses offline?', a: 'Some courses support offline mode. Download the content from the course page.' },
    { id: '3', q: 'How do I track my progress?', a: 'Your progress is shown on the dashboard and within each course.' },
  ];

  const courses = [
    { id: '1', title: 'Information Security Fundamentals', category: 'Security', duration: '4 hours', modules: 7, enrolled: true },
    { id: '2', title: 'Data Privacy Best Practices', category: 'Compliance', duration: '3 hours', modules: 5, enrolled: true },
    { id: '3', title: 'Cybersecurity Essentials', category: 'Security', duration: '6 hours', modules: 10, enrolled: false },
  ];

  return (
    <div className="space-y-6">
      {activeCourse ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{courses.find(c => c.id === activeCourse)?.title}</CardTitle>
              <Button variant="outline" onClick={() => setActiveCourse(null)}>Back to Portal</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center mb-6">
              <div className="text-white text-center">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Course Video Content</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Course Modules</h4>
              {['Introduction', 'Core Concepts', 'Practical Applications', 'Assessment'].map((module, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                  <CheckCircle2 className={cn('w-5 h-5', i < 2 ? 'text-emerald-500' : 'text-muted-foreground')} />
                  <span className="flex-1">{module}</span>
                  <span className="text-sm text-muted-foreground">{15 + i * 5} min</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Available Courses</CardTitle>
                <CardDescription>Browse and enroll in available training</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted cursor-pointer" onClick={() => course.enrolled && setActiveCourse(course.id)}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{course.title}</p>
                          <p className="text-sm text-muted-foreground">{course.category} • {course.modules} modules • {course.duration}</p>
                        </div>
                      </div>
                      {course.enrolled ? (
                        <Badge variant="default">Enrolled</Badge>
                      ) : (
                        <Button size="sm">Enroll</Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {progress.map((p, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{p.course}</span>
                        <span className="text-sm text-muted-foreground">{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} className="h-2 mb-1" />
                      <p className="text-xs text-muted-foreground">{p.modules}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {faqs.map((faq) => (
                  <div key={faq.id} className="border rounded-lg overflow-hidden">
                    <button onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)} className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors text-left">
                      <span className="font-medium">{faq.q}</span>
                      {expandedFaq === faq.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedFaq === faq.id && (
                      <div className="px-4 pb-4 text-sm text-muted-foreground">{faq.a}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================
// PHASE 9: GOVERNANCE
// ============================================
function Phase9Governance() {
  const [selectedTemplate, setSelectedTemplate] = useState('iso');
  const [compliance] = useState([
    { framework: 'ISO 27001', status: 'compliant', score: 94, lastAudit: '2024-01-15' },
    { framework: 'GDPR', status: 'compliant', score: 89, lastAudit: '2024-01-10' },
    { framework: 'SOC 2', status: 'review', score: 78, lastAudit: '2024-01-05' },
  ]);

  const templates = {
    iso: 'ISO 27001: Information Security Management\n\n1. Security Policy\n2. Organization of Information Security\n3. Asset Management\n4. Human Resources Security\n5. Physical Security\n6. Communications Security\n7. Access Control',
    gdpr: 'GDPR Compliance Framework\n\n1. Lawfulness of Processing\n2. Data Subject Rights\n3. Privacy by Design\n4. Data Breach Notification\n5. Data Protection Officer\n6. Records of Processing',
    soc2: 'SOC 2 Trust Services Criteria\n\n1. Security (Common Criteria)\n2. Availability\n3. Processing Integrity\n4. Confidentiality\n5. Privacy',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Compliance Frameworks</CardTitle>
            <CardDescription>Organizational compliance status overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {compliance.map((item) => (
                <div key={item.framework} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', item.status === 'compliant' ? 'bg-emerald-500/10' : 'bg-amber-500/10')}>
                      <Shield className={cn('w-6 h-6', item.status === 'compliant' ? 'text-emerald-500' : 'text-amber-500')} />
                    </div>
                    <div>
                      <p className="font-medium">{item.framework}</p>
                      <p className="text-sm text-muted-foreground">Last audit: {item.lastAudit}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn('text-2xl font-bold', item.score >= 90 ? 'text-emerald-600' : item.score >= 70 ? 'text-amber-600' : 'text-red-600')}>{item.score}%</div>
                    <Badge variant={item.status === 'compliant' ? 'default' : 'secondary'}>{item.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { event: 'Course completed', user: 'Sarah Johnson', time: '2 hours ago' },
                { event: 'Assessment passed', user: 'Michael Chen', time: '4 hours ago' },
                { event: 'Policy acknowledged', user: 'Emily Davis', time: '1 day ago' },
                { event: 'Compliance report', user: 'System', time: '2 days ago' },
              ].map((event, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="text-sm font-medium">{event.event}</p>
                    <p className="text-xs text-muted-foreground">{event.user} • {event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Compliance Templates</CardTitle>
              <CardDescription>Select and customize compliance frameworks</CardDescription>
            </div>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iso">ISO 27001</SelectItem>
                <SelectItem value="gdpr">GDPR</SelectItem>
                <SelectItem value="soc2">SOC 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
            {templates[selectedTemplate as keyof typeof templates]}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


// ============================================
// MAIN ELS STUDIO COMPONENT
// ============================================
interface ELSStudioProps {
  isDarkMode?: boolean;
}

export function ELSStudio(_props: ELSStudioProps = {}) {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState<'studio' | 'scenarios' | 'analytics'>('studio');

  const currentStage = STAGES.find(s => s.id === currentPhase) || STAGES[0];

  const renderPhase = () => {
    switch (currentPhase) {
      case 1: return <Phase1Ingestion />;
      case 2: return <Phase2Analyze />;
      case 3: return <Phase3Design />;
      case 4: return <Phase4Develop />;
      case 5: return <Phase5Implement />;
      case 6: return <Phase6Evaluate />;
      case 7: return <Phase7Personalize />;
      case 8: return <Phase8Portal />;
      case 9: return <Phase9Governance />;
      default: return <Phase1Ingestion />;
    }
  };

  if (view === 'scenarios') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background flex">
          <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} currentView={view} onViewChange={setView} currentPhase={currentPhase} onPhaseChange={setCurrentPhase} />
          <main className="flex-1 flex flex-col min-w-0">
            <header className="h-16 border-b bg-card flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                {!sidebarOpen && (
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                    <PanelLeft className="w-5 h-5" />
                  </Button>
                )}
                <div>
                  <h1 className="font-semibold">Learning Scenarios</h1>
                  <p className="text-xs text-muted-foreground">AI-generated training scenarios</p>
                </div>
              </div>
            </header>
            <div className="flex-1 p-6 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Scenario Library</CardTitle>
                  <CardDescription>Generate realistic learning scenarios for your training programs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: 'Phishing Detection', description: 'Simulated phishing email scenarios', category: 'Security', difficulty: 'Intermediate' },
                      { title: 'Data Breach Response', description: 'Incident response simulation', category: 'Security', difficulty: 'Advanced' },
                      { title: 'Customer Complaint', description: 'Handling difficult customer situations', category: 'Soft Skills', difficulty: 'Beginner' },
                      { title: 'Team Conflict', description: 'Resolving workplace conflicts', category: 'Management', difficulty: 'Intermediate' },
                    ].map((scenario, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold">{scenario.title}</h3>
                            <Badge variant="outline">{scenario.difficulty}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary">{scenario.category}</Badge>
                            <Button size="sm">Preview</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  if (view === 'analytics') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background flex">
          <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} currentView={view} onViewChange={setView} currentPhase={currentPhase} onPhaseChange={setCurrentPhase} />
          <main className="flex-1 flex flex-col min-w-0">
            <header className="h-16 border-b bg-card flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                {!sidebarOpen && (
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                    <PanelLeft className="w-5 h-5" />
                  </Button>
                )}
                <div>
                  <h1 className="font-semibold">Analytics Dashboard</h1>
                  <p className="text-xs text-muted-foreground">Learning metrics and insights</p>
                </div>
              </div>
            </header>
            <div className="flex-1 p-6 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Learners', value: 1247, change: '+12%', icon: Users },
                  { label: 'Avg Completion', value: 87, suffix: '%', change: '+5%', icon: CheckCircle2 },
                  { label: 'Avg Score', value: 82, suffix: '%', change: '+3%', icon: BarChart3 },
                  { label: 'Time Spent', value: 4.2, suffix: 'h', change: '+8%', icon: Clock },
                ].map((stat, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold"><AnimatedCounter value={stat.value} suffix={stat.suffix || ''} /></p>
                            <span className="text-xs text-emerald-600">{stat.change}</span>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <stat.icon className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Learning Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end gap-2">
                    {[65, 78, 82, 91, 88, 95, 102, 98, 105, 112, 108, 115].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-primary/20 rounded-t" style={{ height: `${h * 2}px` }}>
                          <div className="w-full h-full bg-primary rounded-t opacity-80" />
                        </div>
                        <span className="text-xs text-muted-foreground">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} currentView={view} onViewChange={setView} currentPhase={currentPhase} onPhaseChange={setCurrentPhase} />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b bg-card flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                  <PanelLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', `bg-${currentStage.color}-500/10`)}>
                  <currentStage.icon className={cn('w-5 h-5', `text-${currentStage.color}-500`)} />
                </div>
                <div>
                  <h1 className="font-semibold">{currentStage.title}</h1>
                  <p className="text-xs text-muted-foreground">Phase {currentStage.id} of 9</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setCurrentPhase(Math.max(1, currentPhase - 1))} disabled={currentPhase === 1}>
                <ChevronLeft className="w-4 h-4 mr-1" />Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPhase(Math.min(9, currentPhase + 1))} disabled={currentPhase === 9}>
                Next<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {renderPhase()}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default ELSStudio;
