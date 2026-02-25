import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { AssignmentRule, AssignmentTrigger, UserRole, Course, Department, Team } from '../../types/lms';
import { logger } from '../../lib/logger';
import {
  Settings,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Play,
  Pause,
  Copy,
  Zap,
  Users,
  Building,
  Calendar,
  CheckCircle,
  Target,
  Save,
} from 'lucide-react';
import { TrainingAssignment } from './TrainingAssignment';

type ViewMode = 'list' | 'create' | 'edit';

const TRIGGER_CONFIG: Record<AssignmentTrigger, { label: string; description: string; icon: React.ReactNode }> = {
  on_join: {
    label: 'On Join',
    description: 'When a user joins the organization',
    icon: <Users className="w-4 h-4" />
  },
  on_role_change: {
    label: 'Role Change',
    description: 'When a user\'s role is updated',
    icon: <Target className="w-4 h-4" />
  },
  on_department_change: {
    label: 'Department Change',
    description: 'When a user moves to a new department',
    icon: <Building className="w-4 h-4" />
  },
  on_team_change: {
    label: 'Team Change',
    description: 'When a user joins a different team',
    icon: <Users className="w-4 h-4" />
  },
  scheduled: {
    label: 'Scheduled',
    description: 'Run on a recurring schedule',
    icon: <Calendar className="w-4 h-4" />
  },
  manual: {
    label: 'Manual',
    description: 'Triggered manually by admin',
    icon: <Play className="w-4 h-4" />
  }
};

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Org Admin',
  ld_manager: 'L&D Manager',
  team_lead: 'Team Lead',
  instructor: 'Instructor',
  learner: 'Learner'
};

