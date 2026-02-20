import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Smartphone, Copy, RefreshCw } from 'lucide-react';

interface AdminSecurityCenterProps {
  isDarkMode?: boolean;
}

const RECOVERY_CODES = [
  'B4KR-92XF',
  'Q2ZP-71DM',
  'V3HX-88LA',
  'M7TN-04RQ',
  'N8JS-13WU',
  'P5LK-62AZ'
];

export default function AdminSecurityCenter({ isDarkMode = false }: AdminSecurityCenterProps) {
  const [requireMfa, setRequireMfa] = useState(true);
  const [allowSms, setAllowSms] = useState(false);
  const [allowTotp, setAllowTotp] = useState(true);
  const [sessionDuration, setSessionDuration] = useState('12');

  const copyCodes = () => {
    navigator.clipboard.writeText(RECOVERY_CODES.join('\n'));
  };

  return (
    <div className={`h-full overflow-y-auto ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Security & Access</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Configure multi-factor authentication and session policies for enterprise readiness.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">MFA enforcement</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Require multi-factor authentication for admin and high-risk roles.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between text-sm">
                Require MFA for admins
                <input
                  type="checkbox"
                  checked={requireMfa}
                  onChange={(e) => setRequireMfa(e.target.checked)}
                  className="h-4 w-4"
                />
              </label>
              <label className="flex items-center justify-between text-sm">
                Allow authenticator apps (TOTP)
                <input
                  type="checkbox"
                  checked={allowTotp}
                  onChange={(e) => setAllowTotp(e.target.checked)}
                  className="h-4 w-4"
                />
              </label>
              <label className="flex items-center justify-between text-sm">
                Allow SMS codes
                <input
                  type="checkbox"
                  checked={allowSms}
                  onChange={(e) => setAllowSms(e.target.checked)}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Session policies</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Control session length and re-authentication requirements.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Session duration (hours)</label>
              <select
                value={sessionDuration}
                onChange={(e) => setSessionDuration(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border ${
                  isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              >
                <option value="4">4 hours</option>
                <option value="8">8 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
              </select>
              <button className="tuutta-button-primary text-sm px-4 py-2">
                Save security policy
              </button>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Recovery codes</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Provide backup access for administrators if MFA devices are unavailable.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {RECOVERY_CODES.map((code) => (
              <div
                key={code}
                className={`px-3 py-2 rounded-lg text-sm font-mono ${
                  isDarkMode ? 'bg-gray-900/60' : 'bg-gray-50'
                }`}
              >
                {code}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={copyCodes} className="tuutta-button-secondary text-sm px-4 py-2">
              <Copy className="w-4 h-4" />
              Copy codes
            </button>
            <button className="tuutta-button-primary text-sm px-4 py-2">
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
