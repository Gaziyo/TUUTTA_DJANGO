import { ShieldAlert, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ForbiddenPageProps {
  isDarkMode: boolean;
}

export default function ForbiddenPage({ isDarkMode }: ForbiddenPageProps) {
  const navigate = useNavigate();

  return (
    <div className={`min-h-full p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-2xl mx-auto rounded-2xl border p-8 ${
        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700'
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Access denied</h1>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              You are not authorized for this workspace route.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate('/context-switch')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              isDarkMode
                ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Switch Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
