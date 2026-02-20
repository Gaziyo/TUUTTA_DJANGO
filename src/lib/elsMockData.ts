import type { 
  Phase, User, UploadedFile, Course, Assessment, 
  ComplianceRequirement, Notification, LearningPath, 
  DashboardStats, AuditLog 
} from '@/types/els';

export const phases: Phase[] = [
  {
    id: 1,
    name: 'Content Ingestion',
    description: 'Upload and preprocess organizational content',
    icon: 'Upload',
    color: 'hsl(var(--phase-ingest))',
    status: 'completed',
    progress: 100
  },
  {
    id: 2,
    name: 'Analyze',
    description: 'Learner needs and content gap analysis',
    icon: 'Search',
    color: 'hsl(var(--phase-analyze))',
    status: 'completed',
    progress: 100
  },
  {
    id: 3,
    name: 'Design',
    description: 'Course blueprint and instructional design',
    icon: 'Pencil',
    color: 'hsl(var(--phase-design))',
    status: 'in-progress',
    progress: 65
  },
  {
    id: 4,
    name: 'Develop',
    description: 'AI content generation and assessment creation',
    icon: 'Sparkles',
    color: 'hsl(var(--phase-develop))',
    status: 'pending',
    progress: 0
  },
  {
    id: 5,
    name: 'Implement',
    description: 'Learning delivery and enrollment',
    icon: 'Rocket',
    color: 'hsl(var(--phase-implement))',
    status: 'pending',
    progress: 0
  },
  {
    id: 6,
    name: 'Evaluate',
    description: 'Performance tracking and analytics',
    icon: 'BarChart3',
    color: 'hsl(var(--phase-evaluate))',
    status: 'pending',
    progress: 0
  },
  {
    id: 7,
    name: 'Personalize',
    description: 'Adaptive learning paths and recommendations',
    icon: 'UserCog',
    color: 'hsl(var(--phase-personalize))',
    status: 'pending',
    progress: 0
  },
  {
    id: 8,
    name: 'Manager Portal',
    description: 'Stakeholder dashboards and compliance reports',
    icon: 'Users',
    color: 'hsl(var(--phase-portal))',
    status: 'pending',
    progress: 0
  },
  {
    id: 9,
    name: 'Governance',
    description: 'System monitoring and audit controls',
    icon: 'Shield',
    color: 'hsl(var(--phase-govern))',
    status: 'pending',
    progress: 0
  }
];

export const users: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'Training Manager',
    department: 'Human Resources',
    skills: [
      { id: '1', name: 'Leadership', level: 85, category: 'Management' },
      { id: '2', name: 'Compliance', level: 92, category: 'Regulatory' },
      { id: '3', name: 'Communication', level: 78, category: 'Soft Skills' }
    ],
    progress: 87,
    lastActive: new Date('2024-01-30')
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    role: 'Software Engineer',
    department: 'Engineering',
    skills: [
      { id: '4', name: 'JavaScript', level: 95, category: 'Technical' },
      { id: '5', name: 'System Design', level: 72, category: 'Technical' },
      { id: '6', name: 'Security', level: 65, category: 'Compliance' }
    ],
    progress: 62,
    lastActive: new Date('2024-01-31')
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    role: 'Compliance Officer',
    department: 'Legal',
    skills: [
      { id: '7', name: 'GDPR', level: 98, category: 'Regulatory' },
      { id: '8', name: 'Risk Assessment', level: 88, category: 'Compliance' },
      { id: '9', name: 'Audit', level: 91, category: 'Compliance' }
    ],
    progress: 94,
    lastActive: new Date('2024-01-29')
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david.kim@company.com',
    role: 'Sales Representative',
    department: 'Sales',
    skills: [
      { id: '10', name: 'Negotiation', level: 82, category: 'Sales' },
      { id: '11', name: 'Product Knowledge', level: 75, category: 'Technical' },
      { id: '12', name: 'CRM', level: 68, category: 'Tools' }
    ],
    progress: 45,
    lastActive: new Date('2024-01-31')
  },
  {
    id: '5',
    name: 'Lisa Thompson',
    email: 'lisa.thompson@company.com',
    role: 'HR Specialist',
    department: 'Human Resources',
    skills: [
      { id: '13', name: 'Recruitment', level: 89, category: 'HR' },
      { id: '14', name: 'Onboarding', level: 93, category: 'HR' },
      { id: '15', name: 'Conflict Resolution', level: 77, category: 'Soft Skills' }
    ],
    progress: 71,
    lastActive: new Date('2024-01-30')
  },
  {
    id: '6',
    name: 'James Wilson',
    email: 'james.wilson@company.com',
    role: 'Data Analyst',
    department: 'Analytics',
    skills: [
      { id: '16', name: 'SQL', level: 88, category: 'Technical' },
      { id: '17', name: 'Python', level: 82, category: 'Technical' },
      { id: '18', name: 'Data Visualization', level: 76, category: 'Technical' }
    ],
    progress: 58,
    lastActive: new Date('2024-01-28')
  }
];

