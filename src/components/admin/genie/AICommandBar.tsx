import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { useGuidedPipeline } from '../../../context/GuidedPipelineContext';

const SUGGESTIONS = [
  'Summarize key risks',
  'Draft learning objectives',
  'Generate a quick assessment',
  'Suggest active learning ideas'
];

interface AICommandBarProps {
  onSubmit?: (prompt: string) => void;
}

const AICommandBar: React.FC<AICommandBarProps> = ({ onSubmit }) => {
  const { currentStage, getStageConfig } = useGuidedPipeline();
  const stage = getStageConfig(currentStage);
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
    setPrompt('');
  };

  return (
    <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
          <Sparkles className="h-4 w-4" />
          Genie AI Command Bar
        </div>
        <div className="text-xs text-gray-500">
          Working on: <span className="font-medium text-gray-700">{stage?.shortLabel ?? 'Ingest'}</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-3">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask Genie to help with this step…"
          className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!prompt.trim()}
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setPrompt(suggestion)}
            className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:border-purple-200 hover:bg-purple-100"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AICommandBar;
