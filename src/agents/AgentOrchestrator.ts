import type {
  AgentType,
  AgentConfig,
  AgentState,
  AgentTask,
  TaskInput,
  TaskOutput,
  TaskPriority,
  TaskError,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowStep
} from '../types/agents';

// ============================================================================
// AGENT REGISTRY
// ============================================================================

export interface AgentHandler {
  type: AgentType;
  process: (task: AgentTask) => Promise<TaskOutput>;
  validate: (input: TaskInput) => boolean;
  estimateProcessingTime: (input: TaskInput) => number;
}

class AgentRegistry {
  private handlers: Map<AgentType, AgentHandler> = new Map();
  private configs: Map<AgentType, AgentConfig> = new Map();

  register(handler: AgentHandler, config: AgentConfig): void {
    this.handlers.set(handler.type, handler);
    this.configs.set(handler.type, config);
  }

  getHandler(type: AgentType): AgentHandler | undefined {
    return this.handlers.get(type);
  }

  getConfig(type: AgentType): AgentConfig | undefined {
    return this.configs.get(type);
  }

  getAllConfigs(): AgentConfig[] {
    return Array.from(this.configs.values());
  }

  isRegistered(type: AgentType): boolean {
    return this.handlers.has(type);
  }
}

// ============================================================================
// TASK QUEUE
// ============================================================================

class TaskQueue {
  private queues: Map<AgentType, AgentTask[]> = new Map();
  private processingTasks: Map<string, AgentTask> = new Map();

  enqueue(task: AgentTask): void {
    const queue = this.queues.get(task.agentType) || [];
    queue.push(task);
    queue.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
    this.queues.set(task.agentType, queue);
  }

  dequeue(agentType: AgentType): AgentTask | undefined {
    const queue = this.queues.get(agentType);
    if (!queue || queue.length === 0) return undefined;
    const task = queue.shift();
    if (task) {
      this.processingTasks.set(task.id, task);
    }
    return task;
  }

  markComplete(taskId: string): void {
    this.processingTasks.delete(taskId);
  }

  getQueueLength(agentType: AgentType): number {
    return this.queues.get(agentType)?.length || 0;
  }

  getProcessingCount(agentType: AgentType): number {
    return Array.from(this.processingTasks.values())
      .filter(t => t.agentType === agentType).length;
  }

  private getPriorityWeight(priority: TaskPriority): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }
}

// ============================================================================
// EVENT EMITTER
// ============================================================================

type EventCallback = (data: unknown) => void;

class OrchestratorEventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }
}

// ============================================================================
// AGENT ORCHESTRATOR
// ============================================================================

export interface OrchestratorConfig {
  maxConcurrentTasksPerAgent: number;
  defaultTimeout: number;
  enableAutoRetry: boolean;
  maxRetries: number;
  enableMetrics: boolean;
}

export interface OrchestratorMetrics {
  totalTasksProcessed: number;
  totalTasksFailed: number;
  averageProcessingTime: number;
  tasksByAgent: Record<AgentType, number>;
  activeWorkflows: number;
}

