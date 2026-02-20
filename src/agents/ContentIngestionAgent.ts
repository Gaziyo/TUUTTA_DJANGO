import type { AgentHandler } from './AgentOrchestrator';
import type {
  AgentTask,
  TaskInput,
  TaskOutput,
  ContentIngestionInput,
  ContentIngestionOutput,
  ExtractedContent,
  ContentSection,
  KeyTerm,
  Topic,
  ComplianceTag,
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeEdge
} from '../types/agents';

// ============================================================================
// CONTENT INGESTION AGENT
// ============================================================================

/**
 * Content Ingestion Agent
 *
 * Responsibilities:
 * - Extract content from uploaded documents (PDF, DOCX, PPTX, etc.)
 * - Perform semantic analysis and chunking
 * - Identify key concepts, terms, and learning objectives
 * - Create knowledge graph from extracted content
 * - Tag content for compliance requirements
 * - Estimate learning time
 */
export class ContentIngestionAgent implements AgentHandler {
  type: 'content-ingestion' = 'content-ingestion';

  validate(input: TaskInput): boolean {
    const data = input.data as ContentIngestionInput['data'];
    return !!(
      data.documentId &&
      data.documentType &&
      data.documentUrl &&
      data.documentName &&
      data.extractionMode
    );
  }

  estimateProcessingTime(input: TaskInput): number {
    const data = input.data as ContentIngestionInput['data'];
    // Estimate based on document type and extraction mode
    const baseTime = 30000; // 30 seconds base
    const modeMultiplier = data.extractionMode === 'full' ? 2 : 1;
    const typeMultiplier = ['pdf', 'docx'].includes(data.documentType) ? 1.5 : 1;
    return baseTime * modeMultiplier * typeMultiplier;
  }

