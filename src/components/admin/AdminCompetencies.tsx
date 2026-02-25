import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Save,
  X,
  ShieldCheck,
  Layers,
  Link2
} from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import type {
  CompetencyFramework,
  Competency,
  RoleCompetencyMapping,
  CompliancePolicy
} from '../../types/lms';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import { competencyFrameworkService } from '../../services/competencyFrameworkService';

interface AdminCompetenciesProps {
  isDarkMode?: boolean;
}

type ModalType = 'framework' | 'competency' | 'role' | 'policy' | null;

const LEVEL_OPTIONS = ['novice', 'intermediate', 'advanced', 'expert'];
const BLOOM_OPTIONS = ['1', '2', '3', '4', '5', '6'];
const REGULATION_OPTIONS = ['custom', 'gdpr', 'iso27001', 'hipaa', 'sox', 'pci_dss'];
const MODALITY_OPTIONS = ['reading', 'writing', 'listening', 'speaking', 'math', 'general_knowledge'];
const PRIORITY_OPTIONS: Array<'mandatory' | 'recommended' | 'optional'> = ['mandatory', 'recommended', 'optional'];

const AdminCompetencies: React.FC<AdminCompetenciesProps> = ({ isDarkMode = false }) => {
  const { currentOrg } = useLMSStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';

  const [frameworks, setFrameworks] = useState<CompetencyFramework[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [roleMappings, setRoleMappings] = useState<RoleCompetencyMapping[]>([]);
  const [policies, setPolicies] = useState<CompliancePolicy[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [editingFramework, setEditingFramework] = useState<CompetencyFramework | null>(null);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [editingRole, setEditingRole] = useState<RoleCompetencyMapping | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<CompliancePolicy | null>(null);

  const [frameworkForm, setFrameworkForm] = useState({
    name: '',
    description: '',
    version: '',
    isActive: true
  });

  const [competencyForm, setCompetencyForm] = useState({
    name: '',
    description: '',
    frameworkId: '',
    parentId: '',
    level: 'novice',
    bloomLevelTarget: '',
    requiredModalities: [] as string[],
    thresholdScore: ''
  });

  const [roleForm, setRoleForm] = useState({
    competencyId: '',
    roleName: '',
    requiredLevel: 'novice',
    isMandatory: true,
    priority: 'mandatory' as 'mandatory' | 'recommended' | 'optional'
  });

  const [policyForm, setPolicyForm] = useState({
    name: '',
    description: '',
    regulation: 'custom',
    dueDays: '30',
    recurrenceDays: '',
    penaltyDescription: '',
    linkedCourse: '',
    linkedAssessment: '',
    linkedCompetencyIds: [] as string[],
    isActive: true
  });

  const loadAll = async () => {
    if (!currentOrg?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [frameworksData, competenciesData, roleData, policyData] = await Promise.all([
        competencyFrameworkService.listFrameworks(currentOrg.id),
        competencyFrameworkService.listCompetencies(currentOrg.id),
        competencyFrameworkService.listRoleMappings(currentOrg.id),
        competencyFrameworkService.listCompliancePolicies(currentOrg.id)
      ]);
      setFrameworks(frameworksData);
      setCompetencies(competenciesData);
      setRoleMappings(roleData);
      setPolicies(policyData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load competency data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg?.id) {
      loadAll();
    }
  }, [currentOrg?.id]);

  const frameworkOptions = useMemo(() => {
    return frameworks.map((framework) => ({
      id: framework.id,
      name: framework.name
    }));
  }, [frameworks]);

  const competencyOptions = useMemo(() => {
    return competencies.map((competency) => ({
      id: competency.id,
      name: competency.name
    }));
  }, [competencies]);

  const openFrameworkModal = (framework?: CompetencyFramework) => {
    setEditingFramework(framework || null);
    setFrameworkForm({
      name: framework?.name || '',
      description: framework?.description || '',
      version: framework?.version || '',
      isActive: framework?.isActive ?? true
    });
    setActiveModal('framework');
  };

  const openCompetencyModal = (competency?: Competency) => {
    setEditingCompetency(competency || null);
    setCompetencyForm({
      name: competency?.name || '',
      description: competency?.description || '',
      frameworkId: competency?.frameworkId || '',
      parentId: competency?.parentId || '',
      level: competency?.level || 'novice',
      bloomLevelTarget: competency?.bloomLevelTarget ? String(competency.bloomLevelTarget) : '',
      requiredModalities: competency?.requiredModalities ?? [],
      thresholdScore: competency?.thresholdScore !== undefined && competency?.thresholdScore !== null
        ? String(competency.thresholdScore)
        : ''
    });
    setActiveModal('competency');
  };

  const openRoleModal = (mapping?: RoleCompetencyMapping) => {
    setEditingRole(mapping || null);
    setRoleForm({
      competencyId: mapping?.competencyId || '',
      roleName: mapping?.roleName || '',
      requiredLevel: mapping?.requiredLevel || 'novice',
      isMandatory: mapping?.isMandatory ?? true,
      priority: (mapping?.priority as 'mandatory' | 'recommended' | 'optional') || (mapping?.isMandatory ? 'mandatory' : 'recommended')
    });
    setActiveModal('role');
  };

  const openPolicyModal = (policy?: CompliancePolicy) => {
    setEditingPolicy(policy || null);
    setPolicyForm({
      name: policy?.name || '',
      description: policy?.description || '',
      regulation: policy?.regulation || 'custom',
      dueDays: policy?.dueDays ? String(policy.dueDays) : '30',
      recurrenceDays: policy?.recurrenceDays ? String(policy.recurrenceDays) : '',
      penaltyDescription: policy?.penaltyDescription || '',
      linkedCourse: policy?.linkedCourse || '',
      linkedAssessment: policy?.linkedAssessment || '',
      linkedCompetencyIds: policy?.linkedCompetencyIds ?? [],
      isActive: policy?.isActive ?? true
    });
    setActiveModal('policy');
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingFramework(null);
    setEditingCompetency(null);
    setEditingRole(null);
    setEditingPolicy(null);
  };

  const handleSaveFramework = async () => {
    if (!currentOrg?.id || !frameworkForm.name.trim()) return;
    setIsSaving(true);
    try {
      if (editingFramework) {
        await competencyFrameworkService.updateFramework(currentOrg.id, editingFramework.id, {
          name: frameworkForm.name.trim(),
          description: frameworkForm.description.trim(),
          version: frameworkForm.version.trim(),
          isActive: frameworkForm.isActive
        });
      } else {
        await competencyFrameworkService.createFramework(currentOrg.id, {
          name: frameworkForm.name.trim(),
          description: frameworkForm.description.trim(),
          version: frameworkForm.version.trim(),
          isActive: frameworkForm.isActive
        });
      }
      await loadAll();
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCompetency = async () => {
    if (!currentOrg?.id || !competencyForm.name.trim()) return;
    const bloomTarget = competencyForm.bloomLevelTarget.trim();
    const parsedBloom = bloomTarget ? Number(bloomTarget) : null;
    const thresholdRaw = competencyForm.thresholdScore.trim();
    const parsedThreshold = thresholdRaw ? Number(thresholdRaw) : null;
    setIsSaving(true);
    try {
      const payload: Partial<Competency> = {
        name: competencyForm.name.trim(),
        description: competencyForm.description.trim(),
        frameworkId: competencyForm.frameworkId || null,
        parentId: competencyForm.parentId || null,
        level: competencyForm.level,
        bloomLevelTarget: Number.isFinite(parsedBloom) ? parsedBloom : null,
        requiredModalities: competencyForm.requiredModalities,
        thresholdScore: Number.isFinite(parsedThreshold) ? parsedThreshold : null
      };
      if (editingCompetency) {
        await competencyFrameworkService.updateCompetency(currentOrg.id, editingCompetency.id, payload);
      } else {
        await competencyFrameworkService.createCompetency(currentOrg.id, payload);
      }
      await loadAll();
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRole = async () => {
    if (!currentOrg?.id || !roleForm.competencyId || !roleForm.roleName.trim()) return;
    setIsSaving(true);
    try {
      const payload: Partial<RoleCompetencyMapping> = {
        competencyId: roleForm.competencyId,
        roleName: roleForm.roleName.trim(),
        requiredLevel: roleForm.requiredLevel,
        priority: roleForm.priority,
        isMandatory: roleForm.priority === 'mandatory'
      };
      if (editingRole) {
        await competencyFrameworkService.updateRoleMapping(currentOrg.id, editingRole.id, payload);
      } else {
        await competencyFrameworkService.createRoleMapping(currentOrg.id, payload);
      }
      await loadAll();
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!currentOrg?.id || !policyForm.name.trim()) return;
    const dueDays = Number(policyForm.dueDays);
    const recurrence = policyForm.recurrenceDays ? Number(policyForm.recurrenceDays) : null;
    setIsSaving(true);
    try {
      const payload: Partial<CompliancePolicy> = {
        name: policyForm.name.trim(),
        description: policyForm.description.trim(),
        regulation: policyForm.regulation,
        dueDays: Number.isFinite(dueDays) ? dueDays : 30,
        recurrenceDays: recurrence && Number.isFinite(recurrence) ? recurrence : null,
        penaltyDescription: policyForm.penaltyDescription.trim(),
        linkedCourse: policyForm.linkedCourse.trim() || null,
        linkedAssessment: policyForm.linkedAssessment.trim() || null,
        linkedCompetencyIds: policyForm.linkedCompetencyIds,
        isActive: policyForm.isActive
      };
      if (editingPolicy) {
        await competencyFrameworkService.updateCompliancePolicy(currentOrg.id, editingPolicy.id, payload);
      } else {
        await competencyFrameworkService.createCompliancePolicy(currentOrg.id, payload);
      }
      await loadAll();
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (type: Exclude<ModalType, null>, id: string) => {
    if (!currentOrg?.id) return;
    switch (type) {
      case 'framework':
        await competencyFrameworkService.deleteFramework(currentOrg.id, id);
        break;
      case 'competency':
        await competencyFrameworkService.deleteCompetency(currentOrg.id, id);
        break;
      case 'role':
        await competencyFrameworkService.deleteRoleMapping(currentOrg.id, id);
        break;
      case 'policy':
        await competencyFrameworkService.deleteCompliancePolicy(currentOrg.id, id);
        break;
      default:
        break;
    }
    await loadAll();
  };

  const getFrameworkName = (id?: string | null) => {
    if (!id) return 'Unassigned';
    return frameworks.find(f => f.id === id)?.name || 'Unknown';
  };

  const getCompetencyName = (id?: string | null) => {
    if (!id) return '-';
    return competencies.find(c => c.id === id)?.name || 'Unknown';
  };

  const parentOptions = useMemo(() => {
    if (!editingCompetency) return competencies;
    return competencies.filter(c => c.id !== editingCompetency.id);
  }, [competencies, editingCompetency]);

  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-app-bg">
        <AdminPageHeader
          title="Competency Framework"
          subtitle="Select an organization to manage competencies."
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
        title="Competency Framework"
        subtitle="Define competencies, Bloom depth, and role mappings."
        isDarkMode={themeDark}
        badge="Intelligence"
        actions={(
          <button
            onClick={loadAll}
            className="p-2 rounded-lg hover:bg-app-surface-2 text-app-muted"
            aria-label="Refresh competency data"
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

        <AdminSection
          title="Competency Frameworks"
          subtitle="High-level competency models with versions and activation status."
          isDarkMode={themeDark}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm text-app-muted">{frameworks.length} frameworks</p>
            <button
              onClick={() => openFrameworkModal()}
              className="btn-primary-min flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New framework
            </button>
          </div>
          {frameworks.length === 0 ? (
            <div className="card-min-ghost p-6 text-sm text-app-muted">
              No frameworks yet. Create your first competency framework.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {frameworks.map((framework) => (
                <div key={framework.id} className="card-min p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-app-muted" />
                        <h3 className="text-base font-semibold text-app-text">{framework.name}</h3>
                      </div>
                      <p className="text-xs text-app-muted mt-1">
                        {framework.description || 'No description'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                          {framework.version || 'v1'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full ${framework.isActive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}
                        >
                          {framework.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openFrameworkModal(framework)}
                        className="p-2 rounded-lg hover:bg-app-surface-2"
                        aria-label={`Edit framework ${framework.name}`}
                        title={`Edit ${framework.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete('framework', framework.id)}
                        className="p-2 rounded-lg hover:bg-app-surface-2 text-red-500"
                        aria-label={`Delete framework ${framework.name}`}
                        title={`Delete ${framework.name}`}
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

        <AdminSection
          title="Competencies"
          subtitle="Granular skills tied to frameworks and Bloom targets."
          isDarkMode={themeDark}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm text-app-muted">{competencies.length} competencies</p>
            <button
              onClick={() => openCompetencyModal()}
              className="btn-primary-min flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New competency
            </button>
          </div>
          {competencies.length === 0 ? (
            <div className="card-min-ghost p-6 text-sm text-app-muted">
              No competencies defined yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {competencies.map((competency) => (
                <div key={competency.id} className="card-min p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-app-text">{competency.name}</h3>
                      <p className="text-xs text-app-muted mt-1">
                        {competency.description || 'No description'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                          {getFrameworkName(competency.frameworkId)}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                          Level: {competency.level || 'novice'}
                        </span>
                        {competency.bloomLevelTarget && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                            Bloom L{competency.bloomLevelTarget}
                          </span>
                        )}
                        {competency.requiredModalities && competency.requiredModalities.length > 0 && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                            Modalities: {competency.requiredModalities.join(', ')}
                          </span>
                        )}
                        {competency.thresholdScore !== null && competency.thresholdScore !== undefined && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                            Threshold: {competency.thresholdScore <= 1 ? Math.round(competency.thresholdScore * 100) : competency.thresholdScore}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openCompetencyModal(competency)}
                        className="p-2 rounded-lg hover:bg-app-surface-2"
                        aria-label={`Edit competency ${competency.name}`}
                        title={`Edit ${competency.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete('competency', competency.id)}
                        className="p-2 rounded-lg hover:bg-app-surface-2 text-red-500"
                        aria-label={`Delete competency ${competency.name}`}
                        title={`Delete ${competency.name}`}
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

        <AdminSection
          title="Role Mappings"
          subtitle="Map job roles to required competency levels."
          isDarkMode={themeDark}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm text-app-muted">{roleMappings.length} mappings</p>
            <button
              onClick={() => openRoleModal()}
              className="btn-primary-min flex items-center gap-2"
              disabled={competencies.length === 0}
            >
              <Plus className="w-4 h-4" />
              New mapping
            </button>
          </div>
          {competencies.length === 0 ? (
            <div className="card-min-ghost p-6 text-sm text-app-muted">
              Create competencies before adding role mappings.
            </div>
          ) : roleMappings.length === 0 ? (
            <div className="card-min-ghost p-6 text-sm text-app-muted">
              No role mappings yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {roleMappings.map((mapping) => (
                <div key={mapping.id} className="card-min p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-app-muted" />
                        <h3 className="text-base font-semibold text-app-text">{mapping.roleName}</h3>
                      </div>
                      <p className="text-xs text-app-muted mt-1">
                        {getCompetencyName(mapping.competencyId)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                          Required: {mapping.requiredLevel}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full ${
                            (mapping.priority ?? 'mandatory') === 'mandatory'
                              ? 'bg-rose-500/15 text-rose-500'
                              : (mapping.priority ?? 'recommended') === 'optional'
                                ? 'bg-gray-500/15 text-gray-500'
                                : 'bg-sky-500/15 text-sky-500'
                          }`}
                        >
                          {(mapping.priority ?? (mapping.isMandatory ? 'mandatory' : 'recommended')).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openRoleModal(mapping)}
                        className="p-2 rounded-lg hover:bg-app-surface-2"
                        aria-label={`Edit mapping for ${mapping.roleName}`}
                        title={`Edit ${mapping.roleName}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete('role', mapping.id)}
                        className="p-2 rounded-lg hover:bg-app-surface-2 text-red-500"
                        aria-label={`Delete mapping for ${mapping.roleName}`}
                        title={`Delete ${mapping.roleName}`}
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

        <AdminSection
          title="Compliance Policies"
          subtitle="Tie competencies to compliance requirements and renewal cycles."
          isDarkMode={themeDark}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm text-app-muted">{policies.length} policies</p>
            <button
              onClick={() => openPolicyModal()}
              className="btn-primary-min flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New policy
            </button>
          </div>
          {policies.length === 0 ? (
            <div className="card-min-ghost p-6 text-sm text-app-muted">
              No compliance policies added yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {policies.map((policy) => (
                <div key={policy.id} className="card-min p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-app-muted" />
                        <h3 className="text-base font-semibold text-app-text">{policy.name}</h3>
                      </div>
                      <p className="text-xs text-app-muted mt-1">
                        {policy.description || 'No description'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                          {policy.regulation.toUpperCase()}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                          Due every {policy.dueDays} days
                        </span>
                        {policy.recurrenceDays && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                            Recurs {policy.recurrenceDays} days
                          </span>
                        )}
                        {(policy.linkedCompetencyIds?.length ?? 0) > 0 && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                            {policy.linkedCompetencyIds?.length} competencies
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full ${policy.isActive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}
                        >
                          {policy.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openPolicyModal(policy)}
                        className="p-2 rounded-lg hover:bg-app-surface-2"
                        aria-label={`Edit policy ${policy.name}`}
                        title={`Edit ${policy.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete('policy', policy.id)}
                        className="p-2 rounded-lg hover:bg-app-surface-2 text-red-500"
                        aria-label={`Delete policy ${policy.name}`}
                        title={`Delete ${policy.name}`}
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

      {activeModal === 'framework' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg card-min p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-app-text">
                {editingFramework ? 'Edit Framework' : 'Create Framework'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-app-surface-2"
                aria-label="Close framework modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="framework-name" className="text-sm font-medium text-app-text">
                  Name
                </label>
                <input
                  id="framework-name"
                  value={frameworkForm.name}
                  onChange={(e) => setFrameworkForm({ ...frameworkForm, name: e.target.value })}
                  className="input-min w-full mt-1"
                />
              </div>
              <div>
                <label htmlFor="framework-description" className="text-sm font-medium text-app-text">
                  Description
                </label>
                <textarea
                  id="framework-description"
                  value={frameworkForm.description}
                  onChange={(e) => setFrameworkForm({ ...frameworkForm, description: e.target.value })}
                  className="input-min w-full mt-1 min-h-[96px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="framework-version" className="text-sm font-medium text-app-text">
                    Version
                  </label>
                  <input
                    id="framework-version"
                    value={frameworkForm.version}
                    onChange={(e) => setFrameworkForm({ ...frameworkForm, version: e.target.value })}
                    className="input-min w-full mt-1"
                  />
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <input
                    id="framework-active"
                    type="checkbox"
                    checked={frameworkForm.isActive}
                    onChange={(e) => setFrameworkForm({ ...frameworkForm, isActive: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="framework-active" className="text-sm text-app-text">
                    Active
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="btn-secondary-min">Cancel</button>
              <button
                onClick={handleSaveFramework}
                disabled={isSaving || !frameworkForm.name.trim()}
                className="btn-primary-min flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'competency' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-xl card-min p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-app-text">
                {editingCompetency ? 'Edit Competency' : 'Create Competency'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-app-surface-2"
                aria-label="Close competency modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="competency-name" className="text-sm font-medium text-app-text">
                  Name
                </label>
                <input
                  id="competency-name"
                  value={competencyForm.name}
                  onChange={(e) => setCompetencyForm({ ...competencyForm, name: e.target.value })}
                  className="input-min w-full mt-1"
                />
              </div>
              <div>
                <label htmlFor="competency-description" className="text-sm font-medium text-app-text">
                  Description
                </label>
                <textarea
                  id="competency-description"
                  value={competencyForm.description}
                  onChange={(e) => setCompetencyForm({ ...competencyForm, description: e.target.value })}
                  className="input-min w-full mt-1 min-h-[96px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="competency-framework" className="text-sm font-medium text-app-text">
                    Framework
                  </label>
                  <select
                    id="competency-framework"
                    value={competencyForm.frameworkId}
                    onChange={(e) => setCompetencyForm({ ...competencyForm, frameworkId: e.target.value })}
                    className="input-min w-full mt-1"
                  >
                    <option value="">Unassigned</option>
                    {frameworkOptions.map(framework => (
                      <option key={framework.id} value={framework.id}>{framework.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="competency-parent" className="text-sm font-medium text-app-text">
                    Parent Competency
                  </label>
                  <select
                    id="competency-parent"
                    value={competencyForm.parentId}
                    onChange={(e) => setCompetencyForm({ ...competencyForm, parentId: e.target.value })}
                    className="input-min w-full mt-1"
                  >
                    <option value="">None</option>
                    {parentOptions.map(parent => (
                      <option key={parent.id} value={parent.id}>{parent.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="competency-level" className="text-sm font-medium text-app-text">
                    Required Level
                  </label>
                  <select
                    id="competency-level"
                    value={competencyForm.level}
                    onChange={(e) => setCompetencyForm({ ...competencyForm, level: e.target.value })}
                    className="input-min w-full mt-1"
                  >
                    {LEVEL_OPTIONS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="competency-bloom" className="text-sm font-medium text-app-text">
                    Bloom Target
                  </label>
                  <select
                    id="competency-bloom"
                    value={competencyForm.bloomLevelTarget}
                    onChange={(e) => setCompetencyForm({ ...competencyForm, bloomLevelTarget: e.target.value })}
                    className="input-min w-full mt-1"
                  >
                    <option value="">Not set</option>
                    {BLOOM_OPTIONS.map(level => (
                      <option key={level} value={level}>L{level}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-app-text">
                    Required Modalities
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MODALITY_OPTIONS.map((modality) => {
                      const active = competencyForm.requiredModalities.includes(modality);
                      return (
                        <button
                          key={modality}
                          type="button"
                          onClick={() =>
                            setCompetencyForm({
                              ...competencyForm,
                              requiredModalities: active
                                ? competencyForm.requiredModalities.filter(m => m !== modality)
                                : [...competencyForm.requiredModalities, modality]
                            })
                          }
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-app-border text-app-text hover:bg-app-surface-2'
                          }`}
                        >
                          {modality.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label htmlFor="competency-threshold" className="text-sm font-medium text-app-text">
                    Threshold Score (%)
                  </label>
                  <input
                    id="competency-threshold"
                    type="number"
                    min={0}
                    max={100}
                    value={competencyForm.thresholdScore}
                    onChange={(e) => setCompetencyForm({ ...competencyForm, thresholdScore: e.target.value })}
                    className="input-min w-full mt-1"
                    placeholder="e.g. 75"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="btn-secondary-min">Cancel</button>
              <button
                onClick={handleSaveCompetency}
                disabled={isSaving || !competencyForm.name.trim()}
                className="btn-primary-min flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'role' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg card-min p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-app-text">
                {editingRole ? 'Edit Role Mapping' : 'Create Role Mapping'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-app-surface-2"
                aria-label="Close role mapping modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="role-competency" className="text-sm font-medium text-app-text">
                  Competency
                </label>
                <select
                  id="role-competency"
                  value={roleForm.competencyId}
                  onChange={(e) => setRoleForm({ ...roleForm, competencyId: e.target.value })}
                  className="input-min w-full mt-1"
                >
                  <option value="">Select competency</option>
                  {competencyOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="role-name" className="text-sm font-medium text-app-text">
                  Role Name
                </label>
                <input
                  id="role-name"
                  value={roleForm.roleName}
                  onChange={(e) => setRoleForm({ ...roleForm, roleName: e.target.value })}
                  className="input-min w-full mt-1"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="role-required-level" className="text-sm font-medium text-app-text">
                    Required Level
                  </label>
                  <select
                    id="role-required-level"
                    value={roleForm.requiredLevel}
                    onChange={(e) => setRoleForm({ ...roleForm, requiredLevel: e.target.value })}
                    className="input-min w-full mt-1"
                  >
                    {LEVEL_OPTIONS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="role-priority" className="text-sm font-medium text-app-text">
                    Priority
                  </label>
                  <select
                    id="role-priority"
                    value={roleForm.priority}
                    onChange={(e) => setRoleForm({
                      ...roleForm,
                      priority: e.target.value as 'mandatory' | 'recommended' | 'optional',
                      isMandatory: e.target.value === 'mandatory'
                    })}
                    className="input-min w-full mt-1"
                  >
                    {PRIORITY_OPTIONS.map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="btn-secondary-min">Cancel</button>
              <button
                onClick={handleSaveRole}
                disabled={isSaving || !roleForm.competencyId || !roleForm.roleName.trim()}
                className="btn-primary-min flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'policy' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-2xl card-min p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-app-text">
                {editingPolicy ? 'Edit Compliance Policy' : 'Create Compliance Policy'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-app-surface-2"
                aria-label="Close compliance policy modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="policy-name" className="text-sm font-medium text-app-text">
                  Policy name
                </label>
                <input
                  id="policy-name"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  className="input-min w-full mt-1"
                />
              </div>
              <div>
                <label htmlFor="policy-description" className="text-sm font-medium text-app-text">
                  Description
                </label>
                <textarea
                  id="policy-description"
                  value={policyForm.description}
                  onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                  className="input-min w-full mt-1 min-h-[96px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="policy-regulation" className="text-sm font-medium text-app-text">
                    Regulation
                  </label>
                  <select
                    id="policy-regulation"
                    value={policyForm.regulation}
                    onChange={(e) => setPolicyForm({ ...policyForm, regulation: e.target.value })}
                    className="input-min w-full mt-1"
                  >
                    {REGULATION_OPTIONS.map(option => (
                      <option key={option} value={option}>{option.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <input
                    id="policy-active"
                    type="checkbox"
                    checked={policyForm.isActive}
                    onChange={(e) => setPolicyForm({ ...policyForm, isActive: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="policy-active" className="text-sm text-app-text">
                    Active
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="policy-due" className="text-sm font-medium text-app-text">
                    Due days
                  </label>
                  <input
                    id="policy-due"
                    type="number"
                    min={1}
                    value={policyForm.dueDays}
                    onChange={(e) => setPolicyForm({ ...policyForm, dueDays: e.target.value })}
                    className="input-min w-full mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="policy-recurrence" className="text-sm font-medium text-app-text">
                    Recurrence days (optional)
                  </label>
                  <input
                    id="policy-recurrence"
                    type="number"
                    min={1}
                    value={policyForm.recurrenceDays}
                    onChange={(e) => setPolicyForm({ ...policyForm, recurrenceDays: e.target.value })}
                    className="input-min w-full mt-1"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="policy-penalty" className="text-sm font-medium text-app-text">
                  Penalty description
                </label>
                <textarea
                  id="policy-penalty"
                  value={policyForm.penaltyDescription}
                  onChange={(e) => setPolicyForm({ ...policyForm, penaltyDescription: e.target.value })}
                  className="input-min w-full mt-1 min-h-[84px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="policy-linked-course" className="text-sm font-medium text-app-text">
                    Linked course ID
                  </label>
                  <input
                    id="policy-linked-course"
                    value={policyForm.linkedCourse}
                    onChange={(e) => setPolicyForm({ ...policyForm, linkedCourse: e.target.value })}
                    className="input-min w-full mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="policy-linked-assessment" className="text-sm font-medium text-app-text">
                    Linked assessment ID
                  </label>
                  <input
                    id="policy-linked-assessment"
                    value={policyForm.linkedAssessment}
                    onChange={(e) => setPolicyForm({ ...policyForm, linkedAssessment: e.target.value })}
                    className="input-min w-full mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-app-text">Linked competencies</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {competencyOptions.map((option) => {
                    const active = policyForm.linkedCompetencyIds.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPolicyForm({
                          ...policyForm,
                          linkedCompetencyIds: active
                            ? policyForm.linkedCompetencyIds.filter(id => id !== option.id)
                            : [...policyForm.linkedCompetencyIds, option.id]
                        })}
                        className={`px-3 py-1.5 rounded-full text-xs border ${
                          active
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                            : 'border-app-border text-app-muted hover:bg-app-surface-2'
                        }`}
                      >
                        {option.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="btn-secondary-min">Cancel</button>
              <button
                onClick={handleSavePolicy}
                disabled={isSaving || !policyForm.name.trim()}
                className="btn-primary-min flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCompetencies;
