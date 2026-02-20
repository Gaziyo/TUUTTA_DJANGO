import React from 'react';
import { Link } from 'react-router-dom';
import { useGuidedPipeline } from '../../../context/GuidedPipelineContext';

const ImpactPage: React.FC = () => {
  const { program } = useGuidedPipeline();

  const canViewImpact = Boolean(program && program.implement);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-400">Impact</div>
      <h2 className="mt-2 text-2xl font-semibold text-gray-900">Program impact</h2>
      <p className="mt-2 text-sm text-gray-600">
        Track compliance, progress, and at‑risk learners after launch.
      </p>

      {!canViewImpact && (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          Launch the program to unlock impact dashboards.
        </div>
      )}

      {canViewImpact && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-400">Enrollments</div>
            <div className="mt-1 font-semibold">{program?.implement?.enrollmentCount ?? 0} learners</div>
            <div className="mt-1 text-xs text-gray-500">
              {(program?.implement?.cohorts ?? []).join(', ') || 'No cohorts yet.'}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-400">Metrics</div>
            <div className="mt-1 text-xs text-gray-500">
              {(program?.evaluate?.metrics ?? []).length
                ? program?.evaluate?.metrics.join(' • ')
                : 'No metrics defined yet.'}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Link
          to="/admin/genie-guided"
          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
        >
          Back to workspace
        </Link>
        <button
          className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canViewImpact}
        >
          View dashboards
        </button>
      </div>
    </div>
  );
};

export default ImpactPage;
