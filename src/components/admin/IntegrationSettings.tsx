import React, { useState } from 'react';
import {
  Key,
  Globe,
  Shield,
  Database,
  CheckCircle,
  AlertCircle,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Link2,
  Unlink,
  Activity
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  type: 'sso' | 'scorm' | 'xapi' | 'hris' | 'api' | 'webhook';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  config: Record<string, string>;
  description: string;
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
  lastUsed?: Date;
  permissions: string[];
  status: 'active' | 'revoked';
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  secret: string;
  lastTriggered?: Date;
  failureCount: number;
}

interface IntegrationSettingsProps {
  integrations: Integration[];
  apiKeys: APIKey[];
  webhooks: WebhookEndpoint[];
  onUpdateIntegration: (integrationId: string, config: Record<string, string>) => Promise<void>;
  onTestIntegration: (integrationId: string) => Promise<{ success: boolean; message: string }>;
  onCreateAPIKey: (name: string, permissions: string[]) => Promise<APIKey>;
  onRevokeAPIKey: (keyId: string) => Promise<void>;
  onCreateWebhook: (url: string, events: string[]) => Promise<WebhookEndpoint>;
  onDeleteWebhook: (webhookId: string) => Promise<void>;
  onTestWebhook: (webhookId: string) => Promise<{ success: boolean; message: string }>;
  isDarkMode?: boolean;
}

type Tab = 'sso' | 'scorm' | 'api' | 'webhooks';