export const AssignmentRules: React.FC = () => {
  const { user } = useStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const {
    currentOrg,
    courses,
    departments,
    teams,
    loadCourses,
    loadDepartments,
    loadTeams,
    bulkEnroll,
    isLoading
  } = useLMSStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<AssignmentRule | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignNotice, setAssignNotice] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrg?.id) {
      loadCourses();
      loadDepartments();
      loadTeams();
      // In production, fetch rules from backend API
      // For now, using local state with sample rules
    }
  }, [currentOrg?.id, loadCourses, loadDepartments, loadTeams]);

  useEffect(() => {
    if (!assignNotice) return;
    const timer = setTimeout(() => setAssignNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [assignNotice]);

  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateRule = () => {
    setSelectedRule(null);
    setViewMode('create');
  };

  const handleAssignTraining = async (data: { userIds: string[]; courseIds: string[]; priority: 'required' | 'recommended' | 'optional'; dueDate?: number }) => {
    const { userIds, courseIds, priority, dueDate } = data;
    if (!userIds.length || !courseIds.length) return;
    await Promise.all(
      courseIds.map((courseId) => bulkEnroll(userIds, courseId, { dueDate, priority }))
    );
    setShowAssignModal(false);
    setAssignNotice(`Assigned ${courseIds.length} course${courseIds.length === 1 ? '' : 's'} to ${userIds.length} learner${userIds.length === 1 ? '' : 's'}.`);
  };

  const handleEditRule = (rule: AssignmentRule) => {
    setSelectedRule(rule);
    setViewMode('edit');
  };

  const handleSaveRule = (ruleData: Partial<AssignmentRule>) => {
    if (selectedRule) {
      // Update existing rule
      setRules(rules.map(r => r.id === selectedRule.id ? { ...r, ...ruleData, updatedAt: Date.now() } as AssignmentRule : r));
    } else {
      // Create new rule
      const newRule: AssignmentRule = {
        id: `rule-${Date.now()}`,
        orgId: currentOrg?.id || '',
        name: ruleData.name || 'New Rule',
        description: ruleData.description,
        isActive: true,
        trigger: ruleData.trigger || 'manual',
        conditions: ruleData.conditions || {},
        courseIds: ruleData.courseIds || [],
        dueDate: ruleData.dueDate || { type: 'none' },
        priority: ruleData.priority || 'recommended',
        createdBy: user?.id || '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setRules([...rules, newRule]);
    }
    setViewMode('list');
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
    setShowDeleteConfirm(null);
  };

  const handleToggleActive = (ruleId: string) => {
    setRules(rules.map(r =>
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    ));
  };

  const handleDuplicateRule = (rule: AssignmentRule) => {
    const duplicated: AssignmentRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      name: `${rule.name} (Copy)`,
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setRules([...rules, duplicated]);
  };

  const handleRunRule = async (rule: AssignmentRule) => {
    // In a real app, this would trigger the rule execution
    logger.debug('Running rule:', rule.name);
    alert(`Rule "${rule.name}" executed! In production, this would assign courses to matching users.`);
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <RuleEditor
        rule={selectedRule}
        courses={courses}
        departments={departments}
        teams={teams}
        isDarkMode={isDarkMode}
        onSave={handleSaveRule}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Assignment Rules</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Automate training assignments based on user attributes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAssignModal(true)}
              className="btn-secondary-min flex items-center gap-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50"
            >
              <Zap className="w-5 h-5" />
              Assign Training
            </button>
            <button
              onClick={handleCreateRule}
              className="btn-primary-min flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Rule
            </button>
          </div>
        </div>

        {assignNotice && (
          <div className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            isDarkMode ? 'bg-green-900/20 border-green-800 text-green-300' : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            <CheckCircle className="w-4 h-4" />
            {assignNotice}
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
          />
        </div>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No assignment rules</p>
            <p className="text-sm mb-4">Create rules to automate training assignments</p>
            <button
              onClick={handleCreateRule}
              className="btn-primary-min inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create First Rule
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                courses={courses}
                isDarkMode={isDarkMode}
                onEdit={() => handleEditRule(rule)}
                onDelete={() => setShowDeleteConfirm(rule.id)}
                onDuplicate={() => handleDuplicateRule(rule)}
                onToggleActive={() => handleToggleActive(rule.id)}
                onRun={() => handleRunRule(rule)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-xl max-w-md w-full mx-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-semibold mb-2">Delete Rule?</h3>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This action cannot be undone. The rule will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRule(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <TrainingAssignment
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={handleAssignTraining}
      />
    </div>
  );
};

// Rule Card Component
interface RuleCardProps {
  rule: AssignmentRule;
  courses: Course[];
  isDarkMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onRun: () => void;
}

const RuleCard: React.FC<RuleCardProps> = ({
  rule,
  courses,
  isDarkMode,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  onRun
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const triggerConfig = TRIGGER_CONFIG[rule.trigger];
  const assignedCourses = courses.filter(c => rule.courseIds.includes(c.id));

  const getConditionSummary = () => {
    const conditions: string[] = [];
    if (rule.conditions.departments?.length) {
      conditions.push(`${rule.conditions.departments.length} department(s)`);
    }
    if (rule.conditions.teams?.length) {
      conditions.push(`${rule.conditions.teams.length} team(s)`);
    }
    if (rule.conditions.roles?.length) {
      conditions.push(`${rule.conditions.roles.length} role(s)`);
    }
    return conditions.length > 0 ? conditions.join(', ') : 'All users';
  };

  return (
    <div className={`p-4 rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } ${!rule.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${
              rule.isActive
                ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
            }`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">{rule.name}</h3>
              {rule.description && (
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {rule.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-3">
            {/* Trigger */}
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Trigger:</span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                {triggerConfig.icon}
                {triggerConfig.label}
              </span>
            </div>

            {/* Conditions */}
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Applies to:</span>
              <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {getConditionSummary()}
              </span>
            </div>

            {/* Courses */}
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Courses:</span>
              <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {assignedCourses.length} course(s)
              </span>
            </div>

            {/* Priority */}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              rule.priority === 'required'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : rule.priority === 'recommended'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
              {rule.priority}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleActive}
            className={`p-2 rounded-lg ${
              rule.isActive
                ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                : isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
            title={rule.isActive ? 'Deactivate' : 'Activate'}
          >
            {rule.isActive ? <CheckCircle className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>

          {rule.trigger === 'manual' && rule.isActive && (
            <button
              onClick={onRun}
              className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
              title="Run Now"
            >
              <Play className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className={`absolute right-0 top-full mt-1 w-40 rounded-lg shadow-lg border z-20 ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <button
                    onClick={() => { onEdit(); setShowMenu(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { onDuplicate(); setShowMenu(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <hr className={isDarkMode ? 'border-gray-700' : 'border-gray-200'} />
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Rule Editor Component
interface RuleEditorProps {
  rule: AssignmentRule | null;
  courses: Course[];
  departments: Department[];
  teams: Team[];
  isDarkMode: boolean;
  onSave: (rule: Partial<AssignmentRule>) => void;
  onCancel: () => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({
  rule,
  courses,
  departments,
  teams,
  isDarkMode,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [trigger, setTrigger] = useState<AssignmentTrigger>(rule?.trigger || 'manual');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(rule?.conditions.departments || []);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(rule?.conditions.teams || []);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(rule?.conditions.roles || []);
  const [selectedCourses, setSelectedCourses] = useState<string[]>(rule?.courseIds || []);
  const [priority, setPriority] = useState<'required' | 'recommended' | 'optional'>(rule?.priority || 'recommended');
  const [dueDateType, setDueDateType] = useState<'none' | 'relative' | 'fixed'>(rule?.dueDate.type || 'none');
  const [relativeDays, setRelativeDays] = useState(rule?.dueDate.relativeDays || 30);

  const handleSave = () => {
    onSave({
      name,
      description: description || undefined,
      trigger,
      conditions: {
        departments: selectedDepartments.length > 0 ? selectedDepartments : undefined,
        teams: selectedTeams.length > 0 ? selectedTeams : undefined,
        roles: selectedRoles.length > 0 ? selectedRoles : undefined
      },
      courseIds: selectedCourses,
      priority,
      dueDate: {
        type: dueDateType,
        relativeDays: dueDateType === 'relative' ? relativeDays : undefined
      }
    });
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const toggleDepartment = (deptId: string) => {
    setSelectedDepartments(prev =>
      prev.includes(deptId)
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const toggleRole = (role: UserRole) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{rule ? 'Edit Rule' : 'Create Assignment Rule'}</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Configure automatic training assignments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || selectedCourses.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              Save Rule
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Basic Info */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., New Employee Onboarding"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:ring-2 focus:ring-indigo-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this rule does"
                  rows={2}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
            </div>
          </div>

          {/* Trigger */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Trigger</h2>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              When should this rule be executed?
            </p>

            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(TRIGGER_CONFIG) as [AssignmentTrigger, typeof TRIGGER_CONFIG[AssignmentTrigger]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setTrigger(key)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    trigger === key
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : isDarkMode
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={trigger === key ? 'text-indigo-600' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {config.icon}
                    </span>
                    <span className={`font-medium ${trigger === key ? 'text-indigo-600' : ''}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {config.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Conditions */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Conditions</h2>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Which users should this rule apply to? Leave empty to apply to all users.
            </p>

            <div className="space-y-4">
              {/* Departments */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Departments
                </label>
                <div className="flex flex-wrap gap-2">
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => toggleDepartment(dept.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        selectedDepartments.includes(dept.id)
                          ? 'border-indigo-500 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : isDarkMode
                            ? 'border-gray-600 hover:border-gray-500'
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {dept.name}
                    </button>
                  ))}
                  {departments.length === 0 && (
                    <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      No departments created yet
                    </span>
                  )}
                </div>
              </div>

              {/* Teams */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Teams
                </label>
                <div className="flex flex-wrap gap-2">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => toggleTeam(team.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        selectedTeams.includes(team.id)
                          ? 'border-indigo-500 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : isDarkMode
                            ? 'border-gray-600 hover:border-gray-500'
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                  {teams.length === 0 && (
                    <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      No teams created yet
                    </span>
                  )}
                </div>
              </div>

              {/* Roles */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(ROLE_LABELS) as [UserRole, string][])
                    .filter(([role]) => role !== 'super_admin')
                    .map(([role, label]) => (
                      <button
                        key={role}
                        onClick={() => toggleRole(role)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          selectedRoles.includes(role)
                            ? 'border-indigo-500 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                            : isDarkMode
                              ? 'border-gray-600 hover:border-gray-500'
                              : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Courses */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Courses to Assign *</h2>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Select the courses that will be assigned when this rule triggers.
            </p>

            <div className="space-y-2 max-h-64 overflow-auto">
              {courses.filter(c => c.status === 'published').map((course) => (
                <label
                  key={course.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                    selectedCourses.includes(course.id)
                      ? 'bg-indigo-50 dark:bg-indigo-900/30'
                      : isDarkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(course.id)}
                    onChange={() => toggleCourse(course.id)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{course.title}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {course.estimatedDuration} min • {course.modules.length} modules
                    </p>
                  </div>
                </label>
              ))}
              {courses.filter(c => c.status === 'published').length === 0 && (
                <p className={`text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  No published courses available
                </p>
              )}
            </div>
          </div>

          {/* Assignment Settings */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Assignment Settings</h2>

            <div className="space-y-4">
              {/* Priority */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Priority
                </label>
                <div className="flex gap-3">
                  {(['required', 'recommended', 'optional'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        priority === p
                          ? 'border-indigo-500 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : isDarkMode
                            ? 'border-gray-600 hover:border-gray-500'
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Due Date
                </label>
                <div className="flex items-center gap-4">
                  <select
                    value={dueDateType}
                    onChange={(e) => setDueDateType(e.target.value as 'none' | 'relative' | 'fixed')}
                    className={`px-4 py-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-indigo-500`}
                  >
                    <option value="none">No due date</option>
                    <option value="relative">Relative (days from assignment)</option>
                  </select>

                  {dueDateType === 'relative' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={relativeDays}
                        onChange={(e) => setRelativeDays(parseInt(e.target.value) || 30)}
                        min={1}
                        className={`w-20 px-3 py-2 rounded-lg border ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:ring-2 focus:ring-indigo-500`}
                      />
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>days</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentRules;
