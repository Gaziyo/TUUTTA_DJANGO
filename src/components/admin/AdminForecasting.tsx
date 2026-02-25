import React, { useEffect, useState } from 'react';
import { LineChart, RefreshCw } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import forecastingService from '../../services/forecastingService';

interface AdminForecastingProps {
  isDarkMode?: boolean;
}

const AdminForecasting: React.FC<AdminForecastingProps> = ({ isDarkMode = false }) => {
  const { currentOrg } = useLMSStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';

  const [workforceIndex, setWorkforceIndex] = useState<any | null>(null);
  const [departmentTrends, setDepartmentTrends] = useState<any[]>([]);
  const [competencyForecasts, setCompetencyForecasts] = useState<any[]>([]);
  const [complianceReadiness, setComplianceReadiness] = useState<any[]>([]);
  const [skillShortages, setSkillShortages] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadForecasts = async () => {
    if (!currentOrg?.id) return;
    const [index, dept, comp, compliance, shortages] = await Promise.all([
      forecastingService.getWorkforceIndex(currentOrg.id),
      forecastingService.listDepartmentTrends(currentOrg.id),
      forecastingService.listCompetencyForecasts(currentOrg.id),
      forecastingService.listComplianceReadiness(currentOrg.id),
      forecastingService.listSkillShortages(currentOrg.id)
    ]);
    setWorkforceIndex(index);
    setDepartmentTrends(dept);
    setCompetencyForecasts(comp);
    setComplianceReadiness(compliance);
    setSkillShortages(shortages);
  };

  useEffect(() => {
    if (!currentOrg?.id) return;
    loadForecasts();
  }, [currentOrg?.id]);

  const handleRefresh = async () => {
    if (!currentOrg?.id) return;
    setIsRefreshing(true);
    try {
      await forecastingService.recalc(currentOrg.id);
    } finally {
      setIsRefreshing(false);
      loadForecasts();
    }
  };

  return (
    <div className={`space-y-6 ${themeDark ? 'text-white' : 'text-gray-900'}`}>
      <AdminPageHeader
        title="Org Forecasting"
        subtitle="Capability forecasts and strategic workforce trends"
        icon={<LineChart className="w-6 h-6" />}
        isDarkMode={themeDark}
        actions={(
          <button
            onClick={handleRefresh}
            className="btn-primary-min flex items-center gap-2"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing' : 'Recalculate'}
          </button>
        )}
      />

      <AdminSection title="Workforce Capability Index" subtitle="Overall readiness score" isDarkMode={themeDark}>
        <div className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <p className="text-sm text-app-muted">Current score</p>
          <p className="text-3xl font-bold mt-2">{workforceIndex?.score ?? '—'}</p>
          <p className="text-xs mt-2 text-app-muted">Trend: {workforceIndex?.trend ? JSON.stringify(workforceIndex.trend) : '—'}</p>
        </div>
      </AdminSection>

      <AdminSection title="Department Bloom Trends" subtitle="Department-level performance" isDarkMode={themeDark}>
        {departmentTrends.length === 0 ? (
          <div className="text-sm text-app-muted">No department trends yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departmentTrends.map((trend) => (
              <div key={trend.id} className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <p className="text-sm font-semibold">Department {trend.department || '—'}</p>
                <p className="text-xs text-app-muted">Bloom L{trend.bloom_level}</p>
                <p className="text-xs mt-2">Trend: {JSON.stringify(trend.trend)}</p>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection title="Competency Trajectory" subtitle="Forecasted mastery over time" isDarkMode={themeDark}>
        {competencyForecasts.length === 0 ? (
          <div className="text-sm text-app-muted">No competency forecasts yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competencyForecasts.map((forecast) => (
              <div key={forecast.id} className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <p className="text-sm font-semibold">Competency {forecast.competency || '—'}</p>
                <p className="text-xs mt-2">Forecast: {JSON.stringify(forecast.forecast)}</p>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection title="Compliance Readiness" subtitle="Audit readiness predictions" isDarkMode={themeDark}>
        {complianceReadiness.length === 0 ? (
          <div className="text-sm text-app-muted">No compliance predictions yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {complianceReadiness.map((prediction) => (
              <div key={prediction.id} className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <p className="text-sm font-semibold">Prediction</p>
                <p className="text-xs mt-2">{JSON.stringify(prediction.prediction)}</p>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection title="Strategic Skill Shortages" subtitle="Critical gaps across the org" isDarkMode={themeDark}>
        {skillShortages.length === 0 ? (
          <div className="text-sm text-app-muted">No skill shortage signals yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skillShortages.map((shortage) => (
              <div key={shortage.id} className={`p-4 rounded-xl ${themeDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <p className="text-sm font-semibold">Shortage</p>
                <p className="text-xs mt-2">{JSON.stringify(shortage.shortage)}</p>
              </div>
            ))}
          </div>
        )}
      </AdminSection>
    </div>
  );
};

export default AdminForecasting;
