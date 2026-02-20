import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart2,
  Target,
  Users,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  RefreshCw,
  PlusCircle,
  X,
  Lightbulb
} from 'lucide-react';
import { useGeniePipeline } from '../../../context/GeniePipelineContext';
import { useLMSStore } from '../../../store/lmsStore';
import AdminSection from '../AdminSection';
import { generateGenieObjectives } from '../../../lib/genie';
import { validateObjectives } from '../../../lib/genieValidation';

interface GenieStageAnalyzeProps {
  isDarkMode: boolean;
}

const GenieStageAnalyze: React.FC<GenieStageAnalyzeProps> = ({ isDarkMode }) => {
  const { project, updateProject, markStageComplete, markStageInProgress, registerStageActions, autopilotEnabled, setAutopilotStatus } = useGeniePipeline();
  const {
    currentOrg,
    genieSources,
    members,
    teams,
    departments,
    enrollments,
    loadMembers,
    loadTeams,
    loadDepartments,
    loadEnrollments,
    logAction
  } = useLMSStore();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [targetAudience, setTargetAudience] = useState(project?.analysis?.targetAudience || '');
  const [audienceMode, setAudienceMode] = useState<'all' | 'roles' | 'departments' | 'teams' | 'users'>('all');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [learningNeeds, setLearningNeeds] = useState<string[]>(project?.analysis?.learningNeeds || []);
  const [skillGaps, setSkillGaps] = useState<string[]>(project?.analysis?.skillGaps || []);
  const [constraints, setConstraints] = useState<string[]>(project?.analysis?.constraints || []);
  const [context, setContext] = useState(project?.analysis?.context || '');
  const [newNeed, setNewNeed] = useState('');
  const [newGap, setNewGap] = useState('');
  const [newConstraint, setNewConstraint] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedSources = genieSources.filter((s) => project?.sourceIds.includes(s.id));
  const hasOrgData = members.length > 0 && departments.length > 0 && teams.length > 0;
  const canAnalyze = selectedSources.length > 0 && hasOrgData;
  const complianceTags = useMemo(() => new Set(['compliance', 'regulation', 'policy', 'safety', 'security']), []);
  const roles = useMemo(() => {
    return Array.from(new Set(members.map((member) => member.role)))
      .map((role) => ({
        id: role,
        label: role.replace('_', ' ')
      }));
  }, [members]);

  useEffect(() => {
    if (!currentOrg?.id) return;
    loadMembers();
    loadTeams();
    loadDepartments();
    loadEnrollments();
  }, [currentOrg?.id, loadMembers, loadTeams, loadDepartments, loadEnrollments]);

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

  const buildTargetAudienceSummary = useCallback(() => {
    switch (audienceMode) {
      case 'roles':
        return selectedRoleIds.length > 0
          ? `Roles: ${selectedRoleIds.map((role) => role.replace('_', ' ')).join(', ')}`
          : 'Select roles for this training';
      case 'departments':
        return selectedDepartmentIds.length > 0
          ? `Departments: ${departments.filter((d) => selectedDepartmentIds.includes(d.id)).map((d) => d.name).join(', ')}`
          : 'Select departments for this training';
      case 'teams':
        return selectedTeamIds.length > 0
          ? `Teams: ${teams.filter((t) => selectedTeamIds.includes(t.id)).map((t) => t.name).join(', ')}`
          : 'Select teams for this training';
      case 'users':
        return selectedUserIds.length > 0
          ? `Users: ${members.filter((m) => selectedUserIds.includes(m.id)).map((m) => m.name).join(', ')}`
          : 'Select learners for this training';
      default:
        return 'All active learners in this organization';
    }
  }, [audienceMode, selectedRoleIds, selectedDepartmentIds, selectedTeamIds, selectedUserIds, departments, teams, members]);

  const autoPopulateAnalyze = useCallback(async () => {
    if (!canAnalyze) {
      return;
    }
    setIsAnalyzing(true);
    if (project) {
      logAction({
        action: 'ai_analysis_started',
        targetType: 'pipeline',
        targetId: project.id,
        targetName: project.name
      });
    }
    const sourceTags = selectedSources.flatMap((source) => source.tags);
    const uniqueTags = Array.from(new Set(sourceTags));
    const complianceSources = selectedSources.filter((source) =>
      source.tags.some((tag) => complianceTags.has(tag.toLowerCase())) || source.type === 'policy'
    );

    const overdueEnrollments = enrollments.filter((e) => e.status === 'overdue');
    const lowProgress = enrollments.filter((e) => (e.progress ?? 0) < 50);

    const suggestedNeeds = [
      ...uniqueTags.map((tag) => `Improve proficiency in ${tag}`),
      overdueEnrollments.length > 0 ? 'Reduce overdue compliance completions' : null,
      lowProgress.length > 0 ? 'Increase completion rates for in-progress learners' : null
    ].filter(Boolean) as string[];

    const suggestedGaps = [
      overdueEnrollments.length > 0 ? 'Learners are missing deadlines for required courses' : null,
      lowProgress.length > 0 ? 'Low completion progress indicates knowledge gaps' : null,
      complianceSources.length === 0 ? 'No compliance sources mapped to this audience' : null
    ].filter(Boolean) as string[];

    const roleCounts = members.reduce<Record<string, number>>((acc, member) => {
      const key = member.role.replace('_', ' ');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const deptCounts = members.reduce<Record<string, number>>((acc, member) => {
      const dept = departments.find((d) => d.id === member.departmentId)?.name || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    const teamCounts = members.reduce<Record<string, number>>((acc, member) => {
      const team = teams.find((t) => t.id === member.teamId)?.name || 'Unassigned';
      acc[team] = (acc[team] || 0) + 1;
      return acc;
    }, {});

    const complianceTagsList = complianceSources.flatMap((source) => source.tags);
    const complianceTagSet = Array.from(new Set(complianceTagsList));

    const constraintItems = [
      currentOrg?.settings?.notifications?.managerDigestEnabled ? 'Manager digests enabled' : null,
      currentOrg?.settings?.compliance?.autoIssueCertificates ? 'Auto-certificate issuance enabled' : null,
      complianceSources.length > 0 ? 'Compliance completion required for tagged policies' : null
    ].filter(Boolean) as string[];

    let objectiveList: string[] = [];
    try {
      const rawObjectives = await generateGenieObjectives(
        selectedSources.map((source) => ({
          title: source.title,
          description: source.description,
          type: source.type,
          tags: source.tags
        })),
        targetAudience || 'Workforce training',
        6,
        currentOrg?.id
      );
      objectiveList = validateObjectives(rawObjectives);
    } catch {
      const objectiveSeeds = selectedSources.slice(0, 5).map((source) => source.title);
      objectiveList = objectiveSeeds.map((title) => `Explain ${title} requirements and apply them at work.`);
    }

    const contentGaps = Object.keys(roleCounts)
      .filter((role) =>
        !selectedSources.some((source) =>
          source.tags.some((tag) => role.toLowerCase().includes(tag.toLowerCase()))
        )
      )
      .map((role) => `No tagged sources mapped to ${role} role`);

    const audienceSummary = buildTargetAudienceSummary();
    setTargetAudience(audienceSummary);
    setLearningNeeds(suggestedNeeds);
    setSkillGaps(suggestedGaps);
    setConstraints(constraintItems);

    updateProject({
      analysis: {
        ...(project?.analysis ?? {}),
        targetAudience: audienceSummary,
        learningNeeds: suggestedNeeds,
        skillGaps: suggestedGaps,
        constraints: constraintItems,
        context,
        learnerProfiles: {
          roles: Object.entries(roleCounts).map(([label, count]) => ({ label, count })),
          departments: Object.entries(deptCounts).map(([label, count]) => ({ label, count })),
          teams: Object.entries(teamCounts).map(([label, count]) => ({ label, count }))
        },
        complianceMapping: {
          sources: complianceSources.map((source) => source.title),
          tags: complianceTagSet,
          suggestedRoles: Object.keys(roleCounts).filter((role) =>
            complianceTagSet.some((tag) => role.toLowerCase().includes(tag.toLowerCase()))
          )
        },
        contentGaps,
        learningObjectives: objectiveList
      }
    });

    setIsAnalyzing(false);
    if (project) {
      logAction({
        action: 'ai_analysis_completed',
        targetType: 'pipeline',
        targetId: project.id,
        targetName: project.name
      });
    }
  }, [
    canAnalyze,
    project,
    logAction,
    selectedSources,
    complianceTags,
    enrollments,
    members,
    departments,
    teams,
    currentOrg?.settings?.notifications?.managerDigestEnabled,
    currentOrg?.settings?.compliance?.autoIssueCertificates,
    currentOrg?.id,
    buildTargetAudienceSummary,
    targetAudience,
    context,
    updateProject
  ]);

  const setAudienceAll = useCallback(() => {
    setAudienceMode('all');
    setSelectedRoleIds([]);
    setSelectedDepartmentIds([]);
    setSelectedTeamIds([]);
    setSelectedUserIds([]);
    setTargetAudience('All active learners in this organization');
  }, []);

  const setAudienceRoles = useCallback(() => {
    const allRoleIds = roles.map((role) => role.id);
    setAudienceMode('roles');
    setSelectedRoleIds(allRoleIds);
    setTargetAudience(allRoleIds.length ? `Roles: ${allRoleIds.map((role) => role.replace('_', ' ')).join(', ')}` : '');
  }, [roles]);

  useEffect(() => {
    registerStageActions('analyze', {
      runAnalysis: autoPopulateAnalyze,
      setAudienceAll,
      setAudienceRoles
    });
  }, [registerStageActions, autoPopulateAnalyze, setAudienceAll, setAudienceRoles]);

  const handleReloadData = async () => {
    if (!currentOrg?.id) return;
    setIsAnalyzing(true);
    await Promise.all([loadMembers(), loadTeams(), loadDepartments(), loadEnrollments()]);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    markStageInProgress('analyze');
  }, [markStageInProgress]);

  useEffect(() => {
    if (!project) return;
    const hasAnalysis = Boolean(project.analysis?.learningNeeds?.length || project.analysis?.skillGaps?.length);
    if (!hasAnalysis && canAnalyze) {
      autoPopulateAnalyze();
    }
  }, [project, canAnalyze, autoPopulateAnalyze]);

  useEffect(() => {
    if (!autopilotEnabled) return;
    if (project?.stageApprovals.analyze !== 'approved') {
      setAutopilotStatus('blocked');
      return;
    }
    if (canAnalyze) {
      setAutopilotStatus('running');
      autoPopulateAnalyze().finally(() => setAutopilotStatus('idle'));
    }
  }, [autopilotEnabled, canAnalyze, project?.stageApprovals.analyze, setAutopilotStatus, autoPopulateAnalyze]);

  useEffect(() => {
    if (!project) return;
    if (!canAnalyze) return;
    autoPopulateAnalyze();
  }, [audienceMode, selectedRoleIds, selectedDepartmentIds, selectedTeamIds, selectedUserIds, canAnalyze, autoPopulateAnalyze, project]);

  // Save analysis on changes
  useEffect(() => {
    if (targetAudience || learningNeeds.length > 0 || skillGaps.length > 0) {
      updateProject({
        analysis: {
          ...(project?.analysis ?? {}),
          targetAudience,
          learningNeeds,
          skillGaps,
          constraints,
          context
        }
      });

      // Mark complete if we have minimum data
      if (canAnalyze && targetAudience && learningNeeds.length > 0) {
        markStageComplete('analyze');
      }
    }
  }, [targetAudience, learningNeeds, skillGaps, constraints, context, updateProject, markStageComplete, canAnalyze, project?.analysis]);

  const handleAIAnalysis = async () => {
    await autoPopulateAnalyze();
  };

  const addItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string, setInput: React.Dispatch<React.SetStateAction<string>>) => {
    if (item.trim()) {
      setList([...list, item.trim()]);
      setInput('');
    }
  };

  const removeItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 space-y-6" data-section="needs">
      {/* Stage Header */}
      <div
        className={`rounded-2xl p-6 ${
          isDarkMode
            ? 'bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border border-blue-500/20'
            : 'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
            }`}
          >
            <BarChart2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Analyze (ADDIE Phase)
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Identify your target audience, learning needs, and skill gaps. This analysis auto-populates
              from org data (roles, enrollments, compliance tags) and can be refined manually.
            </p>
            {!canAnalyze && (
              <div className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
                isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-700'
              }`}>
                Analysis is locked until you have: 1+ sources, members, departments, and teams loaded.
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={handleAIAnalysis}
                disabled={isAnalyzing || !canAnalyze}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isAnalyzing
                    ? 'bg-blue-500/50 text-white cursor-wait'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing content...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    AI Analyze Sources
                  </>
                )}
              </button>
              <button
                onClick={handleReloadData}
                disabled={isAnalyzing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                Reload org data
              </button>
            </div>
            <button
              onClick={() => {
                setLearningNeeds([]);
                setSkillGaps([]);
                handleAIAnalysis();
              }}
              disabled={isAnalyzing || !canAnalyze}
              className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                isAnalyzing
                  ? 'bg-blue-500/30 text-white/80 cursor-wait'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Re-run Analyze
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          className="rounded-full border border-blue-200 px-3 py-1 font-semibold text-blue-700"
          onClick={() => jumpTo('top')}
        >
          Top
        </button>
        <button
          type="button"
          className="rounded-full border border-blue-200 px-3 py-1 font-semibold text-blue-700"
          onClick={() => jumpTo('needs')}
        >
          Needs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target Audience */}
        <AdminSection title="Target Audience" subtitle="Who will take this training?" isDarkMode={isDarkMode} minHeight="220px">
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Users className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Primary Audience
                </span>
              </div>
              <div className="space-y-3">
                <select
                  value={audienceMode}
                  onChange={(e) => setAudienceMode(e.target.value as typeof audienceMode)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode
                      ? 'bg-gray-900 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All learners</option>
                  <option value="roles">By roles</option>
                  <option value="departments">By departments</option>
                  <option value="teams">By teams</option>
                  <option value="users">Specific users</option>
                </select>

                {audienceMode === 'roles' && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {roles.length === 0 ? (
                      <span className="text-xs text-app-muted">No roles found. Add members first.</span>
                    ) : (
                      roles.map((role) => (
                        <label key={role.id} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={selectedRoleIds.includes(role.id)}
                            onChange={() =>
                              setSelectedRoleIds((prev) =>
                                prev.includes(role.id) ? prev.filter((id) => id !== role.id) : [...prev, role.id]
                              )
                            }
                            className="accent-blue-500"
                          />
                          {role.label}
                        </label>
                      ))
                    )}
                  </div>
                )}

                {audienceMode === 'departments' && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {departments.length === 0 ? (
                      <span className="text-xs text-app-muted">No departments found.</span>
                    ) : (
                      departments.map((dept) => (
                        <label key={dept.id} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={selectedDepartmentIds.includes(dept.id)}
                            onChange={() =>
                              setSelectedDepartmentIds((prev) =>
                                prev.includes(dept.id) ? prev.filter((id) => id !== dept.id) : [...prev, dept.id]
                              )
                            }
                            className="accent-blue-500"
                          />
                          {dept.name}
                        </label>
                      ))
                    )}
                  </div>
                )}

                {audienceMode === 'teams' && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {teams.length === 0 ? (
                      <span className="text-xs text-app-muted">No teams found.</span>
                    ) : (
                      teams.map((team) => (
                        <label key={team.id} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.includes(team.id)}
                            onChange={() =>
                              setSelectedTeamIds((prev) =>
                                prev.includes(team.id) ? prev.filter((id) => id !== team.id) : [...prev, team.id]
                              )
                            }
                            className="accent-blue-500"
                          />
                          {team.name}
                        </label>
                      ))
                    )}
                  </div>
                )}

                {audienceMode === 'users' && (
                  <div className="max-h-28 overflow-y-auto space-y-1 text-xs">
                    {members.length === 0 ? (
                      <span className="text-xs text-app-muted">No users found.</span>
                    ) : (
                      members.map((member) => (
                        <label key={member.id} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(member.id)}
                            onChange={() =>
                              setSelectedUserIds((prev) =>
                                prev.includes(member.id) ? prev.filter((id) => id !== member.id) : [...prev, member.id]
                              )
                            }
                            className="accent-blue-500"
                          />
                          {member.name}
                        </label>
                      ))
                    )}
                  </div>
                )}

                <textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Audience summary auto-fills here. You can refine it."
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                    isDarkMode
                      ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Target className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Learning Context
                </span>
              </div>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Describe the context (e.g., 'Training delivered online, must be completed during onboarding week, accessible on mobile devices')"
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                  isDarkMode
                    ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>
          </div>
        </AdminSection>

        {/* Learning Needs */}
        <AdminSection title="Learning Needs" subtitle="What should learners achieve?" isDarkMode={isDarkMode} minHeight="200px">
          <div className="space-y-3">
            {learningNeeds.length < 2 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLearningNeeds((prev) => [...prev, 'Improve compliance awareness across roles'])}
                  className={`text-[11px] px-2 py-1 rounded-full ${
                    isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  AI Suggest: Improve compliance awareness
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={newNeed}
                onChange={(e) => setNewNeed(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem(learningNeeds, setLearningNeeds, newNeed, setNewNeed)}
                placeholder="Add a learning need..."
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <button
                onClick={() => addItem(learningNeeds, setLearningNeeds, newNeed, setNewNeed)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {learningNeeds.length === 0 ? (
                <div
                  className={`p-4 rounded-lg text-center ${
                    isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  <Lightbulb className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Click "AI Analyze Sources" to generate suggestions</p>
                </div>
              ) : (
                learningNeeds.map((need, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <CheckCircle className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    <span className={`flex-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {need}
                    </span>
                    <button
                      onClick={() => removeItem(learningNeeds, setLearningNeeds, index)}
                      className={`p-1 rounded hover:bg-red-500/20 ${
                        isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </AdminSection>

        {/* Skill Gaps */}
        <AdminSection title="Skill Gaps" subtitle="What knowledge gaps exist?" isDarkMode={isDarkMode} minHeight="200px">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={newGap}
                onChange={(e) => setNewGap(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem(skillGaps, setSkillGaps, newGap, setNewGap)}
                placeholder="Add a skill gap..."
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <button
                onClick={() => addItem(skillGaps, setSkillGaps, newGap, setNewGap)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {skillGaps.length === 0 ? (
                <div
                  className={`p-4 rounded-lg text-center ${
                    isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Identify gaps to address in training</p>
                </div>
              ) : (
                skillGaps.map((gap, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 ${isDarkMode ? 'text-amber-400' : 'text-amber-500'}`} />
                    <span className={`flex-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {gap}
                    </span>
                    <button
                      onClick={() => removeItem(skillGaps, setSkillGaps, index)}
                      className={`p-1 rounded hover:bg-red-500/20 ${
                        isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </AdminSection>

        {/* Constraints */}
        <AdminSection title="Constraints & Requirements" subtitle="Any limitations to consider?" isDarkMode={isDarkMode} minHeight="200px">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={newConstraint}
                onChange={(e) => setNewConstraint(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem(constraints, setConstraints, newConstraint, setNewConstraint)}
                placeholder="Add a constraint..."
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <button
                onClick={() => addItem(constraints, setConstraints, newConstraint, setNewConstraint)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-gray-600 text-white hover:bg-gray-500'
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {constraints.length === 0 ? (
                <div
                  className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                  }`}
                >
                  <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Examples: "Must be under 30 minutes", "Mobile-friendly required", "Multi-language support needed"
                  </p>
                </div>
              ) : (
                constraints.map((constraint, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <span className={`flex-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {constraint}
                    </span>
                    <button
                      onClick={() => removeItem(constraints, setConstraints, index)}
                      className={`p-1 rounded hover:bg-red-500/20 ${
                        isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </AdminSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AdminSection title="Learner Profiles" subtitle="Roles, departments, and teams included." isDarkMode={isDarkMode} minHeight="180px">
          <div className="space-y-3 text-xs">
            <div>
              <p className="font-semibold">Roles</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {members.length === 0 ? (
                  <span className="text-app-muted">No members loaded.</span>
                ) : (
                  Object.entries(members.reduce<Record<string, number>>((acc, member) => {
                    const key = member.role.replace('_', ' ');
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                  }, {})).map(([label, count]) => (
                    <span key={label} className="px-2 py-1 rounded-full border border-app-border text-app-muted">
                      {label} ({count})
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="font-semibold">Departments</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {departments.length === 0 ? (
                  <span className="text-app-muted">No departments loaded.</span>
                ) : (
                  departments.map((dept) => (
                    <span key={dept.id} className="px-2 py-1 rounded-full border border-app-border text-app-muted">
                      {dept.name}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="font-semibold">Teams</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {teams.length === 0 ? (
                  <span className="text-app-muted">No teams loaded.</span>
                ) : (
                  teams.map((team) => (
                    <span key={team.id} className="px-2 py-1 rounded-full border border-app-border text-app-muted">
                      {team.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Skill Gap Detection" subtitle="Based on enrollments and progress." isDarkMode={isDarkMode} minHeight="180px">
          <div className="space-y-2 text-xs">
            {enrollments.length === 0 ? (
              <span className="text-app-muted">No enrollments to analyze.</span>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span>Overdue enrollments</span>
                  <span className="font-semibold">{enrollments.filter((e) => e.status === 'overdue').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Below 50% progress</span>
                  <span className="font-semibold">{enrollments.filter((e) => (e.progress ?? 0) < 50).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>In progress</span>
                  <span className="font-semibold">{enrollments.filter((e) => e.status === 'in_progress').length}</span>
                </div>
              </>
            )}
          </div>
        </AdminSection>

        <AdminSection title="Compliance Mapping" subtitle="Policies & regulatory sources mapped to roles." isDarkMode={isDarkMode} minHeight="180px">
          <div className="space-y-2 text-xs">
            {selectedSources.length === 0 ? (
              <span className="text-app-muted">Select sources in Ingest to map compliance.</span>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span>Compliance sources</span>
                  <span className="font-semibold">
                    {selectedSources.filter((s) => s.type === 'policy' || s.tags.some((tag) => complianceTags.has(tag.toLowerCase()))).length}
                  </span>
                </div>
                <div className="text-app-muted">
                  Tagged: {Array.from(new Set(selectedSources.flatMap((s) => s.tags))).join(', ') || 'None'}
                </div>
              </>
            )}
          </div>
        </AdminSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminSection title="Content Gap Mapping" subtitle="Topics missing from source coverage." isDarkMode={isDarkMode} minHeight="180px">
          <div className="space-y-2 text-xs">
            {selectedSources.length === 0 ? (
              <span className="text-app-muted">No sources selected.</span>
            ) : (
              <div className="text-app-muted">
                {selectedSources.length < 2
                  ? 'Only one source uploaded. Consider adding SOPs or training manuals for full coverage.'
                  : 'Coverage looks healthy based on tags. Add role-specific documents if needed.'}
              </div>
            )}
          </div>
        </AdminSection>

        <AdminSection title="Learning Objective Extraction" subtitle="Derived from uploaded sources." isDarkMode={isDarkMode} minHeight="180px">
          <div className="space-y-2 text-xs">
            {selectedSources.length === 0 ? (
              <span className="text-app-muted">Upload sources to extract objectives.</span>
            ) : (
              selectedSources.slice(0, 5).map((source) => (
                <div key={source.id} className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5" />
                  <span>Explain {source.title} requirements and apply them at work.</span>
                </div>
              ))
            )}
          </div>
        </AdminSection>
      </div>

      {/* Stage Summary */}
      {targetAudience && learningNeeds.length > 0 && (
        <div
          className={`rounded-xl border p-4 ${
            isDarkMode ? 'border-emerald-500/30 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
              Analysis complete: {learningNeeds.length} learning needs, {skillGaps.length} skill gaps identified
            </span>
          </div>
          <p className={`text-xs mt-1 ml-7 ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600'}`}>
            Proceed to Design to create learning objectives and course structure
          </p>
        </div>
      )}
    </div>
  );
};

export default GenieStageAnalyze;
