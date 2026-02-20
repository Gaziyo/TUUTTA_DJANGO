import type { AgentHandler } from './AgentOrchestrator';
import type {
  AgentTask,
  TaskInput,
  TaskOutput,
  LearningDesignInput,
  LearningDesignOutput,
  CourseDesign,
  ModuleDesign,
  LessonDesign,
  LearningObjective,
  LearningPathDesign,
  AssessmentStrategy,
  PrerequisiteRequirement,
  AudienceProfile
} from '../types/agents';

// ============================================================================
// LEARNING DESIGN AGENT
// ============================================================================

/**
 * Learning Design Agent
 *
 * Responsibilities:
 * - Generate course structure from extracted content
 * - Create learning objectives aligned with Bloom's taxonomy
 * - Design module and lesson sequences
 * - Build learning paths with milestones
 * - Create assessment strategies
 * - Adapt difficulty to target audience
 */
export class LearningDesignAgent implements AgentHandler {
  type: 'learning-design' = 'learning-design';

  validate(input: TaskInput): boolean {
    const data = input.data as LearningDesignInput['data'];
    return !!(
      data.contentIngestionTaskId &&
      data.targetAudience &&
      data.learningGoals &&
      data.learningGoals.length > 0 &&
      data.deliveryFormat &&
      data.difficultyLevel
    );
  }

  estimateProcessingTime(input: TaskInput): number {
    const data = input.data as LearningDesignInput['data'];
    const baseTime = 45000; // 45 seconds base
    const goalMultiplier = Math.min(data.learningGoals.length * 0.5, 3);
    return baseTime * (1 + goalMultiplier);
  }

