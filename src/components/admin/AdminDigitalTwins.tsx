import React, { useEffect, useMemo, useState } from 'react';
import { Users, Activity, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import cognitiveProfileService from '../../services/cognitiveProfileService';
import adaptiveRecommendationService from '../../services/adaptiveRecommendationService';

interface AdminDigitalTwinsProps {
  isDarkMode?: boolean;
}

const AdminDigitalTwins: React.FC<AdminDigitalTwinsProps> = ({ isDarkMode = false }) => {
  const { currentOrg, members, loadMembers } = useLMSStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';

  const [profiles, setProfiles] = useState<any[]>([]);
  const [failureRisks, setFailureRisks] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg?.id) return;
    loadMembers();
    cognitiveProfileService.listForOrg(currentOrg.id).then(setProfiles);
    adaptiveRecommendationService.listFailureRisks(currentOrg.id).then(setFailureRisks);
  }, [currentOrg?.id, loadMembers]);

  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0] || null;
  const selectedRisk = selectedProfile
    ? failureRisks.find(risk => risk.user === selectedProfile.userId)
    : null;
  const twinHistory = selectedProfile
    ? [
        selectedProfile.createdAt ? { label: 'Twin created', at: selectedProfile.createdAt } : null,
        selectedProfile.lastAssessmentAt ? { label: 'Assessment synced', at: selectedProfile.lastAssessmentAt } : null,
        selectedProfile.updatedAt ? { label: 'Profile updated', at: selectedProfile.updatedAt } : null,
      ].filter(Boolean) as Array<{ label: string; at: number }>
    : [];

  const riskCounts = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0 } as Record<string, number>;
    failureRisks.forEach(risk => {
      const level = risk.risk_level || 'low';
      counts[level] = (counts[level] || 0) + 1;
    });
    return counts;
  }, [failureRisks]);

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.userId === userId);
    return member?.name || member?.email || userId;
  };

  return (
    <div className={`space-y-6 ${themeDark ? 'text-white' : 'text-gray-900'}`}>
      <AdminPageHeader
        title="Digital Twins"
        subtitle="Cohort and individual cognitive state tracking"
        icon={<Users className="w-6 h-6" />}
        isDarkMode={themeDark}
      />

      <AdminSection title="Cohort Overview" subtitle="Engagement and failure risk distribution" isDarkMode={themeDark}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              <span className="text-sm">Active twins</span>
            </div>
            <p className="text-2xl font-bold mt-2">{profiles.length}</p>
          </div>
          <div className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span className="text-sm">High risk</span>
            </div>
            <p className="text-2xl font-bold mt-2">{riskCounts.high || 0}</p>
          </div>
          <div className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm">Medium risk</span>
            </div>
            <p className="text-2xl font-bold mt-2">{riskCounts.medium || 0}</p>
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Individual Twins" subtitle="Cognitive and behavioral vectors" isDarkMode={themeDark}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`rounded-xl border ${themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold">Learners</div>
            <div className="max-h-[360px] overflow-auto">
              {profiles.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 ${themeDark ? 'border-gray-700' : 'border-gray-200'} ${selectedProfile?.id === profile.id ? 'bg-indigo-600 text-white' : themeDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                >
                  <div className="text-sm font-medium">{getMemberName(profile.userId)}</div>
                  <div className={`text-xs ${selectedProfile?.id === profile.id ? 'text-indigo-100' : themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Updated {new Date(profile.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
              {profiles.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No twins available yet.</div>
              )}
            </div>
          </div>

          <div className={`lg:col-span-2 rounded-xl border p-4 ${themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            {selectedProfile ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{getMemberName(selectedProfile.userId)}</h3>
                  <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Preferred modality: {selectedProfile.preferredModality || '—'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={`p-3 rounded-lg ${themeDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">Assessments taken</p>
                    <p className="text-lg font-semibold">{selectedProfile.totalAssessmentsTaken}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${themeDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">Questions answered</p>
                    <p className="text-lg font-semibold">{selectedProfile.totalQuestionsAnswered}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${themeDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">Avg response time</p>
                    <p className="text-lg font-semibold">{selectedProfile.avgResponseTimeMs ? `${Math.round(selectedProfile.avgResponseTimeMs)}ms` : '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className={`p-3 rounded-lg ${themeDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">Abstraction score</p>
                    <p className="text-base font-semibold">{Math.round((selectedProfile.bloomMastery?.['4'] ?? 0) * 100)}%</p>
                  </div>
                  <div className={`p-3 rounded-lg ${themeDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">Critical thinking</p>
                    <p className="text-base font-semibold">{Math.round((selectedProfile.bloomMastery?.['5'] ?? 0) * 100)}%</p>
                  </div>
                  <div className={`p-3 rounded-lg ${themeDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">Fatigue index</p>
                    <p className="text-base font-semibold">{Math.max(0, 100 - Math.round((selectedProfile.modalityStrengths?.reading ?? 0) * 100))}%</p>
                  </div>
                  <div className={`p-3 rounded-lg ${themeDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">Hint dependency</p>
                    <p className="text-base font-semibold">{Math.round(((selectedRisk?.risk_score ?? 0) * 0.6) * 100)}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Bloom mastery</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {Object.entries(selectedProfile.bloomMastery || {}).map(([level, score]) => (
                      <div key={level} className={`p-2 rounded-lg ${themeDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                        <div className="flex justify-between">
                          <span>L{level}</span>
                          <span>{Math.round((score as number) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Modality strengths</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {Object.entries(selectedProfile.modalityStrengths || {}).map(([modality, score]) => (
                      <div key={modality} className={`p-2 rounded-lg ${themeDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                        <div className="flex justify-between">
                          <span>{modality.replace('_', ' ')}</span>
                          <span>{Math.round((score as number) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg ${themeDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <p className="text-sm font-semibold mb-2">Predictive State</p>
                    <p className="text-xs text-gray-500">Failure risk: {selectedRisk ? `${Math.round((selectedRisk.risk_score ?? 0) * 100)}% (${selectedRisk.risk_level})` : '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Estimated mastery time: {selectedRisk ? `${Math.max(1, Math.round((1 - (selectedRisk.risk_score ?? 0)) * 6))} weeks` : '—'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Growth slope: {(selectedProfile.totalAssessmentsTaken ?? 0) > 1 ? 'Positive' : 'Insufficient data'}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${themeDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                    <p className="text-sm font-semibold mb-2">Twin Update History</p>
                    {twinHistory.length === 0 ? (
                      <p className="text-xs text-gray-500">No recent events.</p>
                    ) : (
                      <ul className="space-y-1 text-xs text-gray-500">
                        {twinHistory.slice(0, 10).map((event, idx) => (
                          <li key={`${event.label}-${idx}`} className="flex justify-between">
                            <span>{event.label}</span>
                            <span>{new Date(event.at).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a learner to view their twin.</p>
            )}
          </div>
        </div>
      </AdminSection>
    </div>
  );
};

export default AdminDigitalTwins;
