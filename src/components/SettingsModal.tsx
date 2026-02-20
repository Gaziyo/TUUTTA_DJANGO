import React from 'react';
import { X, ShieldCheck, Copy, RefreshCw } from 'lucide-react';
import { useStore } from '../store';
import { AppSettings, TTSOptions } from '../types';
import { isEnterpriseFeatureEnabled } from '../config/featureFlags';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VOICE_OPTIONS: { value: TTSOptions['voice']; label: string; description: string }[] = [
  { value: 'nova', label: 'Nova', description: 'A warm, friendly female voice' },
  { value: 'shimmer', label: 'Shimmer', description: 'A bright, young female voice' },
  { value: 'fable', label: 'Fable', description: 'A male voice with narrative style' },
  { value: 'echo', label: 'Echo', description: 'A male voice with depth' },
  { value: 'onyx', label: 'Onyx', description: 'A male voice with gravitas' },
  { value: 'alloy', label: 'Alloy', description: 'A neutral voice' },
];

const SPEED_OPTIONS = [
  { value: 0.5, label: 'Slow' },
  { value: 0.75, label: 'Relaxed' },
  { value: 1.0, label: 'Normal' },
  { value: 1.25, label: 'Fast' },
  { value: 1.5, label: 'Very Fast' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { getSettings, updateSettings } = useStore();
  const settings = getSettings();
  const selectedVoice = VOICE_OPTIONS.some(v => v.value === settings.voice)
    ? settings.voice
    : 'nova';
  const isDarkMode = settings.theme === 'dark';
  const mfaEnabled = settings.mfaEnabled ?? false;
  const mfaMethod = settings.mfaMethod ?? 'totp';
  const mfaRecoveryCodes = settings.mfaRecoveryCodes ?? [];

  const generateRecoveryCodes = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const nextCodes = Array.from({ length: 6 }, () => {
      const chunk = Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      return `${chunk.slice(0, 4)}-${chunk.slice(4)}`;
    });
    updateSettings({ mfaRecoveryCodes: nextCodes });
  };

  const handleMfaEnable = () => {
    if (!mfaEnabled) {
      updateSettings({ mfaEnabled: true, mfaMethod });
      if (mfaRecoveryCodes.length === 0) {
        generateRecoveryCodes();
      }
      return;
    }
    updateSettings({ mfaEnabled: false });
  };

  const copyRecoveryCodes = () => {
    if (mfaRecoveryCodes.length === 0) return;
    navigator.clipboard.writeText(mfaRecoveryCodes.join('\n'));
  };

  const handleThemeChange = (theme: AppSettings['theme']) => {
    updateSettings({ theme });
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`glass-card w-full max-w-md relative overflow-y-auto max-h-[90vh]`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 ${
            isDarkMode ? 'text-gray-400 hover:text-[#766edd]' : 'text-gray-500 hover:text-[#766edd]'
          } transition-colors`}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'gradient-text'}`}>
          Settings
        </h2>

        <div className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Theme
            </label>
            <select
              value={settings.theme}
              onChange={(e) => handleThemeChange(e.target.value as AppSettings['theme'])}
              className={`block w-full rounded-lg border px-3 py-2 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Font Size
            </label>
            <select
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: e.target.value as AppSettings['fontSize'] })}
              className={`block w-full rounded-lg border px-3 py-2 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              AI Voice
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => updateSettings({ voice: e.target.value as TTSOptions['voice'] })}
              className={`block w-full rounded-lg border px-3 py-2 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              {VOICE_OPTIONS.map(voice => (
                <option key={voice.value} value={voice.value}>
                  {voice.label} - {voice.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Speech Speed
            </label>
            <select
              value={settings.speechSpeed || 1.0}
              onChange={(e) => updateSettings({ speechSpeed: parseFloat(e.target.value) })}
              className={`block w-full rounded-lg border px-3 py-2 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              {SPEED_OPTIONS.map(speed => (
                <option key={speed.value} value={speed.value}>
                  {speed.label} ({speed.value}x)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Text-to-Speech
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.speechEnabled}
                onChange={(e) => updateSettings({ speechEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Auto-Save
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => updateSettings({ autoSave: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Notifications
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationEnabled}
                onChange={(e) => updateSettings({ notificationEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          {isEnterpriseFeatureEnabled('mfa') && (
            <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-800/70' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Multi-factor authentication
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Add an extra layer of protection to your account.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Enable MFA</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mfaEnabled}
                      onChange={handleMfaEnable}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                  </label>
                </div>

                <label className="text-xs font-medium">Preferred method</label>
                <select
                  value={mfaMethod}
                  onChange={(e) => updateSettings({ mfaMethod: e.target.value as AppSettings['mfaMethod'] })}
                  disabled={!mfaEnabled}
                  className={`block w-full rounded-lg border px-3 py-2 ${
                    isDarkMode
                      ? 'bg-gray-900 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } disabled:opacity-60`}
                >
                  <option value="totp">Authenticator app (TOTP)</option>
                  <option value="sms">SMS codes</option>
                </select>

                {mfaEnabled && (
                  <div className="space-y-3">
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Save recovery codes in a safe location. They allow access if you lose your device.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {mfaRecoveryCodes.length > 0 ? (
                        mfaRecoveryCodes.map(code => (
                          <div key={code} className={`px-2 py-1 rounded-md text-xs font-mono ${
                            isDarkMode ? 'bg-gray-900/60' : 'bg-white'
                          }`}>
                            {code}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500">Generate recovery codes to finish enrollment.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={copyRecoveryCodes}
                        className="tuutta-button-secondary text-xs px-3 py-1.5"
                        disabled={mfaRecoveryCodes.length === 0}
                      >
                        <Copy className="w-3 h-3" />
                        Copy codes
                      </button>
                      <button
                        onClick={generateRecoveryCodes}
                        className="tuutta-button-primary text-xs px-3 py-1.5"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Regenerate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
