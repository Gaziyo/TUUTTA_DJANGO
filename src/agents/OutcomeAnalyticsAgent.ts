import type { AgentHandler } from './AgentOrchestrator';
import type {
  AgentTask,
  TaskInput,
  TaskOutput,
  OutcomeAnalyticsInput,
  OutcomeAnalyticsOutput,
  AnalysisType,
  AnalysisScope,
  TimeRange,
  Insight,
  Prediction,
  AnalyticsRecommendation,
  AnalyticsAlert,
  VisualizationData,
  DataPoint,
  PredictionFactor
} from '../types/agents';

// ============================================================================
// OUTCOME ANALYTICS AGENT
// ============================================================================

/**
 * Outcome Analytics Agent (MOAT - Most Strategic Agent)
 *
 * Responsibilities:
 * - Detect skill gaps across organization
 * - Forecast readiness and completion rates
 * - Identify compliance risks
 * - Measure learning effectiveness
 * - Analyze engagement trends
 * - Generate actionable recommendations
 * - Trigger automated retraining when needed
 */
export class OutcomeAnalyticsAgent implements AgentHandler {
  type: 'outcome-analytics' = 'outcome-analytics';

  validate(input: TaskInput): boolean {
    const data = input.data as OutcomeAnalyticsInput['data'];
    return !!(
      data.analysisType &&
      data.scope &&
      data.timeRange
    );
  }

  estimateProcessingTime(input: TaskInput): number {
    const data = input.data as OutcomeAnalyticsInput['data'];
    // Complex analyses take longer
    const complexTypes: AnalysisType[] = ['readiness-forecast', 'performance-prediction'];
    const baseTime = 20000;
    const complexityMultiplier = complexTypes.includes(data.analysisType) ? 2 : 1;
    const scopeMultiplier = data.scope.level === 'organization' ? 2 : 1;
    return baseTime * complexityMultiplier * scopeMultiplier;
  }

