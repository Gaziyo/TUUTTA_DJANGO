import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Save,
  AlertTriangle,
  Play
} from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import { GapMatrixEntry } from '../../services/gapMatrixService';
import { competencyFrameworkService } from '../../services/competencyFrameworkService';
import type { Competency } from '../../types/lms';
import baselineDiagnosticService from '../../services/baselineDiagnosticService';
import remediationTriggerService, { RemediationTrigger } from '../../services/remediationTriggerService';
import evaluateAnalyticsService from '../../services/evaluateAnalyticsService';

interface AdminGapEngineProps {
  isDarkMode?: boolean;
}

type ModalType = 'create' | 'edit' | null;

type StatusFilter = 'all' | GapMatrixEntry['status'];

type PriorityFilter = 'all' | '1' | '2' | '3' | '4' | '5';

const BLOOM_LEVELS = ['0', '1', '2', '3', '4', '5', '6'];
const PRIORITY_OPTIONS: PriorityFilter[] = ['all', '1', '2', '3', '4', '5'];

const AdminGapEngine: React.FC<AdminGapEngineProps> = ({ isDarkMode = false }) => {
  const {
    currentOrg,
    members,
    courses,
    gapMatrixEntries,
    loadMembers,
    loadCourses,
    loadGapMatrixEntries,
    createGapMatrixEntry,
    updateGapMatrixEntry,
    closeGapMatrixEntry,
    deleteGapMatrixEntry,
    bulkCloseLowPriority,
    isLoading,
    error
  } = useLMSStore();

  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';

  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [baselineDiagnostics, setBaselineDiagnostics] = useState<any[]>([]);
  const [remediationTriggers, setRemediationTriggers] = useState<RemediationTrigger[]>([]);
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [bloomSnapshots, setBloomSnapshots] = useState<any[]>([]);
  const [gapClosureSnapshots, setGapClosureSnapshots] = useState<any[]>([]);
  const [isRefreshingEvaluate, setIsRefreshingEvaluate] = useState(false);
  const [diagnosticForm, setDiagnosticForm] = useState({
    name: '',
    targetType: 'org',
    targetId: '',
    roleName: ''
  });
  const [triggerForm, setTriggerForm] = useState({
    competency: '',
    assessment: '',
    remediation_course: '',
    min_gap_score: '0.30',
    max_attempts: '2',
    is_active: true,
  });

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingEntry, setEditingEntry] = useState<GapMatrixEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    userId: '',
    competencyId: '',
    currentBloomLevel: '1',
    targetBloomLevel: '2',
    priority: '3',
    recommendedCourseId: ''
  });

  const [editForm, setEditForm] = useState({
    status: 'open' as GapMatrixEntry['status'],
    priority: '3',
    recommendedCourseId: ''
  });

  const loadEntries = async () => {
    if (!currentOrg?.id) return;
    const status = statusFilter === 'all' ? undefined : statusFilter;
    const priority = priorityFilter === 'all' ? undefined : Number(priorityFilter);
    await loadGapMatrixEntries({ status, priority });
  };

  const loadCompetencies = async () => {
    if (!currentOrg?.id) return;
    try {
      const data = await competencyFrameworkService.listCompetencies(currentOrg.id);
      setCompetencies(data);
    } catch {
      setCompetencies([]);
    }
  };

  const loadRemediationTriggers = async () => {
    if (!currentOrg?.id) return;
    try {
      const data = await remediationTriggerService.listForOrg(currentOrg.id);
      setRemediationTriggers(data);
    } catch {
      setRemediationTriggers([]);
    }
  };

  const loadEvaluateAnalytics = async () => {
    if (!currentOrg?.id) return;
    try {
      const [bloom, gap] = await Promise.all([
        evaluateAnalyticsService.listBloomSnapshots(currentOrg.id),
        evaluateAnalyticsService.listGapClosureSnapshots(currentOrg.id),
      ]);
      setBloomSnapshots(bloom);
      setGapClosureSnapshots(gap);
    } catch {
      setBloomSnapshots([]);
      setGapClosureSnapshots([]);
    }
  };

  useEffect(() => {
    if (!currentOrg?.id) return;
    const status = statusFilter === 'all' ? undefined : statusFilter;
    const priority = priorityFilter === 'all' ? undefined : Number(priorityFilter);
    loadGapMatrixEntries({ status, priority });
  }, [currentOrg?.id, statusFilter, priorityFilter, loadGapMatrixEntries]);

  useEffect(() => {
    if (!currentOrg?.id) return;
    loadMembers();
    loadCourses();
    loadCompetencies();
    loadRemediationTriggers();
    loadEvaluateAnalytics();
    baselineDiagnosticService.listForOrg(currentOrg.id).then(setBaselineDiagnostics);
  }, [currentOrg?.id, loadMembers, loadCourses]);

  const handleCreateDiagnostic = async () => {
    if (!currentOrg?.id || !diagnosticForm.name.trim()) return;
    const created = await baselineDiagnosticService.create(currentOrg.id, {
      name: diagnosticForm.name.trim(),
      target_type: diagnosticForm.targetType,
      target_id: diagnosticForm.targetId || null,
      role_name: diagnosticForm.roleName || null,
      status: 'queued'
    });
    setBaselineDiagnostics(prev => [created, ...prev]);
    setDiagnosticForm({ name: '', targetType: 'org', targetId: '', roleName: '' });
  };

  const handleRunDiagnostic = async (id: string) => {
    if (!currentOrg?.id) return;
    await baselineDiagnosticService.run(currentOrg.id, id);
    baselineDiagnosticService.listForOrg(currentOrg.id).then(setBaselineDiagnostics);
  };

  const resetTriggerForm = () => {
    setTriggerForm({
      competency: '',
      assessment: '',
      remediation_course: '',
      min_gap_score: '0.30',
      max_attempts: '2',
      is_active: true,
    });
    setEditingTriggerId(null);
  };

  const handleSaveTrigger = async () => {
    if (!currentOrg?.id || !triggerForm.remediation_course) return;
    const payload = {
      competency: triggerForm.competency || null,
      assessment: triggerForm.assessment || null,
      remediation_course: triggerForm.remediation_course,
      min_gap_score: Number(triggerForm.min_gap_score || 0.3),
      max_attempts: Number(triggerForm.max_attempts || 2),
      is_active: triggerForm.is_active,
      metadata: {},
    };
    if (editingTriggerId) {
      await remediationTriggerService.update(currentOrg.id, editingTriggerId, payload);
    } else {
      await remediationTriggerService.create(currentOrg.id, payload);
    }
    await loadRemediationTriggers();
    resetTriggerForm();
  };

  const handleEditTrigger = (trigger: RemediationTrigger) => {
    setEditingTriggerId(trigger.id);
    setTriggerForm({
      competency: trigger.competency || '',
      assessment: trigger.assessment || '',
      remediation_course: trigger.remediation_course,
      min_gap_score: String(trigger.min_gap_score ?? 0.3),
      max_attempts: String(trigger.max_attempts ?? 2),
      is_active: Boolean(trigger.is_active ?? true),
    });
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    if (!currentOrg?.id) return;
    const confirmed = window.confirm('Delete this remediation trigger?');
    if (!confirmed) return;
    await remediationTriggerService.remove(currentOrg.id, triggerId);
    await loadRemediationTriggers();
    if (editingTriggerId === triggerId) {
      resetTriggerForm();
    }
  };

  const handleRefreshEvaluateAnalytics = async () => {
    if (!currentOrg?.id) return;
    setIsRefreshingEvaluate(true);
    try {
      await Promise.all([
        evaluateAnalyticsService.recalcBloomSnapshots(currentOrg.id),
        evaluateAnalyticsService.recalcGapClosureSnapshots(currentOrg.id),
      ]);
    } finally {
      setIsRefreshingEvaluate(false);
      await loadEvaluateAnalytics();
    }
  };

  const memberOptions = useMemo(() => {
    return members
      .filter(member => member.userId)
      .map(member => ({
        id: member.userId as string,
        label: `${member.name} (${member.email})`
      }));
  }, [members]);

  const competencyOptions = useMemo(() => {
    return competencies.map((competency) => ({
      id: competency.id,
      label: competency.name
    }));
  }, [competencies]);

  const courseOptions = useMemo(() => {
    return courses.map(course => ({
      id: course.id,
      label: course.title
    }));
  }, [courses]);

  const getUserLabel = (userId: string) => {
    const member = members.find(m => m.userId === userId);
    return member ? member.name : userId;
  };

  const getCompetencyLabel = (entry: GapMatrixEntry) => {
    if (entry.competencyName) return entry.competencyName;
    const competency = competencies.find(c => c.id === entry.competencyId);
    return competency?.name || 'Unknown competency';
  };

  const getCourseLabel = (entry: GapMatrixEntry) => {
    if (entry.recommendedCourseTitle) return entry.recommendedCourseTitle;
    if (!entry.recommendedCourseId) return 'None';
    const course = courses.find(c => c.id === entry.recommendedCourseId);
    return course?.title || entry.recommendedCourseId;
  };

  const openCreateModal = () => {
    setEditingEntry(null);
    setCreateForm({
      userId: memberOptions[0]?.id || '',
      competencyId: competencyOptions[0]?.id || '',
      currentBloomLevel: '1',
      targetBloomLevel: '2',
      priority: '3',
      recommendedCourseId: ''
    });
    setActiveModal('create');
  };

  const openEditModal = (entry: GapMatrixEntry) => {
    setEditingEntry(entry);
    setEditForm({
      status: entry.status,
      priority: String(entry.priority),
      recommendedCourseId: entry.recommendedCourseId || ''
    });
    setActiveModal('edit');
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingEntry(null);
  };

  const handleCreate = async () => {
    if (!currentOrg?.id || !createForm.userId || !createForm.competencyId) return;
    const currentBloom = Number(createForm.currentBloomLevel);
    const targetBloom = Number(createForm.targetBloomLevel);
    setIsSaving(true);
    try {
      await createGapMatrixEntry({
        userId: createForm.userId,
        competencyId: createForm.competencyId,
        currentBloomLevel: Number.isFinite(currentBloom) ? currentBloom : 1,
        targetBloomLevel: Number.isFinite(targetBloom) ? targetBloom : 2,
        priority: Number(createForm.priority) as GapMatrixEntry['priority'],
        recommendedCourseId: createForm.recommendedCourseId || undefined
      });
      await loadEntries();
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!currentOrg?.id || !editingEntry) return;
    setIsSaving(true);
    try {
      await updateGapMatrixEntry(editingEntry.id, {
        status: editForm.status,
        priority: Number(editForm.priority) as GapMatrixEntry['priority'],
        recommendedCourseId: editForm.recommendedCourseId || undefined
      });
      await loadEntries();
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseEntry = async (entry: GapMatrixEntry) => {
    if (!currentOrg?.id) return;
    await closeGapMatrixEntry(entry.id);
    await loadEntries();
  };

  const handleDeleteEntry = async (entry: GapMatrixEntry) => {
    if (!currentOrg?.id) return;
    const confirmed = window.confirm('Delete this gap entry? This cannot be undone.');
    if (!confirmed) return;
    await deleteGapMatrixEntry(entry.id);
    await loadEntries();
    closeModal();
  };

  const handleBulkClose = async () => {
    if (!currentOrg?.id) return;
    const confirmed = window.confirm('Close all low-priority gap entries (priority 4-5)?');
    if (!confirmed) return;
    const closedCount = await bulkCloseLowPriority(4);
    await loadEntries();
    setBulkNotice(
      closedCount > 0
        ? `Closed ${closedCount} low-priority gap entries.`
        : 'No low-priority gap entries to close.'
    );
  };

  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-app-bg">
        <AdminPageHeader
          title="Gap Intelligence"
          subtitle="Select an organization to view gap analytics."
          isDarkMode={themeDark}
          badge="Intelligence"
        />
        <div className="p-6">
          <AdminSection isDarkMode={themeDark} title="No organization" subtitle="Choose an org from the admin switcher.">
            <p className="text-sm text-app-muted">No organization selected.</p>
          </AdminSection>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <AdminPageHeader
        title="Gap Intelligence"
        subtitle="Diagnose skill gaps and trigger remediation."
        isDarkMode={themeDark}
        badge="Intelligence"
        actions={(
          <button
            onClick={loadEntries}
            className="p-2 rounded-lg hover:bg-app-surface-2 text-app-muted"
            aria-label="Refresh gap matrix"
            title="Refresh"
          >
            <RefreshCw className={isLoading ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
          </button>
        )}
      />

      <div className="p-6 space-y-6">
        {error && (
          <div className="card-min p-4 border-red-500/40 text-sm text-red-500">
            {error}
          </div>
        )}
        {bulkNotice && (
          <div className="card-min p-4 text-sm text-app-muted">
            {bulkNotice}
          </div>
        )}

        <AdminSection
          title="Baseline Diagnostics"
          subtitle="Trigger baseline assessments to seed the Gap Matrix."
          isDarkMode={themeDark}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <input
              value={diagnosticForm.name}
              onChange={(e) => setDiagnosticForm({ ...diagnosticForm, name: e.target.value })}
              className="input-min"
              placeholder="Diagnostic name"
            />
            <select
              value={diagnosticForm.targetType}
              onChange={(e) => setDiagnosticForm({ ...diagnosticForm, targetType: e.target.value })}
              className="input-min"
            >
              <option value="org">Organization</option>
              <option value="department">Department</option>
              <option value="team">Team</option>
              <option value="role">Role</option>
              <option value="user">User</option>
            </select>
            <input
              value={diagnosticForm.targetId}
              onChange={(e) => setDiagnosticForm({ ...diagnosticForm, targetId: e.target.value })}
              className="input-min"
              placeholder="Target id (optional)"
            />
            <input
              value={diagnosticForm.roleName}
              onChange={(e) => setDiagnosticForm({ ...diagnosticForm, roleName: e.target.value })}
              className="input-min"
              placeholder="Role name (optional)"
            />
          </div>
          <button
            onClick={handleCreateDiagnostic}
            className="btn-primary-min flex items-center gap-2"
            disabled={!diagnosticForm.name.trim()}
          >
            <Plus className="w-4 h-4" />
            Create diagnostic
          </button>

          <div className="mt-4">
            {baselineDiagnostics.length === 0 ? (
              <div className="text-sm text-app-muted">No baseline diagnostics yet.</div>
            ) : (
              <div className="space-y-2">
                {baselineDiagnostics.map((diagnostic) => (
                  <div key={diagnostic.id} className="card-min p-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold">{diagnostic.name}</div>
                      <div className="text-xs text-app-muted">
                        {diagnostic.target_type} {diagnostic.target_id || ''} {diagnostic.role_name || ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-app-muted">{diagnostic.status}</span>
                      <button
                        onClick={() => handleRunDiagnostic(diagnostic.id)}
                        className="btn-secondary-min flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Run
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminSection>

        <AdminSection
          title="Remediation Triggers"
          subtitle="Configure threshold-based remediation assignments."
          isDarkMode={themeDark}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <select
              value={triggerForm.competency}
              onChange={(e) => setTriggerForm({ ...triggerForm, competency: e.target.value })}
              className="input-min"
            >
              <option value="">Any competency</option>
              {competencyOptions.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <input
              value={triggerForm.assessment}
              onChange={(e) => setTriggerForm({ ...triggerForm, assessment: e.target.value })}
              className="input-min"
              placeholder="Assessment ID (optional)"
            />
            <select
              value={triggerForm.remediation_course}
              onChange={(e) => setTriggerForm({ ...triggerForm, remediation_course: e.target.value })}
              className="input-min"
            >
              <option value="">Select remediation course</option>
              {courseOptions.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={triggerForm.min_gap_score}
              onChange={(e) => setTriggerForm({ ...triggerForm, min_gap_score: e.target.value })}
              className="input-min"
              placeholder="Min gap score"
            />
            <input
              type="number"
              min={1}
              value={triggerForm.max_attempts}
              onChange={(e) => setTriggerForm({ ...triggerForm, max_attempts: e.target.value })}
              className="input-min"
              placeholder="Max failed attempts"
            />
            <label className="flex items-center gap-2 text-sm text-app-muted">
              <input
                type="checkbox"
                checked={triggerForm.is_active}
                onChange={(e) => setTriggerForm({ ...triggerForm, is_active: e.target.checked })}
              />
              Trigger active
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleSaveTrigger}
                className="btn-primary-min flex-1"
                disabled={!triggerForm.remediation_course}
              >
                {editingTriggerId ? 'Update' : 'Create'}
              </button>
              {editingTriggerId && (
                <button onClick={resetTriggerForm} className="btn-secondary-min">Cancel</button>
              )}
            </div>
          </div>

          {remediationTriggers.length === 0 ? (
            <div className="text-sm text-app-muted">No remediation triggers configured.</div>
          ) : (
            <div className="space-y-2">
              {remediationTriggers.map((trigger) => (
                <div key={trigger.id} className="card-min p-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold">{trigger.remediation_course_title || trigger.remediation_course}</div>
                    <div className="text-xs text-app-muted">
                      Competency: {trigger.competency_name || 'Any'} · Assessment: {trigger.assessment_title || trigger.assessment || 'Any'}
                    </div>
                    <div className="text-xs text-app-muted">
                      Min gap {trigger.min_gap_score ?? 0.3} · Max attempts {trigger.max_attempts ?? 2} · {trigger.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditTrigger(trigger)} className="btn-secondary-min">Edit</button>
                    <button onClick={() => handleDeleteTrigger(trigger.id)} className="btn-secondary-min text-red-500">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection
          title="Evaluate Analytics"
          subtitle="Bloom performance and gap-closure trends."
          isDarkMode={themeDark}
        >
          <div className="flex justify-end mb-3">
            <button
              onClick={handleRefreshEvaluateAnalytics}
              className="btn-secondary-min flex items-center gap-2"
              disabled={isRefreshingEvaluate}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingEvaluate ? 'animate-spin' : ''}`} />
              {isRefreshingEvaluate ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-min p-4">
              <h4 className="text-sm font-semibold text-app-text mb-2">Latest Bloom Snapshots</h4>
              {bloomSnapshots.length === 0 ? (
                <div className="text-sm text-app-muted">No bloom snapshots yet.</div>
              ) : (
                <div className="space-y-2 text-xs">
                  {bloomSnapshots.slice(0, 5).map((snapshot) => (
                    <div key={snapshot.id} className="flex items-center justify-between">
                      <span>Bloom L{snapshot.bloom_level}</span>
                      <span>
                        Score {Math.round((snapshot.average_score ?? 0) * 100) / 100}, Pass {Math.round((snapshot.pass_rate ?? 0) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card-min p-4">
              <h4 className="text-sm font-semibold text-app-text mb-2">Gap Closure</h4>
              {gapClosureSnapshots.length === 0 ? (
                <div className="text-sm text-app-muted">No gap closure snapshots yet.</div>
              ) : (
                <div className="space-y-2 text-xs">
                  {gapClosureSnapshots.slice(0, 5).map((snapshot) => (
                    <div key={snapshot.id} className="flex items-center justify-between">
                      <span>{snapshot.created_at ? new Date(snapshot.created_at).toLocaleDateString() : 'Snapshot'}</span>
                      <span>
                        Avg gap {Math.round((snapshot.average_gap_score ?? 0) * 100)}% · Open {snapshot.total_open} · Closed {snapshot.total_closed}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Filters" subtitle="Refine by status and priority." isDarkMode={themeDark}>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[180px]">
              <label htmlFor="gap-status" className="text-xs font-semibold text-app-muted">Status</label>
              <select
                id="gap-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="input-min w-full mt-1"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="min-w-[180px]">
              <label htmlFor="gap-priority" className="text-xs font-semibold text-app-muted">Priority</label>
              <select
                id="gap-priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                className="input-min w-full mt-1"
              >
                {PRIORITY_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All' : `Priority ${option}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1" />
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleBulkClose}
                className="btn-secondary-min flex items-center gap-2"
              >
                Close low priority
              </button>
              <button
                onClick={openCreateModal}
                className="btn-primary-min flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New gap entry
              </button>
            </div>
          </div>
        </AdminSection>

        <AdminSection
          title="Gap Matrix"
          subtitle="Track learner-to-competency gaps and prioritize remediation."
          isDarkMode={themeDark}
        >
          {gapMatrixEntries.length === 0 ? (
            <div className="card-min-ghost p-6 text-sm text-app-muted">
              No gap entries found for the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {gapMatrixEntries.map((entry) => (
                <div key={entry.id} className="card-min p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-app-text">
                        {getUserLabel(entry.userId)}
                      </div>
                      <div className="text-xs text-app-muted mt-1">
                        {getCompetencyLabel(entry)}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                          Bloom {entry.currentBloomLevel} → {entry.targetBloomLevel}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                          Gap score {entry.gapScore.toFixed(2)}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                          Priority {entry.priority}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full ${
                            entry.status === 'closed'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : entry.status === 'in_progress'
                              ? 'bg-sky-500/15 text-sky-500'
                              : 'bg-amber-500/15 text-amber-500'
                          }`}
                        >
                          {entry.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-3 text-xs text-app-muted">
                        Recommended course: {getCourseLabel(entry)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.status !== 'closed' && (
                        <button
                          onClick={() => handleCloseEntry(entry)}
                          className="p-2 rounded-lg hover:bg-app-surface-2 text-emerald-500"
                          aria-label="Close gap entry"
                          title="Close gap entry"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(entry)}
                        className="p-2 rounded-lg hover:bg-app-surface-2"
                        aria-label="Edit gap entry"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry)}
                        className="p-2 rounded-lg hover:bg-app-surface-2 text-red-500"
                        aria-label="Delete gap entry"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      </div>

      {activeModal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-2xl card-min p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-app-text">Create Gap Entry</h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-app-surface-2"
                aria-label="Close gap entry modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="gap-user" className="text-sm font-medium text-app-text">Learner</label>
                <select
                  id="gap-user"
                  value={createForm.userId}
                  onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                  className="input-min w-full mt-1"
                >
                  <option value="">Select learner</option>
                  {memberOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="gap-competency" className="text-sm font-medium text-app-text">Competency</label>
                <select
                  id="gap-competency"
                  value={createForm.competencyId}
                  onChange={(e) => setCreateForm({ ...createForm, competencyId: e.target.value })}
                  className="input-min w-full mt-1"
                >
                  <option value="">Select competency</option>
                  {competencyOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gap-current" className="text-sm font-medium text-app-text">Current Bloom Level</label>
                  <select
                    id="gap-current"
                    value={createForm.currentBloomLevel}
                    onChange={(e) => setCreateForm({ ...createForm, currentBloomLevel: e.target.value })}
                    className="input-min w-full mt-1"
                  >
                    {BLOOM_LEVELS.map(level => (
                      <option key={level} value={level}>L{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="gap-target" className="text-sm font-medium text-app-text">Target Bloom Level</label>
                  <select
                    id="gap-target"
                    value={createForm.targetBloomLevel}
                    onChange={(e) => setCreateForm({ ...createForm, targetBloomLevel: e.target.value })}
                    className="input-min w-full mt-1"
                  >
                    {BLOOM_LEVELS.map(level => (
                      <option key={level} value={level}>L{level}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gap-priority-create" className="text-sm font-medium text-app-text">Priority</label>
                  <select
                    id="gap-priority-create"
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="input-min w-full mt-1"
                  >
                    {PRIORITY_OPTIONS.filter(p => p !== 'all').map(level => (
                      <option key={level} value={level}>Priority {level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="gap-course" className="text-sm font-medium text-app-text">Recommended Course</label>
                  <select
                    id="gap-course"
                    value={createForm.recommendedCourseId}
                    onChange={(e) => setCreateForm({ ...createForm, recommendedCourseId: e.target.value })}
                    className="input-min w-full mt-1"
                  >
                    <option value="">None</option>
                    {courseOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="btn-secondary-min">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={isSaving || !createForm.userId || !createForm.competencyId}
                className="btn-primary-min flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'edit' && editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-xl card-min p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-app-text">Update Gap Entry</h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-app-surface-2"
                aria-label="Close update modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-app-muted">Learner</p>
                <p className="text-sm font-semibold text-app-text">{getUserLabel(editingEntry.userId)}</p>
              </div>
              <div>
                <p className="text-sm text-app-muted">Competency</p>
                <p className="text-sm font-semibold text-app-text">{getCompetencyLabel(editingEntry)}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gap-status-edit" className="text-sm font-medium text-app-text">Status</label>
                  <select
                    id="gap-status-edit"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as GapMatrixEntry['status'] })}
                    className="input-min w-full mt-1"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="gap-priority-edit" className="text-sm font-medium text-app-text">Priority</label>
                  <select
                    id="gap-priority-edit"
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="input-min w-full mt-1"
                  >
                    {PRIORITY_OPTIONS.filter(p => p !== 'all').map(level => (
                      <option key={level} value={level}>Priority {level}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="gap-course-edit" className="text-sm font-medium text-app-text">Recommended Course</label>
                <select
                  id="gap-course-edit"
                  value={editForm.recommendedCourseId}
                  onChange={(e) => setEditForm({ ...editForm, recommendedCourseId: e.target.value })}
                  className="input-min w-full mt-1"
                >
                  <option value="">None</option>
                  {courseOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => handleDeleteEntry(editingEntry)}
                className="flex items-center gap-2 text-red-500 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <div className="flex gap-2">
                <button onClick={closeModal} className="btn-secondary-min">Cancel</button>
                <button
                  onClick={handleUpdate}
                  disabled={isSaving}
                  className="btn-primary-min flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGapEngine;
