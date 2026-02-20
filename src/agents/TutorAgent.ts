import type { AgentHandler } from './AgentOrchestrator';
import type {
  AgentTask,
  TaskInput,
  TaskOutput,
  TutorAgentInput,
  TutorAgentOutput,
  TutorResponse,
  LearnerStateUpdate,
  RecommendedAction,
  TutorContext,
  TutorInteraction,
  LearnerProfile,
  VisualAid,
  Resource
} from '../types/agents';

// ============================================================================
// TUTOR AGENT
// ============================================================================

/**
 * Tutor Agent
 *
 * Responsibilities:
 * - Provide adaptive explanations based on learner profile
 * - Generate contextual hints and examples
 * - Offer remediation for struggling learners
 * - Track and update learner knowledge state
 * - Recommend next actions based on performance
 * - Adapt teaching style to learner preferences
 */
export class TutorAgent implements AgentHandler {
  type: 'tutor' = 'tutor';

  validate(input: TaskInput): boolean {
    const data = input.data as TutorAgentInput['data'];
    return !!(
      data.learnerId &&
      data.context &&
      data.interaction
    );
  }

  estimateProcessingTime(input: TaskInput): number {
    const data = input.data as TutorAgentInput['data'];
    // Faster responses for simple interactions
    const complexInteractions = ['confusion', 'request-example'];
    if (complexInteractions.includes(data.interaction.type)) {
      return 5000;
    }
    return 2000;
  }

