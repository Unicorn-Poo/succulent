'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';
import { EngagementAutomationEngine } from '../../utils/engagementAutomation';

interface DMConversation {
  id: string;
  platform: string;
  participant: string;
  participantUsername: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  isRead: boolean;
  needsResponse: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface DMTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
  platform: string;
  triggers: string[];
  enabled: boolean;
}

interface DMCampaign {
  id: string;
  name: string;
  platform: string;
  template: DMTemplate;
  targets: string[];
  sentCount: number;
  responseCount: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: string;
}

interface DMAutomationManagerProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

export default function DMAutomationManager({
  platform,
  profileKey,
  accountGroup
}: DMAutomationManagerProps) {
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [templates, setTemplates] = useState<DMTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<DMCampaign[]>([]);
  const [activeTab, setActiveTab] = useState<'conversations' | 'templates' | 'campaigns' | 'outreach'>('conversations');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [newTemplate, setNewTemplate] = useState<Partial<DMTemplate>>({
    name: '',
    subject: '',
    message: '',
    platform,
    triggers: [],
    enabled: true
  });
  const [outreachTargets, setOutreachTargets] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const engine = new EngagementAutomationEngine(profileKey);

  // Load conversations
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedConversations = await engine.getDMConversations(platform);
      setConversations(fetchedConversations);
    } catch (error) {
      console.error('Error loading DM conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [platform, profileKey]);

  // Initialize default templates
  useEffect(() => {
    const defaultTemplates: DMTemplate[] = [
      {
        id: `${platform}_welcome`,
        name: 'Welcome Message',
        subject: 'Welcome!',
        message: `Hi {username}! 👋 Thanks for following me on ${platform}. I share content about [your niche] and would love to connect with like-minded people. What got you interested in this topic?`,
        platform,
        triggers: ['new_follower'],
        enabled: false
      },
      {
        id: `${platform}_collaboration`,
        name: 'Collaboration Inquiry',
        subject: 'Collaboration Opportunity',
        message: `Hi {username}! I came across your profile and love your content about [topic]. I think we might have some great collaboration opportunities. Would you be interested in connecting?`,
        platform,
        triggers: ['manual'],
        enabled: true
      },
      {
        id: `${platform}_thankyou`,
        name: 'Thank You Message',
        subject: 'Thank you!',
        message: `Hi {username}! Thank you for engaging with my content. It means a lot to have supportive followers like you. Is there any particular topic you'd like me to cover more?`,
        platform,
        triggers: ['high_engagement'],
        enabled: false
      }
    ];
    setTemplates(defaultTemplates);
  }, [platform]);

  // Load data on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleConversationToggle = (conversationId: string) => {
    setSelectedConversations(prev => 
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const handleSendBulkDM = async () => {
    if (!selectedTemplate || selectedConversations.length === 0) {
      alert('Please select a template and conversations');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const conversationId of selectedConversations) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) continue;

      try {
        const personalizedMessage = template.message.replace('{username}', conversation.participantUsername);
        const success = await engine.sendAutomatedDM(platform, conversation.participant, personalizedMessage);
        
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Add delay between messages
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        errorCount++;
      }
    }

    alert(`DM campaign complete: ${successCount} sent, ${errorCount} failed`);
    setSelectedConversations([]);
    setIsLoading(false);
    await loadConversations();
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.message) {
      alert('Please fill in template name and message');
      return;
    }

    const template: DMTemplate = {
      id: `${platform}_custom_${Date.now()}`,
      name: newTemplate.name,
      subject: newTemplate.subject || '',
      message: newTemplate.message,
      platform,
      triggers: newTemplate.triggers || [],
      enabled: newTemplate.enabled !== false
    };

    setTemplates(prev => [...prev, template]);
    setNewTemplate({
      name: '',
      subject: '',
      message: '',
      platform,
      triggers: [],
      enabled: true
    });
  };

  const handleStartOutreachCampaign = async () => {
    if (!selectedTemplate || !outreachTargets.trim()) {
      alert('Please select a template and enter target usernames');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    const targets = outreachTargets.split('\n').map(t => t.trim()).filter(t => t);
    
    const campaign: DMCampaign = {
      id: `campaign_${Date.now()}`,
      name: `${template.name} Campaign`,
      platform,
      template,
      targets,
      sentCount: 0,
      responseCount: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    setCampaigns(prev => [...prev, campaign]);

    // Start sending DMs
    setIsLoading(true);
    let sentCount = 0;

    for (const target of targets) {
      try {
        const personalizedMessage = template.message.replace('{username}', target);
        const success = await engine.sendAutomatedDM(platform, target, personalizedMessage);
        
        if (success) {
          sentCount++;
        }
        
        // Add delay between messages
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`Failed to send DM to ${target}:`, error);
      }
    }

    // Update campaign
    setCampaigns(prev => 
      prev.map(c => 
        c.id === campaign.id 
          ? { ...c, sentCount, status: 'completed' as const }
          : c
      )
    );

    alert(`Outreach campaign complete: ${sentCount}/${targets.length} messages sent`);
    setOutreachTargets('');
    setIsLoading(false);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'negative': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">DM Automation Manager</h3>
        <Button onClick={loadConversations} disabled={isLoading} size="sm">
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b">
          {[
            { key: 'conversations', label: `Conversations (${conversations.length})` },
            { key: 'templates', label: `Templates (${templates.length})` },
            { key: 'campaigns', label: `Campaigns (${campaigns.length})` },
            { key: 'outreach', label: 'New Outreach' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-lime-500 text-lime-600 dark:text-lime-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations Tab */}
      {activeTab === 'conversations' && (
        <div>
          {selectedConversations.length > 0 && (
            <div className="mb-4 p-4 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground">{selectedConversations.length} conversations selected</span>
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    <option value="">Select template</option>
                    {templates.filter(t => t.enabled).map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <Button onClick={handleSendBulkDM} size="sm" disabled={!selectedTemplate}>
                    Send Bulk DM
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                className={`p-4 border rounded-lg ${
                  selectedConversations.includes(conversation.id) ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20' : 'border-border'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedConversations.includes(conversation.id)}
                    onChange={() => handleConversationToggle(conversation.id)}
                    className="mt-1 rounded"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-foreground">{conversation.participantUsername}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getSentimentColor(conversation.sentiment)}`}>
                        {getSentimentIcon(conversation.sentiment)}
                      </span>
                      {conversation.needsResponse && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs">
                          Needs Response
                        </span>
                      )}
                      {!conversation.isRead && (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs">
                          Unread
                        </span>
                      )}
                    </div>
                    
                    <p className="text-foreground mb-2">{conversation.lastMessage}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{new Date(conversation.lastMessageAt).toLocaleDateString()}</span>
                      <span>{conversation.messageCount} messages</span>
                      <span>{conversation.platform}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {conversations.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              No DM conversations found
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          {/* Create New Template */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-3">Create New Template</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                placeholder="Template name"
                value={newTemplate.name || ''}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Subject (optional)"
                value={newTemplate.subject || ''}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <textarea
              placeholder="Message template (use {username} for personalization)"
              value={newTemplate.message || ''}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, message: e.target.value }))}
              className="w-full p-3 border rounded-lg h-24 resize-none"
            />
            <div className="flex justify-end mt-3">
              <Button onClick={handleCreateTemplate} size="sm">
                Create Template
              </Button>
            </div>
          </div>

          {/* Existing Templates */}
          <div className="space-y-4">
            {templates.map(template => (
              <div key={template.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">{template.name}</h4>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={template.enabled}
                      onChange={(e) => setTemplates(prev => 
                        prev.map(t => 
                          t.id === template.id 
                            ? { ...t, enabled: e.target.checked }
                            : t
                        )
                      )}
                      className="rounded"
                    />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>
                
                {template.subject && (
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Subject:</strong> {template.subject}
                  </p>
                )}
                
                <p className="text-foreground mb-2">{template.message}</p>
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>Platform: {template.platform}</span>
                  <span>Triggers: {template.triggers.join(', ') || 'Manual'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div>
          <div className="space-y-4">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">{campaign.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    campaign.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    campaign.status === 'active' ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300' :
                    campaign.status === 'paused' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                    'bg-muted text-foreground'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-lime-600 dark:text-lime-400">{campaign.targets.length}</p>
                    <p className="text-xs text-muted-foreground">Targets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{campaign.sentCount}</p>
                    <p className="text-xs text-muted-foreground">Sent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{campaign.responseCount}</p>
                    <p className="text-xs text-muted-foreground">Responses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-muted-foreground">
                      {campaign.sentCount > 0 ? ((campaign.responseCount / campaign.sentCount) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Response Rate</p>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                  <span className="ml-4">Template: {campaign.template.name}</span>
                </div>
              </div>
            ))}
          </div>

          {campaigns.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No campaigns created yet
            </div>
          )}
        </div>
      )}

      {/* Outreach Tab */}
      {activeTab === 'outreach' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Select Template</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.filter(t => t.enabled).map(template => (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate === template.id ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20' : 'border-border hover:border-border'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <h5 className="font-medium text-foreground">{template.name}</h5>
                    <p className="text-sm text-muted-foreground mt-1">{template.message.substring(0, 100)}...</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Target Usernames</h4>
              <textarea
                placeholder="Enter usernames, one per line&#10;example_user1&#10;example_user2&#10;example_user3"
                value={outreachTargets}
                onChange={(e) => setOutreachTargets(e.target.value)}
                className="w-full p-3 border rounded-lg h-64 resize-none"
              />
              
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {outreachTargets.split('\n').filter(t => t.trim()).length} targets
                </span>
                <Button 
                  onClick={handleStartOutreachCampaign}
                  disabled={!selectedTemplate || !outreachTargets.trim() || isLoading}
                >
                  {isLoading ? 'Sending...' : 'Start Campaign'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
