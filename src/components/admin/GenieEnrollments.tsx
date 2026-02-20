import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Calendar, Target, UserCheck, Wand2, Trash2 } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { UserRole } from '../../types/lms';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';
import GenieTutorPanel from './GenieTutorPanel';
import { buildGenieTutorContext } from '../../lib/genieTutorContext';

const ROLE_OPTIONS: UserRole[] = ['learner', 'instructor', 'team_lead', 'ld_manager', 'org_admin', 'super_admin'];

const GenieEnrollments: React.FC<{ isDarkMode?: boolean; embedded?: boolean }> = ({
  isDarkMode = false,
  embedded = false
}) => {
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    currentOrg,
    members,
    teams,
    departments,
    courses,
    enrollments,
    genieEnrollmentRules,
    genieSources,
    genieDrafts,
    genieAssessments,
    loadMembers,
    loadTeams,
    loadDepartments,
    loadCourses,
    loadEnrollments,
    bulkEnroll,
    createGenieEnrollmentRule,
    updateGenieEnrollmentRule,
    deleteGenieEnrollmentRule
  } = useLMSStore();

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<'required' | 'recommended' | 'optional'>('required');
  const [enrollRole, setEnrollRole] = useState<'student' | 'teacher'>('student');
  const [isAssigning, setIsAssigning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ruleRoles, setRuleRoles] = useState<UserRole[]>([]);
  const [ruleDeptIds, setRuleDeptIds] = useState<string[]>([]);
  const [ruleTeamIds, setRuleTeamIds] = useState<string[]>([]);
  const [ruleActive, setRuleActive] = useState(true);
  const [autoRunDaily, setAutoRunDaily] = useState(false);

  useEffect(() => {
    if (currentOrg?.id) {
      loadMembers();
      loadTeams();
      loadDepartments();
      loadCourses();
      loadEnrollments();
    }
  }, [currentOrg?.id, loadMembers, loadTeams, loadDepartments, loadCourses, loadEnrollments]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    const el = document.querySelector(`[data-section="${section}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('section-highlight');
      window.setTimeout(() => el.classList.remove('section-highlight'), 1600);
    }
  }, [searchParams]);

  const jumpTo = (section: string) => {
    if (section === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const params = new URLSearchParams(searchParams);
      params.delete('section');
      setSearchParams(params, { replace: true });
      return;
    }
    const params = new URLSearchParams(searchParams);
    params.set('section', section);
    setSearchParams(params, { replace: true });
  };

  const tutorContext = buildGenieTutorContext({
    step: 'implement',
    sources: genieSources,
    drafts: genieDrafts,
    assessments: genieAssessments
  });
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = searchQuery.trim().length === 0 ||
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || member.role === roleFilter;
      const matchesDepartment = departmentFilter === 'all' || member.departmentId === departmentFilter;
      const matchesTeam = teamFilter === 'all' || member.teamId === teamFilter;
      return matchesSearch && matchesRole && matchesDepartment && matchesTeam;
    });
  }, [members, searchQuery, roleFilter, departmentFilter, teamFilter]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectAllFiltered = () => {
    setSelectedUserIds(filteredMembers.map((member) => member.id));
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleAssign = async () => {
    if (!selectedCourseId || selectedUserIds.length === 0) return;
    setIsAssigning(true);
    setMessage(null);
    try {
      const dueTimestamp = dueDate ? new Date(dueDate).getTime() : undefined;
      await bulkEnroll(selectedUserIds, selectedCourseId, {
        dueDate: dueTimestamp,
        priority,
        role: enrollRole
      });
      setMessage(`Assigned ${selectedUserIds.length} learners.`);
      setSelectedUserIds([]);
    } catch (error) {
      setMessage((error as Error).message || 'Failed to assign learners.');
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleRuleRole = (role: UserRole) => {
    setRuleRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleRuleDepartment = (deptId: string) => {
    setRuleDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const toggleRuleTeam = (teamId: string) => {
    setRuleTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleCreateRule = async () => {
    if (!selectedCourseId) return;
    const dueTimestamp = dueDate ? new Date(dueDate).getTime() : undefined;
    await createGenieEnrollmentRule({
      orgId: currentOrg?.id || '',
      courseId: selectedCourseId,
      roleFilters: ruleRoles,
      departmentIds: ruleDeptIds,
      teamIds: ruleTeamIds,
      dueDate: dueTimestamp,
      priority,
      enrollRole,
      isActive: ruleActive,
      autoRunDaily
    });
    setRuleRoles([]);
    setRuleDeptIds([]);
    setRuleTeamIds([]);
    setMessage('Auto-enroll rule created.');
  };

  const getMatchingUserIdsForRule = (ruleId: string) => {
    const rule = genieEnrollmentRules.find((item) => item.id === ruleId);
    if (!rule) return [];
    return members
      .filter((member) => {
        const matchRole = rule.roleFilters.length === 0 || rule.roleFilters.includes(member.role);
        const matchDept = rule.departmentIds.length === 0 || (member.departmentId && rule.departmentIds.includes(member.departmentId));
        const matchTeam = rule.teamIds.length === 0 || (member.teamId && rule.teamIds.includes(member.teamId));
        return matchRole && matchDept && matchTeam;
      })
      .map((member) => member.id);
  };

  const handleApplyRules = async () => {
    if (!genieEnrollmentRules.length) return;
    setIsAssigning(true);
    setMessage(null);
    try {
      for (const rule of genieEnrollmentRules.filter((r) => r.isActive)) {
        const userIds = getMatchingUserIdsForRule(rule.id)
          .filter((userId) => !enrollments.some((enroll) => enroll.userId === userId && enroll.courseId === rule.courseId));
        if (userIds.length === 0) continue;
        await bulkEnroll(userIds, rule.courseId, {
          dueDate: rule.dueDate,
          priority: rule.priority,
          role: rule.enrollRole
        });
        await updateGenieEnrollmentRule(rule.id, { lastRunAt: Date.now() });
      }
      setMessage('Auto-enroll rules applied.');
    } catch (error) {
      setMessage((error as Error).message || 'Failed to apply rules.');
    } finally {
      setIsAssigning(false);
    }
  };

  const tutorActions = [
    {
      label: 'Apply auto-enroll rules',
      description: 'Run active rules across matching learners.',
      onClick: handleApplyRules,
      disabled: isAssigning || genieEnrollmentRules.length === 0,
      variant: 'primary' as const
    },
    {
      label: 'Assign selected learners',
      description: 'Enroll the selected users into the course.',
      onClick: handleAssign,
      disabled: isAssigning || !selectedCourseId || selectedUserIds.length === 0
    }
  ];

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text" data-section="rules">
      {!embedded && (
        <AdminPageHeader
          title="Genie Enrollment"
          subtitle="Auto-assign Genie courses to roles, teams, or departments."
          isDarkMode={themeDark}
          badge="Genie"
        />
      )}
      {!embedded && (
        <div className="px-6 pb-2 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            className="rounded-full border border-indigo-200 px-3 py-1 font-semibold text-indigo-700"
            onClick={() => jumpTo('top')}
          >
            Top
          </button>
          <button
            type="button"
            className="rounded-full border border-indigo-200 px-3 py-1 font-semibold text-indigo-700"
            onClick={() => jumpTo('rules')}
          >
            Rules
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <AdminSection title="AI Tutor" subtitle="Guidance for enrollment and rollout." isDarkMode={themeDark} minHeight="200px">
          <GenieTutorPanel context={tutorContext} actions={tutorActions} isDarkMode={themeDark} />
        </AdminSection>

        <AdminSection title="Course + Schedule" isDarkMode={themeDark} minHeight="160px">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-400">Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className={`mt-1 px-3 py-2 rounded-lg border text-sm w-full ${
                  themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-400">Due Date</label>
              <div className={`mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border ${
                themeDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
              }`}>
                <Calendar className="w-4 h-4 text-indigo-500" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`bg-transparent outline-none text-sm w-full ${
                    themeDark ? 'text-white' : 'text-gray-900'
                  }`}
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-400">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className={`mt-1 px-3 py-2 rounded-lg border text-sm w-full ${
                  themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="required">Required</option>
                <option value="recommended">Recommended</option>
                <option value="optional">Optional</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-400">Enrollment Role</label>
              <select
                value={enrollRole}
                onChange={(e) => setEnrollRole(e.target.value as typeof enrollRole)}
                className={`mt-1 px-3 py-2 rounded-lg border text-sm w-full ${
                  themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Select Learners" isDarkMode={themeDark} minHeight="280px">
          <AdminToolbar
            isDarkMode={themeDark}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search members..."
            rightContent={(
              <>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All roles</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All teams</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </>
            )}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={selectAllFiltered}
              className={`px-3 py-1.5 rounded-lg text-xs ${
                themeDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Select all ({filteredMembers.length})
            </button>
            <button
              onClick={clearSelection}
              className={`px-3 py-1.5 rounded-lg text-xs ${
                themeDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Clear selection
            </button>
          </div>

          <div className="mt-4 space-y-2 max-h-[360px] overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className={`rounded-xl border p-6 text-center ${
                themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}>
                <Users className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
                <p className="text-sm font-semibold">No members found</p>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <label
                  key={member.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(member.id)}
                    onChange={() => toggleUser(member.id)}
                    className="accent-indigo-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{member.name}</p>
                    <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>{member.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    themeDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {member.role}
                  </span>
                </label>
              ))
            )}
          </div>
        </AdminSection>

        <AdminSection title="Assign" isDarkMode={themeDark} minHeight="120px">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAssign}
              disabled={!selectedCourseId || selectedUserIds.length === 0 || isAssigning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <UserCheck className="w-4 h-4" />
              {isAssigning ? 'Assigning...' : `Assign ${selectedUserIds.length || ''} learners`}
            </button>
            {message && (
              <span className={`text-xs ${message.includes('Failed') ? 'text-red-500' : 'text-emerald-500'}`}>
                {message}
              </span>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Target className="w-4 h-4" />
              Assignments are added immediately to enrollments.
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Auto-Enroll Rules" subtitle="Create rules that auto-assign learners." isDarkMode={themeDark} minHeight="200px">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-400">Roles</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role}
                      onClick={() => toggleRuleRole(role)}
                      className={`px-2 py-1 rounded-lg text-xs ${
                        ruleRoles.includes(role)
                          ? 'bg-indigo-600 text-white'
                          : themeDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-400">Departments</label>
                <div className="mt-2 flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => toggleRuleDepartment(dept.id)}
                      className={`px-2 py-1 rounded-lg text-xs ${
                        ruleDeptIds.includes(dept.id)
                          ? 'bg-indigo-600 text-white'
                          : themeDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-400">Teams</label>
                <div className="mt-2 flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => toggleRuleTeam(team.id)}
                      className={`px-2 py-1 rounded-lg text-xs ${
                        ruleTeamIds.includes(team.id)
                          ? 'bg-indigo-600 text-white'
                          : themeDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={ruleActive}
                onChange={(e) => setRuleActive(e.target.checked)}
                className="accent-indigo-500"
              />
              Active rule
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={autoRunDaily}
                onChange={(e) => setAutoRunDaily(e.target.checked)}
                className="accent-indigo-500"
              />
              Auto-run daily (placeholder)
            </label>
            <button
              onClick={handleCreateRule}
              disabled={!selectedCourseId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Wand2 className="w-4 h-4" />
              Create auto-enroll rule
            </button>
            <button
              onClick={handleApplyRules}
              disabled={isAssigning || genieEnrollmentRules.length === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs ${
                themeDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Apply rules now
            </button>
          </div>

          <div className="mt-6 space-y-2">
            {genieEnrollmentRules.length === 0 ? (
              <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No auto-enroll rules yet.
              </p>
            ) : (
              genieEnrollmentRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`rounded-xl border p-4 flex flex-wrap items-center gap-3 ${
                    themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-sm font-semibold">
                      {courses.find((course) => course.id === rule.courseId)?.title || 'Course'}
                    </p>
                    <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Roles: {rule.roleFilters.length ? rule.roleFilters.join(', ') : 'Any'} •
                      Depts: {rule.departmentIds.length ? rule.departmentIds.length : 'Any'} •
                      Teams: {rule.teamIds.length ? rule.teamIds.length : 'Any'} •
                      {rule.autoRunDaily ? 'Auto daily' : 'Manual run'}
                    </p>
                    {rule.lastRunAt && (
                      <p className={`text-[11px] mt-1 ${themeDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Last run: {new Date(rule.lastRunAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => updateGenieEnrollmentRule(rule.id, { isActive: !rule.isActive })}
                    className={`px-3 py-1.5 rounded-lg text-xs ${
                      rule.isActive
                        ? themeDark ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : themeDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => deleteGenieEnrollmentRule(rule.id)}
                    className={`p-2 rounded-lg ${
                      themeDark ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-500'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </AdminSection>
      </div>
    </div>
  );
};

export default GenieEnrollments;