export class AgentOrchestrator {
  private registry: AgentRegistry;
  private taskQueue: TaskQueue;
  private events: OrchestratorEventEmitter;
  private config: OrchestratorConfig;
  private agentStates: Map<AgentType, AgentState>;
  private tasks: Map<string, AgentTask>;
  private workflows: Map<string, WorkflowExecution>;
  private isRunning: boolean = false;
  private metrics: OrchestratorMetrics;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.registry = new AgentRegistry();
    this.taskQueue = new TaskQueue();
    this.events = new OrchestratorEventEmitter();
    this.agentStates = new Map();
    this.tasks = new Map();
    this.workflows = new Map();
    this.config = {
      maxConcurrentTasksPerAgent: config.maxConcurrentTasksPerAgent || 3,
      defaultTimeout: config.defaultTimeout || 300000, // 5 minutes
      enableAutoRetry: config.enableAutoRetry ?? true,
      maxRetries: config.maxRetries || 3,
      enableMetrics: config.enableMetrics ?? true
    };
    this.metrics = {
      totalTasksProcessed: 0,
      totalTasksFailed: 0,
      averageProcessingTime: 0,
      tasksByAgent: {} as Record<AgentType, number>,
      activeWorkflows: 0
    };
  }

  // ---------------------------------------------------------------------------
  // Agent Management
  // ---------------------------------------------------------------------------

  registerAgent(handler: AgentHandler, config: AgentConfig): void {
    this.registry.register(handler, config);
    this.agentStates.set(handler.type, {
      agentId: config.id,
      type: handler.type,
      status: 'idle',
      currentTaskId: null,
      queuedTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      lastActivity: new Date(),
      metrics: {
        avgProcessingTimeMs: 0,
        successRate: 1,
        tasksPerHour: 0,
        tokensUsed: 0,
        costEstimate: 0
      }
    });
    this.events.emit('agent:registered', { type: handler.type, config });
  }

  getAgentState(type: AgentType): AgentState | undefined {
    return this.agentStates.get(type);
  }

  getAllAgentStates(): AgentState[] {
    return Array.from(this.agentStates.values());
  }

  // ---------------------------------------------------------------------------
  // Task Management
  // ---------------------------------------------------------------------------

  async submitTask(
    agentType: AgentType,
    input: TaskInput,
    options: {
      priority?: TaskPriority;
      createdBy?: string;
      parentTaskId?: string;
    } = {}
  ): Promise<string> {
    const config = this.registry.getConfig(agentType);
    if (!config || !config.enabled) {
      throw new Error(`Agent ${agentType} is not available`);
    }

    const handler = this.registry.getHandler(agentType);
    if (!handler?.validate(input)) {
      throw new Error(`Invalid input for agent ${agentType}`);
    }

    const task: AgentTask = {
      id: this.generateId(),
      agentType,
      status: 'queued',
      priority: options.priority || 'medium',
      createdAt: new Date(),
      createdBy: options.createdBy || 'system',
      input,
      metadata: {
        retryCount: 0,
        version: 1
      }
    };

    if (options.parentTaskId) {
      task.input.context = {
        ...task.input.context,
        parentTaskId: options.parentTaskId,
        organizationId: task.input.context?.organizationId || '',
        userId: task.input.context?.userId || ''
      };
    }

    this.tasks.set(task.id, task);
    this.taskQueue.enqueue(task);
    this.updateAgentState(agentType, state => ({
      ...state,
      queuedTasks: state.queuedTasks + 1
    }));

    this.events.emit('task:queued', { taskId: task.id, agentType });

    // Process if orchestrator is running
    if (this.isRunning) {
      this.processNextTask(agentType);
    }

    return task.id;
  }

  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'queued') {
      task.status = 'failed';
      task.error = {
        code: 'CANCELLED',
        message: 'Task was cancelled by user',
        recoverable: false
      };
      this.events.emit('task:cancelled', { taskId });
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Workflow Management
  // ---------------------------------------------------------------------------

  async executeWorkflow(
    definition: WorkflowDefinition,
    initialContext: Record<string, unknown> = {}
  ): Promise<string> {
    const execution: WorkflowExecution = {
      id: this.generateId(),
      workflowId: definition.id,
      status: 'running',
      startedAt: new Date(),
      currentStepId: definition.steps[0]?.id || '',
      context: initialContext,
      stepResults: []
    };

    this.workflows.set(execution.id, execution);
    this.metrics.activeWorkflows++;
    this.events.emit('workflow:started', { executionId: execution.id, workflowId: definition.id });

    // Start executing workflow asynchronously
    this.executeWorkflowSteps(execution, definition);

    return execution.id;
  }

  private async executeWorkflowSteps(
    execution: WorkflowExecution,
    definition: WorkflowDefinition
  ): Promise<void> {
    for (const step of definition.steps) {
      if (execution.status !== 'running') break;

      execution.currentStepId = step.id;
      this.events.emit('workflow:step-started', {
        executionId: execution.id,
        stepId: step.id
      });

      try {
        // Check conditions
        if (step.conditions) {
          const shouldSkip = this.evaluateConditions(step.conditions, execution.context);
          if (shouldSkip) {
            this.events.emit('workflow:step-skipped', {
              executionId: execution.id,
              stepId: step.id
            });
            continue;
          }
        }

        // Map inputs
        const taskInput = this.mapInputs(step.inputMapping, execution.context);

        // Submit task
        const taskId = await this.submitTask(step.agentType, taskInput, {
          priority: 'high',
          parentTaskId: execution.stepResults[execution.stepResults.length - 1]?.taskId
        });

        // Wait for completion
        const result = await this.waitForTask(taskId, step.timeout);

        // Check if human review is required
        if (step.humanReviewRequired && result.status === 'completed') {
          result.status = 'awaiting-review';
          this.events.emit('workflow:review-required', {
            executionId: execution.id,
            stepId: step.id,
            taskId
          });

          // Wait for review (in real implementation, this would pause and resume)
          execution.status = 'paused';
          return;
        }

        // Map outputs
        if (result.output) {
          execution.context = {
            ...execution.context,
            ...this.mapOutputs(step.outputMapping, result.output)
          };
        }

        execution.stepResults.push({
          stepId: step.id,
          taskId,
          status: result.status,
          startedAt: result.startedAt || new Date(),
          completedAt: result.completedAt,
          output: result.output?.data
        });

        this.events.emit('workflow:step-completed', {
          executionId: execution.id,
          stepId: step.id,
          taskId
        });

      } catch (error) {
        const taskError: TaskError = {
          code: 'STEP_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true
        };

        execution.stepResults.push({
          stepId: step.id,
          taskId: '',
          status: 'failed',
          startedAt: new Date(),
          error: taskError
        });

        if (definition.errorHandling.onStepFailure === 'stop') {
          execution.status = 'failed';
          execution.error = {
            stepId: step.id,
            error: taskError,
            recoveryAttempted: false,
            recoverySuccessful: false
          };
          break;
        }
      }
    }

    if (execution.status === 'running') {
      execution.status = 'completed';
      execution.completedAt = new Date();
    }

    this.metrics.activeWorkflows--;
    this.events.emit('workflow:completed', {
      executionId: execution.id,
      status: execution.status
    });
  }

  getWorkflowExecution(executionId: string): WorkflowExecution | undefined {
    return this.workflows.get(executionId);
  }

  async resumeWorkflow(executionId: string): Promise<void> {
    const execution = this.workflows.get(executionId);
    if (execution && execution.status === 'paused') {
      execution.status = 'running';
      this.events.emit('workflow:resumed', { executionId });
    }
  }

  // ---------------------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------------------

  start(): void {
    this.isRunning = true;
    this.events.emit('orchestrator:started', {});

    // Start processing for all registered agents
    for (const [type] of this.agentStates) {
      this.processNextTask(type);
    }
  }

  stop(): void {
    this.isRunning = false;
    this.events.emit('orchestrator:stopped', {});
  }

  private async processNextTask(agentType: AgentType): Promise<void> {
    if (!this.isRunning) return;

    const config = this.registry.getConfig(agentType);
    const currentProcessing = this.taskQueue.getProcessingCount(agentType);

    if (currentProcessing >= (config?.maxConcurrentTasks || this.config.maxConcurrentTasksPerAgent)) {
      return;
    }

    const task = this.taskQueue.dequeue(agentType);
    if (!task) return;

    this.updateAgentState(agentType, state => ({
      ...state,
      status: 'processing',
      currentTaskId: task.id,
      queuedTasks: state.queuedTasks - 1,
      lastActivity: new Date()
    }));

    task.status = 'in-progress';
    task.startedAt = new Date();
    this.events.emit('task:started', { taskId: task.id, agentType });

    try {
      const handler = this.registry.getHandler(agentType);
      if (!handler) throw new Error(`No handler for ${agentType}`);

      const output = await this.executeWithTimeout(
        handler.process(task),
        config?.timeoutMs || this.config.defaultTimeout
      );

      task.output = output;
      task.status = config?.autoApprove ? 'completed' : 'awaiting-review';
      task.completedAt = new Date();
      task.metadata.processingTimeMs = task.completedAt.getTime() - (task.startedAt?.getTime() || 0);

      this.updateAgentState(agentType, state => ({
        ...state,
        status: 'idle',
        currentTaskId: null,
        completedTasks: state.completedTasks + 1,
        lastActivity: new Date(),
        metrics: {
          ...state.metrics,
          avgProcessingTimeMs: this.calculateRunningAverage(
            state.metrics.avgProcessingTimeMs,
            task.metadata.processingTimeMs || 0,
            state.completedTasks + 1
          )
        }
      }));

      this.metrics.totalTasksProcessed++;
      this.events.emit('task:completed', { taskId: task.id, agentType, output });

    } catch (error) {
      await this.handleTaskError(task, error);
    } finally {
      this.taskQueue.markComplete(task.id);
      // Process next task
      setTimeout(() => this.processNextTask(agentType), 100);
    }
  }

  private async handleTaskError(task: AgentTask, error: unknown): Promise<void> {
    const config = this.registry.getConfig(task.agentType);
    const maxRetries = config?.retryAttempts || this.config.maxRetries;

    task.error = {
      code: 'PROCESSING_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      recoverable: task.metadata.retryCount < maxRetries
    };

    if (this.config.enableAutoRetry && task.metadata.retryCount < maxRetries) {
      task.metadata.retryCount++;
      task.status = 'queued';
      this.taskQueue.enqueue(task);
      this.events.emit('task:retrying', {
        taskId: task.id,
        attempt: task.metadata.retryCount
      });
    } else {
      task.status = 'failed';
      task.completedAt = new Date();

      this.updateAgentState(task.agentType, state => ({
        ...state,
        status: 'idle',
        currentTaskId: null,
        failedTasks: state.failedTasks + 1,
        lastActivity: new Date()
      }));

      this.metrics.totalTasksFailed++;
      this.events.emit('task:failed', { taskId: task.id, error: task.error });
    }
  }

  // ---------------------------------------------------------------------------
  // Event Handling
  // ---------------------------------------------------------------------------

  on(event: string, callback: EventCallback): void {
    this.events.on(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.events.off(event, callback);
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  getMetrics(): OrchestratorMetrics {
    return { ...this.metrics };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateAgentState(
    type: AgentType,
    updater: (state: AgentState) => AgentState
  ): void {
    const current = this.agentStates.get(type);
    if (current) {
      this.agentStates.set(type, updater(current));
    }
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeoutMs)
      )
    ]);
  }

  private async waitForTask(taskId: string, timeout: number): Promise<AgentTask> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const task = this.tasks.get(taskId);
      if (task && ['completed', 'failed', 'awaiting-review'].includes(task.status)) {
        return task;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Task ${taskId} timed out`);
  }

  private evaluateConditions(
    conditions: WorkflowStep['conditions'],
    context: Record<string, unknown>
  ): boolean {
    if (!conditions) return false;

    for (const condition of conditions) {
      const value = context[condition.field];
      let matches = false;

      switch (condition.operator) {
        case 'equals':
          matches = value === condition.value;
          break;
        case 'not-equals':
          matches = value !== condition.value;
          break;
        case 'greater-than':
          matches = (value as number) > (condition.value as number);
          break;
        case 'less-than':
          matches = (value as number) < (condition.value as number);
          break;
        case 'contains':
          matches = String(value).includes(String(condition.value));
          break;
      }

      if (matches && condition.action === 'skip') {
        return true;
      }
    }

    return false;
  }

  private mapInputs(
    mapping: Record<string, string>,
    context: Record<string, unknown>
  ): TaskInput {
    const data: Record<string, unknown> = {};

    for (const [targetKey, sourceKey] of Object.entries(mapping)) {
      data[targetKey] = context[sourceKey];
    }

    return { type: 'mapped', data };
  }

  private mapOutputs(
    mapping: Record<string, string>,
    output: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [targetKey, sourceKey] of Object.entries(mapping)) {
      result[targetKey] = output[sourceKey];
    }

    return result;
  }

  private calculateRunningAverage(
    currentAvg: number,
    newValue: number,
    count: number
  ): number {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let orchestratorInstance: AgentOrchestrator | null = null;

export const getOrchestrator = (config?: Partial<OrchestratorConfig>): AgentOrchestrator => {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator(config);
  }
  return orchestratorInstance;
};

export const resetOrchestrator = (): void => {
  if (orchestratorInstance) {
    orchestratorInstance.stop();
    orchestratorInstance = null;
  }
};
