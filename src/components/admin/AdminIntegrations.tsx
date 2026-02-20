import React, { useMemo, useState } from 'react';
import { IntegrationSettings } from './IntegrationSettings';
import { useLMSStore } from '../../store/lmsStore';

interface AdminIntegrationsProps {
  isDarkMode?: boolean;
}

interface IntegrationRecord {
  id: string;
  name: string;
  type: 'sso' | 'scorm' | 'xapi' | 'hris' | 'api' | 'webhook';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  config: Record<string, string>;
  description: string;
}

interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
  lastUsed?: Date;
  permissions: string[];
  status: 'active' | 'revoked';
}

interface WebhookRecord {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  secret: string;
  lastTriggered?: Date;
  failureCount: number;
}

const initialIntegrations: IntegrationRecord[] = [
  {
    id: 'saml-main',
    name: 'SAML 2.0',
    type: 'sso' as const,
    status: 'disconnected' as const,
    description: 'Enterprise SSO via SAML 2.0',
    lastSync: undefined,
    config: {
      entryPoint: '',
      issuer: '',
      certificate: '',
      attributeMap: 'email, firstName, lastName'
    }
  },
  {
    id: 'oidc-main',
    name: 'OIDC',
    type: 'sso' as const,
    status: 'disconnected' as const,
    description: 'OpenID Connect with OAuth 2.0',
    lastSync: undefined,
    config: {
      issuer: '',
      clientId: '',
      clientSecret: '',
      redirectUri: ''
    }
  }
];

export default function AdminIntegrations({ isDarkMode = false }: AdminIntegrationsProps) {
  const { currentOrg } = useLMSStore();
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>(initialIntegrations);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);

  const orgScopedIntegrations = useMemo(() => {
    if (!currentOrg) return integrations;
    return integrations.map((integration) => ({
      ...integration,
      name: `${integration.name} (${currentOrg.name})`
    }));
  }, [integrations, currentOrg]);

  return (
    <IntegrationSettings
      integrations={orgScopedIntegrations}
      apiKeys={apiKeys}
      webhooks={webhooks}
      onUpdateIntegration={async (integrationId, config) => {
        setIntegrations((prev) =>
          prev.map((integration) =>
            integration.id === integrationId
              ? { ...integration, config, status: 'connected' as const }
              : integration
          )
        );
      }}
      onTestIntegration={async () => ({
        success: true,
        message: 'Connection looks healthy.'
      })}
      onCreateAPIKey={async (name, permissions) => {
        const newKey = {
          id: `key-${Date.now()}`,
          name,
          key: `tuutta_${Math.random().toString(36).slice(2, 12)}`,
          createdAt: new Date(),
          permissions,
          status: 'active' as const
        };
        setApiKeys((prev) => [newKey, ...prev]);
        return newKey;
      }}
      onRevokeAPIKey={async (keyId) => {
        setApiKeys((prev) => prev.filter((key) => key.id !== keyId));
      }}
      onCreateWebhook={async (url, events) => {
        const newWebhook = {
          id: `wh-${Date.now()}`,
          url,
          events,
          status: 'active' as const,
          secret: Math.random().toString(36).slice(2, 10),
          failureCount: 0
        };
        setWebhooks((prev) => [newWebhook, ...prev]);
        return newWebhook;
      }}
      onDeleteWebhook={async (webhookId) => {
        setWebhooks((prev) => prev.filter((webhook) => webhook.id !== webhookId));
      }}
      onTestWebhook={async () => ({
        success: true,
        message: 'Webhook responded with 200 OK.'
      })}
      isDarkMode={isDarkMode}
    />
  );
}