export const uploadedFiles: UploadedFile[] = [
  {
    id: '1',
    name: 'Employee_Handbook_2024.pdf',
    type: 'pdf',
    size: 4523456,
    status: 'completed',
    progress: 100,
    extractedContent: 'Employee handbook content...',
    tags: ['HR', 'Policy', 'Onboarding'],
    uploadedAt: new Date('2024-01-25')
  },
  {
    id: '2',
    name: 'Security_Policies.docx',
    type: 'docx',
    size: 2345678,
    status: 'completed',
    progress: 100,
    extractedContent: 'Security policy content...',
    tags: ['Security', 'Compliance', 'IT'],
    uploadedAt: new Date('2024-01-26')
  },
  {
    id: '3',
    name: 'Compliance_Training.pptx',
    type: 'pptx',
    size: 8912345,
    status: 'processing',
    progress: 67,
    tags: ['Compliance', 'Training'],
    uploadedAt: new Date('2024-01-30')
  },
  {
    id: '4',
    name: 'Safety_Procedures.mp4',
    type: 'video',
    size: 456789012,
    status: 'completed',
    progress: 100,
    tags: ['Safety', 'Training', 'Video'],
    uploadedAt: new Date('2024-01-27')
  },
  {
    id: '5',
    name: 'Code_of_Conduct.pdf',
    type: 'pdf',
    size: 1234567,
    status: 'completed',
    progress: 100,
    extractedContent: 'Code of conduct content...',
    tags: ['Ethics', 'Compliance', 'Policy'],
    uploadedAt: new Date('2024-01-28')
  }
];

export const courses: Course[] = [
  {
    id: '1',
    title: 'Information Security Awareness',
    description: 'Comprehensive security training for all employees',
    modules: [
      {
        id: 'm1',
        title: 'Introduction to Information Security',
        description: 'Basic concepts and importance',
        units: [
          { id: 'u1', title: 'What is Information Security?', content: '...', type: 'text', duration: 15, order: 1 },
          { id: 'u2', title: 'Common Threats', content: '...', type: 'video', duration: 20, order: 2 }
        ],
        order: 1
      },
      {
        id: 'm2',
        title: 'Password Security',
        description: 'Best practices for password management',
        units: [
          { id: 'u3', title: 'Creating Strong Passwords', content: '...', type: 'interactive', duration: 10, order: 1 },
          { id: 'u4', title: 'Multi-Factor Authentication', content: '...', type: 'text', duration: 15, order: 2 }
        ],
        order: 2
      }
    ],
    learningOutcomes: [
      { id: 'lo1', description: 'Identify common security threats', taxonomy: 'understand', measurable: true },
      { id: 'lo2', description: 'Implement strong password practices', taxonomy: 'apply', measurable: true },
      { id: 'lo3', description: 'Recognize phishing attempts', taxonomy: 'analyze', measurable: true }
    ],
    status: 'published',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-25')
  },
  {
    id: '2',
    title: 'GDPR Compliance Training',
    description: 'Understanding data protection regulations',
    modules: [
      {
        id: 'm3',
        title: 'GDPR Fundamentals',
        description: 'Core principles of GDPR',
        units: [
          { id: 'u5', title: 'Key Principles', content: '...', type: 'text', duration: 25, order: 1 },
          { id: 'u6', title: 'Data Subject Rights', content: '...', type: 'video', duration: 30, order: 2 }
        ],
        order: 1
      }
    ],
    learningOutcomes: [
      { id: 'lo4', description: 'Explain GDPR principles', taxonomy: 'understand', measurable: true },
      { id: 'lo5', description: 'Handle data subject requests', taxonomy: 'apply', measurable: true }
    ],
    status: 'draft',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  }
];

