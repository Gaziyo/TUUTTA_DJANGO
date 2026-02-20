import React from 'react';
import { Link } from 'react-router-dom';
import { useGuidedPipeline } from '../../../context/GuidedPipelineContext';

const PreviewPage: React.FC = () => {
  const { program } = useGuidedPipeline();

  const canPreview = Boolean(program && program.sources.length > 0);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-400">Preview</div>
      <h2 className="mt-2 text-2xl font-semibold text-gray-900">Preview the learner experience</h2>
      <p className="mt-2 text-sm text-gray-600">
        See how the program will feel to learners before you publish.
      </p>
      {program && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-full border border-purple-200 px-3 py-1 text-[11px] font-semibold text-purple-700"
            onClick={() => {
              const blob = new Blob([JSON.stringify(program, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `guided_program_${program.id}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download program JSON
          </button>
          <button
            className="rounded-full border border-purple-200 px-3 py-1 text-[11px] font-semibold text-purple-700"
            onClick={() => {
              const rows = [
                ['type', 'value'],
                ...program.sources.map(source => ['source', source.name]),
                ...(program.design?.objectives ?? []).map(obj => ['objective', obj])
              ];
              const csv = rows
                .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(','))
                .join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `guided_preview_${program.id}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export preview CSV
          </button>
        </div>
      )}

      {!canPreview && (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          Upload at least one source to unlock preview.
        </div>
      )}

      {canPreview && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-400">Sources</div>
            <div className="mt-1 font-semibold">{program?.sources.length} source(s)</div>
            <div className="mt-1 text-xs text-gray-500">
              {program?.sources.map(source => source.name).join(', ')}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-400">Objectives</div>
            <div className="mt-1 text-xs text-gray-500">
              {(program?.design?.objectives ?? []).length
                ? program?.design?.objectives.join(' • ')
                : 'No objectives defined yet.'}
            </div>
            {typeof program?.design?.objectiveConfidence === 'number' && (
              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Confidence</div>
                <div className="mt-2 h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-purple-500"
                    style={{ width: `${Math.round(program.design.objectiveConfidence * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 12 }).map((_, index) => {
                    const filled = index / 12 < (program.design?.objectiveConfidence ?? 0);
                    return (
                      <span
                        key={index}
                        className={`h-1.5 w-1.5 rounded-full ${filled ? 'bg-purple-500' : 'bg-gray-200'}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-400">Preview simulation</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(() => {
                const fromText = (program?.sources ?? [])
                  .map(source => ({
                    title: source.name,
                    snippet: (source.extractedText ?? '').split(/\n|\r|\./).map(line => line.trim()).filter(Boolean)[0] ?? ''
                  }))
                  .filter(item => item.title);
                const modules = fromText.length
                  ? fromText
                  : (program?.design?.objectives ?? []).map((objective) => ({
                    title: objective,
                    snippet: 'Objective-derived module'
                  }));
                return modules.slice(0, 4).map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
                    <div className="text-[11px] uppercase tracking-wide text-gray-400">Module {index + 1}</div>
                    <div className="mt-1 font-semibold">{item.title}</div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      {item.snippet ? item.snippet.slice(0, 120) : 'Auto-generated preview'}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-400">Learner view</div>
            <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Course menu</div>
                <ul className="mt-3 space-y-2">
                  {(program?.sources.map(source => source.name) ?? program?.design?.objectives ?? [])
                    .slice(0, 4)
                    .map((item, index) => (
                      <li key={`${item}-${index}`} className="rounded-lg border border-gray-100 bg-white px-2 py-1">
                        Module {index + 1}
                      </li>
                    ))}
                </ul>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-900">Module preview</div>
                <p className="mt-2 text-xs text-gray-600">
                  Learners see objectives, a short lesson summary, and a quick knowledge check.
                </p>
                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600">
                  <div className="font-semibold text-gray-800">Lesson 1: Overview</div>
                  <div className="mt-1 text-gray-500">Estimated time: 5–7 minutes</div>
                </div>
                <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600">
                  <div className="font-semibold text-gray-800">Check-in quiz</div>
                  <div className="mt-1 text-gray-500">3 questions · Immediate feedback</div>
                </div>
              </div>
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
          disabled={!canPreview}
        >
          Publish program
        </button>
      </div>
    </div>
  );
};

export default PreviewPage;
