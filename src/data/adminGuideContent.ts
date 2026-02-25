// ============================================================================
// ADMIN GUIDE CONTENT
// Moodle-style documentation content for the App Admin Guide
// ============================================================================

export interface GuideStep {
  title: string;
  description: string;
  tip?: string;
  action?: {
    label: string;
    route: string;
  };
}

export interface GuideContent {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'get_started' | 'manage_course' | 'manage_site' | 'activities';
  estimatedTime: string;
  steps: GuideStep[];
  relatedGuides?: string[];
  tryItRoute?: string;
  media?: {
    title: string;
    description: string;
    type: 'video' | 'image' | 'embed';
    url: string;
  };
  demo?: {
    title: string;
    description: string;
    type: 'workshop_wizard' | 'forum_preview' | 'assignment_builder';
  };
}

export const guideContent: Record<string, GuideContent> = {
  // ============================================================================
  // GET STARTED GUIDES
  // ============================================================================
  browse_features: {
    id: 'browse_features',
    title: 'Browse Features',
    description: 'Explore all the powerful features available in Tuutta LMS to enhance your learning experience.',
    icon: 'compass',
    category: 'get_started',
    estimatedTime: '5 min',
    steps: [
      {
        title: 'Course Management',
        description: 'Create and organize courses with modules, lessons, and multimedia content. Support for SCORM, videos, documents, and interactive content.',
        tip: 'Use the Course Builder for a guided course creation experience.'
      },
      {
        title: 'Learning Paths',
        description: 'Chain multiple courses together into structured learning journeys with prerequisites and milestones.',
        tip: 'Learning paths are great for certification programs and onboarding sequences.'
      },
      {
        title: 'Assessments & Quizzes',
        description: 'Build quizzes with multiple question types: multiple choice, true/false, fill-in-the-blank, matching, and short answer.',
        tip: 'Set passing scores and attempt limits to ensure mastery.'
      },
      {
        title: 'Analytics & Reporting',
        description: 'Track learner progress, completion rates, and performance with detailed dashboards and exportable reports.',
        tip: 'Use the Reports Dashboard to identify at-risk learners early.'
      },
      {
        title: 'AI-Powered Tutoring',
        description: 'Context-aware AI assistant that helps learners understand course content and answers questions in real-time.',
        tip: 'The AI Tutor adapts to the current course context automatically.'
      },
      {
        title: 'Gamification',
        description: 'Motivate learners with badges, points, leaderboards, and achievement systems.',
        tip: 'Gamification can increase course completion rates by up to 60%.'
      }
    ],
    tryItRoute: '/admin/content',
    relatedGuides: ['admin_quick_guide', 'teacher_quick_guide']
  },

  teacher_quick_guide: {
    id: 'teacher_quick_guide',
    title: 'Teacher Quick Guide',
    description: 'Get up and running as an instructor in just 5 steps. Learn how to create engaging courses and support your learners.',
    icon: 'graduation-cap',
    category: 'get_started',
    estimatedTime: '10 min',
    steps: [
      {
        title: 'Step 1: Create Your First Course',
        description: 'Navigate to Courses in the admin menu and click "Create Course". Fill in the basic details: title, description, and category.',
        tip: 'Start with a clear, descriptive title that tells learners exactly what they\'ll learn.',
        action: {
          label: 'Create Course',
          route: '/admin/courses/new'
        }
      },
      {
        title: 'Step 2: Add Course Content',
        description: 'Build your course structure with modules and lessons. Add videos, documents, text content, or interactive elements to each lesson.',
        tip: 'Break content into bite-sized lessons (5-15 minutes each) for better engagement.'
      },
      {
        title: 'Step 3: Create Assessments',
        description: 'Add quizzes to test understanding. Set passing scores and configure feedback for correct/incorrect answers.',
        tip: 'Include knowledge checks throughout the course, not just at the end.',
        action: {
          label: 'Quiz Builder',
          route: '/admin/quizzes'
        }
      },
      {
        title: 'Step 4: Enroll Learners',
        description: 'Add learners to your course manually, via bulk import, or enable self-enrollment with an access code.',
        tip: 'Use enrollment rules to automatically assign courses based on department or role.',
        action: {
          label: 'Manage Enrollments',
          route: '/admin/enrollments'
        }
      },
      {
        title: 'Step 5: Monitor Progress',
        description: 'Track learner progress through the Reports Dashboard. Identify struggling learners and provide support.',
        tip: 'Set up automated reminders for learners who fall behind.',
        action: {
          label: 'View Reports',
          route: '/admin/reports'
        }
      }
    ],
    tryItRoute: '/admin/courses/new',
    relatedGuides: ['set_up_course', 'add_students', 'track_progress']
  },

  admin_quick_guide: {
    id: 'admin_quick_guide',
    title: 'Admin Quick Guide',
    description: 'Essential administration tasks for setting up and managing your learning platform.',
    icon: 'shield',
    category: 'get_started',
    estimatedTime: '15 min',
    steps: [
      {
        title: 'Step 1: Configure Site Settings',
        description: 'Set your organization name, timezone, default language, and branding. Upload your logo and customize colors.',
        tip: 'Consistent branding builds trust and recognition with learners.',
        action: {
          label: 'Site Settings',
          route: '/admin/settings'
        }
      },
      {
        title: 'Step 2: Set Up User Roles',
        description: 'Configure roles and permissions: Learner, Instructor, Team Lead, L&D Manager, Org Admin, and Super Admin.',
        tip: 'Use the principle of least privilege - only grant permissions that are needed.'
      },
      {
        title: 'Step 3: Add Users',
        description: 'Add users manually, import via CSV, or configure SSO integration for automatic provisioning.',
        tip: 'Bulk import is fastest for initial setup - prepare your CSV with required fields.',
        action: {
          label: 'User Management',
          route: '/admin/users'
        }
      },
      {
        title: 'Step 4: Create Course Categories',
        description: 'Organize courses into categories and departments for easier discovery and management.',
        tip: 'Think about how learners will search for courses when creating categories.'
      },
      {
        title: 'Step 5: Configure Notifications',
        description: 'Set up email templates for enrollments, reminders, completions, and certificates.',
        tip: 'Personalized notifications with learner names increase engagement.'
      },
      {
        title: 'Step 6: Set Up Compliance Tracking',
        description: 'Configure compliance requirements, due dates, and automated escalation for mandatory training.',
        tip: 'Use the Compliance Dashboard to monitor organization-wide compliance status.',
        action: {
          label: 'View Reports',
          route: '/admin/reports'
        }
      }
    ],
    tryItRoute: '/admin/settings',
    relatedGuides: ['add_users', 'add_courses', 'change_look_feel']
  },

  installation_guide: {
    id: 'installation_guide',
    title: 'Installation Quick Guide',
    description: 'Technical setup guide for deploying and configuring your Tuutta LMS instance.',
    icon: 'wrench',
    category: 'get_started',
    estimatedTime: '20 min',
    steps: [
      {
        title: 'Step 1: Environment Setup',
        description: 'Ensure you have Node.js 18+, npm/yarn, and a modern browser. Clone the repository and install dependencies.',
        tip: 'Use nvm to manage Node.js versions for easier upgrades.'
      },
      {
        title: 'Step 2: Configure Environment Variables',
        description: 'Copy .env.example to .env and configure: API endpoints, API keys, and feature flags.',
        tip: 'Never commit .env files to version control - use environment-specific configs.'
      },
      {
        title: 'Step 3: Database Setup',
        description: 'Configure Django database settings and run migrations for your PostgreSQL environment.',
        tip: 'Validate database connectivity and migration health before production rollout.'
      },
      {
        title: 'Step 4: Authentication Setup',
        description: 'Configure Django authentication flow (JWT/login endpoints) and any external SSO provider integration.',
        tip: 'Start with email/password for testing, add SSO later for enterprise deployment.'
      },
      {
        title: 'Step 5: Build and Deploy',
        description: 'Run npm run build to create production bundles. Deploy frontend to your host and backend to Render.',
        tip: 'Use preview deployments for testing before pushing to production.'
      },
      {
        title: 'Step 6: Post-Deployment Verification',
        description: 'Create your first admin account, configure organization settings, and test the complete user flow.',
        tip: 'Document your configuration for team members and future reference.'
      }
    ],
    tryItRoute: '/admin/settings',
    relatedGuides: ['admin_quick_guide']
  },

  // ============================================================================
  // MANAGE YOUR COURSE GUIDES
  // ============================================================================
  set_up_course: {
    id: 'set_up_course',
    title: 'Set Up Your Course',
    description: 'Complete guide to creating an effective online course from scratch.',
    icon: 'book-open',
    category: 'manage_course',
    estimatedTime: '15 min',
    steps: [
      {
        title: 'Define Learning Objectives',
        description: 'Start by identifying what learners should know or be able to do after completing the course. Write clear, measurable objectives.',
        tip: 'Use action verbs: "Learners will be able to explain...", "demonstrate...", "apply..."'
      },
      {
        title: 'Create Course Structure',
        description: 'Organize content into modules (topics) and lessons (individual learning units). Plan the logical flow of information.',
        tip: 'Aim for 3-7 modules per course and 3-5 lessons per module for optimal engagement.'
      },
      {
        title: 'Add Content Types',
        description: 'Mix content types for engagement: videos for demonstrations, documents for reference, text for explanations, and quizzes for practice.',
        tip: 'Videos under 6 minutes have the highest completion rates.',
        action: {
          label: 'Content Library',
          route: '/admin/content'
        }
      },
      {
        title: 'Configure Course Settings',
        description: 'Set enrollment options, completion requirements, certificate settings, and access permissions.',
        tip: 'Enable sequential progress to ensure learners complete prerequisites before advancing.'
      },
      {
        title: 'Preview and Test',
        description: 'Use the preview mode to experience the course as a learner. Check all content loads correctly and navigation works.',
        tip: 'Have a colleague review the course before publishing for fresh perspective.'
      },
      {
        title: 'Publish Your Course',
        description: 'When ready, change course status to "Published". The course will become available to enrolled learners.',
        tip: 'Start with a pilot group before rolling out to all learners.'
      }
    ],
    tryItRoute: '/admin/courses/new',
    relatedGuides: ['add_students', 'upload_files', 'use_assignments']
  },

  add_students: {
    id: 'add_students',
    title: 'Add Students',
    description: 'Learn the different ways to enroll learners in your courses.',
    icon: 'users',
    category: 'manage_course',
    estimatedTime: '8 min',
    steps: [
      {
        title: 'Manual Enrollment',
        description: 'Add individual learners by searching for their name or email. Assign them to specific courses with a start date.',
        tip: 'Use manual enrollment for VIP learners or special cases.',
        action: {
          label: 'Enrollments',
          route: '/admin/enrollments'
        }
      },
      {
        title: 'Bulk Import',
        description: 'Upload a CSV file with learner emails and course assignments. The system will process enrollments automatically.',
        tip: 'Download the CSV template first to ensure correct formatting.'
      },
      {
        title: 'Self-Enrollment',
        description: 'Enable self-enrollment on courses so learners can browse the catalog and enroll themselves.',
        tip: 'Add an enrollment key for courses that should be restricted to certain groups.'
      },
      {
        title: 'Assignment Rules',
        description: 'Create rules to automatically enroll learners based on department, job title, location, or custom attributes.',
        tip: 'Assignment rules are powerful for onboarding - new hires get enrolled automatically.',
        action: {
          label: 'Training Assignment',
          route: '/admin/assignments'
        }
      },
      {
        title: 'Invite Links',
        description: 'Generate shareable links that allow anyone with the link to enroll. Great for external partners or contractors.',
        tip: 'Set expiration dates on invite links for security.'
      }
    ],
    tryItRoute: '/admin/enrollments',
    relatedGuides: ['track_progress', 'set_up_course']
  },

  track_progress: {
    id: 'track_progress',
    title: 'Track Progress',
    description: 'Monitor learner progress and identify opportunities for intervention.',
    icon: 'bar-chart-2',
    category: 'manage_course',
    estimatedTime: '10 min',
    steps: [
      {
        title: 'Dashboard Overview',
        description: 'The Reports Dashboard shows key metrics: active learners, completion rates, overdue enrollments, and average scores.',
        tip: 'Check the dashboard weekly to catch issues early.',
        action: {
          label: 'Reports Dashboard',
          route: '/admin/reports'
        }
      },
      {
        title: 'Course-Level Reports',
        description: 'Drill into individual courses to see module completion, quiz scores, and time spent. Identify difficult content.',
        tip: 'Low completion on a specific module may indicate content issues.'
      },
      {
        title: 'Learner-Level Reports',
        description: 'View individual learner progress across all enrolled courses. See their learning history and achievements.',
        tip: 'Export learner reports for performance reviews or compliance audits.'
      },
      {
        title: 'Compliance Tracking',
        description: 'Monitor mandatory training completion with compliance dashboards. See who\'s compliant, at-risk, or overdue.',
        tip: 'Set up automated reminders before due dates to improve compliance rates.'
      },
      {
        title: 'Export and Share',
        description: 'Export reports to CSV or PDF for sharing with stakeholders. Schedule automated report delivery.',
        tip: 'Create saved report templates for recurring reporting needs.'
      }
    ],
    tryItRoute: '/admin/reports',
    relatedGuides: ['add_students', 'admin_quick_guide']
  },

  upload_files: {
    id: 'upload_files',
    title: 'Upload Files',
    description: 'Add content to the library for use across courses.',
    icon: 'upload',
    category: 'manage_course',
    estimatedTime: '5 min',
    steps: [
      {
        title: 'Access Content Library',
        description: 'Navigate to Content Library in the admin menu. This is your central repository for all learning content.',
        tip: 'Organize content into folders by topic or course for easier management.',
        action: {
          label: 'Content Library',
          route: '/admin/content'
        }
      },
      {
        title: 'Upload Files',
        description: 'Click "Upload" or drag and drop files. Supported formats: MP4, PDF, DOCX, PPTX, SCORM packages, and images.',
        tip: 'Compress large videos before uploading for faster loading.'
      },
      {
        title: 'Add Metadata',
        description: 'Tag files with keywords, descriptions, and categories. Good metadata makes content easier to find and reuse.',
        tip: 'Use consistent naming conventions: "Module1_Lesson2_Introduction.mp4"'
      },
      {
        title: 'Organize in Folders',
        description: 'Create a folder structure that mirrors your course organization. Move files between folders as needed.',
        tip: 'Create an "Archive" folder for outdated content instead of deleting.'
      },
      {
        title: 'Use in Courses',
        description: 'When building courses, select content from the library. The same file can be used in multiple courses.',
        tip: 'Reusing content saves storage and ensures consistency across courses.'
      }
    ],
    tryItRoute: '/admin/content',
    relatedGuides: ['set_up_course', 'teacher_quick_guide']
  },

  // ============================================================================
  // MANAGE YOUR SITE GUIDES
  // ============================================================================
  add_users: {
    id: 'add_users',
    title: 'Add Users',
    description: 'Manage user accounts and access to your learning platform.',
    icon: 'user-plus',
    category: 'manage_site',
    estimatedTime: '10 min',
    steps: [
      {
        title: 'Manual User Creation',
        description: 'Click "Add User" and fill in required fields: name, email, and role. The user will receive a welcome email.',
        tip: 'Use consistent email formats for easier user management.',
        action: {
          label: 'User Management',
          route: '/admin/users'
        }
      },
      {
        title: 'Bulk Import Users',
        description: 'Upload a CSV with user details: name, email, role, department. Download the template for correct formatting.',
        tip: 'Validate emails before import to avoid bounce issues.'
      },
      {
        title: 'Assign Roles',
        description: 'Set appropriate roles: Learner (view courses), Instructor (create content), Admin (full management).',
        tip: 'Start with Learner role and upgrade as needed - easier than removing permissions.'
      },
      {
        title: 'Organize into Teams',
        description: 'Group users into teams and departments for easier course assignment and reporting.',
        tip: 'Mirror your organizational structure for intuitive management.',
        action: {
          label: 'Teams Management',
          route: '/admin/teams'
        }
      },
      {
        title: 'Configure SSO (Optional)',
        description: 'Set up Single Sign-On with Google, Microsoft, or SAML for seamless authentication.',
        tip: 'SSO reduces password fatigue and improves security.'
      }
    ],
    tryItRoute: '/admin/users',
    relatedGuides: ['admin_quick_guide', 'add_students']
  },

  add_courses: {
    id: 'add_courses',
    title: 'Add Courses',
    description: 'Create and manage courses in your learning catalog.',
    icon: 'graduation-cap',
    category: 'manage_site',
    estimatedTime: '12 min',
    steps: [
      {
        title: 'Create New Course',
        description: 'Navigate to Courses and click "Create Course". Enter title, description, category, and thumbnail image.',
        tip: 'Use compelling thumbnails - they significantly impact enrollment rates.',
        action: {
          label: 'Course Management',
          route: '/admin/courses'
        }
      },
      {
        title: 'Use Course Templates',
        description: 'Start from a template for common course types: onboarding, compliance, skills training, or certification.',
        tip: 'Templates save time and ensure consistent course structure.'
      },
      {
        title: 'Duplicate Existing Courses',
        description: 'Copy an existing course to create a new version. All content and settings are duplicated.',
        tip: 'Use duplication for annual compliance training updates.'
      },
      {
        title: 'Organize Course Catalog',
        description: 'Assign courses to categories for better organization. Set featured courses to highlight on the home page.',
        tip: 'Review and update categories quarterly as your catalog grows.'
      },
      {
        title: 'Course Lifecycle Management',
        description: 'Manage course states: Draft (building), Published (live), Archived (retired). Archive old versions instead of deleting.',
        tip: 'Keep archived courses for compliance records and historical reporting.'
      }
    ],
    tryItRoute: '/admin/courses/new',
    relatedGuides: ['set_up_course', 'teacher_quick_guide']
  },

  change_look_feel: {
    id: 'change_look_feel',
    title: 'Change the Look and Feel',
    description: 'Customize the appearance of your learning platform to match your brand.',
    icon: 'palette',
    category: 'manage_site',
    estimatedTime: '8 min',
    steps: [
      {
        title: 'Upload Logo',
        description: 'Add your organization logo to appear in the header and login page. Recommended size: 200x50 pixels.',
        tip: 'Use a transparent PNG for best results across light and dark modes.',
        action: {
          label: 'Settings',
          route: '/admin/settings'
        }
      },
      {
        title: 'Set Brand Colors',
        description: 'Configure primary and secondary colors to match your brand guidelines. Changes apply across the platform.',
        tip: 'Ensure sufficient contrast for accessibility (WCAG 2.1 AA standard).'
      },
      {
        title: 'Customize Login Page',
        description: 'Add a custom background image, welcome message, and support contact information to the login page.',
        tip: 'A friendly welcome message sets a positive tone for learners.'
      },
      {
        title: 'Configure Dark Mode',
        description: 'Enable or disable dark mode option for users. Set the default theme preference.',
        tip: 'Dark mode is popular for evening learners and reduces eye strain.'
      },
      {
        title: 'Custom CSS (Advanced)',
        description: 'For advanced customization, add custom CSS to fine-tune specific elements.',
        tip: 'Test custom CSS thoroughly - it may break with platform updates.'
      }
    ],
    tryItRoute: '/admin/settings',
    relatedGuides: ['admin_quick_guide', 'installation_guide']
  },

  install_plugins: {
    id: 'install_plugins',
    title: 'Install Plugins',
    description: 'Extend platform functionality with plugins and integrations.',
    icon: 'puzzle',
    category: 'manage_site',
    estimatedTime: '10 min',
    steps: [
      {
        title: 'Browse Available Plugins',
        description: 'Navigate to Settings > Plugins to see available integrations: video conferencing, content providers, HR systems.',
        tip: 'Read plugin descriptions carefully to understand requirements.',
        action: {
          label: 'Settings',
          route: '/admin/settings'
        }
      },
      {
        title: 'Install a Plugin',
        description: 'Click "Install" on the desired plugin. Configure required settings like API keys or connection strings.',
        tip: 'Test plugins in a staging environment before production deployment.'
      },
      {
        title: 'Configure Integration',
        description: 'Set up the connection between Tuutta and the external system. Map fields and configure sync settings.',
        tip: 'Document your integration configuration for troubleshooting.'
      },
      {
        title: 'Popular Integrations',
        description: 'Common integrations: Zoom/Teams (virtual classrooms), LinkedIn Learning (content), Workday/BambooHR (user sync).',
        tip: 'Start with one integration and add more as you become comfortable.'
      },
      {
        title: 'Manage Installed Plugins',
        description: 'Enable/disable plugins, update configurations, and monitor integration health from the plugins dashboard.',
        tip: 'Review plugin usage quarterly - disable unused integrations for security.'
      }
    ],
    tryItRoute: '/admin/settings',
    relatedGuides: ['admin_quick_guide']
  },

  // ============================================================================
  // ADD ACTIVITIES GUIDES
  // ============================================================================
  use_assignments: {
    id: 'use_assignments',
    title: 'Use Assignments to Assess',
    description: 'Create assignments for learners to demonstrate their knowledge and skills.',
    icon: 'clipboard-check',
    category: 'activities',
    estimatedTime: '12 min',
    media: {
      title: 'Assignment Builder Walkthrough',
      description: 'See how to configure instructions, submission types, due dates, and grading rubrics.',
      type: 'video',
      url: 'https://www.youtube.com/embed/5EJQhzUwqL0'
    },
    demo: {
      title: 'Assignment Builder Demo',
      description: 'Configure a sample assignment with rubric criteria and feedback settings.',
      type: 'assignment_builder'
    },
    steps: [
      {
        title: 'Create an Assignment',
        description: 'Add an assignment activity to your course. Set the title, instructions, and submission type (file upload, text, or URL).',
        tip: 'Clear instructions reduce learner confusion and support requests.',
        action: {
          label: 'Training Assignment',
          route: '/admin/assignments'
        }
      },
      {
        title: 'Set Due Dates',
        description: 'Configure submission deadlines. Enable late submissions with penalties if desired.',
        tip: 'Send reminder notifications 3 days and 1 day before the deadline.'
      },
      {
        title: 'Create Grading Rubric',
        description: 'Define grading criteria with point values. Rubrics ensure consistent, fair grading across learners.',
        tip: 'Share rubrics with learners upfront so they know expectations.'
      },
      {
        title: 'Review Submissions',
        description: 'View all submissions in one place. Download attachments, add comments, and assign grades.',
        tip: 'Use inline comments for specific feedback on written submissions.'
      },
      {
        title: 'Provide Feedback',
        description: 'Give constructive feedback that helps learners improve. Use audio/video feedback for a personal touch.',
        tip: 'Highlight what was done well before suggesting improvements.'
      }
    ],
    tryItRoute: '/admin/assignments',
    relatedGuides: ['test_with_quiz', 'track_progress']
  },

  discuss_in_forums: {
    id: 'discuss_in_forums',
    title: 'Discuss in Forums',
    description: 'Create discussion forums for collaborative learning and peer interaction.',
    icon: 'message-circle',
    category: 'activities',
    estimatedTime: '8 min',
    media: {
      title: 'Forum Moderation Highlights',
      description: 'Preview how moderators manage posts, pin replies, and guide healthy discussion.',
      type: 'video',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    },
    demo: {
      title: 'Forum Preview',
      description: 'A mock forum view showing threads, replies, and moderation actions.',
      type: 'forum_preview'
    },
    steps: [
      {
        title: 'Create a Forum',
        description: 'Add a forum activity to your course. Choose the forum type: general discussion, Q&A, or single topic.',
        tip: 'Q&A forums require learners to post before seeing others\' responses.',
        action: {
          label: 'Discussion Forums',
          route: '/admin/forums'
        }
      },
      {
        title: 'Set Discussion Guidelines',
        description: 'Write clear posting guidelines: expected participation, response length, and netiquette rules.',
        tip: 'Model good discussion behavior with your own thoughtful posts.'
      },
      {
        title: 'Seed with Starter Topics',
        description: 'Create initial discussion topics with thought-provoking questions to kickstart conversation.',
        tip: 'Open-ended questions generate more discussion than yes/no questions.'
      },
      {
        title: 'Moderate Discussions',
        description: 'Monitor discussions for inappropriate content. Pin important posts, mark answers, and guide conversations.',
        tip: 'Respond to posts within 24-48 hours to maintain engagement.'
      },
      {
        title: 'Grade Participation',
        description: 'Optionally, grade forum participation based on quantity and quality of contributions.',
        tip: 'Quality over quantity - reward thoughtful contributions, not just post count.'
      }
    ],
    tryItRoute: '/admin/forums',
    relatedGuides: ['set_up_course', 'teacher_quick_guide']
  },

  test_with_quiz: {
    id: 'test_with_quiz',
    title: 'Test Students with a Quiz',
    description: 'Create quizzes to assess learner understanding and reinforce learning.',
    icon: 'help-circle',
    category: 'activities',
    estimatedTime: '15 min',
    media: {
      title: 'Quiz Builder Tour',
      description: 'Explore question types, scoring rules, and auto-grading configuration.',
      type: 'video',
      url: 'https://www.youtube.com/embed/9bZkp7q19f0'
    },
    steps: [
      {
        title: 'Create a Quiz',
        description: 'Add a quiz activity to your course. Set the title, description, and time limit if desired.',
        tip: 'Time limits add challenge but can cause anxiety - use appropriately.',
        action: {
          label: 'Quiz Builder',
          route: '/admin/quizzes'
        }
      },
      {
        title: 'Add Questions',
        description: 'Create questions: Multiple Choice, True/False, Fill-in-the-Blank, Matching, Short Answer, or Essay.',
        tip: 'Mix question types to assess different levels of understanding.'
      },
      {
        title: 'Configure Question Settings',
        description: 'Set point values, shuffle options, and add feedback for correct/incorrect answers.',
        tip: 'Feedback on incorrect answers turns mistakes into learning moments.'
      },
      {
        title: 'Set Quiz Parameters',
        description: 'Configure: passing score, number of attempts, question order (shuffled or fixed), and review options.',
        tip: 'Allow 2-3 attempts for learning quizzes, 1 attempt for final assessments.'
      },
      {
        title: 'Create Question Banks',
        description: 'Build reusable question banks. Pull random questions for unique quizzes each attempt.',
        tip: 'Question banks with 3x the quiz length enable good randomization.'
      },
      {
        title: 'Review Results',
        description: 'Analyze quiz results: average scores, question difficulty, and discrimination indices.',
        tip: 'Questions everyone gets wrong (or right) may need revision.'
      }
    ],
    tryItRoute: '/admin/quizzes',
    relatedGuides: ['use_assignments', 'track_progress']
  },

  peer_assess_workshop: {
    id: 'peer_assess_workshop',
    title: 'Peer-Assess with a Workshop',
    description: 'Set up peer assessment activities where learners evaluate each other\'s work.',
    icon: 'layers',
    category: 'activities',
    estimatedTime: '15 min',
    media: {
      title: 'Workshop Phases Overview',
      description: 'Learn how setup, submission, assessment, and grading phases work together.',
      type: 'video',
      url: 'https://www.youtube.com/embed/FTQbiNvZqaY'
    },
    demo: {
      title: 'Workshop Wizard',
      description: 'Step through the phases and configure peer review allocations.',
      type: 'workshop_wizard'
    },
    steps: [
      {
        title: 'Create a Workshop',
        description: 'Add a workshop activity to your course. Workshops have phases: setup, submission, assessment, and grading.',
        tip: 'Plan your workshop timeline carefully - each phase needs adequate time.',
        action: {
          label: 'Workshop Builder',
          route: '/admin/workshops'
        }
      },
      {
        title: 'Define Assessment Criteria',
        description: 'Create the rubric learners will use to assess peers. Clear criteria ensure fair, consistent peer reviews.',
        tip: 'Include example responses showing different quality levels.'
      },
      {
        title: 'Configure Submission Phase',
        description: 'Set what learners submit: text, file upload, or both. Include clear instructions and examples.',
        tip: 'Show sample submissions so learners understand expectations.'
      },
      {
        title: 'Set Up Peer Allocation',
        description: 'Choose how peers are assigned: random, manual, or scheduled. Set the number of peers each learner assesses.',
        tip: '3-5 peer reviews provide good feedback diversity without overwhelming.'
      },
      {
        title: 'Guide the Assessment Phase',
        description: 'Open the assessment phase. Monitor progress and remind learners to complete their reviews.',
        tip: 'Provide rubric training so learners know how to give constructive feedback.'
      },
      {
        title: 'Calculate Final Grades',
        description: 'Close the workshop and calculate grades. Grades combine submission quality and assessment quality.',
        tip: 'Review outlier assessments - very high or low scores may need instructor adjustment.'
      }
    ],
    tryItRoute: '/admin/workshops',
    relatedGuides: ['use_assignments', 'discuss_in_forums']
  }
};

// Helper function to get guides by category
export function getGuidesByCategory(category: GuideContent['category']): GuideContent[] {
  return Object.values(guideContent).filter(guide => guide.category === category);
}

// Helper function to get related guides
export function getRelatedGuides(guideId: string): GuideContent[] {
  const guide = guideContent[guideId];
  if (!guide?.relatedGuides) return [];
  return guide.relatedGuides
    .map(id => guideContent[id])
    .filter(Boolean);
}