export const assessments: Assessment[] = [
  {
    id: '1',
    title: 'Security Awareness Quiz',
    type: 'mcq',
    difficulty: 'intermediate',
    questions: [
      {
        id: 'q1',
        text: 'What is the most secure way to create a password?',
        type: 'mcq',
        options: ['Use personal information', 'Use a mix of letters, numbers, and symbols', 'Use the same password everywhere', 'Write it down'],
        correctAnswer: 'Use a mix of letters, numbers, and symbols',
        points: 10
      },
      {
        id: 'q2',
        text: 'What should you do if you receive a suspicious email?',
        type: 'mcq',
        options: ['Click the link to check', 'Forward it to colleagues', 'Report it to IT', 'Delete it immediately'],
        correctAnswer: 'Report it to IT',
        points: 10
      }
    ],
    timeLimit: 20
  }
];

export const complianceRequirements: ComplianceRequirement[] = [
  {
    id: '1',
    name: 'Annual Security Training',
    description: 'All employees must complete security awareness training annually',
    priority: 'high',
    deadline: new Date('2024-03-31'),
    assignedRoles: ['All Employees'],
    completionRate: 78
  },
  {
    id: '2',
    name: 'GDPR Certification',
    description: 'Data handlers must complete GDPR compliance certification',
    priority: 'high',
    deadline: new Date('2024-02-28'),
    assignedRoles: ['HR', 'Legal', 'IT', 'Sales'],
    completionRate: 92
  },
  {
    id: '3',
    name: 'Workplace Safety',
    description: 'Basic workplace safety procedures training',
    priority: 'medium',
    deadline: new Date('2024-06-30'),
    assignedRoles: ['All Employees'],
    completionRate: 45
  },
  {
    id: '4',
    name: 'Anti-Harassment Training',
    description: 'Preventing and responding to workplace harassment',
    priority: 'high',
    deadline: new Date('2024-04-15'),
    assignedRoles: ['All Employees', 'Managers'],
    completionRate: 63
  }
];

export const notifications: Notification[] = [
  {
    id: '1',
    title: 'Course Published',
    message: 'Information Security Awareness course has been published',
    type: 'success',
    read: false,
    createdAt: new Date('2024-01-31T10:30:00')
  },
  {
    id: '2',
    title: 'Compliance Deadline Approaching',
    message: 'GDPR Certification deadline is in 28 days',
    type: 'warning',
    read: false,
    createdAt: new Date('2024-01-31T09:15:00')
  },
  {
    id: '3',
    title: 'New Content Processed',
    message: 'Security_Policies.docx has been successfully processed',
    type: 'info',
    read: true,
    createdAt: new Date('2024-01-30T16:45:00')
  },
  {
    id: '4',
    title: 'Assessment Failed',
    message: '3 learners failed the Security Awareness Quiz',
    type: 'error',
    read: false,
    createdAt: new Date('2024-01-30T14:20:00')
  }
];

export const learningPaths: LearningPath[] = [
  {
    id: 'lp1',
    userId: '2',
    nodes: [
      { id: 'n1', title: 'Security Basics', type: 'module', dependencies: [], estimatedTime: 30, completed: true },
      { id: 'n2', title: 'Password Security', type: 'module', dependencies: ['n1'], estimatedTime: 20, completed: true },
      { id: 'n3', title: 'Security Quiz', type: 'assessment', dependencies: ['n2'], estimatedTime: 15, completed: false },
      { id: 'n4', title: 'Advanced Threats', type: 'module', dependencies: ['n3'], estimatedTime: 45, completed: false }
    ],
    currentNodeId: 'n3',
    completedNodes: ['n1', 'n2']
  }
];