  async process(task: AgentTask): Promise<TaskOutput> {
    const input = task.input as ContentIngestionInput;
    const { documentId, documentType, documentName, extractionMode, targetAudience, complianceContext } = input.data;

    try {
      // Step 1: Extract raw content from document
      const rawContent = await this.extractDocumentContent(input.data);

      // Step 2: Perform semantic analysis
      const extractedContent = await this.performSemanticAnalysis(rawContent, extractionMode);

      // Step 3: Build knowledge graph
      const knowledgeGraph = this.buildKnowledgeGraph(extractedContent);

      // Step 4: Identify topics
      const suggestedTopics = this.identifyTopics(extractedContent);

      // Step 5: Tag for compliance
      const complianceTags = this.tagForCompliance(extractedContent, complianceContext);

      // Step 6: Estimate learning time
      const estimatedLearningTime = this.estimateLearningTime(extractedContent);

      const output: ContentIngestionOutput = {
        type: 'content-ingestion',
        confidence: 0.85,
        artifacts: [
          {
            id: `kg-${documentId}`,
            type: 'knowledge-graph',
            name: `Knowledge Graph: ${documentName}`,
            data: knowledgeGraph,
            createdAt: new Date()
          }
        ],
        data: {
          documentId,
          extractedContent,
          knowledgeGraph,
          suggestedTopics,
          complianceTags,
          estimatedLearningTime
        }
      };

      return output;
    } catch (error) {
      throw new Error(`Content ingestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private async extractDocumentContent(data: ContentIngestionInput['data']): Promise<string> {
    // In production, this would call document processing APIs
    // For now, simulate extraction based on document type
    const { documentType, documentUrl, documentName } = data;

    // Simulate API call delay
    await this.simulateProcessing(1000);

    // Return simulated extracted content
    return `
      Document: ${documentName}
      Type: ${documentType}

      Introduction
      This document covers the key aspects of workplace safety and compliance.
      Understanding these principles is essential for all employees.

      Section 1: Safety Protocols
      Safety protocols are designed to protect employees from workplace hazards.
      Key protocols include personal protective equipment, emergency procedures,
      and incident reporting.

      Section 2: Compliance Requirements
      All employees must complete safety training within 30 days of hire.
      Annual refresher training is mandatory.
      Documentation must be maintained for audit purposes.

      Section 3: Emergency Procedures
      In case of emergency, follow the evacuation plan.
      Know the location of emergency exits and assembly points.
      Report all incidents to your supervisor immediately.

      Key Terms:
      - PPE: Personal Protective Equipment
      - OSHA: Occupational Safety and Health Administration
      - SDS: Safety Data Sheet

      Learning Objectives:
      1. Identify common workplace hazards
      2. Apply proper safety protocols
      3. Respond appropriately to emergencies
      4. Complete required compliance documentation
    `;
  }

  private async performSemanticAnalysis(
    rawContent: string,
    extractionMode: 'full' | 'summary' | 'key-points'
  ): Promise<ExtractedContent> {
    await this.simulateProcessing(500);

    // Parse sections from content
    const sections = this.parseSections(rawContent);
    const keyTerms = this.extractKeyTerms(rawContent);
    const learningObjectives = this.extractLearningObjectives(rawContent);
    const prerequisites = this.identifyPrerequisites(rawContent);

    return {
      title: this.extractTitle(rawContent),
      summary: this.generateSummary(rawContent, extractionMode),
      sections,
      keyTerms,
      learningObjectives,
      prerequisites
    };
  }

  private extractTitle(content: string): string {
    const lines = content.split('\n').filter(l => l.trim());
    const documentLine = lines.find(l => l.includes('Document:'));
    if (documentLine) {
      return documentLine.replace('Document:', '').trim();
    }
    return 'Untitled Document';
  }

  private generateSummary(content: string, mode: string): string {
    if (mode === 'key-points') {
      return 'This document covers workplace safety protocols, compliance requirements, and emergency procedures. Key focus areas include PPE usage, training requirements, and incident reporting.';
    }
    return 'A comprehensive guide to workplace safety and compliance, covering safety protocols, regulatory requirements, emergency procedures, and key terminology. Essential reading for all employees to ensure a safe and compliant work environment.';
  }

  private parseSections(content: string): ContentSection[] {
    const sections: ContentSection[] = [];
    const sectionRegex = /Section \d+: ([^\n]+)\n([\s\S]*?)(?=Section \d+:|Key Terms:|Learning Objectives:|$)/g;

    let match;
    let order = 0;
    while ((match = sectionRegex.exec(content)) !== null) {
      order++;
      sections.push({
        id: `section-${order}`,
        title: match[1].trim(),
        content: match[2].trim(),
        type: 'text',
        importance: order === 1 ? 'critical' : 'important',
        relatedSections: []
      });
    }

    // Add introduction if present
    if (content.includes('Introduction')) {
      const introMatch = content.match(/Introduction\n([\s\S]*?)(?=Section 1:|$)/);
      if (introMatch) {
        sections.unshift({
          id: 'section-intro',
          title: 'Introduction',
          content: introMatch[1].trim(),
          type: 'text',
          importance: 'important',
          relatedSections: ['section-1', 'section-2']
        });
      }
    }

    return sections;
  }

  private extractKeyTerms(content: string): KeyTerm[] {
    const keyTerms: KeyTerm[] = [
      {
        term: 'PPE',
        definition: 'Personal Protective Equipment - safety gear worn to minimize exposure to hazards',
        context: 'Required in areas with potential hazards',
        relatedTerms: ['safety gear', 'protective equipment']
      },
      {
        term: 'OSHA',
        definition: 'Occupational Safety and Health Administration - federal agency ensuring safe working conditions',
        context: 'Regulatory compliance requirements',
        relatedTerms: ['compliance', 'regulations', 'safety standards']
      },
      {
        term: 'SDS',
        definition: 'Safety Data Sheet - document containing information about chemical hazards',
        context: 'Chemical safety and handling procedures',
        relatedTerms: ['hazmat', 'chemical safety', 'MSDS']
      }
    ];

    return keyTerms;
  }

  private extractLearningObjectives(content: string): string[] {
    const objectives: string[] = [];
    const objectiveRegex = /\d+\.\s+([^\n]+)/g;
    const objectivesSection = content.match(/Learning Objectives:([\s\S]*?)$/);

    if (objectivesSection) {
      let match;
      while ((match = objectiveRegex.exec(objectivesSection[1])) !== null) {
        objectives.push(match[1].trim());
      }
    }

    return objectives.length > 0 ? objectives : [
      'Understand key concepts presented in the document',
      'Apply learned principles in practical scenarios',
      'Demonstrate competency through assessment'
    ];
  }

  private identifyPrerequisites(content: string): string[] {
    // Analyze content for prerequisite knowledge requirements
    return [
      'Basic understanding of workplace environments',
      'Familiarity with organizational policies'
    ];
  }

  private buildKnowledgeGraph(content: ExtractedContent): KnowledgeGraph {
    const nodes: KnowledgeNode[] = [];
    const edges: KnowledgeEdge[] = [];

    // Create nodes for key terms
    content.keyTerms.forEach((term, index) => {
      nodes.push({
        id: `term-${index}`,
        type: 'concept',
        label: term.term,
        description: term.definition,
        weight: 0.8,
        metadata: { context: term.context }
      });
    });

    // Create nodes for learning objectives
    content.learningObjectives.forEach((objective, index) => {
      nodes.push({
        id: `objective-${index}`,
        type: 'skill',
        label: `Objective ${index + 1}`,
        description: objective,
        weight: 1.0,
        metadata: {}
      });
    });

    // Create nodes for sections
    content.sections.forEach(section => {
      nodes.push({
        id: section.id,
        type: 'concept',
        label: section.title,
        description: section.content.substring(0, 200),
        weight: section.importance === 'critical' ? 1.0 : 0.7,
        metadata: { importance: section.importance }
      });
    });

    // Create edges connecting related concepts
    for (let i = 0; i < content.sections.length - 1; i++) {
      edges.push({
        id: `edge-section-${i}`,
        source: content.sections[i].id,
        target: content.sections[i + 1].id,
        type: 'leads-to',
        weight: 0.8
      });
    }

    // Connect terms to related sections
    nodes.filter(n => n.type === 'concept' && n.id.startsWith('term-')).forEach((termNode, index) => {
      if (content.sections.length > 0) {
        edges.push({
          id: `edge-term-${index}`,
          source: termNode.id,
          target: content.sections[0].id,
          type: 'related-to',
          weight: 0.6
        });
      }
    });

    return { nodes, edges };
  }

  private identifyTopics(content: ExtractedContent): Topic[] {
    const topics: Topic[] = [
      {
        id: 'topic-safety',
        name: 'Workplace Safety',
        description: 'Core concepts of workplace safety and hazard prevention',
        relatedTopicIds: ['topic-compliance', 'topic-emergency'],
        skillLevel: 'beginner'
      },
      {
        id: 'topic-compliance',
        name: 'Regulatory Compliance',
        description: 'Understanding and meeting regulatory requirements',
        parentTopicId: 'topic-safety',
        relatedTopicIds: ['topic-safety'],
        skillLevel: 'intermediate'
      },
      {
        id: 'topic-emergency',
        name: 'Emergency Response',
        description: 'Procedures for handling workplace emergencies',
        parentTopicId: 'topic-safety',
        relatedTopicIds: ['topic-safety'],
        skillLevel: 'beginner'
      }
    ];

    return topics;
  }

  private tagForCompliance(
    content: ExtractedContent,
    complianceContext?: string[]
  ): ComplianceTag[] {
    const tags: ComplianceTag[] = [
      {
        category: 'Workplace Safety',
        requirement: 'Safety Training',
        regulation: 'OSHA 29 CFR 1910',
        priority: 'mandatory'
      },
      {
        category: 'Documentation',
        requirement: 'Training Records',
        regulation: 'OSHA Recordkeeping',
        priority: 'mandatory'
      },
      {
        category: 'Periodic Training',
        requirement: 'Annual Refresher',
        priority: 'mandatory'
      }
    ];

    // Add context-specific tags
    if (complianceContext?.includes('healthcare')) {
      tags.push({
        category: 'Healthcare Compliance',
        requirement: 'HIPAA Training',
        regulation: 'HIPAA',
        priority: 'mandatory'
      });
    }

    return tags;
  }

  private estimateLearningTime(content: ExtractedContent): number {
    // Estimate based on content complexity
    const sectionCount = content.sections.length;
    const termCount = content.keyTerms.length;
    const objectiveCount = content.learningObjectives.length;

    // Base: 5 minutes per section, 2 minutes per term, 10 minutes per objective
    const baseTime = (sectionCount * 5) + (termCount * 2) + (objectiveCount * 10);

    // Add buffer for assessments and review
    return Math.ceil(baseTime * 1.3);
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export const contentIngestionAgentConfig = {
  id: 'content-ingestion-agent',
  type: 'content-ingestion' as const,
  name: 'Content Ingestion Agent',
  description: 'Extracts and analyzes content from uploaded documents, creating knowledge graphs and identifying learning objectives',
  enabled: true,
  autoApprove: false, // Require human review of extracted content
  maxConcurrentTasks: 5,
  retryAttempts: 3,
  timeoutMs: 300000, // 5 minutes
  modelConfig: {
    model: 'claude-3-opus',
    temperature: 0.3,
    maxTokens: 8000
  }
};

// ============================================================================
// FACTORY
// ============================================================================

export const createContentIngestionAgent = (): {
  handler: ContentIngestionAgent;
  config: typeof contentIngestionAgentConfig;
} => {
  return {
    handler: new ContentIngestionAgent(),
    config: contentIngestionAgentConfig
  };
};
