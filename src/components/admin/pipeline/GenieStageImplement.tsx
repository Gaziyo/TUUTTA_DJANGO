import React, { useState, useEffect, useCallback } from 'react';
import {
  PlayCircle,
  Users,
  Calendar,
  Bell,
  CheckCircle,
  Building2,
  UserCheck,
  Briefcase,
  Clock,
  Send,
  AlertCircle
} from 'lucide-react';
import { useGeniePipeline } from '../../../context/GeniePipelineContext';
import { useLMSStore } from '../../../store/lmsStore';
import AdminSection from '../AdminSection';
import type { CourseModule, Lesson } from '../../../types/lms';

interface GenieStageImplementProps {
  isDarkMode: boolean;
}

type EnrollmentType = 'role' | 'team' | 'department' | 'all';

interface EnrollmentRule {
  type: EnrollmentType;
  targetId?: string;
  targetName: string;
}

const GenieStageImplement: React.FC<GenieStageImplementProps> = ({ isDarkMode }) => {
  const { project, updateProject, markStageComplete, markStageInProgress, registerStageActions, autopilotEnabled, setAutopilotStatus } = useGeniePipeline();
  const {
    departments,
    teams,
    members,
    currentOrg,
    currentMember,
    loadMembers,
    loadTeams,
    loadDepartments,
    createCourse,
    publishCourse,
    bulkEnroll,
    createReportSchedule,
    runReportNow
  } = useLMSStore();

  const [enrollmentRules, setEnrollmentRules] = useState<EnrollmentRule[]>(
    project?.implementation?.enrollmentRules || []
  );
  const [startDate, setStartDate] = useState<string>(
    project?.implementation?.startDate
      ? new Date(project.implementation.startDate).toISOString().split('T')[0]
      : ''
  );
  const [endDate, setEndDate] = useState<string>(
    project?.implementation?.endDate
      ? new Date(project.implementation.endDate).toISOString().split('T')[0]
      : ''
  );
  const [enableNotifications, setEnableNotifications] = useState(
    project?.implementation?.notifications ?? true
  );
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentComplete, setDeploymentComplete] = useState(false);
  const canPublish = Boolean(project?.draft?.outline?.length || project?.design?.moduleStructure?.length);

  useEffect(() => {
    markStageInProgress('implement');
  }, [markStageInProgress]);

  useEffect(() => {
    if (!currentOrg?.id) return;
    loadMembers();
    loadTeams();
    loadDepartments();
  }, [currentOrg?.id, loadMembers, loadTeams, loadDepartments]);

  // Save implementation settings
  useEffect(() => {
    updateProject({
      implementation: {
        courseId: project?.implementation?.courseId,
        enrollmentRules,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        notifications: enableNotifications
      }
    });
  }, [enrollmentRules, startDate, endDate, enableNotifications, updateProject, project?.implementation?.courseId]);

  const addEnrollmentRule = useCallback((type: EnrollmentType, targetId?: string, targetName?: string) => {
    const newRule: EnrollmentRule = {
      type,
      targetId,
      targetName: targetName || (type === 'all' ? 'All Employees' : 'Unknown')
    };
    setEnrollmentRules((prev) => [...prev, newRule]);
  }, []);

  const removeEnrollmentRule = (index: number) => {
    setEnrollmentRules(enrollmentRules.filter((_, i) => i !== index));
  };

  const buildModulesFromDraft = useCallback((draftLessons: { moduleId: string; title: string; lessons: Lesson[] }[]): CourseModule[] => {
    return draftLessons.map((module, index) => ({
      id: module.moduleId || `module_${index + 1}_${Date.now()}`,
      title: module.title,
      description: project?.design?.moduleStructure?.[index]?.description,
      order: index + 1,
      lessons: module.lessons.map((lesson, lessonIndex) => ({
        ...lesson,
        order: lesson.order ?? lessonIndex + 1,
        duration: lesson.duration ?? 10,
        isRequired: lesson.isRequired ?? true
      }))
    }));
  }, [project?.design?.moduleStructure]);

  const buildModulesFromDesign = useCallback((): CourseModule[] => {
    if (!project?.design?.moduleStructure) return [];
    return project.design.moduleStructure.map((module, index) => ({
      id: `module_${index + 1}_${Date.now()}`,
      title: module.title,
      description: module.description,
      order: index + 1,
      lessons: module.topics.map((topic, topicIndex) => ({
        id: `lesson_${index + 1}_${topicIndex + 1}_${Date.now()}`,
        title: topic,
        type: 'text',
        content: { htmlContent: '<p>Lesson content placeholder.</p>' },
        duration: 10,
        order: topicIndex + 1,
        isRequired: true
      }))
    }));
  }, [project?.design?.moduleStructure]);

  const resolveEnrollmentUserIds = useCallback(() => {
    const userIds = new Set<string>();
    enrollmentRules.forEach((rule) => {
      switch (rule.type) {
        case 'all':
          members.forEach((member) => userIds.add(member.userId || member.id));
          break;
        case 'department':
          members
            .filter((member) => member.departmentId === rule.targetId)
            .forEach((member) => userIds.add(member.userId || member.id));
          break;
        case 'team':
          members
            .filter((member) => member.teamId === rule.targetId)
            .forEach((member) => userIds.add(member.userId || member.id));
          break;
        case 'role':
          members
            .filter((member) => member.role === rule.targetId || member.role.replace('_', ' ') === rule.targetName)
            .forEach((member) => userIds.add(member.userId || member.id));
          break;
      }
    });
    return Array.from(userIds);
  }, [enrollmentRules, members]);

  const handleDeploy = useCallback(async () => {
    if (enrollmentRules.length === 0) {
      alert('Please add at least one enrollment rule');
      return;
    }

    setIsDeploying(true);

    try {
      if (!currentOrg || !currentMember) {
        throw new Error('Organization or user context missing.');
      }

      const modules = project?.draft?.outline?.length
        ? buildModulesFromDraft(project.draft.outline)
        : buildModulesFromDesign();

      if (modules.length === 0) {
        throw new Error('No course structure available. Complete Design/Develop first.');
      }

      const createdCourse = await createCourse({
        title: project?.design?.courseTitle || project?.name || 'New Course',
        description: project?.design?.assessmentStrategy || 'Generated by Genie AI Pipeline.',
        category: 'Genie',
        tags: project?.analysis?.learningNeeds || [],
        difficulty: 'beginner',
        estimatedDuration: modules.reduce((sum, module) => sum + module.lessons.length * 10, 0),
        modules,
        settings: {
          enableCertificate: true,
          showProgressBar: true,
          allowSelfEnrollment: false
        }
      });

      await publishCourse(createdCourse.id);

      const dueDate = endDate ? new Date(endDate).getTime() : undefined;
      const userIds = resolveEnrollmentUserIds();
      if (userIds.length === 0) {
        throw new Error('No learners matched the enrollment rules.');
      }

      await bulkEnroll(userIds, createdCourse.id, { dueDate, priority: 'required' });

      const recipients = currentMember.email || '';
      if (recipients) {
        const schedule = await createReportSchedule({
          frequency: 'weekly',
          recipients,
          enabled: true
        });
        await runReportNow(schedule.id);
      }

      updateProject({
        implementation: {
          ...(project?.implementation ?? {}),
          courseId: createdCourse.id
        }
      });

      setDeploymentComplete(true);
      markStageComplete('implement');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsDeploying(false);
    }
  }, [
    enrollmentRules,
    currentOrg,
    currentMember,
    project,
    endDate,
    createCourse,
    publishCourse,
    bulkEnroll,
    createReportSchedule,
    runReportNow,
    updateProject,
    markStageComplete,
    buildModulesFromDraft,
    buildModulesFromDesign,
    resolveEnrollmentUserIds
  ]);

  useEffect(() => {
    registerStageActions('implement', {
      addAll: () => addEnrollmentRule('all', undefined, 'All Employees'),
      deploy: handleDeploy,
      setSchedule: () => {
        const today = new Date();
        const due = new Date();
        due.setDate(today.getDate() + 14);
        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(due.toISOString().split('T')[0]);
        setEnableNotifications(true);
      },
      openNotifications: () => {
        const el = document.getElementById('notification-settings');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }, [registerStageActions, addEnrollmentRule, handleDeploy]);

  useEffect(() => {
    if (!autopilotEnabled) return;
    if (project?.stageApprovals.implement !== 'approved') {
      setAutopilotStatus('blocked');
      return;
    }
    if (enrollmentRules.length > 0 && canPublish && !isDeploying && !deploymentComplete) {
      setAutopilotStatus('running');
      handleDeploy().finally(() => setAutopilotStatus('idle'));
    }
  }, [autopilotEnabled, enrollmentRules.length, canPublish, isDeploying, deploymentComplete, project?.stageApprovals.implement, setAutopilotStatus, handleDeploy]);

  const getEnrollmentIcon = (type: EnrollmentType) => {
    switch (type) {
      case 'department':
        return <Building2 className="w-4 h-4" />;
      case 'team':
        return <Users className="w-4 h-4" />;
      case 'role':
        return <Briefcase className="w-4 h-4" />;
      case 'all':
        return <UserCheck className="w-4 h-4" />;
    }
  };

  const estimatedLearners = enrollmentRules.reduce((total, rule) => {
    if (rule.type === 'all') return total + 150;
    if (rule.type === 'department') return total + 30;
    if (rule.type === 'team') return total + 10;
    return total + 5;
  }, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Stage Header */}
      <div
        className={`rounded-2xl p-6 ${
          isDarkMode
            ? 'bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500/20'
            : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
            }`}
          >
            <PlayCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Implement (ADDIE + Delivery)
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Deploy your course, define enrollment rules, and schedule the training delivery.
              Configure notifications and track learner assignments.
            </p>
            {!canPublish && (
              <div className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
                isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-700'
              }`}>
                Publish is locked until Design/Develop produces a course structure.
              </div>
            )}
            {deploymentComplete ? (
              <div
                className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Course deployed successfully!</span>
              </div>
            ) : (
              <button
                onClick={handleDeploy}
                disabled={isDeploying || enrollmentRules.length === 0 || !canPublish}
                className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDeploying
                    ? 'bg-green-500/50 text-white cursor-wait'
                    : 'bg-green-600 text-white hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {isDeploying ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Publishing course...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    One-click Publish & Enroll
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Rules */}
        <AdminSection title="Enrollment Rules" subtitle="Who should take this training?" isDarkMode={isDarkMode} minHeight="300px">
          <div className="space-y-4">
            {/* Quick Add Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => addEnrollmentRule('all', undefined, 'All Employees')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                All Employees
              </button>
              {departments.slice(0, 3).map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => addEnrollmentRule('department', dept.id, dept.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  {dept.name}
                </button>
              ))}
              {teams.slice(0, 2).map((team) => (
                <button
                  key={team.id}
                  onClick={() => addEnrollmentRule('team', team.id, team.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {team.name}
                </button>
              ))}
            </div>

            {/* Enrollment List */}
            <div className="space-y-2">
              {enrollmentRules.length === 0 ? (
                <div
                  className={`p-6 rounded-xl border-2 border-dashed text-center ${
                    isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <Users className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No enrollment rules added
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Click buttons above to add target audiences
                  </p>
                </div>
              ) : (
                enrollmentRules.map((rule, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {getEnrollmentIcon(rule.type)}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {rule.targetName}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {rule.type.charAt(0).toUpperCase() + rule.type.slice(1)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeEnrollmentRule(index)}
                      className={`p-1 rounded hover:bg-red-500/20 ${
                        isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {enrollmentRules.length > 0 && (
              <div
                className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
                }`}
              >
                <p className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                  ~{estimatedLearners} learners will be enrolled
                </p>
              </div>
            )}
          </div>
        </AdminSection>

        {/* Schedule & Settings */}
        <AdminSection title="Schedule & Notifications" isDarkMode={isDarkMode} minHeight="300px">
          <div className="space-y-4">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Start Date
                </label>
                <div className="relative">
                  <Calendar
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 rounded-lg border text-sm ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label
                  className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Due Date
                </label>
                <div className="relative">
                  <Calendar
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 rounded-lg border text-sm ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div
              id="notification-settings"
              className={`p-4 rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Enable Notifications
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Send email reminders for assignments and deadlines
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEnableNotifications(!enableNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enableNotifications
                      ? 'bg-green-500'
                      : isDarkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enableNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Notification Preview */}
            {enableNotifications && (
              <div className="space-y-2">
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Scheduled Notifications
                </p>
                {[
                  { label: 'Assignment notification', when: 'On enrollment' },
                  { label: 'Reminder', when: '7 days before due date' },
                  { label: 'Final reminder', when: '1 day before due date' },
                  { label: 'Overdue notice', when: 'On due date (if incomplete)' }
                ].map((notification, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {notification.label}
                    </span>
                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {notification.when}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminSection>
      </div>

      {/* Deployment Summary */}
      <AdminSection title="Deployment Summary" isDarkMode={isDarkMode} minHeight="150px">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className={`p-4 rounded-xl text-center ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}
          >
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {project?.design?.moduleStructure?.length || 0}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Modules</p>
          </div>
          <div
            className={`p-4 rounded-xl text-center ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}
          >
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {project?.design?.learningObjectives?.length || 0}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Objectives</p>
          </div>
          <div
            className={`p-4 rounded-xl text-center ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}
          >
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              ~{estimatedLearners}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Learners</p>
          </div>
          <div
            className={`p-4 rounded-xl text-center ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}
          >
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {startDate && endDate
                ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
                : '--'}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Days Duration</p>
          </div>
        </div>
      </AdminSection>

      {/* Stage Summary */}
      {deploymentComplete && (
        <div
          className={`rounded-xl border p-4 ${
            isDarkMode ? 'border-emerald-500/30 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
              Course deployed! {estimatedLearners} learners enrolled
            </span>
          </div>
          <p className={`text-xs mt-1 ml-7 ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600'}`}>
            Proceed to Evaluate to track outcomes and gather feedback
          </p>
        </div>
      )}
    </div>
  );
};

export default GenieStageImplement;