  async process(task: AgentTask): Promise<TaskOutput> {
    const input = task.input as OutcomeAnalyticsInput;
    const { analysisType, scope, timeRange, filters } = input.data;

    try {
      // Step 1: Collect and process data
      const rawData = await this.collectData(scope, timeRange, filters);

      // Step 2: Perform analysis based on type
      const analysisResults = await this.performAnalysis(analysisType, rawData, scope);

      // Step 3: Generate insights
      const insights = this.generateInsights(analysisResults, analysisType);

      // Step 4: Create predictions
      const predictions = this.createPredictions(analysisResults, analysisType, timeRange);

      // Step 5: Generate recommendations
      const recommendations = this.generateRecommendations(insights, predictions, scope);

      // Step 6: Check for alerts
      const alerts = this.checkForAlerts(analysisResults, scope);

      // Step 7: Prepare visualizations
      const visualizations = this.prepareVisualizations(analysisResults, analysisType);

      const output: OutcomeAnalyticsOutput = {
        type: 'outcome-analytics',
        confidence: 0.88,
        artifacts: [
          {
            id: `report-${Date.now()}`,
            type: 'report',
            name: `${this.getAnalysisTypeName(analysisType)} Report`,
            data: { insights, predictions, recommendations, alerts },
            createdAt: new Date()
          }
        ],
        data: {
          analysisId: `analysis-${Date.now()}`,
          insights,
          predictions,
          recommendations,
          alerts,
          visualizations
        }
      };

      return output;
    } catch (error) {
      throw new Error(`Analytics failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Data Collection
  // ---------------------------------------------------------------------------

  private async collectData(
    scope: AnalysisScope,
    timeRange: TimeRange,
    filters?: OutcomeAnalyticsInput['data']['filters']
  ): Promise<AnalyticsRawData> {
    await this.simulateProcessing(500);

    // Simulate data collection based on scope
    const entityCount = scope.level === 'organization' ? 500 :
                       scope.level === 'department' ? 100 :
                       scope.level === 'team' ? 25 : 1;

    return {
      learnerCount: entityCount,
      courseCount: 15,
      completionRate: 0.72,
      averageScore: 78.5,
      engagementScore: 0.65,
      complianceRate: 0.89,
      skillGapData: this.generateSkillGapData(),
      timeSeriesData: this.generateTimeSeriesData(timeRange),
      performanceData: this.generatePerformanceData(entityCount)
    };
  }

  private generateSkillGapData(): SkillGapData[] {
    return [
      { skillId: 'safety-basics', skillName: 'Safety Fundamentals', currentLevel: 0.82, requiredLevel: 0.90, gap: 0.08 },
      { skillId: 'hazard-id', skillName: 'Hazard Identification', currentLevel: 0.68, requiredLevel: 0.85, gap: 0.17 },
      { skillId: 'emergency-resp', skillName: 'Emergency Response', currentLevel: 0.75, requiredLevel: 0.95, gap: 0.20 },
      { skillId: 'compliance-doc', skillName: 'Compliance Documentation', currentLevel: 0.71, requiredLevel: 0.80, gap: 0.09 },
      { skillId: 'ppe-usage', skillName: 'PPE Usage', currentLevel: 0.88, requiredLevel: 0.90, gap: 0.02 }
    ];
  }

  private generateTimeSeriesData(timeRange: TimeRange): TimeSeriesPoint[] {
    const data: TimeSeriesPoint[] = [];
    const daysBetween = Math.ceil(
      (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const pointCount = Math.min(daysBetween, 30);

    for (let i = 0; i < pointCount; i++) {
      data.push({
        date: new Date(timeRange.start.getTime() + (i * 24 * 60 * 60 * 1000)),
        completions: Math.floor(10 + Math.random() * 20),
        enrollments: Math.floor(15 + Math.random() * 25),
        activeUsers: Math.floor(100 + Math.random() * 50),
        avgScore: 70 + Math.random() * 20
      });
    }

    return data;
  }

  private generatePerformanceData(count: number): PerformanceRecord[] {
    const records: PerformanceRecord[] = [];

    for (let i = 0; i < Math.min(count, 50); i++) {
      records.push({
        entityId: `entity-${i}`,
        score: 60 + Math.random() * 40,
        completionRate: 0.5 + Math.random() * 0.5,
        engagementRate: 0.4 + Math.random() * 0.6,
        riskLevel: Math.random() > 0.8 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low'
      });
    }

    return records;
  }

  // ---------------------------------------------------------------------------
  // Analysis
  // ---------------------------------------------------------------------------

  private async performAnalysis(
    analysisType: AnalysisType,
    rawData: AnalyticsRawData,
    scope: AnalysisScope
  ): Promise<AnalysisResults> {
    await this.simulateProcessing(300);

    return {
      analysisType,
      scope,
      metrics: {
        overallScore: rawData.averageScore,
        completionRate: rawData.completionRate,
        engagementScore: rawData.engagementScore,
        complianceRate: rawData.complianceRate,
        atRiskCount: rawData.performanceData.filter(p => p.riskLevel === 'high').length,
        improvementTrend: 0.05 // 5% improvement
      },
      skillGaps: rawData.skillGapData,
      timeSeriesData: rawData.timeSeriesData,
      performanceDistribution: this.calculateDistribution(rawData.performanceData)
    };
  }

  private calculateDistribution(data: PerformanceRecord[]): PerformanceDistribution {
    const scores = data.map(d => d.score);
    return {
      excellent: scores.filter(s => s >= 90).length / data.length,
      good: scores.filter(s => s >= 80 && s < 90).length / data.length,
      satisfactory: scores.filter(s => s >= 70 && s < 80).length / data.length,
      needsImprovement: scores.filter(s => s >= 60 && s < 70).length / data.length,
      critical: scores.filter(s => s < 60).length / data.length
    };
  }

  // ---------------------------------------------------------------------------
  // Insights Generation
  // ---------------------------------------------------------------------------

  private generateInsights(
    results: AnalysisResults,
    analysisType: AnalysisType
  ): Insight[] {
    const insights: Insight[] = [];

    // Skill gap insights
    const criticalGaps = results.skillGaps.filter(g => g.gap > 0.15);
    if (criticalGaps.length > 0) {
      insights.push({
        id: 'insight-skill-gaps',
        type: 'anomaly',
        title: 'Critical Skill Gaps Detected',
        description: `${criticalGaps.length} skills have gaps exceeding 15%. Priority training required for: ${criticalGaps.map(g => g.skillName).join(', ')}.`,
        significance: 'critical',
        dataPoints: criticalGaps.map(g => ({
          label: g.skillName,
          value: Math.round(g.gap * 100),
          unit: '%',
          change: undefined,
          changeDirection: 'down' as const
        })),
        affectedEntities: criticalGaps.map(g => g.skillId)
      });
    }

    // Performance trend insight
    const recentTrend = this.calculateTrend(results.timeSeriesData);
    insights.push({
      id: 'insight-trend',
      type: 'trend',
      title: recentTrend > 0 ? 'Positive Learning Trend' : 'Declining Performance Trend',
      description: recentTrend > 0
        ? `Learning outcomes have improved by ${Math.abs(Math.round(recentTrend * 100))}% over the analysis period.`
        : `Learning outcomes have declined by ${Math.abs(Math.round(recentTrend * 100))}%. Intervention recommended.`,
      significance: Math.abs(recentTrend) > 0.1 ? 'high' : 'medium',
      dataPoints: [{
        label: 'Performance Trend',
        value: Math.round(recentTrend * 100),
        unit: '%',
        changeDirection: recentTrend > 0 ? 'up' : 'down'
      }],
      affectedEntities: []
    });

    // Compliance insight
    if (results.metrics.complianceRate < 0.95) {
      insights.push({
        id: 'insight-compliance',
        type: 'anomaly',
        title: 'Compliance Target Not Met',
        description: `Current compliance rate is ${Math.round(results.metrics.complianceRate * 100)}%, below the 95% target. ${Math.round((0.95 - results.metrics.complianceRate) * results.performanceDistribution.critical * 100)}% of learners require attention.`,
        significance: results.metrics.complianceRate < 0.85 ? 'critical' : 'high',
        dataPoints: [{
          label: 'Compliance Rate',
          value: Math.round(results.metrics.complianceRate * 100),
          unit: '%',
          change: -5,
          changeDirection: 'down'
        }],
        affectedEntities: []
      });
    }

    // Engagement insight
    insights.push({
      id: 'insight-engagement',
      type: 'benchmark',
      title: 'Engagement Analysis',
      description: `Overall engagement score is ${Math.round(results.metrics.engagementScore * 100)}%. ${results.metrics.engagementScore > 0.7 ? 'Above' : 'Below'} industry benchmark of 70%.`,
      significance: results.metrics.engagementScore > 0.7 ? 'low' : 'medium',
      dataPoints: [{
        label: 'Engagement Score',
        value: Math.round(results.metrics.engagementScore * 100),
        unit: '%'
      }],
      affectedEntities: []
    });

    return insights;
  }

  private calculateTrend(data: TimeSeriesPoint[]): number {
    if (data.length < 2) return 0;

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.avgScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.avgScore, 0) / secondHalf.length;

    return (secondAvg - firstAvg) / firstAvg;
  }

  // ---------------------------------------------------------------------------
  // Predictions
  // ---------------------------------------------------------------------------

  private createPredictions(
    results: AnalysisResults,
    analysisType: AnalysisType,
    timeRange: TimeRange
  ): Prediction[] {
    const predictions: Prediction[] = [];

    // Completion prediction
    predictions.push({
      id: 'prediction-completion',
      type: 'completion',
      target: 'Overall Course Completion',
      predictedValue: Math.min(0.95, results.metrics.completionRate + 0.08),
      confidence: 0.82,
      factors: [
        { name: 'Current momentum', impact: 0.4, description: 'Recent completion trends are positive' },
        { name: 'Engagement level', impact: 0.3, description: 'Engagement scores support continued progress' },
        { name: 'Seasonal factors', impact: -0.1, description: 'Historical patterns show slight Q4 slowdown' }
      ],
      timeframe: '30 days'
    });

    // Performance prediction
    predictions.push({
      id: 'prediction-performance',
      type: 'performance',
      target: 'Average Assessment Score',
      predictedValue: results.metrics.overallScore + 3.5,
      confidence: 0.78,
      factors: [
        { name: 'Learning curve', impact: 0.5, description: 'Learners showing steady improvement' },
        { name: 'Content updates', impact: 0.2, description: 'Recent content improvements driving better outcomes' },
        { name: 'Skill gap remediation', impact: 0.3, description: 'Targeted interventions addressing weak areas' }
      ],
      timeframe: '60 days'
    });

    // Risk prediction
    const atRiskRate = results.metrics.atRiskCount / 50; // Simplified
    predictions.push({
      id: 'prediction-risk',
      type: 'risk',
      target: 'Non-Compliance Risk',
      predictedValue: atRiskRate * 0.8, // Expecting 20% reduction
      confidence: 0.75,
      factors: [
        { name: 'Intervention effectiveness', impact: -0.4, description: 'Active interventions reducing risk' },
        { name: 'Deadline pressure', impact: 0.2, description: 'Upcoming deadlines may increase stress' },
        { name: 'Support availability', impact: -0.2, description: 'Enhanced support reducing barriers' }
      ],
      timeframe: '14 days'
    });

    return predictions;
  }

  // ---------------------------------------------------------------------------
  // Recommendations
  // ---------------------------------------------------------------------------

  private generateRecommendations(
    insights: Insight[],
    predictions: Prediction[],
    scope: AnalysisScope
  ): AnalyticsRecommendation[] {
    const recommendations: AnalyticsRecommendation[] = [];

    // Check critical insights
    const criticalInsights = insights.filter(i => i.significance === 'critical');
    criticalInsights.forEach(insight => {
      recommendations.push({
        id: `rec-${insight.id}`,
        type: 'intervention',
        priority: 'urgent',
        title: `Address: ${insight.title}`,
        description: `Immediate action required to resolve ${insight.description}`,
        expectedImpact: 'High - addresses critical gap',
        effort: 'medium',
        targetEntities: insight.affectedEntities,
        actions: [
          'Schedule targeted training sessions',
          'Assign additional practice exercises',
          'Set up manager check-ins',
          'Review and update learning materials'
        ]
      });
    });

    // Optimization recommendations
    recommendations.push({
      id: 'rec-optimization',
      type: 'optimization',
      priority: 'medium',
      title: 'Optimize Learning Paths',
      description: 'Analysis indicates opportunities to improve learning path efficiency based on successful learner patterns.',
      expectedImpact: 'Medium - 15% time reduction expected',
      effort: 'low',
      targetEntities: [],
      actions: [
        'Implement adaptive sequencing',
        'Add prerequisite skip options for advanced learners',
        'Streamline assessment frequency'
      ]
    });

    // Resource allocation recommendation
    recommendations.push({
      id: 'rec-resources',
      type: 'resource-allocation',
      priority: 'medium',
      title: 'Reallocate Training Resources',
      description: 'Some training modules are over-subscribed while others have availability.',
      expectedImpact: 'Medium - improved resource utilization',
      effort: 'low',
      targetEntities: [],
      actions: [
        'Rebalance instructor assignments',
        'Add capacity to high-demand sessions',
        'Consolidate low-attendance sessions'
      ]
    });

    // Content update recommendation
    recommendations.push({
      id: 'rec-content',
      type: 'content-update',
      priority: 'low',
      title: 'Update Learning Content',
      description: 'Some materials have not been updated in 12+ months and may benefit from refresh.',
      expectedImpact: 'Low-Medium - improved engagement',
      effort: 'high',
      targetEntities: [],
      actions: [
        'Review and update outdated modules',
        'Add new interactive elements',
        'Incorporate recent case studies'
      ]
    });

    return recommendations;
  }

  // ---------------------------------------------------------------------------
  // Alerts
  // ---------------------------------------------------------------------------

  private checkForAlerts(
    results: AnalysisResults,
    scope: AnalysisScope
  ): AnalyticsAlert[] {
    const alerts: AnalyticsAlert[] = [];

    // Compliance deadline alert
    if (results.metrics.complianceRate < 0.90) {
      alerts.push({
        id: 'alert-compliance',
        severity: 'critical',
        type: 'compliance-deadline',
        title: 'Compliance Deadline Approaching',
        message: `${Math.round((1 - results.metrics.complianceRate) * 100)}% of required training incomplete with deadline in 14 days.`,
        affectedCount: Math.round((1 - results.metrics.complianceRate) * 50),
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        suggestedAction: 'Send reminder notifications and escalate to managers'
      });
    }

    // Performance drop alert
    if (results.performanceDistribution.critical > 0.1) {
      alerts.push({
        id: 'alert-performance',
        severity: 'warning',
        type: 'performance-drop',
        title: 'Performance Concerns Detected',
        message: `${Math.round(results.performanceDistribution.critical * 100)}% of learners scoring below 60%.`,
        affectedCount: Math.round(results.performanceDistribution.critical * 50),
        suggestedAction: 'Initiate remediation program for struggling learners'
      });
    }

    // Skill gap alert
    const majorGaps = results.skillGaps.filter(g => g.gap > 0.20);
    if (majorGaps.length > 0) {
      alerts.push({
        id: 'alert-skill-gap',
        severity: 'warning',
        type: 'skill-gap',
        title: 'Major Skill Gaps Identified',
        message: `${majorGaps.length} skills have gaps exceeding 20%: ${majorGaps.map(g => g.skillName).join(', ')}.`,
        affectedCount: majorGaps.length,
        suggestedAction: 'Schedule focused training sessions for identified skill areas'
      });
    }

    return alerts;
  }

  // ---------------------------------------------------------------------------
  // Visualizations
  // ---------------------------------------------------------------------------

  private prepareVisualizations(
    results: AnalysisResults,
    analysisType: AnalysisType
  ): VisualizationData[] {
    return [
      {
        id: 'viz-trend',
        type: 'line-chart',
        title: 'Learning Progress Over Time',
        data: {
          labels: results.timeSeriesData.map(d => d.date.toLocaleDateString()),
          datasets: [
            {
              label: 'Average Score',
              data: results.timeSeriesData.map(d => d.avgScore)
            },
            {
              label: 'Completions',
              data: results.timeSeriesData.map(d => d.completions)
            }
          ]
        },
        config: { xAxis: 'Date', yAxis: 'Value' }
      },
      {
        id: 'viz-distribution',
        type: 'pie-chart',
        title: 'Performance Distribution',
        data: {
          labels: ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement', 'Critical'],
          values: [
            results.performanceDistribution.excellent,
            results.performanceDistribution.good,
            results.performanceDistribution.satisfactory,
            results.performanceDistribution.needsImprovement,
            results.performanceDistribution.critical
          ]
        },
        config: {}
      },
      {
        id: 'viz-skills',
        type: 'bar-chart',
        title: 'Skill Gap Analysis',
        data: {
          labels: results.skillGaps.map(g => g.skillName),
          datasets: [
            {
              label: 'Current Level',
              data: results.skillGaps.map(g => g.currentLevel * 100)
            },
            {
              label: 'Required Level',
              data: results.skillGaps.map(g => g.requiredLevel * 100)
            }
          ]
        },
        config: { xAxis: 'Skill', yAxis: 'Proficiency %' }
      },
      {
        id: 'viz-heatmap',
        type: 'heatmap',
        title: 'Activity Heatmap',
        data: {
          rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          cols: ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM'],
          values: Array(5).fill(null).map(() => Array(8).fill(null).map(() => Math.random() * 100))
        },
        config: {}
      }
    ];
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getAnalysisTypeName(type: AnalysisType): string {
    const names: Record<AnalysisType, string> = {
      'skill-gap': 'Skill Gap Analysis',
      'readiness-forecast': 'Readiness Forecast',
      'compliance-risk': 'Compliance Risk Assessment',
      'learning-effectiveness': 'Learning Effectiveness',
      'engagement-trends': 'Engagement Trends',
      'performance-prediction': 'Performance Prediction'
    };
    return names[type] || type;
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface AnalyticsRawData {
  learnerCount: number;
  courseCount: number;
  completionRate: number;
  averageScore: number;
  engagementScore: number;
  complianceRate: number;
  skillGapData: SkillGapData[];
  timeSeriesData: TimeSeriesPoint[];
  performanceData: PerformanceRecord[];
}

interface SkillGapData {
  skillId: string;
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
}

interface TimeSeriesPoint {
  date: Date;
  completions: number;
  enrollments: number;
  activeUsers: number;
  avgScore: number;
}

interface PerformanceRecord {
  entityId: string;
  score: number;
  completionRate: number;
  engagementRate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface PerformanceDistribution {
  excellent: number;
  good: number;
  satisfactory: number;
  needsImprovement: number;
  critical: number;
}

interface AnalysisResults {
  analysisType: AnalysisType;
  scope: AnalysisScope;
  metrics: {
    overallScore: number;
    completionRate: number;
    engagementScore: number;
    complianceRate: number;
    atRiskCount: number;
    improvementTrend: number;
  };
  skillGaps: SkillGapData[];
  timeSeriesData: TimeSeriesPoint[];
  performanceDistribution: PerformanceDistribution;
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export const outcomeAnalyticsAgentConfig = {
  id: 'outcome-analytics-agent',
  type: 'outcome-analytics' as const,
  name: 'Outcome Analytics Agent',
  description: 'Analyzes learning outcomes, detects skill gaps, forecasts readiness, and generates actionable recommendations',
  enabled: true,
  autoApprove: true, // Analytics reports can auto-generate
  maxConcurrentTasks: 3,
  retryAttempts: 2,
  timeoutMs: 300000, // 5 minutes for complex analyses
  modelConfig: {
    model: 'claude-3-opus',
    temperature: 0.2, // Lower temperature for analytical tasks
    maxTokens: 16000
  }
};

// ============================================================================
// FACTORY
// ============================================================================

export const createOutcomeAnalyticsAgent = (): {
  handler: OutcomeAnalyticsAgent;
  config: typeof outcomeAnalyticsAgentConfig;
} => {
  return {
    handler: new OutcomeAnalyticsAgent(),
    config: outcomeAnalyticsAgentConfig
  };
};