export const dashboardStats: DashboardStats = {
  activeCourses: 12,
  totalLearners: 248,
  completionRate: 73,
  complianceScore: 87,
  recentActivity: [
    {
      id: 'a1',
      user: users[0],
      action: 'published course',
      target: 'Information Security Awareness',
      timestamp: new Date('2024-01-31T11:00:00')
    },
    {
      id: 'a2',
      user: users[1],
      action: 'completed module',
      target: 'Password Security',
      timestamp: new Date('2024-01-31T10:45:00')
    },
    {
      id: 'a3',
      user: users[2],
      action: 'uploaded document',
      target: 'Compliance_Training.pptx',
      timestamp: new Date('2024-01-31T10:30:00')
    },
    {
      id: 'a4',
      user: users[3],
      action: 'started course',
      target: 'GDPR Compliance Training',
      timestamp: new Date('2024-01-31T09:15:00')
    },
    {
      id: 'a5',
      user: users[4],
      action: 'passed assessment',
      target: 'Security Awareness Quiz',
      timestamp: new Date('2024-01-31T08:50:00')
    }
  ]
};

export const auditLogs: AuditLog[] = [
  {
    id: 'al1',
    action: 'Course Published',
    userId: '1',
    userName: 'Sarah Johnson',
    timestamp: new Date('2024-01-31T11:00:00'),
    details: { courseId: '1', courseName: 'Information Security Awareness' }
  },
  {
    id: 'al2',
    action: 'Content Uploaded',
    userId: '3',
    userName: 'Emily Rodriguez',
    timestamp: new Date('2024-01-31T10:30:00'),
    details: { fileName: 'Compliance_Training.pptx', fileSize: 8912345 }
  },
  {
    id: 'al3',
    action: 'Assessment Completed',
    userId: '2',
    userName: 'Michael Chen',
    timestamp: new Date('2024-01-31T10:15:00'),
    details: { assessmentId: '1', score: 85, passed: true }
  },
  {
    id: 'al4',
    action: 'User Role Updated',
    userId: '1',
    userName: 'Sarah Johnson',
    timestamp: new Date('2024-01-30T16:00:00'),
    details: { targetUserId: '5', oldRole: 'HR Assistant', newRole: 'HR Specialist' }
  },
  {
    id: 'al5',
    action: 'AI Content Generated',
    userId: '1',
    userName: 'Sarah Johnson',
    timestamp: new Date('2024-01-30T14:30:00'),
    details: { type: 'lesson', moduleId: 'm2', tokensUsed: 1247 }
  }
];

// Analytics time series data
export const timeSeriesData = [
  { date: '2024-01-01', completions: 12, activeUsers: 45, averageScore: 78 },
  { date: '2024-01-05', completions: 18, activeUsers: 52, averageScore: 80 },
  { date: '2024-01-10', completions: 25, activeUsers: 61, averageScore: 82 },
  { date: '2024-01-15', completions: 32, activeUsers: 68, averageScore: 79 },
  { date: '2024-01-20', completions: 28, activeUsers: 72, averageScore: 81 },
  { date: '2024-01-25', completions: 35, activeUsers: 78, averageScore: 83 },
  { date: '2024-01-31', completions: 42, activeUsers: 85, averageScore: 85 }
];

// Skill gap matrix data
export const skillGapMatrix = {
  roles: ['Engineering', 'HR', 'Sales', 'Legal', 'Analytics'],
  skills: ['Security', 'Compliance', 'Communication', 'Technical', 'Leadership'],
  data: [
    [65, 45, 70, 95, 55], // Engineering
    [55, 85, 90, 40, 75], // HR
    [50, 60, 95, 50, 70], // Sales
    [60, 98, 85, 45, 80], // Legal
    [70, 55, 65, 90, 50]  // Analytics
  ]
};
