import React, { useState, useMemo } from 'react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import {
  X,
  Search,
  Users,
  User,
  Building,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface TrainingAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (data: AssignmentData) => Promise<void>;
}

interface AssignmentData {
  userIds: string[];
  courseIds: string[];
  priority: 'required' | 'recommended' | 'optional';
  dueDate?: number;
}

type SelectionMode = 'users' | 'groups';
type Step = 'recipients' | 'courses' | 'settings' | 'review';

export const TrainingAssignment: React.FC<TrainingAssignmentProps> = ({
  isOpen,
  onClose,
  onAssign
}) => {
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const { members, courses, departments, teams } = useLMSStore();

  const [step, setStep] = useState<Step>('recipients');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<Set<string>>(new Set());
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [priority, setPriority] = useState<'required' | 'recommended' | 'optional'>('required');
  const [dueDateType, setDueDateType] = useState<'none' | 'relative' | 'fixed'>('relative');
  const [relativeDays, setRelativeDays] = useState(30);
  const [fixedDate, setFixedDate] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  // Filter published courses
  const publishedCourses = useMemo(() => {
    return courses.filter(c => c.status === 'published');
  }, [courses]);

  // Calculate total recipients
  const totalRecipients = useMemo(() => {
    if (selectionMode === 'users') {
      return selectedUserIds.size;
    } else {
      const userIdsFromGroups = new Set<string>();

      // Add users from selected departments
      selectedDepartmentIds.forEach(deptId => {
        members.filter(m => m.departmentId === deptId).forEach(m => userIdsFromGroups.add(m.id));
      });

      // Add users from selected teams
      selectedTeamIds.forEach(teamId => {
        const team = teams.find(t => t.id === teamId);
        team?.memberIds.forEach(id => userIdsFromGroups.add(id));
      });

      return userIdsFromGroups.size;
    }
  }, [selectionMode, selectedUserIds, selectedDepartmentIds, selectedTeamIds, members, teams]);

  // Get final user IDs for assignment
  const getFinalUserIds = (): string[] => {
    if (selectionMode === 'users') {
      return Array.from(selectedUserIds);
    } else {
      const userIds = new Set<string>();

      selectedDepartmentIds.forEach(deptId => {
        members.filter(m => m.departmentId === deptId).forEach(m => userIds.add(m.id));
      });

      selectedTeamIds.forEach(teamId => {
        const team = teams.find(t => t.id === teamId);
        team?.memberIds.forEach(id => userIds.add(id));
      });

      return Array.from(userIds);
    }
  };

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const toggleDepartment = (deptId: string) => {
    const newSet = new Set(selectedDepartmentIds);
    if (newSet.has(deptId)) {
      newSet.delete(deptId);
    } else {
      newSet.add(deptId);
    }
    setSelectedDepartmentIds(newSet);
  };

  const toggleTeam = (teamId: string) => {
    const newSet = new Set(selectedTeamIds);
    if (newSet.has(teamId)) {
      newSet.delete(teamId);
    } else {
      newSet.add(teamId);
    }
    setSelectedTeamIds(newSet);
  };

  const toggleCourse = (courseId: string) => {
    const newSet = new Set(selectedCourseIds);
    if (newSet.has(courseId)) {
      newSet.delete(courseId);
    } else {
      newSet.add(courseId);
    }
    setSelectedCourseIds(newSet);
  };

  const toggleExpandDept = (deptId: string) => {
    const newSet = new Set(expandedDepts);
    if (newSet.has(deptId)) {
      newSet.delete(deptId);
    } else {
      newSet.add(deptId);
    }
    setExpandedDepts(newSet);
  };

  const selectAllUsers = () => {
    setSelectedUserIds(new Set(members.map(m => m.id)));
  };

  const clearAllUsers = () => {
    setSelectedUserIds(new Set());
  };

  const selectAllCourses = () => {
    setSelectedCourseIds(new Set(publishedCourses.map(c => c.id)));
  };

  const clearAllCourses = () => {
    setSelectedCourseIds(new Set());
  };

  const handleAssign = async () => {
    setAssigning(true);

    let dueDate: number | undefined;
    if (dueDateType === 'relative') {
      dueDate = Date.now() + (relativeDays * 24 * 60 * 60 * 1000);
    } else if (dueDateType === 'fixed' && fixedDate) {
      dueDate = new Date(fixedDate).getTime();
    }

    await onAssign({
      userIds: getFinalUserIds(),
      courseIds: Array.from(selectedCourseIds),
      priority,
      dueDate
    });

    setAssigning(false);
    handleClose();
  };

  const handleClose = () => {
    setStep('recipients');
    setSelectionMode('users');
    setSearchQuery('');
    setSelectedUserIds(new Set());
    setSelectedDepartmentIds(new Set());
    setSelectedTeamIds(new Set());
    setSelectedCourseIds(new Set());
    setPriority('required');
    setDueDateType('relative');
    setRelativeDays(30);
    setFixedDate('');
    onClose();
  };

  const canProceed = () => {
    switch (step) {
      case 'recipients':
        return totalRecipients > 0;
      case 'courses':
        return selectedCourseIds.size > 0;
      case 'settings':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['recipients', 'courses', 'settings', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['recipients', 'courses', 'settings', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`w-full max-w-3xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div>
            <h2 className="text-xl font-bold">Assign Training</h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {step === 'recipients' && 'Select who should receive training'}
              {step === 'courses' && 'Choose courses to assign'}
              {step === 'settings' && 'Configure assignment settings'}
              {step === 'review' && 'Review and confirm'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between max-w-md mx-auto">
            {(['recipients', 'courses', 'settings', 'review'] as Step[]).map((s, index) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-indigo-600 text-white'
                      : ['recipients', 'courses', 'settings', 'review'].indexOf(step) > index
                        ? 'bg-green-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-200 text-gray-500'
                  }`}>
                    {['recipients', 'courses', 'settings', 'review'].indexOf(step) > index ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    ['recipients', 'courses', 'settings', 'review'].indexOf(step) > index
                      ? 'bg-green-500'
                      : isDarkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Step 1: Recipients */}
          {step === 'recipients' && (
            <div className="space-y-4">
              {/* Selection Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectionMode('users')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border ${
                    selectionMode === 'users'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : isDarkMode
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Select Users</span>
                </button>
                <button
                  onClick={() => setSelectionMode('groups')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border ${
                    selectionMode === 'groups'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : isDarkMode
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building className="w-5 h-5" />
                  <span className="font-medium">Select Groups</span>
                </button>
              </div>

              {selectionMode === 'users' && (
                <>
                  {/* Search & Actions */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        } focus:ring-2 focus:ring-indigo-500`}
                      />
                    </div>
                    <button
                      onClick={selectAllUsers}
                      className={`px-3 py-2 text-sm rounded-lg ${
                        isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllUsers}
                      className={`px-3 py-2 text-sm rounded-lg ${
                        isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      Clear
                    </button>
                  </div>

                  {/* User List */}
                  <div className={`border rounded-lg max-h-64 overflow-auto ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    {filteredMembers.map((member) => (
                      <label
                        key={member.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer border-b last:border-b-0 ${
                          isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                        } ${selectedUserIds.has(member.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(member.id)}
                          onChange={() => toggleUser(member.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                        />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-indigo-600`}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.name}</p>
                          <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {member.email}
                          </p>
                        </div>
                      </label>
                    ))}
                    {filteredMembers.length === 0 && (
                      <p className={`p-4 text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        No users found
                      </p>
                    )}
                  </div>
                </>
              )}

              {selectionMode === 'groups' && (
                <div className="space-y-4">
                  {/* Departments */}
                  <div>
                    <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Departments
                    </h4>
                    <div className={`border rounded-lg ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      {departments.map((dept) => {
                        const deptMembers = members.filter(m => m.departmentId === dept.id);
                        return (
                          <div key={dept.id} className={`border-b last:border-b-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className={`flex items-center gap-3 p-3 ${
                              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                            }`}>
                              <input
                                type="checkbox"
                                checked={selectedDepartmentIds.has(dept.id)}
                                onChange={() => toggleDepartment(dept.id)}
                                className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                              />
                              <button
                                onClick={() => toggleExpandDept(dept.id)}
                                className={`p-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                              >
                                {expandedDepts.has(dept.id) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <Building className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                              <span className="font-medium text-sm">{dept.name}</span>
                              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                ({deptMembers.length} members)
                              </span>
                            </div>
                            {expandedDepts.has(dept.id) && deptMembers.length > 0 && (
                              <div className={`pl-14 pb-2 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                {deptMembers.slice(0, 5).map(m => (
                                  <p key={m.id} className={`text-xs py-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {m.name}
                                  </p>
                                ))}
                                {deptMembers.length > 5 && (
                                  <p className={`text-xs py-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    +{deptMembers.length - 5} more
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {departments.length === 0 && (
                        <p className={`p-4 text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          No departments created
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Teams */}
                  <div>
                    <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Teams
                    </h4>
                    <div className={`border rounded-lg ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      {teams.map((team) => (
                        <label
                          key={team.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer border-b last:border-b-0 ${
                            isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.has(team.id)}
                            onChange={() => toggleTeam(team.id)}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                          />
                          <Users className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className="font-medium text-sm">{team.name}</span>
                          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            ({team.memberIds.length} members)
                          </span>
                        </label>
                      ))}
                      {teams.length === 0 && (
                        <p className={`p-4 text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          No teams created
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Courses */}
          {step === 'courses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedCourseIds.size} course(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllCourses}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAllCourses}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className={`border rounded-lg max-h-80 overflow-auto ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                {publishedCourses.map((course) => (
                  <label
                    key={course.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer border-b last:border-b-0 ${
                      isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                    } ${selectedCourseIds.has(course.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourseIds.has(course.id)}
                      onChange={() => toggleCourse(course.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                    />
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <BookOpen className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{course.title}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {course.estimatedDuration} min • {course.modules.length} modules
                      </p>
                    </div>
                  </label>
                ))}
                {publishedCourses.length === 0 && (
                  <p className={`p-4 text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    No published courses available
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 'settings' && (
            <div className="space-y-6">
              {/* Priority */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Priority Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'required', label: 'Required', desc: 'Must complete', color: 'red' },
                    { value: 'recommended', label: 'Recommended', desc: 'Should complete', color: 'yellow' },
                    { value: 'optional', label: 'Optional', desc: 'Nice to have', color: 'gray' }
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPriority(opt.value)}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        priority === opt.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                          : isDarkMode
                            ? 'border-gray-700 hover:border-gray-600'
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className={`font-medium ${priority === opt.value ? 'text-indigo-600' : ''}`}>
                        {opt.label}
                      </p>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Due Date
                </label>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {([
                      { value: 'none', label: 'No due date' },
                      { value: 'relative', label: 'Relative' },
                      { value: 'fixed', label: 'Fixed date' }
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDueDateType(opt.value)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          dueDateType === opt.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                            : isDarkMode
                              ? 'border-gray-700 hover:border-gray-600'
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {dueDateType === 'relative' && (
                    <div className="flex items-center gap-3">
                      <Clock className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Complete within</span>
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
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>days</span>
                    </div>
                  )}

                  {dueDateType === 'fixed' && (
                    <div className="flex items-center gap-3">
                      <Calendar className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <input
                        type="date"
                        value={fixedDate}
                        onChange={(e) => setFixedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={`px-3 py-2 rounded-lg border ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:ring-2 focus:ring-indigo-500`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h4 className="font-medium mb-3">Assignment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Recipients:</span>
                    <span className="font-medium">{totalRecipients} user(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Courses:</span>
                    <span className="font-medium">{selectedCourseIds.size} course(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Total Enrollments:</span>
                    <span className="font-medium">{totalRecipients * selectedCourseIds.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Priority:</span>
                    <span className={`font-medium capitalize ${
                      priority === 'required' ? 'text-red-500' :
                      priority === 'recommended' ? 'text-yellow-500' :
                      'text-gray-500'
                    }`}>{priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Due Date:</span>
                    <span className="font-medium">
                      {dueDateType === 'none' && 'No due date'}
                      {dueDateType === 'relative' && `${relativeDays} days from assignment`}
                      {dueDateType === 'fixed' && fixedDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected Courses */}
              <div>
                <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Courses to Assign
                </h4>
                <div className={`border rounded-lg max-h-32 overflow-auto ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  {Array.from(selectedCourseIds).map(courseId => {
                    const course = courses.find(c => c.id === courseId);
                    return course ? (
                      <div key={courseId} className={`flex items-center gap-2 px-3 py-2 text-sm border-b last:border-b-0 ${
                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                      }`}>
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        <span>{course.title}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Warning */}
              <div className={`flex items-start gap-3 p-3 rounded-lg ${
                isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'
              }`}>
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>
                  This will create {totalRecipients * selectedCourseIds.size} new enrollment(s).
                  Users will be notified about their new training assignments.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {step === 'recipients' && `${totalRecipients} recipient(s) selected`}
            {step === 'courses' && `${selectedCourseIds.size} course(s) selected`}
          </div>
          <div className="flex items-center gap-3">
            {step !== 'recipients' && (
              <button
                onClick={prevStep}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Back
              </button>
            )}
            {step !== 'review' ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {assigning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Assign Training
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingAssignment;
