import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import adaptiveRecommendationService from '../../services/adaptiveRecommendationService';
import adaptivePolicyService from '../../services/adaptivePolicyService';
import interventionService from '../../services/interventionService';

interface AdminPredictionsProps {
  isDarkMode?: boolean;
}

const AdminPredictions: React.FC<AdminPredictionsProps> = ({ isDarkMode = false }) => {
  const { currentOrg, members, loadMembers } = useLMSStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';

  const [failureRisks, setFailureRisks] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [decisionLogs, setDecisionLogs] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [interventionTarget, setInterventionTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg?.id) return;
    loadMembers();
    adaptiveRecommendationService.listFailureRisks(currentOrg.id).then(setFailureRisks);
    adaptivePolicyService.listPolicies(currentOrg.id).then(setPolicies);
    adaptivePolicyService.listDecisionLogs(currentOrg.id).then(setDecisionLogs);
    interventionService.listForOrg(currentOrg.id).then(setInterventions);
  }, [currentOrg?.id, loadMembers]);

  const refreshSignals = async () => {
    if (!currentOrg?.id) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        adaptiveRecommendationService.recalcFailureRisks(currentOrg.id),
        adaptiveRecommendationService.recalcForOrg(currentOrg.id),
        adaptivePolicyService.optimize(currentOrg.id),
      ]);
    } finally {
      setIsRefreshing(false);
      adaptiveRecommendationService.listFailureRisks(currentOrg.id).then(setFailureRisks);
      adaptivePolicyService.listDecisionLogs(currentOrg.id).then(setDecisionLogs);
    }
  };

  const runSimulation = async () => {
    if (!currentOrg?.id) return;
    setIsSimulating(true);
    try {
      await adaptivePolicyService.simulate(currentOrg.id, 40);
      await adaptivePolicyService.optimize(currentOrg.id);
    } finally {
      setIsSimulating(false);
      adaptivePolicyService.listPolicies(currentOrg.id).then(setPolicies);
      adaptivePolicyService.listDecisionLogs(currentOrg.id).then(setDecisionLogs);
    }
  };

  const atRiskLearners = useMemo(() => {
    return [...failureRisks].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
  }, [failureRisks]);

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.userId === userId);
    return member?.name || member?.email || userId;
  };

  const triggerIntervention = async (risk: any) => {
    if (!currentOrg?.id || !risk?.user) return;
    setInterventionTarget(risk.id);
    try {
      await interventionService.create(currentOrg.id, {
        user: risk.user,
        action_type: 'manual_intervention',
        status: 'executed',
        outcome: {
          risk_score: risk.risk_score,
          risk_level: risk.risk_level,
          reasons: risk.reasons || [],
          course: risk.course,
        },
      });
      const refreshed = await interventionService.listForOrg(currentOrg.id);
      setInterventions(refreshed);
    } finally {
      setInterventionTarget(null);
    }
  };

  return (
    <div className={`space-y-6 ${themeDark ? 'text-white' : 'text-gray-900'}`}>
      <AdminPageHeader
        title="Predictive Analytics"
        subtitle="At-risk learners, policy monitoring, and interventions"
        icon={<AlertTriangle className="w-6 h-6" />}
        isDarkMode={themeDark}
        actions={(
          <div className="flex items-center gap-2">
            <button
              onClick={runSimulation}
              className="btn-secondary-min"
              disabled={isSimulating}
            >
              {isSimulating ? 'Simulating' : 'Simulate Policies'}
            </button>
            <button
              onClick={refreshSignals}
              className="btn-primary-min flex items-center gap-2"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing' : 'Refresh Signals'}
            </button>
          </div>
        )}
      />

      <AdminSection title="At-Risk Learners" subtitle="Failure risk snapshots and reasons" isDarkMode={themeDark}>
        {atRiskLearners.length === 0 ? (
          <div className="text-sm text-app-muted">No risk snapshots available.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={themeDark ? 'text-gray-400' : 'text-gray-500'}>
                  <th className="text-left py-2">Learner</th>
                  <th className="text-left py-2">Course</th>
                  <th className="text-left py-2">Risk</th>
                  <th className="text-left py-2">Reasons</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {atRiskLearners.map((risk) => (
                  <tr key={risk.id} className={themeDark ? 'border-t border-gray-700' : 'border-t border-gray-200'}>
                    <td className="py-2">{getMemberName(risk.user)}</td>
                    <td className="py-2">{risk.course}</td>
                    <td className="py-2">{Math.round((risk.risk_score ?? 0) * 100)}% ({risk.risk_level})</td>
                    <td className="py-2">{risk.reasons?.join(', ') || '—'}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => triggerIntervention(risk)}
                        className="px-2.5 py-1 rounded-md text-xs bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60"
                        disabled={interventionTarget === risk.id}
                      >
                        {interventionTarget === risk.id ? 'Triggering…' : 'Trigger'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection title="Adaptive Engine Monitor" subtitle="Policy status and recent decisions" isDarkMode={themeDark}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold">Policies</h3>
            </div>
            {policies.length === 0 ? (
              <p className="text-xs text-app-muted">No adaptive policies configured.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {policies.map(policy => (
                  <li key={policy.id} className="border-b border-gray-200/20 pb-2">
                    <div className="flex items-center justify-between">
                      <span>{policy.name}</span>
                      <span className={themeDark ? 'text-gray-400' : 'text-gray-500'}>{policy.status}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-app-muted">
                      Avg reward: {Number((policy.config as any)?.simulation?.average_reward ?? (policy.config as any)?.bandit?.q_values?.recommend_course ?? 0).toFixed(2)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold">Recent Decisions</h3>
            </div>
            {decisionLogs.length === 0 ? (
              <p className="text-xs text-app-muted">No decision logs yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {decisionLogs.slice(0, 6).map(log => (
                  <li key={log.id} className="flex items-center justify-between">
                    <span>{log.action_type}</span>
                    <span className={themeDark ? 'text-gray-400' : 'text-gray-500'}>
                      {log.created_at ? new Date(log.created_at).toLocaleDateString() : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Intervention Log" subtitle="Actions taken and outcomes" isDarkMode={themeDark}>
        {interventions.length === 0 ? (
          <div className="text-sm text-app-muted">No interventions recorded yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={themeDark ? 'text-gray-400' : 'text-gray-500'}>
                  <th className="text-left py-2">Learner</th>
                  <th className="text-left py-2">Action</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((log) => (
                  <tr key={log.id} className={themeDark ? 'border-t border-gray-700' : 'border-t border-gray-200'}>
                    <td className="py-2">{getMemberName(log.user)}</td>
                    <td className="py-2">{log.action_type}</td>
                    <td className="py-2">{log.status}</td>
                    <td className="py-2">{log.outcome ? JSON.stringify(log.outcome) : '—'}</td>
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

export default AdminPredictions;
