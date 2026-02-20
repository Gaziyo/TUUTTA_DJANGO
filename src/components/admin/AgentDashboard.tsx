import React, { useState } from 'react';
import {
  Bot,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Cpu,
  Zap,
  ClipboardCheck,
  MessageSquare,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Settings,
  Eye,
  Upload,
  Target,
  BookOpen
} from 'lucide-react';
import type { AgentType, AgentState, AgentTask, TaskStatus } from '../../types/agents';

interface AgentDashboardProps {
  isDarkMode?: boolean;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ isDarkMode = false }) => {
  const [agentStates] = useState<AgentState[]>([]);
  const [recentTasks] = useState<AgentTask[]>([]);
  const [isOrchestratorRunning, setIsOrchestratorRunning] = useState(true);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'workflows'>('overview');
  const tabs: Array<{ id: 'overview' | 'tasks' | 'workflows'; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'tasks', label: 'Tasks', icon: ClipboardCheck },
    { id: 'workflows', label: 'Workflows', icon: Target }
  ];

  const getAgentIcon = (type: AgentType) => {
    const icons: Record<AgentType, React.ElementType> = {
      'content-ingestion': Upload,
      'learning-design': BookOpen,
      'assessment': ClipboardCheck,
      'tutor': MessageSquare,
      'outcome-analytics': BarChart3,
      'quality-assurance': CheckCircle
    };
    return icons[type] || Bot;
  };

  const getAgentName = (type: AgentType): string => {
    const names: Record<AgentType, string> = {
      'content-ingestion': 'Content Ingestion',
      'learning-design': 'Learning Design',
      'assessment': 'Assessment',
      'tutor': 'Tutor',
      'outcome-analytics': 'Outcome Analytics',
      'quality-assurance': 'Quality Assurance'
    };
    return names[type] || type;
  };

  const getStatusColor = (status: AgentState['status'] | TaskStatus) => {
    const colors: Record<string, string> = {
      'idle': 'text-gray-500',
      'processing': 'text-blue-500',
      'waiting-approval': 'text-yellow-500',
      'completed': 'text-green-500',
      'failed': 'text-red-500',
      'paused': 'text-orange-500',
      'queued': 'text-gray-400',
      'in-progress': 'text-blue-500',
      'awaiting-review': 'text-yellow-500',
      'approved': 'text-green-500',
      'rejected': 'text-red-500'
    };
    return colors[status] || 'text-gray-500';
  };

  const getStatusBgColor = (status: AgentState['status'] | TaskStatus) => {
    const colors: Record<string, string> = {
      'idle': isDarkMode ? 'bg-gray-700' : 'bg-gray-100',
      'processing': isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100',
      'waiting-approval': isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-100',
      'completed': isDarkMode ? 'bg-green-900/30' : 'bg-green-100',
      'failed': isDarkMode ? 'bg-red-900/30' : 'bg-red-100',
      'paused': isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100',
      'queued': isDarkMode ? 'bg-gray-700' : 'bg-gray-100',
      'in-progress': isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100',
      'awaiting-review': isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-100'
    };
    return colors[status] || (isDarkMode ? 'bg-gray-700' : 'bg-gray-100');
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const toggleAgentExpand = (agentId: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId);
    } else {
      newExpanded.add(agentId);
    }
    setExpandedAgents(newExpanded);
  };

  // Calculate totals
  const totalCompleted = agentStates.reduce((sum, a) => sum + a.completedTasks, 0);
  const totalFailed = agentStates.reduce((sum, a) => sum + a.failedTasks, 0);
  const totalQueued = agentStates.reduce((sum, a) => sum + a.queuedTasks, 0);
  const totalCost = agentStates.reduce((sum, a) => sum + a.metrics.costEstimate, 0);
  const activeAgents = agentStates.filter(a => a.status === 'processing').length;

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
              <Bot className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Agent Orchestrator
              </h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Autonomous learning infrastructure powered by AI agents
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              isOrchestratorRunning
                ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                : isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOrchestratorRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">{isOrchestratorRunning ? 'Running' : 'Stopped'}</span>
            </div>
            <button
              onClick={() => setIsOrchestratorRunning(!isOrchestratorRunning)}
              className={`p-2 rounded-lg ${
                isOrchestratorRunning
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isOrchestratorRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              <RefreshCw className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
            <button className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              <Settings className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-5 gap-4">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                    <Cpu className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activeAgents}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Agents</p>
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-900/50' : 'bg-green-100'}`}>
                    <CheckCircle className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalCompleted}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed</p>
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-yellow-900/50' : 'bg-yellow-100'}`}>
                    <Clock className={`w-5 h-5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalQueued}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Queued</p>
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-900/50' : 'bg-red-100'}`}>
                    <XCircle className={`w-5 h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalFailed}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Failed</p>
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
                    <Zap className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${totalCost.toFixed(2)}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Est. Cost</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Cards */}
            <div className="grid grid-cols-1 gap-4">
              {agentStates.length === 0 ? (
                <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-600'}`}>
                  No agent activity yet.
                </div>
              ) : (
                agentStates.map(agent => {
                  const Icon = getAgentIcon(agent.type);
                  const isExpanded = expandedAgents.has(agent.agentId);

                  return (
                  <div
                    key={agent.agentId}
                    className={`rounded-lg border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                  >
                    {/* Agent Header */}
                    <div
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleAgentExpand(agent.agentId)}
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        ) : (
                          <ChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        )}
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <Icon className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {getAgentName(agent.type)}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBgColor(agent.status)} ${getStatusColor(agent.status)}`}>
                              {agent.status}
                            </span>
                          </div>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Last active: {formatTimeAgo(agent.lastActivity)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {agent.completedTasks}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Completed</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {agent.queuedTasks}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Queued</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {Math.round(agent.metrics.successRate * 100)}%
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Success</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatDuration(agent.metrics.avgProcessingTimeMs)}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Avg Time</p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className={`px-4 py-3 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="grid grid-cols-4 gap-6">
                          <div>
                            <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Performance Metrics
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tasks/Hour</span>
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {agent.metrics.tasksPerHour}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tokens Used</span>
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {(agent.metrics.tokensUsed / 1000).toFixed(0)}K
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Est. Cost</span>
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  ${agent.metrics.costEstimate.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Task Statistics
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed</span>
                                <span className="text-sm font-medium text-green-500">{agent.completedTasks}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Failed</span>
                                <span className="text-sm font-medium text-red-500">{agent.failedTasks}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>In Queue</span>
                                <span className="text-sm font-medium text-yellow-500">{agent.queuedTasks}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Current Status
                            </h4>
                            <div className="space-y-2">
                              <div className={`flex items-center gap-2 ${getStatusColor(agent.status)}`}>
                                {agent.status === 'processing' ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : agent.status === 'idle' ? (
                                  <Clock className="w-4 h-4" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                <span className="text-sm font-medium capitalize">{agent.status}</span>
                              </div>
                              {agent.currentTaskId && (
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Working on: {agent.currentTaskId}
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Actions
                            </h4>
                            <div className="flex gap-2">
                              <button className={`px-3 py-1.5 text-sm rounded-lg ${
                                isDarkMode
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}>
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className={`px-3 py-1.5 text-sm rounded-lg ${
                                isDarkMode
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}>
                                <Settings className="w-4 h-4" />
                              </button>
                              <button className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                                Run Task
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Task Filters */}
            <div className="flex items-center gap-4">
              <select className={`px-3 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}>
                <option value="all">All Agents</option>
                <option value="content-ingestion">Content Ingestion</option>
                <option value="learning-design">Learning Design</option>
                <option value="assessment">Assessment</option>
                <option value="tutor">Tutor</option>
                <option value="outcome-analytics">Outcome Analytics</option>
              </select>
              <select className={`px-3 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}>
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In Progress</option>
                <option value="awaiting-review">Awaiting Review</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Tasks Table */}
            <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <table className="w-full">
                <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Task ID
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Agent
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Status
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Priority
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Created
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {recentTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`px-4 py-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        No recent agent tasks.
                      </td>
                    </tr>
                  ) : recentTasks.map(task => {
                    const Icon = getAgentIcon(task.agentType);
                    return (
                      <tr key={task.id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-3 text-sm font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {task.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                              {getAgentName(task.agentType)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusBgColor(task.status)} ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm capitalize ${
                            task.priority === 'high' ? 'text-red-500' :
                            task.priority === 'medium' ? 'text-yellow-500' : 'text-gray-500'
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatTimeAgo(task.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                              <Eye className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            </button>
                            {task.status === 'awaiting-review' && (
                              <button className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
                                Review
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'workflows' && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Target className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Workflow Designer
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Create and manage automated agent workflows
              </p>
              <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Create Workflow
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