  async process(task: AgentTask): Promise<TaskOutput> {
    const input = task.input as LearningDesignInput;
    const {
      contentIngestionTaskId,
      targetAudience,
      learningGoals,
      timeConstraint,
      deliveryFormat,
      difficultyLevel
    } = input.data;

    try {
      // Step 1: Analyze learning goals and create objectives
      const objectives = await this.createLearningObjectives(learningGoals, difficultyLevel);

      // Step 2: Design course structure
      const courseStructure = await this.designCourseStructure(
        objectives,
        targetAudience,
        deliveryFormat,
        timeConstraint
      );

      // Step 3: Create learning path
      const learningPath = this.createLearningPath(courseStructure);

      // Step 4: Design assessment strategy
      const assessmentStrategy = this.createAssessmentStrategy(objectives, courseStructure);

      // Step 5: Identify prerequisites
      const prerequisites = this.identifyPrerequisites(targetAudience, difficultyLevel);

      // Step 6: Calculate estimated duration
      const estimatedDuration = this.calculateDuration(courseStructure);

      const output: LearningDesignOutput = {
        type: 'learning-design',
        confidence: 0.88,
        artifacts: [
          {
            id: `course-${courseStructure.id}`,
            type: 'course',
            name: courseStructure.title,
            data: courseStructure,
            createdAt: new Date()
          }
        ],
        data: {
          courseStructure,
          learningPath,
          assessmentStrategy,
          estimatedDuration,
          prerequisites
        }
      };

      return output;
    } catch (error) {
      throw new Error(`Learning design failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private async createLearningObjectives(
    learningGoals: string[],
    difficultyLevel: string
  ): Promise<LearningObjective[]> {
    await this.simulateProcessing(300);

    const bloomLevels: LearningObjective['bloomLevel'][] =
      difficultyLevel === 'beginner'
        ? ['remember', 'understand', 'apply']
        : difficultyLevel === 'advanced'
        ? ['analyze', 'evaluate', 'create']
        : ['understand', 'apply', 'analyze'];

    return learningGoals.map((goal, index) => ({
      id: `objective-${index + 1}`,
      statement: this.formatObjectiveStatement(goal, bloomLevels[index % bloomLevels.length]),
      bloomLevel: bloomLevels[index % bloomLevels.length],
      measurable: true,
      assessmentCriteria: this.generateAssessmentCriteria(goal)
    }));
  }

  private formatObjectiveStatement(goal: string, bloomLevel: string): string {
    const actionVerbs: Record<string, string[]> = {
      remember: ['identify', 'list', 'recall', 'recognize'],
      understand: ['explain', 'describe', 'summarize', 'interpret'],
      apply: ['apply', 'demonstrate', 'implement', 'use'],
      analyze: ['analyze', 'compare', 'differentiate', 'examine'],
      evaluate: ['evaluate', 'assess', 'critique', 'justify'],
      create: ['create', 'design', 'develop', 'construct']
    };

    const verbs = actionVerbs[bloomLevel] || actionVerbs.understand;
    const verb = verbs[Math.floor(Math.random() * verbs.length)];

    // Transform goal into objective format
    const baseGoal = goal.toLowerCase().replace(/^(to |understand |learn |know )/, '');
    return `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${baseGoal}`;
  }

  private generateAssessmentCriteria(goal: string): string[] {
    return [
      `Demonstrate understanding of ${goal.toLowerCase()}`,
      `Apply concepts in practical scenarios`,
      `Achieve minimum 70% on related assessments`
    ];
  }

  private async designCourseStructure(
    objectives: LearningObjective[],
    targetAudience: AudienceProfile,
    deliveryFormat: string,
    timeConstraint?: number
  ): Promise<CourseDesign> {
    await this.simulateProcessing(500);

    const modules = this.createModules(objectives, deliveryFormat, timeConstraint);
    const totalHours = modules.reduce((sum, m) => sum + m.estimatedMinutes, 0) / 60;

    return {
      id: `course-${Date.now()}`,
      title: 'Workplace Safety & Compliance Training',
      description: this.generateCourseDescription(objectives, targetAudience),
      objectives,
      modules,
      estimatedHours: Math.ceil(totalHours * 10) / 10,
      certificationAvailable: true
    };
  }

  private generateCourseDescription(
    objectives: LearningObjective[],
    audience: AudienceProfile
  ): string {
    return `This comprehensive training program is designed for ${audience.roles.join(', ')}
    at the ${audience.experienceLevel} level. Upon completion, learners will be able to
    ${objectives.slice(0, 3).map(o => o.statement.toLowerCase()).join(', ')}.`;
  }

  private createModules(
    objectives: LearningObjective[],
    deliveryFormat: string,
    timeConstraint?: number
  ): ModuleDesign[] {
    const modules: ModuleDesign[] = [];

    // Group objectives into logical modules
    const objectivesPerModule = Math.ceil(objectives.length / 3);

    for (let i = 0; i < Math.ceil(objectives.length / objectivesPerModule); i++) {
      const moduleObjectives = objectives.slice(
        i * objectivesPerModule,
        (i + 1) * objectivesPerModule
      );

      const lessons = this.createLessons(moduleObjectives, deliveryFormat);

      modules.push({
        id: `module-${i + 1}`,
        title: this.generateModuleTitle(i),
        description: `Module covering ${moduleObjectives.map(o => o.statement).join('; ')}`,
        objectives: moduleObjectives.map(o => o.id),
        lessons,
        estimatedMinutes: lessons.reduce((sum, l) => sum + l.estimatedMinutes, 0),
        sequenceOrder: i + 1,
        prerequisites: i > 0 ? [`module-${i}`] : []
      });
    }

    return modules;
  }

  private generateModuleTitle(index: number): string {
    const titles = [
      'Foundations & Core Concepts',
      'Practical Applications',
      'Advanced Topics & Best Practices',
      'Compliance & Documentation',
      'Assessment & Certification'
    ];
    return titles[index] || `Module ${index + 1}`;
  }

  private createLessons(
    objectives: LearningObjective[],
    deliveryFormat: string
  ): LessonDesign[] {
    const lessons: LessonDesign[] = [];

    objectives.forEach((objective, index) => {
      // Introduction lesson
      lessons.push({
        id: `lesson-${objective.id}-intro`,
        title: `Introduction: ${objective.statement.split(' ').slice(1, 4).join(' ')}`,
        description: `Learn the fundamentals of ${objective.statement.toLowerCase()}`,
        contentType: deliveryFormat === 'instructor-led' ? 'video' : 'text',
        content: {
          mainContent: `This lesson introduces the key concepts related to: ${objective.statement}`,
          keyPoints: [
            'Understanding the core principles',
            'Recognizing key terminology',
            'Identifying practical applications'
          ],
          examples: [
            {
              title: 'Real-World Scenario',
              description: 'A practical example demonstrating the concept in action',
              type: 'scenario'
            }
          ],
          resources: [
            {
              title: 'Reference Guide',
              type: 'document',
              description: 'Supplementary reading material'
            }
          ]
        },
        activities: [
          {
            id: `activity-${objective.id}-1`,
            type: 'reflection',
            title: 'Knowledge Check',
            instructions: 'Reflect on how this applies to your role',
            estimatedMinutes: 5,
            gradedWeight: 0
          }
        ],
        estimatedMinutes: 15,
        sequenceOrder: index * 2 + 1
      });

      // Practice lesson
      lessons.push({
        id: `lesson-${objective.id}-practice`,
        title: `Practice: Applying ${objective.statement.split(' ')[0]}`,
        description: `Hands-on practice for ${objective.statement.toLowerCase()}`,
        contentType: 'interactive',
        content: {
          mainContent: `Interactive exercises to reinforce: ${objective.statement}`,
          keyPoints: [
            'Step-by-step application',
            'Common mistakes to avoid',
            'Best practices'
          ],
          examples: [
            {
              title: 'Guided Exercise',
              description: 'Work through a practical example with guidance',
              type: 'worked-example'
            }
          ],
          resources: []
        },
        activities: [
          {
            id: `activity-${objective.id}-2`,
            type: 'exercise',
            title: 'Practical Exercise',
            instructions: 'Complete the interactive exercise',
            estimatedMinutes: 10,
            gradedWeight: 10
          },
          {
            id: `activity-${objective.id}-3`,
            type: 'quiz',
            title: 'Lesson Quiz',
            instructions: 'Test your understanding',
            estimatedMinutes: 5,
            gradedWeight: 15
          }
        ],
        estimatedMinutes: 20,
        sequenceOrder: index * 2 + 2
      });
    });

    return lessons;
  }

  private createLearningPath(courseStructure: CourseDesign): LearningPathDesign {
    const milestones = courseStructure.modules.map((module, index) => ({
      id: `milestone-${index + 1}`,
      name: `Complete ${module.title}`,
      requirements: [
        `Complete all lessons in ${module.title}`,
        'Pass module assessment with 70% or higher'
      ],
      reward: index === courseStructure.modules.length - 1 ? 'Course Certificate' : `${(index + 1) * 25} XP`,
      estimatedCompletion: module.estimatedMinutes / 60
    }));

    return {
      id: `path-${courseStructure.id}`,
      name: `${courseStructure.title} Learning Path`,
      description: 'Complete this structured path to master the course content',
      milestones,
      alternativePaths: [
        {
          condition: 'Prior experience in the field',
          targetMilestoneId: 'milestone-2',
          reason: 'Skip introductory content if already familiar with basics'
        }
      ]
    };
  }

  private createAssessmentStrategy(
    objectives: LearningObjective[],
    courseStructure: CourseDesign
  ): AssessmentStrategy {
    const formativeAssessments = courseStructure.modules.map((module, index) => ({
      id: `formative-${index + 1}`,
      name: `${module.title} Quiz`,
      type: 'quiz' as const,
      weight: 10,
      placementAfter: module.id,
      objectivesCovered: module.objectives
    }));

    const summativeAssessments = [
      {
        id: 'summative-1',
        name: 'Final Assessment',
        type: 'exam' as const,
        weight: 40,
        placementAfter: courseStructure.modules[courseStructure.modules.length - 1].id,
        objectivesCovered: objectives.map(o => o.id)
      },
      {
        id: 'summative-2',
        name: 'Practical Demonstration',
        type: 'practical' as const,
        weight: 20,
        placementAfter: 'summative-1',
        objectivesCovered: objectives.filter(o =>
          ['apply', 'analyze', 'evaluate', 'create'].includes(o.bloomLevel)
        ).map(o => o.id)
      }
    ];

    return {
      formativeAssessments,
      summativeAssessments,
      passingThreshold: 70,
      retakePolicy: {
        maxAttempts: 3,
        cooldownHours: 24,
        scorePolicy: 'highest'
      }
    };
  }

  private identifyPrerequisites(
    audience: AudienceProfile,
    difficultyLevel: string
  ): PrerequisiteRequirement[] {
    const prerequisites: PrerequisiteRequirement[] = [];

    if (difficultyLevel === 'intermediate' || difficultyLevel === 'advanced') {
      prerequisites.push({
        type: 'course',
        id: 'prereq-basics',
        name: 'Fundamentals Course',
        required: true
      });
    }

    if (difficultyLevel === 'advanced') {
      prerequisites.push({
        type: 'experience',
        id: 'prereq-exp',
        name: '1+ year of related experience',
        required: false
      });
    }

    return prerequisites;
  }

  private calculateDuration(courseStructure: CourseDesign): number {
    return courseStructure.modules.reduce(
      (total, module) => total + module.estimatedMinutes,
      0
    ) / 60; // Return hours
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export const learningDesignAgentConfig = {
  id: 'learning-design-agent',
  type: 'learning-design' as const,
  name: 'Learning Design Agent',
  description: 'Generates course structures, learning paths, and assessment strategies from extracted content',
  enabled: true,
  autoApprove: false, // Require human review of course designs
  maxConcurrentTasks: 3,
  retryAttempts: 2,
  timeoutMs: 180000, // 3 minutes
  modelConfig: {
    model: 'claude-3-opus',
    temperature: 0.5,
    maxTokens: 12000
  }
};

// ============================================================================
// FACTORY
// ============================================================================

export const createLearningDesignAgent = (): {
  handler: LearningDesignAgent;
  config: typeof learningDesignAgentConfig;
} => {
  return {
    handler: new LearningDesignAgent(),
    config: learningDesignAgentConfig
  };
};
