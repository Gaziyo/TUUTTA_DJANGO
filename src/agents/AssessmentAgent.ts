import type { AgentHandler } from './AgentOrchestrator';
import type {
  AgentTask,
  TaskInput,
  TaskOutput,
  AssessmentAgentInput,
  AssessmentAgentOutput,
  GeneratedQuestion,
  QuestionType,
  QuestionOption,
  Rubric,
  RubricCriterion,
  AnswerKey,
  DifficultyDistribution
} from '../types/agents';

// ============================================================================
// ASSESSMENT AGENT
// ============================================================================

/**
 * Assessment Agent
 *
 * Responsibilities:
 * - Generate assessment questions from learning objectives
 * - Create diverse question types (MCQ, short answer, scenario-based, etc.)
 * - Build scoring rubrics for subjective questions
 * - Generate answer keys with explanations
 * - Ensure coverage of all learning objectives
 * - Balance difficulty distribution
 */
export class AssessmentAgent implements AgentHandler {
  type: 'assessment' = 'assessment';

  validate(input: TaskInput): boolean {
    const data = input.data as AssessmentAgentInput['data'];
    return !!(
      data.learningDesignTaskId &&
      data.assessmentPlanId &&
      data.questionCount > 0 &&
      data.questionTypes &&
      data.questionTypes.length > 0 &&
      data.difficultyDistribution
    );
  }

  estimateProcessingTime(input: TaskInput): number {
    const data = input.data as AssessmentAgentInput['data'];
    // ~5 seconds per question base, more for complex types
    const complexTypes: QuestionType[] = ['essay', 'scenario-based', 'practical'];
    const complexCount = data.questionTypes.filter(t => complexTypes.includes(t)).length;
    return (data.questionCount * 5000) + (complexCount * 3000);
  }

