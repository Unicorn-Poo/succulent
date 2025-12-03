"use client";

import { Card, Text, Button, Badge } from "@radix-ui/themes";
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Settings,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  setupWebhook,
  getWebhookConfig,
  WebhookConfig
} from "@/utils/ayrshareAnalytics";
import { isBusinessPlanMode } from "@/utils/ayrshareIntegration";

interface WebhookItem extends WebhookConfig {
  id?: string;
  createdAt?: string;
  lastTriggered?: string;
  status?: 'active' | 'inactive' | 'error';
}

interface AyrshareWebhookInfo {
  currentWebhooks: any;
  availableEvents: string[];
  suggestedWebhookUrl: string;
  eventDescriptions: Record<string, string>;
}

export default function WebhookManagement() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAyrshareRegister, setShowAyrshareRegister] = useState(false);
  const [ayrshareInfo, setAyrshareInfo] = useState<AyrshareWebhookInfo | null>(null);
  const [selectedAyrshareEvents, setSelectedAyrshareEvents] = useState<string[]>([]);
  const [newWebhook, setNewWebhook] = useState<WebhookConfig>({
    url: '',
    events: [],
    secret: '',
    active: true
  });

  const businessPlanAvailable = isBusinessPlanMode();

  // Available webhook events
  const availableEvents = [
    { id: 'post.published', name: 'Post Published', description: 'When a post is successfully published' },
    { id: 'post.failed', name: 'Post Failed', description: 'When a post fails to publish' },
    { id: 'post.scheduled', name: 'Post Scheduled', description: 'When a post is scheduled' },
    { id: 'account.connected', name: 'Account Connected', description: 'When a social account is connected' },
    { id: 'account.disconnected', name: 'Account Disconnected', description: 'When a social account is disconnected' },
    { id: 'analytics.updated', name: 'Analytics Updated', description: 'When new analytics data is available' },
    { id: 'comment.received', name: 'Comment Received', description: 'When a new comment is received' },
    { id: 'mention.received', name: 'Mention Received', description: 'When your account is mentioned' }
  ];

  // Load existing webhooks
  const loadWebhooks = async () => {
    if (!businessPlanAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const config = await getWebhookConfig();
      
      // Convert API response to webhook items array
      if (config.webhooks) {
        setWebhooks(config.webhooks);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Ayrshare webhook info and current registrations
  const loadAyrshareWebhookInfo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ayrshare-webhooks/register');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load Ayrshare webhook info');
      }

      setAyrshareInfo(data);
      // Pre-select all events by default
      setSelectedAyrshareEvents(data.availableEvents || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load Ayrshare webhook info');
    } finally {
      setIsLoading(false);
    }
  };

  // Register webhook with Ayrshare
  const handleAyrshareRegister = async () => {
    if (!ayrshareInfo?.suggestedWebhookUrl || selectedAyrshareEvents.length === 0) {
      setError('Please select at least one event to subscribe to');
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const response = await fetch('/api/ayrshare-webhooks/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          url: ayrshareInfo.suggestedWebhookUrl,
          events: selectedAyrshareEvents,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to register webhook');
      }

      setSuccess(`Webhook registered with Ayrshare for ${selectedAyrshareEvents.length} events`);
      setShowAyrshareRegister(false);
      
      // Reload webhook info
      await loadAyrshareWebhookInfo();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to register webhook');
    } finally {
      setIsRegistering(false);
    }
  };

  // Unregister webhook from Ayrshare
  const handleAyrshareUnregister = async (url: string) => {
    if (!confirm('Are you sure you want to unregister this webhook from Ayrshare?')) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ayrshare-webhooks/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          url,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to unregister webhook');
      }

      setSuccess('Webhook unregistered from Ayrshare');
      await loadAyrshareWebhookInfo();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to unregister webhook');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Ayrshare event selection
  const toggleAyrshareEvent = (eventId: string) => {
    setSelectedAyrshareEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    );
  };

  useEffect(() => {
    loadWebhooks();
  }, [businessPlanAvailable]);

  // Create new webhook
  const handleCreateWebhook = async () => {
    if (!newWebhook.url.trim() || newWebhook.events.length === 0) {
      setError('Please provide a URL and select at least one event');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await setupWebhook(newWebhook);
      
      const createdWebhook: WebhookItem = {
        ...newWebhook,
        id: result.id,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      setWebhooks(prev => [...prev, createdWebhook]);
      setNewWebhook({ url: '', events: [], secret: '', active: true });
      setShowCreateForm(false);
      setSuccess('Webhook created successfully!');
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create webhook');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete webhook
  const handleDeleteWebhook = (webhookId: string) => {
    if (confirm('Are you sure you want to delete this webhook?')) {
      setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
      setSuccess('Webhook deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Toggle webhook event
  const toggleEvent = (eventId: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  if (!businessPlanAvailable) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <Webhook className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <Text size="4" weight="bold" className="block mb-2">Webhook Management</Text>
            <Text size="2" color="gray" className="block mb-4">
              Real-time webhook notifications require Ayrshare Business Plan
            </Text>
            <Button onClick={() => window.open('https://www.ayrshare.com/pricing', '_blank')}>
              Upgrade to Business Plan
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Text size="5" weight="bold">Webhook Management</Text>
          <Text size="2" color="gray" className="mt-1">
            Set up real-time notifications for post events and social media activities
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="soft" onClick={loadWebhooks} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="soft" 
            color="orange"
            onClick={() => {
              setShowAyrshareRegister(true);
              loadAyrshareWebhookInfo();
            }}
          >
            <Zap className="w-4 h-4 mr-2" />
            Register with Ayrshare
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Webhook
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <Card>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <Text color="red">{error}</Text>
            </div>
          </div>
        </Card>
      )}

      {success && (
        <Card>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <Text color="green">{success}</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Ayrshare Webhook Registration */}
      {showAyrshareRegister && (
        <Card>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                <Text size="3" weight="medium">Register Webhook with Ayrshare</Text>
              </div>
              <button
                onClick={() => setShowAyrshareRegister(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                <Text size="2" color="gray" className="mt-2">Loading webhook information...</Text>
              </div>
            ) : ayrshareInfo ? (
              <>
                {/* Webhook URL */}
                <div className="p-3 bg-muted rounded-lg">
                  <Text size="2" color="gray" className="block mb-1">Webhook Endpoint</Text>
                  <code className="text-sm font-mono text-foreground break-all">
                    {ayrshareInfo.suggestedWebhookUrl}
                  </code>
                </div>

                {/* Event Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Select Events to Subscribe ({selectedAyrshareEvents.length} selected)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ayrshareInfo.availableEvents.map((event) => (
                      <div
                        key={event}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAyrshareEvents.includes(event)
                            ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-border hover:border-orange-200'
                        }`}
                        onClick={() => toggleAyrshareEvent(event)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Text size="2" weight="medium" className="capitalize">{event}</Text>
                          {selectedAyrshareEvents.includes(event) && (
                            <Check className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          )}
                        </div>
                        <Text size="1" color="gray">
                          {ayrshareInfo.eventDescriptions[event] || `Triggered on ${event} events`}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current Registrations */}
                {ayrshareInfo.currentWebhooks && (
                  <div>
                    <Text size="2" weight="medium" className="block mb-2">Current Ayrshare Registrations</Text>
                    {Array.isArray(ayrshareInfo.currentWebhooks) && ayrshareInfo.currentWebhooks.length > 0 ? (
                      <div className="space-y-2">
                        {ayrshareInfo.currentWebhooks.map((webhook: any, index: number) => (
                          <div key={index} className="p-2 bg-muted rounded flex items-center justify-between">
                            <code className="text-xs font-mono truncate flex-1">{webhook.url || webhook}</code>
                            <button
                              onClick={() => handleAyrshareUnregister(webhook.url || webhook)}
                              className="ml-2 p-1 text-red-500 hover:text-red-700"
                              title="Unregister"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Text size="2" color="gray">No webhooks currently registered with Ayrshare</Text>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="soft"
                    onClick={() => setShowAyrshareRegister(false)}
                    disabled={isRegistering}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="orange"
                    onClick={handleAyrshareRegister}
                    disabled={isRegistering || selectedAyrshareEvents.length === 0}
                  >
                    {isRegistering ? 'Registering...' : 'Register Webhook'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-4 text-center">
                <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <Text size="2" color="gray">Failed to load Ayrshare webhook information</Text>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Create Webhook Form */}
      {showCreateForm && (
        <Card>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Text size="3" weight="medium">Create New Webhook</Text>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={newWebhook.url}
                onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://your-domain.com/webhook"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
            </div>

            {/* Secret Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Secret (Optional)
              </label>
              <input
                type="text"
                value={newWebhook.secret}
                onChange={(e) => setNewWebhook(prev => ({ ...prev, secret: e.target.value }))}
                placeholder="webhook-secret-key"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
              <Text size="1" color="gray" className="mt-1">
                Used to verify webhook authenticity
              </Text>
            </div>

            {/* Events Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Events to Subscribe ({newWebhook.events.length} selected)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      newWebhook.events.includes(event.id)
                        ? 'border-lime-300 bg-lime-50 dark:bg-lime-900/20'
                        : 'border-border hover:border-border'
                    }`}
                    onClick={() => toggleEvent(event.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Text size="2" weight="medium">{event.name}</Text>
                      {newWebhook.events.includes(event.id) && (
                        <Check className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                      )}
                    </div>
                    <Text size="1" color="gray">{event.description}</Text>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="soft"
                onClick={() => setShowCreateForm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWebhook}
                disabled={isLoading || !newWebhook.url.trim() || newWebhook.events.length === 0}
              >
                {isLoading ? 'Creating...' : 'Create Webhook'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Webhooks List */}
      {webhooks.length > 0 ? (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id || webhook.url} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <Webhook className="w-5 h-5 text-lime-600 dark:text-lime-400" />
                    <Text size="3" weight="medium" className="truncate flex-1">
                      {webhook.url}
                    </Text>
                    <Badge 
                      variant="soft"
                      color={webhook.status === 'active' ? 'green' : webhook.status === 'error' ? 'red' : 'gray'}
                    >
                      {webhook.status || 'active'}
                    </Badge>
                  </div>

                  {/* Events */}
                  <div>
                    <Text size="2" color="gray" className="block mb-2">
                      Subscribed Events ({webhook.events.length})
                    </Text>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 6).map((eventId) => {
                        const event = availableEvents.find(e => e.id === eventId);
                        return (
                          <Badge key={eventId} variant="outline" size="1">
                            {event?.name || eventId}
                          </Badge>
                        );
                      })}
                      {webhook.events.length > 6 && (
                        <Badge variant="outline" size="1">
                          +{webhook.events.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    {webhook.createdAt && (
                      <div>
                        <span className="font-medium text-foreground">Created:</span> {new Date(webhook.createdAt).toLocaleDateString()}
                      </div>
                    )}
                    {webhook.lastTriggered && (
                      <div>
                        <span className="font-medium text-foreground">Last Triggered:</span> {new Date(webhook.lastTriggered).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {/* TODO: Implement edit */}}
                    className="p-2 text-muted-foreground hover:text-foreground dark:text-foreground hover:bg-muted dark:bg-muted rounded"
                    title="Edit webhook"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(webhook.id || webhook.url)}
                    className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-300 hover:bg-red-50 dark:bg-red-900/20 rounded"
                    title="Delete webhook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !showCreateForm && !isLoading && (
        <Card>
          <div className="p-8 text-center space-y-4">
            <Webhook className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <Text size="3" weight="medium" className="block mb-2">No Webhooks Configured</Text>
              <Text size="2" color="gray" className="block mb-4">
                Set up webhooks to receive real-time notifications about your social media activity
              </Text>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Webhook
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <div className="p-4 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-lime-600 dark:text-lime-400 mt-0.5" />
            <div className="flex-1">
              <Text size="2" weight="medium" className="block mb-1 text-lime-800 dark:text-lime-300">
                Webhook Best Practices
              </Text>
              <Text size="2" className="text-lime-700 dark:text-lime-300 mb-3">
                Webhooks allow you to receive real-time notifications about events in your Ayrshare account. 
                Make sure your endpoint can handle POST requests and responds with a 200 status code.
              </Text>
              <Button 
                size="1" 
                variant="soft"
                onClick={() => window.open('https://www.ayrshare.com/docs/apis/webhooks/overview', '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 