  async process(task: AgentTask): Promise<TaskOutput> {
    const input = task.input as TutorAgentInput;
    const { learnerId, context, interaction } = input.data;

    try {
      // Step 1: Analyze learner state and interaction
      const analysisResult = this.analyzeLearnerInteraction(context, interaction);

      // Step 2: Generate appropriate response
      const response = await this.generateResponse(
        interaction,
        context,
        analysisResult
      );

      // Step 3: Update learner state
      const learnerStateUpdate = this.calculateLearnerStateUpdate(
        context,
        interaction,
        response
      );

      // Step 4: Generate recommendations
      const recommendedActions = this.generateRecommendations(
        context,
        learnerStateUpdate
      );

      const output: TutorAgentOutput = {
        type: 'tutor',
        confidence: analysisResult.confidence,
        artifacts: [],
        data: {
          response,
          learnerStateUpdate,
          recommendedActions
        }
      };

      return output;
    } catch (error) {
      throw new Error(`Tutor response failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Analysis
  // ---------------------------------------------------------------------------

  private analyzeLearnerInteraction(
    context: TutorContext,
    interaction: TutorInteraction
  ): { confidence: number; needsRemediation: boolean; topicStrength: number } {
    const { learnerProfile, currentProgress } = context;

    // Calculate topic strength based on profile and progress
    const topicStrength = this.calculateTopicStrength(
      learnerProfile,
      currentProgress.currentLesson
    );

    // Check if remediation is needed
    const needsRemediation =
      currentProgress.strugglingTopics.length > 0 ||
      interaction.type === 'confusion' ||
      topicStrength < 0.4;

    // Calculate confidence based on context
    const confidence = this.calculateResponseConfidence(context, interaction);

    return { confidence, needsRemediation, topicStrength };
  }

  private calculateTopicStrength(
    profile: LearnerProfile,
    currentLesson: string
  ): number {
    // Simplified topic strength calculation
    const baseStrength = Object.values(profile.knowledgeLevel).reduce(
      (sum, level) => sum + level,
      0
    ) / Math.max(Object.keys(profile.knowledgeLevel).length, 1);

    return Math.min(1, Math.max(0, baseStrength));
  }

  private calculateResponseConfidence(
    context: TutorContext,
    interaction: TutorInteraction
  ): number {
    // Higher confidence for simple interactions, lower for complex scenarios
    const typeConfidence: Record<string, number> = {
      'question': 0.9,
      'request-hint': 0.95,
      'request-example': 0.88,
      'submit-answer': 0.92,
      'confusion': 0.75,
      'feedback': 0.85
    };

    return typeConfidence[interaction.type] || 0.8;
  }

  // ---------------------------------------------------------------------------
  // Response Generation
  // ---------------------------------------------------------------------------

  private async generateResponse(
    interaction: TutorInteraction,
    context: TutorContext,
    analysis: { confidence: number; needsRemediation: boolean; topicStrength: number }
  ): Promise<TutorResponse> {
    await this.simulateProcessing(300);

    switch (interaction.type) {
      case 'question':
        return this.generateQuestionResponse(interaction, context, analysis);
      case 'confusion':
        return this.generateConfusionResponse(interaction, context, analysis);
      case 'request-example':
        return this.generateExampleResponse(interaction, context);
      case 'request-hint':
        return this.generateHintResponse(interaction, context);
      case 'submit-answer':
        return this.generateAnswerFeedback(interaction, context);
      case 'feedback':
        return this.generateAcknowledgment(interaction);
      default:
        return this.generateDefaultResponse(interaction, context);
    }
  }

  private generateQuestionResponse(
    interaction: TutorInteraction,
    context: TutorContext,
    analysis: { needsRemediation: boolean; topicStrength: number }
  ): TutorResponse {
    const { learnerProfile } = context;

    // Adapt explanation based on learning style
    const explanation = this.adaptToLearningStyle(
      `That's a great question! ${this.generateExplanationContent(interaction.content)}`,
      learnerProfile.learningStyle
    );

    return {
      type: 'explanation',
      content: explanation,
      visualAids: learnerProfile.learningStyle === 'visual'
        ? this.generateVisualAids(interaction.content)
        : undefined,
      followUpQuestions: [
        'Does this explanation make sense?',
        'Would you like me to provide an example?',
        'Are there any specific parts you\'d like me to clarify?'
      ],
      resources: this.getSuggestedResources(interaction.content),
      adaptations: [
        {
          reason: `Adapted for ${learnerProfile.learningStyle} learning style`,
          adaptation: 'Included appropriate visual/textual emphasis'
        },
        {
          reason: `Learner pace preference: ${learnerProfile.pacePreference}`,
          adaptation: analysis.needsRemediation
            ? 'Provided additional context and scaffolding'
            : 'Maintained standard explanation depth'
        }
      ]
    };
  }

  private generateConfusionResponse(
    interaction: TutorInteraction,
    context: TutorContext,
    analysis: { topicStrength: number }
  ): TutorResponse {
    const breakdownContent = `
I understand this can be confusing. Let me break it down step by step:

1. **Core Concept**: ${this.simplifyContent(interaction.content)}

2. **Why It Matters**: This concept is important because it helps ensure safety and compliance in the workplace.

3. **Simple Example**: Imagine you're at work and encounter a situation where you need to apply this. Here's what you would do...

4. **Key Takeaway**: Remember, the main point is to prioritize safety and follow established procedures.

Would you like me to explain any of these steps in more detail?
    `;

    return {
      type: 'explanation',
      content: breakdownContent,
      visualAids: [
        {
          type: 'diagram',
          description: 'Step-by-step breakdown diagram',
          altText: 'Visual representation of the concept breakdown'
        }
      ],
      followUpQuestions: [
        'Which part is still unclear?',
        'Would a different example help?',
        'Should we go back to the basics first?'
      ],
      resources: [],
      adaptations: [
        {
          reason: 'Learner expressed confusion',
          adaptation: 'Provided simplified, step-by-step explanation'
        },
        {
          reason: `Topic strength: ${Math.round(analysis.topicStrength * 100)}%`,
          adaptation: 'Added foundational context and examples'
        }
      ]
    };
  }

  private generateExampleResponse(
    interaction: TutorInteraction,
    context: TutorContext
  ): TutorResponse {
    return {
      type: 'example',
      content: `
Here's a practical example to illustrate this concept:

**Scenario**: A manufacturing facility needs to implement new safety protocols.

**Application**:
- First, they conduct a hazard assessment to identify risks
- Then, they apply the hierarchy of controls (elimination → substitution → engineering → administrative → PPE)
- Finally, they train all employees and document compliance

**Outcome**: The facility reduces incidents by 40% and achieves full regulatory compliance.

**Key Insight**: Notice how each step builds on the previous one. This systematic approach ensures nothing is overlooked.
      `,
      visualAids: [
        {
          type: 'diagram',
          description: 'Process flow diagram showing the implementation steps',
          altText: 'Flowchart of safety protocol implementation'
        }
      ],
      followUpQuestions: [
        'Can you think of how this might apply to your workplace?',
        'What challenges do you think might arise during implementation?'
      ],
      resources: [
        {
          title: 'Case Study: Safety Implementation',
          type: 'article',
          description: 'Detailed case study of successful safety programs'
        }
      ],
      adaptations: [
        {
          reason: 'Example requested',
          adaptation: 'Provided real-world scenario with concrete steps'
        }
      ]
    };
  }

  private generateHintResponse(
    interaction: TutorInteraction,
    context: TutorContext
  ): TutorResponse {
    return {
      type: 'hint',
      content: `
Here's a hint to guide your thinking:

💡 **Hint**: Think about the fundamental principle behind this concept. Ask yourself:
- What is the primary goal?
- What are the key steps or components?
- How does this connect to what you already know?

Remember: The answer often relates to prioritizing safety and following a systematic approach.

Would you like another hint, or would you like to try answering?
      `,
      followUpQuestions: [
        'Does this hint help point you in the right direction?',
        'Would you like a more specific hint?'
      ],
      resources: [],
      adaptations: [
        {
          reason: 'Hint requested',
          adaptation: 'Provided guiding questions without revealing answer'
        }
      ]
    };
  }

  private generateAnswerFeedback(
    interaction: TutorInteraction,
    context: TutorContext
  ): TutorResponse {
    // Simulate answer evaluation
    const isCorrect = Math.random() > 0.3; // Simplified - would actually evaluate

    if (isCorrect) {
      return {
        type: 'encouragement',
        content: `
✅ **Excellent work!** Your answer demonstrates a strong understanding of the concept.

**What you got right:**
- You correctly identified the key principles
- Your reasoning was sound and well-structured
- You applied the concept appropriately

**To deepen your understanding:** Consider how this might apply in more complex scenarios, such as when multiple factors are at play.

Ready to move on to the next topic?
        `,
        followUpQuestions: [
          'Would you like to try a more challenging question?',
          'Ready to move to the next lesson?'
        ],
        resources: [],
        adaptations: [
          {
            reason: 'Correct answer provided',
            adaptation: 'Reinforced learning with positive feedback'
          }
        ]
      };
    } else {
      return {
        type: 'correction',
        content: `
That's a good attempt, but let me help clarify a few points:

**Your answer**: ${interaction.content}

**Where to improve:**
- Consider the hierarchy of priorities in safety management
- Remember that prevention is more effective than reaction
- Think about how the components work together

**Correct approach:**
The key is to first assess the situation, then apply controls in order of effectiveness, and finally document everything for compliance.

Would you like to try again with this feedback in mind?
        `,
        followUpQuestions: [
          'Would you like me to explain this concept again?',
          'Should we look at a similar example first?'
        ],
        resources: [],
        adaptations: [
          {
            reason: 'Incorrect answer provided',
            adaptation: 'Provided constructive feedback with guidance'
          }
        ]
      };
    }
  }

  private generateAcknowledgment(interaction: TutorInteraction): TutorResponse {
    return {
      type: 'encouragement',
      content: 'Thank you for your feedback! Your input helps improve the learning experience. Is there anything else you\'d like to explore?',
      followUpQuestions: ['What would you like to learn next?'],
      resources: [],
      adaptations: []
    };
  }

  private generateDefaultResponse(
    interaction: TutorInteraction,
    context: TutorContext
  ): TutorResponse {
    return {
      type: 'explanation',
      content: 'I\'m here to help with your learning. Could you tell me more about what you\'d like to understand better?',
      followUpQuestions: [
        'What topic are you working on?',
        'What aspect would you like me to explain?'
      ],
      resources: [],
      adaptations: []
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private adaptToLearningStyle(content: string, style: string): string {
    switch (style) {
      case 'visual':
        return content + '\n\n📊 *See the diagram above for a visual representation.*';
      case 'auditory':
        return content + '\n\n🎧 *Listen to the explanation carefully and repeat the key points aloud.*';
      case 'reading':
        return content + '\n\n📚 *Review the detailed text and take notes on key concepts.*';
      case 'kinesthetic':
        return content + '\n\n🤲 *Try applying this concept in a hands-on exercise.*';
      default:
        return content;
    }
  }

  private generateExplanationContent(question: string): string {
    return 'Let me explain this concept in detail. The key principle here is to understand how each component works together to create a safe and compliant environment. By following the established guidelines and procedures, you can effectively manage risks and ensure everyone\'s safety.';
  }

  private simplifyContent(content: string): string {
    return 'At its core, this concept is about ensuring safety through systematic procedures and controls.';
  }

  private generateVisualAids(topic: string): VisualAid[] {
    return [
      {
        type: 'diagram',
        description: 'Conceptual diagram illustrating the key relationships',
        altText: 'Diagram showing the main concept and its components'
      }
    ];
  }

  private getSuggestedResources(topic: string): Resource[] {
    return [
      {
        title: 'Quick Reference Guide',
        type: 'document',
        description: 'One-page summary of key concepts'
      },
      {
        title: 'Video Tutorial',
        type: 'video',
        description: 'Detailed walkthrough with examples'
      }
    ];
  }

  // ---------------------------------------------------------------------------
  // Learner State Updates
  // ---------------------------------------------------------------------------

  private calculateLearnerStateUpdate(
    context: TutorContext,
    interaction: TutorInteraction,
    response: TutorResponse
  ): LearnerStateUpdate {
    const { learnerProfile, currentProgress } = context;

    // Calculate engagement level
    const engagementLevel = this.calculateEngagement(interaction, context);

    // Detect frustration indicators
    const frustrationIndicators = this.detectFrustration(interaction, context);

    // Determine recommended pace
    const recommendedPace = this.calculateRecommendedPace(
      engagementLevel,
      frustrationIndicators.length,
      response.type
    );

    // Calculate knowledge updates
    const knowledgeUpdates: Record<string, number> = {};
    if (interaction.type === 'submit-answer' && response.type === 'encouragement') {
      // Increase knowledge on correct answers
      knowledgeUpdates[currentProgress.currentLesson] =
        (learnerProfile.knowledgeLevel[currentProgress.currentLesson] || 0.5) + 0.1;
    }

    return {
      knowledgeUpdates,
      engagementLevel,
      frustrationIndicators,
      recommendedPace
    };
  }

  private calculateEngagement(
    interaction: TutorInteraction,
    context: TutorContext
  ): number {
    // Higher engagement for questions and active participation
    const interactionWeights: Record<string, number> = {
      'question': 0.9,
      'request-example': 0.85,
      'submit-answer': 0.8,
      'confusion': 0.6,
      'request-hint': 0.75,
      'feedback': 0.7
    };

    return interactionWeights[interaction.type] || 0.5;
  }

  private detectFrustration(
    interaction: TutorInteraction,
    context: TutorContext
  ): string[] {
    const indicators: string[] = [];

    if (interaction.type === 'confusion') {
      indicators.push('Expressed confusion');
    }

    if (context.currentProgress.strugglingTopics.length > 2) {
      indicators.push('Multiple struggling topics');
    }

    // Check for repeated similar interactions
    const recentSimilar = context.recentInteractions.filter(
      i => i.type === interaction.type
    );
    if (recentSimilar.length > 3) {
      indicators.push('Repeated requests for help');
    }

    return indicators;
  }

  private calculateRecommendedPace(
    engagement: number,
    frustrationCount: number,
    responseType: string
  ): 'slow-down' | 'maintain' | 'speed-up' {
    if (frustrationCount > 1 || responseType === 'correction') {
      return 'slow-down';
    }

    if (engagement > 0.8 && responseType === 'encouragement') {
      return 'speed-up';
    }

    return 'maintain';
  }

  // ---------------------------------------------------------------------------
  // Recommendations
  // ---------------------------------------------------------------------------

  private generateRecommendations(
    context: TutorContext,
    stateUpdate: LearnerStateUpdate
  ): RecommendedAction[] {
    const recommendations: RecommendedAction[] = [];

    // Check for remediation need
    if (stateUpdate.frustrationIndicators.length > 0) {
      recommendations.push({
        type: 'review-topic',
        priority: 'high',
        reason: 'Learner showing signs of difficulty',
        targetContent: context.currentProgress.strugglingTopics[0]
      });
    }

    // Check for advancement
    if (stateUpdate.recommendedPace === 'speed-up') {
      recommendations.push({
        type: 'move-forward',
        priority: 'medium',
        reason: 'Learner demonstrating strong understanding',
        targetContent: 'next-lesson'
      });
    }

    // Check for practice need
    if (stateUpdate.engagementLevel < 0.6) {
      recommendations.push({
        type: 'practice-more',
        priority: 'medium',
        reason: 'Additional practice recommended for reinforcement'
      });
    }

    // Check for break recommendation
    if (context.currentProgress.timeSpent > 45) {
      recommendations.push({
        type: 'take-break',
        priority: 'low',
        reason: 'Extended study session - break recommended for optimal retention'
      });
    }

    return recommendations;
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export const tutorAgentConfig = {
  id: 'tutor-agent',
  type: 'tutor' as const,
  name: 'Tutor Agent',
  description: 'Provides adaptive tutoring, explanations, and feedback based on learner needs',
  enabled: true,
  autoApprove: true, // Tutor responses don't need approval
  maxConcurrentTasks: 20, // High concurrency for responsive tutoring
  retryAttempts: 1,
  timeoutMs: 30000, // 30 seconds max for interactive responses
  modelConfig: {
    model: 'claude-3-sonnet',
    temperature: 0.7,
    maxTokens: 4000
  }
};

// ============================================================================
// FACTORY
// ============================================================================

export const createTutorAgent = (): {
  handler: TutorAgent;
  config: typeof tutorAgentConfig;
} => {
  return {
    handler: new TutorAgent(),
    config: tutorAgentConfig
  };
};