  async process(task: AgentTask): Promise<TaskOutput> {
    const input = task.input as AssessmentAgentInput;
    const {
      learningDesignTaskId,
      assessmentPlanId,
      questionCount,
      questionTypes,
      difficultyDistribution,
      includeRubrics
    } = input.data;

    try {
      // Step 1: Generate questions
      const questions = await this.generateQuestions(
        questionCount,
        questionTypes,
        difficultyDistribution
      );

      // Step 2: Create rubrics for subjective questions
      const rubrics = includeRubrics
        ? this.createRubrics(questions.filter(q =>
            ['essay', 'short-answer', 'scenario-based', 'practical'].includes(q.type)
          ))
        : [];

      // Step 3: Generate answer key
      const answerKey = this.generateAnswerKey(questions);

      // Step 4: Calculate estimated completion time
      const estimatedCompletionMinutes = this.calculateCompletionTime(questions);

      const output: AssessmentAgentOutput = {
        type: 'assessment',
        confidence: 0.90,
        artifacts: [
          {
            id: `assessment-${assessmentPlanId}`,
            type: 'assessment',
            name: `Assessment for ${assessmentPlanId}`,
            data: { questions, rubrics, answerKey },
            createdAt: new Date()
          }
        ],
        data: {
          assessmentId: assessmentPlanId,
          questions,
          rubrics,
          answerKey,
          estimatedCompletionMinutes
        }
      };

      return output;
    } catch (error) {
      throw new Error(`Assessment generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Question Generation
  // ---------------------------------------------------------------------------

  private async generateQuestions(
    count: number,
    types: QuestionType[],
    distribution: DifficultyDistribution
  ): Promise<GeneratedQuestion[]> {
    await this.simulateProcessing(500);

    const questions: GeneratedQuestion[] = [];
    const questionsPerType = Math.ceil(count / types.length);

    // Calculate difficulty counts
    const easyCount = Math.round(count * (distribution.easy / 100));
    const mediumCount = Math.round(count * (distribution.medium / 100));
    const hardCount = count - easyCount - mediumCount;

    let easyGenerated = 0;
    let mediumGenerated = 0;
    let hardGenerated = 0;

    for (const type of types) {
      const typeCount = Math.min(questionsPerType, count - questions.length);

      for (let i = 0; i < typeCount; i++) {
        // Determine difficulty
        let difficulty: 'easy' | 'medium' | 'hard';
        if (easyGenerated < easyCount) {
          difficulty = 'easy';
          easyGenerated++;
        } else if (mediumGenerated < mediumCount) {
          difficulty = 'medium';
          mediumGenerated++;
        } else {
          difficulty = 'hard';
          hardGenerated++;
        }

        const question = this.generateQuestionByType(
          type,
          difficulty,
          questions.length + 1
        );
        questions.push(question);
      }
    }

    return questions;
  }

  private generateQuestionByType(
    type: QuestionType,
    difficulty: 'easy' | 'medium' | 'hard',
    questionNumber: number
  ): GeneratedQuestion {
    const baseQuestion: Partial<GeneratedQuestion> = {
      id: `q-${questionNumber}`,
      type,
      difficulty,
      objectiveId: `objective-${(questionNumber % 4) + 1}`,
      bloomLevel: this.getBloomLevel(difficulty),
      points: this.getPoints(difficulty, type),
      tags: this.getTags(type, difficulty)
    };

    switch (type) {
      case 'multiple-choice':
        return this.generateMultipleChoice(baseQuestion, difficulty);
      case 'multiple-select':
        return this.generateMultipleSelect(baseQuestion, difficulty);
      case 'true-false':
        return this.generateTrueFalse(baseQuestion, difficulty);
      case 'short-answer':
        return this.generateShortAnswer(baseQuestion, difficulty);
      case 'essay':
        return this.generateEssay(baseQuestion, difficulty);
      case 'matching':
        return this.generateMatching(baseQuestion, difficulty);
      case 'ordering':
        return this.generateOrdering(baseQuestion, difficulty);
      case 'fill-blank':
        return this.generateFillBlank(baseQuestion, difficulty);
      case 'scenario-based':
        return this.generateScenarioBased(baseQuestion, difficulty);
      case 'practical':
        return this.generatePractical(baseQuestion, difficulty);
      default:
        return this.generateMultipleChoice(baseQuestion, difficulty);
    }
  }

  private generateMultipleChoice(
    base: Partial<GeneratedQuestion>,
    difficulty: string
  ): GeneratedQuestion {
    const questions = {
      easy: {
        text: 'What does PPE stand for in workplace safety?',
        options: [
          { id: 'a', text: 'Personal Protective Equipment', isCorrect: true, feedback: 'Correct! PPE refers to protective gear worn to minimize exposure to hazards.' },
          { id: 'b', text: 'Professional Protection Enforcement', isCorrect: false, feedback: 'Incorrect. This is not the correct acronym.' },
          { id: 'c', text: 'Preventive Procedures for Employees', isCorrect: false, feedback: 'Incorrect. PPE specifically refers to equipment, not procedures.' },
          { id: 'd', text: 'Primary Prevention Essentials', isCorrect: false, feedback: 'Incorrect. Try again.' }
        ],
        correctAnswer: 'a',
        explanation: 'PPE stands for Personal Protective Equipment, which includes items like gloves, safety glasses, hard hats, and respirators.'
      },
      medium: {
        text: 'Which of the following best describes the hierarchy of controls for workplace hazards?',
        options: [
          { id: 'a', text: 'PPE → Engineering Controls → Administrative Controls → Elimination', isCorrect: false, feedback: 'Incorrect. This is the reverse order of effectiveness.' },
          { id: 'b', text: 'Elimination → Substitution → Engineering Controls → Administrative Controls → PPE', isCorrect: true, feedback: 'Correct! This represents the hierarchy from most to least effective.' },
          { id: 'c', text: 'Administrative Controls → PPE → Engineering Controls → Elimination', isCorrect: false, feedback: 'Incorrect. Administrative controls are not the most effective method.' },
          { id: 'd', text: 'All controls are equally effective', isCorrect: false, feedback: 'Incorrect. There is a defined hierarchy of effectiveness.' }
        ],
        correctAnswer: 'b',
        explanation: 'The hierarchy of controls ranks hazard controls from most effective (elimination) to least effective (PPE).'
      },
      hard: {
        text: 'According to OSHA regulations, when must an employer conduct a Job Hazard Analysis (JHA)?',
        options: [
          { id: 'a', text: 'Only when an accident occurs', isCorrect: false, feedback: 'Incorrect. JHA should be proactive, not reactive.' },
          { id: 'b', text: 'Annually for all job positions', isCorrect: false, feedback: 'Incorrect. JHA frequency depends on risk levels and changes.' },
          { id: 'c', text: 'Before introducing new tasks, after incidents, when changes occur, or during periodic reviews', isCorrect: true, feedback: 'Correct! JHA should be conducted proactively and reactively.' },
          { id: 'd', text: 'Only during initial employee onboarding', isCorrect: false, feedback: 'Incorrect. JHA is an ongoing process.' }
        ],
        correctAnswer: 'c',
        explanation: 'OSHA recommends JHA be conducted when new jobs are created, after incidents, when processes change, and during regular reviews.'
      }
    };

    const q = questions[difficulty as keyof typeof questions];

    return {
      ...base,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      hints: ['Consider the primary goal of workplace safety measures.']
    } as GeneratedQuestion;
  }

  private generateMultipleSelect(
    base: Partial<GeneratedQuestion>,
    difficulty: string
  ): GeneratedQuestion {
    return {
      ...base,
      text: 'Select ALL that apply: Which of the following are required elements of a workplace safety program?',
      options: [
        { id: 'a', text: 'Management commitment', isCorrect: true, feedback: 'Correct! Leadership support is essential.' },
        { id: 'b', text: 'Employee involvement', isCorrect: true, feedback: 'Correct! Workers must participate in safety initiatives.' },
        { id: 'c', text: 'Hazard identification and assessment', isCorrect: true, feedback: 'Correct! Understanding risks is fundamental.' },
        { id: 'd', text: 'Optional compliance with regulations', isCorrect: false, feedback: 'Incorrect. Compliance is mandatory, not optional.' },
        { id: 'e', text: 'Training and education', isCorrect: true, feedback: 'Correct! Knowledge transfer is critical.' }
      ],
      correctAnswer: ['a', 'b', 'c', 'e'],
      explanation: 'Effective safety programs require commitment, involvement, hazard assessment, and training. Compliance is mandatory.',
      hints: ['Think about what makes safety programs successful.']
    } as GeneratedQuestion;
  }

  private generateTrueFalse(
    base: Partial<GeneratedQuestion>,
    difficulty: string
  ): GeneratedQuestion {
    const questions = {
      easy: {
        text: 'Personal Protective Equipment (PPE) should be the first line of defense against workplace hazards.',
        correctAnswer: 'false',
        explanation: 'False. PPE is actually the last line of defense. Engineering controls and elimination should be prioritized first.'
      },
      medium: {
        text: 'Employers are required to provide PPE at no cost to employees when it is required for the job.',
        correctAnswer: 'true',
        explanation: 'True. Under OSHA regulations, employers must provide required PPE free of charge to employees.'
      },
      hard: {
        text: 'An employer can be cited by OSHA for a hazard even if no accident has occurred.',
        correctAnswer: 'true',
        explanation: 'True. OSHA can issue citations for recognized hazards regardless of whether an injury has occurred.'
      }
    };

    const q = questions[difficulty as keyof typeof questions];

    return {
      ...base,
      text: q.text,
      options: [
        { id: 'true', text: 'True', isCorrect: q.correctAnswer === 'true' },
        { id: 'false', text: 'False', isCorrect: q.correctAnswer === 'false' }
      ],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    } as GeneratedQuestion;
  }

  private generateShortAnswer(
    base: Partial<GeneratedQuestion>,
    difficulty: string
  ): GeneratedQuestion {
    return {
      ...base,
      text: 'Describe the purpose of a Safety Data Sheet (SDS) and list three key sections it must contain.',
      correctAnswer: 'An SDS provides comprehensive information about hazardous chemicals. Key sections include: identification, hazard information, composition, first-aid measures, firefighting measures, handling and storage, and exposure controls.',
      explanation: 'Safety Data Sheets are standardized documents that communicate chemical hazard information to workers.',
      hints: ['Think about what information workers need when handling chemicals.'],
      timeLimit: 180
    } as GeneratedQuestion;
  }

  private generateEssay(
    base: Partial<GeneratedQuestion>,
    difficulty: string
  ): GeneratedQuestion {
    return {
      ...base,
      text: 'Analyze a workplace scenario where multiple safety controls could be applied. Describe how you would implement the hierarchy of controls and justify your decisions.',
      correctAnswer: 'Response should demonstrate understanding of elimination, substitution, engineering controls, administrative controls, and PPE in order of effectiveness.',
      explanation: 'This question assesses ability to apply safety concepts to real-world scenarios.',
      hints: ['Consider a specific hazard and work through each level of the hierarchy.'],
      timeLimit: 600
    } as GeneratedQuestion;
  }

  private generateMatching(
    base: Partial<GeneratedQuestion>,
    difficulty: string
  ): GeneratedQuestion {
    return {
      ...base,
      text: 'Match each safety term with its correct definition:',
      options: [
        { id: 'a', text: 'OSHA', isCorrect: false },
        { id: 'b', text: 'PPE', isCorrect: false },
        { id: 'c', text: 'SDS', isCorrect: false },
        { id: 'd', text: 'JHA', isCorrect: false }
      ],
      correctAnswer: ['a-1', 'b-2', 'c-3', 'd-4'],
      explanation: 'Each term has a specific meaning in workplace safety context.'
    } as GeneratedQuestion;
  }

  private generateOrdering(
    base: Partial<GeneratedQuestion>,
    difficulty: string
  ): GeneratedQuestion {
    return {
      ...base,
      text: 'Place the following steps of emergency response in the correct order:',
      options: [
        { id: 'a', text: 'Evacuate the area', isCorrect: false },
        { id: 'b', text: 'Alert others of the emergency', isCorrect: false },
        { id: 'c', text: 'Assess the situation for safety', isCorrect: false },
        { id: 'd', text: 'Call emergency services', isCorrect: false }
      ],
      correctAnswer: ['c', 'b', 'd', 'a'],
      explanation: 'First assess safety, then alert others, call for help, and evacuate if necessary.'
    } as GeneratedQuestion;
  }

  private generateFillBlank(
    base: Partial<GeneratedQuestion>,
    difficulty: string
  ): GeneratedQuestion {
    return {
      ...base,
      text: 'The _____ of controls prioritizes _____ as the most effective method of hazard control, while _____ is considered the least effective.',
      correctAnswer: ['hierarchy', 'elimination', 'PPE'],
      explanation: 'The hierarchy of controls ranks elimination as most effective and PPE as least effective.'
    } as GeneratedQuestion;
  }

  private generateScenarioBased(
    base: Partial<GeneratedQuestion>,
    difficulty: string
  ): GeneratedQuestion {
    return {
      ...base,
      text: `Scenario: You are a supervisor and notice a worker not wearing required safety glasses while operating a grinder. The worker claims the glasses fog up and impair their vision. What actions should you take? Select all appropriate responses.`,
      options: [
        { id: 'a', text: 'Stop the work immediately until proper PPE is worn', isCorrect: true, feedback: 'Correct. Safety comes first.' },
        { id: 'b', text: 'Allow work to continue since the worker is experienced', isCorrect: false, feedback: 'Incorrect. Experience does not exempt PPE requirements.' },
        { id: 'c', text: 'Investigate anti-fog alternatives or other solutions', isCorrect: true, feedback: 'Correct. Address the root cause of non-compliance.' },
        { id: 'd', text: 'Document the incident and provide additional training', isCorrect: true, feedback: 'Correct. Documentation and training are important.' },
        { id: 'e', text: 'Terminate the worker immediately', isCorrect: false, feedback: 'Incorrect. Progressive discipline is appropriate.' }
      ],
      correctAnswer: ['a', 'c', 'd'],
      explanation: 'The supervisor should stop unsafe work, investigate solutions, and ensure proper documentation and training.',
      timeLimit: 300
    } as GeneratedQuestion;
  }

  private generatePractical(
    base: Partial<GeneratedQuestion>,
    difficulty: string
  ): GeneratedQuestion {
    return {
      ...base,
      text: 'Practical Assessment: Demonstrate the proper procedure for inspecting and donning a safety harness before working at height.',
      correctAnswer: 'Learner should: 1) Inspect all components for damage, 2) Check webbing for cuts/frays, 3) Verify hardware function, 4) Don harness correctly, 5) Adjust for proper fit, 6) Demonstrate connection to anchor point.',
      explanation: 'This practical assessment verifies hands-on competency with fall protection equipment.',
      timeLimit: 600
    } as GeneratedQuestion;
  }

  // ---------------------------------------------------------------------------
  // Rubric Generation
  // ---------------------------------------------------------------------------

  private createRubrics(questions: GeneratedQuestion[]): Rubric[] {
    return questions.map(question => ({
      id: `rubric-${question.id}`,
      questionId: question.id,
      criteria: this.generateRubricCriteria(question),
      maxScore: question.points
    }));
  }

  private generateRubricCriteria(question: GeneratedQuestion): RubricCriterion[] {
    const baseWeights = question.type === 'essay' ? [30, 30, 25, 15] : [40, 35, 25];

    const criteria: RubricCriterion[] = [
      {
        id: `criterion-${question.id}-1`,
        name: 'Content Accuracy',
        description: 'Correctness and accuracy of the response',
        levels: [
          { score: 4, label: 'Exemplary', description: 'Completely accurate with insightful additions' },
          { score: 3, label: 'Proficient', description: 'Accurate with minor omissions' },
          { score: 2, label: 'Developing', description: 'Partially accurate with some errors' },
          { score: 1, label: 'Beginning', description: 'Significant errors or misconceptions' },
          { score: 0, label: 'Not Demonstrated', description: 'No valid response' }
        ],
        weight: baseWeights[0]
      },
      {
        id: `criterion-${question.id}-2`,
        name: 'Completeness',
        description: 'Coverage of all required elements',
        levels: [
          { score: 4, label: 'Complete', description: 'All elements thoroughly addressed' },
          { score: 3, label: 'Mostly Complete', description: 'Most elements addressed' },
          { score: 2, label: 'Partial', description: 'Some elements addressed' },
          { score: 1, label: 'Minimal', description: 'Few elements addressed' },
          { score: 0, label: 'Missing', description: 'No elements addressed' }
        ],
        weight: baseWeights[1]
      },
      {
        id: `criterion-${question.id}-3`,
        name: 'Application',
        description: 'Ability to apply concepts to scenarios',
        levels: [
          { score: 4, label: 'Expert Application', description: 'Sophisticated application with examples' },
          { score: 3, label: 'Competent Application', description: 'Correct application' },
          { score: 2, label: 'Basic Application', description: 'Limited application' },
          { score: 1, label: 'Attempted', description: 'Attempted but incorrect application' },
          { score: 0, label: 'No Application', description: 'No attempt to apply concepts' }
        ],
        weight: baseWeights[2]
      }
    ];

    if (question.type === 'essay') {
      criteria.push({
        id: `criterion-${question.id}-4`,
        name: 'Communication',
        description: 'Clarity and organization of response',
        levels: [
          { score: 4, label: 'Excellent', description: 'Clear, well-organized, professional' },
          { score: 3, label: 'Good', description: 'Clear with minor issues' },
          { score: 2, label: 'Adequate', description: 'Understandable but disorganized' },
          { score: 1, label: 'Poor', description: 'Difficult to follow' },
          { score: 0, label: 'Unclear', description: 'Cannot be understood' }
        ],
        weight: baseWeights[3]
      });
    }

    return criteria;
  }

  // ---------------------------------------------------------------------------
  // Answer Key Generation
  // ---------------------------------------------------------------------------

  private generateAnswerKey(questions: GeneratedQuestion[]): AnswerKey {
    return {
      assessmentId: 'assessment-key',
      answers: questions.map(q => ({
        questionId: q.id,
        correctAnswer: q.correctAnswer,
        acceptableVariations: this.getAcceptableVariations(q),
        partialCreditRules: this.getPartialCreditRules(q)
      })),
      gradingNotes: 'Review subjective responses carefully. Use rubrics for essay and short-answer questions. Award partial credit where applicable.'
    };
  }

  private getAcceptableVariations(question: GeneratedQuestion): string[] {
    if (question.type === 'short-answer') {
      return ['Variations in wording are acceptable if meaning is preserved'];
    }
    return [];
  }

  private getPartialCreditRules(question: GeneratedQuestion): { condition: string; creditPercentage: number }[] {
    if (['short-answer', 'essay', 'scenario-based'].includes(question.type)) {
      return [
        { condition: 'Correct concept with minor errors', creditPercentage: 75 },
        { condition: 'Partial understanding demonstrated', creditPercentage: 50 },
        { condition: 'Relevant attempt with major errors', creditPercentage: 25 }
      ];
    }
    return [];
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getBloomLevel(difficulty: string): string {
    const levels: Record<string, string> = {
      easy: 'remember',
      medium: 'apply',
      hard: 'analyze'
    };
    return levels[difficulty] || 'understand';
  }

  private getPoints(difficulty: string, type: QuestionType): number {
    const basePoints: Record<string, number> = {
      easy: 5,
      medium: 10,
      hard: 15
    };
    const typeMultiplier: Record<QuestionType, number> = {
      'multiple-choice': 1,
      'multiple-select': 1.2,
      'true-false': 0.8,
      'short-answer': 1.5,
      'essay': 3,
      'matching': 1.2,
      'ordering': 1.3,
      'fill-blank': 1,
      'scenario-based': 2,
      'practical': 2.5
    };
    return Math.round(basePoints[difficulty] * (typeMultiplier[type] || 1));
  }

  private getTags(type: QuestionType, difficulty: string): string[] {
    return [type, difficulty, 'workplace-safety', 'compliance'];
  }

  private calculateCompletionTime(questions: GeneratedQuestion[]): number {
    const timePerQuestion: Record<QuestionType, number> = {
      'multiple-choice': 1,
      'multiple-select': 1.5,
      'true-false': 0.5,
      'short-answer': 3,
      'essay': 10,
      'matching': 2,
      'ordering': 2,
      'fill-blank': 1,
      'scenario-based': 5,
      'practical': 8
    };

    return questions.reduce((total, q) => {
      const baseTime = timePerQuestion[q.type] || 2;
      const difficultyMultiplier = q.difficulty === 'hard' ? 1.5 : q.difficulty === 'medium' ? 1.2 : 1;
      return total + (baseTime * difficultyMultiplier);
    }, 0);
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export const assessmentAgentConfig = {
  id: 'assessment-agent',
  type: 'assessment' as const,
  name: 'Assessment Agent',
  description: 'Generates assessment questions, rubrics, and answer keys aligned with learning objectives',
  enabled: true,
  autoApprove: false, // Require human review of generated assessments
  maxConcurrentTasks: 5,
  retryAttempts: 2,
  timeoutMs: 240000, // 4 minutes
  modelConfig: {
    model: 'claude-3-opus',
    temperature: 0.4,
    maxTokens: 10000
  }
};

// ============================================================================
// FACTORY
// ============================================================================

export const createAssessmentAgent = (): {
  handler: AssessmentAgent;
  config: typeof assessmentAgentConfig;
} => {
  return {
    handler: new AssessmentAgent(),
    config: assessmentAgentConfig
  };
};