export const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({
  integrations,
  apiKeys,
  webhooks,
  onUpdateIntegration,
  onTestIntegration,
  onCreateAPIKey,
  onRevokeAPIKey,
  onCreateWebhook,
  onDeleteWebhook,
  onTestWebhook,
  isDarkMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('sso');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [editedConfig, setEditedConfig] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'sso', label: 'Single Sign-On', icon: <Shield className="w-4 h-4" /> },
    { id: 'scorm', label: 'SCORM/xAPI', icon: <Database className="w-4 h-4" /> },
    { id: 'api', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
    { id: 'webhooks', label: 'Webhooks', icon: <Globe className="w-4 h-4" /> },
  ];

  const ssoIntegrations = integrations.filter(i => i.type === 'sso');
  const _scormIntegrations = integrations.filter(i => i.type === 'scorm' || i.type === 'xapi');

  const availablePermissions = [
    'courses:read',
    'courses:write',
    'users:read',
    'users:write',
    'enrollments:read',
    'enrollments:write',
    'reports:read',
    'analytics:read',
  ];

  const webhookEvents = [
    'enrollment.created',
    'enrollment.completed',
    'course.published',
    'course.updated',
    'user.created',
    'user.updated',
    'certificate.issued',
    'quiz.submitted',
  ];

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return;

    setIsSaving(true);
    setTestResult(null);
    try {
      await onUpdateIntegration(selectedIntegration.id, editedConfig);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestIntegration = async (integrationId: string) => {
    setTestResult(null);
    const result = await onTestIntegration(integrationId);
    setTestResult(result);
  };

  const handleCreateKey = async () => {
    if (!newKeyName) return;

    setIsSaving(true);
    try {
      await onCreateAPIKey(newKeyName, newKeyPermissions);
      setNewKeyName('');
      setNewKeyPermissions([]);
      setIsCreatingKey(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookUrl || newWebhookEvents.length === 0) return;

    setIsSaving(true);
    try {
      await onCreateWebhook(newWebhookUrl, newWebhookEvents);
      setNewWebhookUrl('');
      setNewWebhookEvents([]);
      setIsCreatingWebhook(false);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected':
      case 'inactive':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700';
      case 'disconnected':
      case 'inactive':
        return isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600';
      case 'error':
        return isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700';
      case 'revoked':
        return isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700';
      default:
        return '';
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h1 className="text-2xl font-bold mb-2">Integration Settings</h1>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          Configure SSO, SCORM/xAPI, APIs, and webhook integrations
        </p>
      </div>

      {/* Tabs */}
      <div className={`px-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* SSO Tab */}
        {activeTab === 'sso' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* SSO Provider Cards */}
              {[
                { id: 'saml', name: 'SAML 2.0', description: 'Enterprise SSO with SAML protocol' },
                { id: 'oidc', name: 'OpenID Connect', description: 'OAuth 2.0 based authentication' },
                { id: 'okta', name: 'Okta', description: 'Okta identity management' },
                { id: 'azure', name: 'Azure AD', description: 'Microsoft Azure Active Directory' },
              ].map(provider => {
                const integration = ssoIntegrations.find(i => i.id === provider.id);
                return (
                  <div
                    key={provider.id}
                    className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{provider.name}</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {provider.description}
                        </p>
                      </div>
                      {integration && (
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(integration.status)}`}>
                          {integration.status}
                        </span>
                      )}
                    </div>

                    {integration ? (
                      <div className="space-y-3">
                        {integration.lastSync && (
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Last sync: {formatDate(integration.lastSync)}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedIntegration(integration);
                              setEditedConfig(integration.config);
                            }}
                            className={`flex-1 py-2 rounded ${
                              isDarkMode
                                ? 'bg-gray-700 hover:bg-gray-600'
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            Configure
                          </button>
                          <button
                            onClick={() => handleTestIntegration(integration.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                          >
                            <TestTube className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded flex items-center justify-center gap-2">
                        <Link2 className="w-4 h-4" />
                        Connect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Integration Config */}
            {selectedIntegration && selectedIntegration.type === 'sso' && (
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Configure {selectedIntegration.name}</h3>
                  <button onClick={() => setSelectedIntegration(null)}>
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {testResult && (
                  <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                    testResult.success
                      ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                      : isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                  }`}>
                    {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {testResult.message}
                  </div>
                )}

                <div className="space-y-4">
                  {selectedIntegration.id === 'saml' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Identity Provider URL</label>
                        <input
                          type="text"
                          value={editedConfig.idpUrl || ''}
                          onChange={(e) => setEditedConfig({ ...editedConfig, idpUrl: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          }`}
                          placeholder="https://idp.example.com/saml"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Entity ID</label>
                        <input
                          type="text"
                          value={editedConfig.entityId || ''}
                          onChange={(e) => setEditedConfig({ ...editedConfig, entityId: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">X.509 Certificate</label>
                        <textarea
                          value={editedConfig.certificate || ''}
                          onChange={(e) => setEditedConfig({ ...editedConfig, certificate: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border font-mono text-sm ${
                            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          }`}
                          rows={4}
                          placeholder="-----BEGIN CERTIFICATE-----"
                        />
                      </div>
                    </>
                  )}

                  {selectedIntegration.id === 'oidc' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Client ID</label>
                        <input
                          type="text"
                          value={editedConfig.clientId || ''}
                          onChange={(e) => setEditedConfig({ ...editedConfig, clientId: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Client Secret</label>
                        <div className="relative">
                          <input
                            type={showSecrets['clientSecret'] ? 'text' : 'password'}
                            value={editedConfig.clientSecret || ''}
                            onChange={(e) => setEditedConfig({ ...editedConfig, clientSecret: e.target.value })}
                            className={`w-full px-3 py-2 pr-10 rounded-lg border ${
                              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets({ ...showSecrets, clientSecret: !showSecrets['clientSecret'] })}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            {showSecrets['clientSecret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Discovery URL</label>
                        <input
                          type="text"
                          value={editedConfig.discoveryUrl || ''}
                          onChange={(e) => setEditedConfig({ ...editedConfig, discoveryUrl: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          }`}
                          placeholder="https://example.com/.well-known/openid-configuration"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setSelectedIntegration(null)}
                    className={`px-4 py-2 rounded ${
                      isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCORM/xAPI Tab */}
        {activeTab === 'scorm' && (
          <div className="space-y-6">
            {/* SCORM Settings */}
            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                SCORM Configuration
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">SCORM Version Support</label>
                  <div className="space-y-2">
                    {['SCORM 1.2', 'SCORM 2004 (2nd Ed)', 'SCORM 2004 (3rd Ed)', 'SCORM 2004 (4th Ed)'].map(version => (
                      <label key={version} className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">{version}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Default Completion Rules</label>
                  <select className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}>
                    <option>Complete when cmi.completion_status = completed</option>
                    <option>Complete when cmi.success_status = passed</option>
                    <option>Complete when score &gt;= passing score</option>
                  </select>
                </div>
              </div>
            </div>

            {/* xAPI Settings */}
            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                xAPI (Tin Can) Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">LRS Endpoint</label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    placeholder="https://lrs.example.com/xapi"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">LRS Key</label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">LRS Secret</label>
                    <input
                      type="password"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Send statements to external LRS</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded">
                  <Save className="w-4 h-4" />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">API Keys</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Manage API keys for external integrations
                </p>
              </div>
              <button
                onClick={() => setIsCreatingKey(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
              >
                <Key className="w-4 h-4" />
                Create API Key
              </button>
            </div>

            <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <table className="w-full">
                <thead>
                  <tr className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Key</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Permissions</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Last Used</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {apiKeys.map(key => (
                    <tr key={key.id}>
                      <td className="px-4 py-3 font-medium">{key.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className={`text-sm px-2 py-1 rounded ${
                            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                          }`}>
                            {showSecrets[key.id] ? key.key : `${key.key.slice(0, 8)}...`}
                          </code>
                          <button
                            onClick={() => setShowSecrets({ ...showSecrets, [key.id]: !showSecrets[key.id] })}
                            className="p-1"
                          >
                            {showSecrets[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(key.key)}
                            className="p-1"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {key.permissions.slice(0, 2).map(perm => (
                            <span key={perm} className={`text-xs px-2 py-0.5 rounded ${
                              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                            }`}>
                              {perm}
                            </span>
                          ))}
                          {key.permissions.length > 2 && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                            }`}>
                              +{key.permissions.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {key.lastUsed ? formatDate(key.lastUsed) : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(key.status)}`}>
                          {key.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {key.status === 'active' && (
                          <button
                            onClick={() => onRevokeAPIKey(key.id)}
                            className="text-red-500 hover:text-red-600 text-sm"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {apiKeys.length === 0 && (
                <div className="p-8 text-center">
                  <Key className={`w-12 h-12 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    No API keys created yet
                  </p>
                </div>
              )}
            </div>

            {/* Create API Key Modal */}
            {isCreatingKey && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className={`w-full max-w-md rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
                  <h3 className="font-semibold mb-4">Create API Key</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Key Name</label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        }`}
                        placeholder="e.g., Production Integration"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Permissions</label>
                      <div className="grid grid-cols-2 gap-2">
                        {availablePermissions.map(perm => (
                          <label key={perm} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newKeyPermissions.includes(perm)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewKeyPermissions([...newKeyPermissions, perm]);
                                } else {
                                  setNewKeyPermissions(newKeyPermissions.filter(p => p !== perm));
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{perm}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setIsCreatingKey(false)}
                      className={`px-4 py-2 rounded ${
                        isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateKey}
                      disabled={!newKeyName || isSaving}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50"
                    >
                      Create Key
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Webhook Endpoints</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Receive real-time notifications for LMS events
                </p>
              </div>
              <button
                onClick={() => setIsCreatingWebhook(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
              >
                <Globe className="w-4 h-4" />
                Add Endpoint
              </button>
            </div>

            <div className="space-y-4">
              {webhooks.map(webhook => (
                <div key={webhook.id} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(webhook.status)}
                        <code className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {webhook.url}
                        </code>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {webhook.events.map(event => (
                          <span key={event} className={`text-xs px-2 py-1 rounded ${
                            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                          }`}>
                            {event}
                          </span>
                        ))}
                      </div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {webhook.lastTriggered ? (
                          <>Last triggered: {formatDate(webhook.lastTriggered)}</>
                        ) : (
                          'Never triggered'
                        )}
                        {webhook.failureCount > 0 && (
                          <span className="ml-2 text-red-500">
                            ({webhook.failureCount} failures)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onTestWebhook(webhook.id)}
                        className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title="Test webhook"
                      >
                        <TestTube className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteWebhook(webhook.id)}
                        className={`p-2 rounded text-red-500 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title="Delete webhook"
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {webhooks.length === 0 && (
                <div className={`p-8 text-center rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <Globe className={`w-12 h-12 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    No webhook endpoints configured
                  </p>
                </div>
              )}
            </div>

            {/* Create Webhook Modal */}
            {isCreatingWebhook && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className={`w-full max-w-md rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
                  <h3 className="font-semibold mb-4">Add Webhook Endpoint</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Endpoint URL</label>
                      <input
                        type="url"
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        }`}
                        placeholder="https://api.example.com/webhooks/lms"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Events</label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {webhookEvents.map(event => (
                          <label key={event} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newWebhookEvents.includes(event)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewWebhookEvents([...newWebhookEvents, event]);
                                } else {
                                  setNewWebhookEvents(newWebhookEvents.filter(ev => ev !== event));
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{event}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setIsCreatingWebhook(false)}
                      className={`px-4 py-2 rounded ${
                        isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateWebhook}
                      disabled={!newWebhookUrl || newWebhookEvents.length === 0 || isSaving}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50"
                    >
                      Add Endpoint
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
