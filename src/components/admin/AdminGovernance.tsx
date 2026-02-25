import React, { useEffect, useState } from 'react';
import { Shield, Plus } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import governanceService from '../../services/governanceService';

interface AdminGovernanceProps {
  isDarkMode?: boolean;
}

const AdminGovernance: React.FC<AdminGovernanceProps> = ({ isDarkMode = false }) => {
  const { currentOrg } = useLMSStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';

  const [policies, setPolicies] = useState<any[]>([]);
  const [explainability, setExplainability] = useState<any[]>([]);
  const [biasScans, setBiasScans] = useState<any[]>([]);
  const [modelVersions, setModelVersions] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [isRunningBias, setIsRunningBias] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [policyForm, setPolicyForm] = useState({ name: '', policy_type: 'ai_usage', description: '' });
  const [modelForm, setModelForm] = useState({ model_name: 'rl_policy', version: '', status: 'staged' });
  const [overrideForm, setOverrideForm] = useState({ target_type: 'enrollment', target_id: '', action: 'force_unlock', reason: '' });

  useEffect(() => {
    if (!currentOrg?.id) return;
    governanceService.listPolicies(currentOrg.id).then(setPolicies);
    governanceService.listExplainabilityLogs(currentOrg.id).then(setExplainability);
    governanceService.listBiasScans(currentOrg.id).then(setBiasScans);
    governanceService.listModelVersions(currentOrg.id).then(setModelVersions);
    governanceService.listOverrides(currentOrg.id).then(setOverrides);
  }, [currentOrg?.id]);

  const handleCreatePolicy = async () => {
    if (!currentOrg?.id || !policyForm.name.trim()) return;
    setIsSavingPolicy(true);
    try {
      await governanceService.createPolicy(currentOrg.id, {
        name: policyForm.name.trim(),
        policy_type: policyForm.policy_type,
        description: policyForm.description.trim(),
        content: {},
        is_active: true,
      } as any);
      setPolicyForm({ name: '', policy_type: 'ai_usage', description: '' });
      setPolicies(await governanceService.listPolicies(currentOrg.id));
      setShowPolicyForm(false);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleRunBiasScan = async () => {
    if (!currentOrg?.id) return;
    setIsRunningBias(true);
    try {
      const created = await governanceService.createBiasScan(currentOrg.id, {
        name: `Bias Scan ${new Date().toISOString()}`,
        status: 'queued',
        results: {},
      } as any);
      await governanceService.runBiasScan(currentOrg.id, created.id);
      setBiasScans(await governanceService.listBiasScans(currentOrg.id));
    } finally {
      setIsRunningBias(false);
    }
  };

  const handleCreateModelVersion = async () => {
    if (!currentOrg?.id || !modelForm.model_name.trim() || !modelForm.version.trim()) return;
    setIsSavingModel(true);
    try {
      await governanceService.createModelVersion(currentOrg.id, {
        model_name: modelForm.model_name.trim(),
        version: modelForm.version.trim(),
        status: modelForm.status,
        metrics: {},
      } as any);
      setModelForm({ model_name: 'rl_policy', version: '', status: 'staged' });
      setModelVersions(await governanceService.listModelVersions(currentOrg.id));
    } finally {
      setIsSavingModel(false);
    }
  };

  const handleCreateOverride = async () => {
    if (!currentOrg?.id || !overrideForm.target_id.trim() || !overrideForm.action.trim()) return;
    setIsSavingOverride(true);
    try {
      await governanceService.createOverride(currentOrg.id, {
        target_type: overrideForm.target_type,
        target_id: overrideForm.target_id.trim(),
        action: overrideForm.action.trim(),
        reason: overrideForm.reason.trim(),
        metadata: {},
      } as any);
      setOverrideForm({ target_type: 'enrollment', target_id: '', action: 'force_unlock', reason: '' });
      setOverrides(await governanceService.listOverrides(currentOrg.id));
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleRollbackVersion = async (modelVersionId: string) => {
    if (!currentOrg?.id) return;
    await governanceService.rollbackModelVersion(currentOrg.id, modelVersionId);
    setModelVersions(await governanceService.listModelVersions(currentOrg.id));
  };

  return (
    <div className={`space-y-6 ${themeDark ? 'text-white' : 'text-gray-900'}`}>
      <AdminPageHeader
        title="AI Governance"
        subtitle="Policy, explainability, bias monitoring, and overrides"
        icon={<Shield className="w-6 h-6" />}
        isDarkMode={themeDark}
        actions={(
          <button
            onClick={() => setShowPolicyForm(prev => !prev)}
            className="btn-primary-min flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Policy
          </button>
        )}
      />

      {showPolicyForm && (
        <AdminSection title="Create Policy" subtitle="Add AI usage or retention policies" isDarkMode={themeDark}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={policyForm.name}
              onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
              className="input-min"
              placeholder="Policy name"
            />
            <select
              value={policyForm.policy_type}
              onChange={(e) => setPolicyForm({ ...policyForm, policy_type: e.target.value })}
              className="input-min"
            >
              <option value="ai_usage">AI Usage</option>
              <option value="data_retention">Data Retention</option>
              <option value="model_governance">Model Governance</option>
            </select>
            <input
              value={policyForm.description}
              onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
              className="input-min"
              placeholder="Description"
            />
          </div>
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={handleCreatePolicy}
              disabled={isSavingPolicy || !policyForm.name.trim()}
              className="btn-primary-min disabled:opacity-60"
            >
              {isSavingPolicy ? 'Saving…' : 'Save Policy'}
            </button>
          </div>
        </AdminSection>
      )}

      <AdminSection title="Policies" subtitle="Active governance policies" isDarkMode={themeDark}>
        {policies.length === 0 ? (
          <div className="text-sm text-app-muted">No policies found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map(policy => (
              <div key={policy.id} className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <p className="text-sm font-semibold">{policy.name}</p>
                <p className="text-xs text-app-muted">{policy.policy_type}</p>
                <p className="text-xs mt-2">{policy.description || '—'}</p>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection title="Explainability Logs" subtitle="Recent AI decision traces" isDarkMode={themeDark}>
        {explainability.length === 0 ? (
          <div className="text-sm text-app-muted">No explainability logs yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={themeDark ? 'text-gray-400' : 'text-gray-500'}>
                  <th className="text-left py-2">Model</th>
                  <th className="text-left py-2">Decision</th>
                  <th className="text-left py-2">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {explainability.map(log => (
                  <tr key={log.id} className={themeDark ? 'border-t border-gray-700' : 'border-t border-gray-200'}>
                    <td className="py-2">{log.model_name}</td>
                    <td className="py-2">{log.decision_type}</td>
                    <td className="py-2">{JSON.stringify(log.rationale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection title="Bias Scans" subtitle="Fairness monitoring results" isDarkMode={themeDark}>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleRunBiasScan}
            className="btn-primary-min disabled:opacity-60"
            disabled={isRunningBias}
          >
            {isRunningBias ? 'Running…' : 'Run Bias Scan'}
          </button>
        </div>
        {biasScans.length === 0 ? (
          <div className="text-sm text-app-muted">No bias scans recorded.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {biasScans.map(scan => (
              <div key={scan.id} className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <p className="text-sm font-semibold">{scan.name}</p>
                <p className="text-xs text-app-muted">Status: {scan.status}</p>
                <p className="text-xs mt-2">{JSON.stringify(scan.results)}</p>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection title="Model Versions" subtitle="Active model registry" isDarkMode={themeDark}>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            value={modelForm.model_name}
            onChange={(e) => setModelForm({ ...modelForm, model_name: e.target.value })}
            className="input-min"
            placeholder="Model name"
          />
          <input
            value={modelForm.version}
            onChange={(e) => setModelForm({ ...modelForm, version: e.target.value })}
            className="input-min"
            placeholder="Version"
          />
          <select
            value={modelForm.status}
            onChange={(e) => setModelForm({ ...modelForm, status: e.target.value })}
            className="input-min"
          >
            <option value="staged">Staged</option>
            <option value="active">Active</option>
            <option value="deprecated">Deprecated</option>
            <option value="rolled_back">Rolled Back</option>
          </select>
          <button
            type="button"
            onClick={handleCreateModelVersion}
            className="btn-primary-min disabled:opacity-60"
            disabled={isSavingModel || !modelForm.version.trim()}
          >
            {isSavingModel ? 'Saving…' : 'Add Version'}
          </button>
        </div>
        {modelVersions.length === 0 ? (
          <div className="text-sm text-app-muted">No model versions tracked.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modelVersions.map(version => (
              <div key={version.id} className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{version.model_name}</p>
                  <button
                    type="button"
                    onClick={() => handleRollbackVersion(version.id)}
                    className="btn-secondary-min text-xs"
                  >
                    Rollback
                  </button>
                </div>
                <p className="text-xs text-app-muted">Version {version.version} · {version.status}</p>
                <p className="text-xs mt-2">{JSON.stringify(version.metrics)}</p>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection title="Human Overrides" subtitle="Manual intervention records" isDarkMode={themeDark}>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
          <select
            value={overrideForm.target_type}
            onChange={(e) => setOverrideForm({ ...overrideForm, target_type: e.target.value })}
            className="input-min"
          >
            <option value="enrollment">Enrollment</option>
            <option value="assessment">Assessment</option>
            <option value="recommendation">Recommendation</option>
          </select>
          <input
            value={overrideForm.target_id}
            onChange={(e) => setOverrideForm({ ...overrideForm, target_id: e.target.value })}
            className="input-min"
            placeholder="Target ID"
          />
          <input
            value={overrideForm.action}
            onChange={(e) => setOverrideForm({ ...overrideForm, action: e.target.value })}
            className="input-min"
            placeholder="Action"
          />
          <input
            value={overrideForm.reason}
            onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
            className="input-min"
            placeholder="Reason"
          />
          <button
            type="button"
            onClick={handleCreateOverride}
            className="btn-primary-min disabled:opacity-60"
            disabled={isSavingOverride || !overrideForm.target_id.trim()}
          >
            {isSavingOverride ? 'Saving…' : 'Create Override'}
          </button>
        </div>
        {overrides.length === 0 ? (
          <div className="text-sm text-app-muted">No overrides yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={themeDark ? 'text-gray-400' : 'text-gray-500'}>
                  <th className="text-left py-2">Target</th>
                  <th className="text-left py-2">Action</th>
                  <th className="text-left py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map(override => (
                  <tr key={override.id} className={themeDark ? 'border-t border-gray-700' : 'border-t border-gray-200'}>
                    <td className="py-2">{override.target_type} {override.target_id}</td>
                    <td className="py-2">{override.action}</td>
                    <td className="py-2">{override.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </div>
  );
};

export default AdminGovernance;
