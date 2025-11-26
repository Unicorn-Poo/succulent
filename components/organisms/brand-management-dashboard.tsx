'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';

interface BrandSettings {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  fonts: string[];
  voice: {
    tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'playful';
    personality: string[];
    dosList: string[];
    dontsList: string[];
  };
  hashtags: {
    primary: string[];
    secondary: string[];
    forbidden: string[];
  };
  mentions: {
    regular: string[];
    partners: string[];
    competitors: string[];
  };
  templates: {
    id: string;
    name: string;
    content: string;
    platforms: string[];
    category: string;
  }[];
  guidelines: {
    postingFrequency: Record<string, number>;
    contentMix: Record<string, number>;
    engagementRules: string[];
    approvalRequired: boolean;
  };
}

interface BrandConsistencyReport {
  overallScore: number;
  hashtagConsistency: number;
  voiceConsistency: number;
  visualConsistency: number;
  recommendations: string[];
  violations: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    postId?: string;
  }[];
}

interface BrandManagementDashboardProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

export default function BrandManagementDashboard({
  platform,
  profileKey,
  accountGroup
}: BrandManagementDashboardProps) {
  const [brandSettings, setBrandSettings] = useState<BrandSettings | null>(null);
  const [consistencyReport, setConsistencyReport] = useState<BrandConsistencyReport | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'templates' | 'guidelines' | 'consistency'>('settings');
  const [isLoading, setIsLoading] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    platforms: [platform],
    category: 'general'
  });

  // Initialize with default brand settings
  useEffect(() => {
    const defaultBrand: BrandSettings = {
      id: 'brand_1',
      name: 'My Brand',
      primaryColor: '#3B82F6',
      secondaryColor: '#EF4444',
      fonts: ['Inter', 'Roboto', 'Open Sans'],
      voice: {
        tone: 'friendly',
        personality: ['authentic', 'helpful', 'engaging', 'professional'],
        dosList: [
          'Use positive language',
          'Engage with comments promptly',
          'Share valuable insights',
          'Use brand hashtags consistently'
        ],
        dontsList: [
          'Post controversial content',
          'Use offensive language',
          'Ignore customer complaints',
          'Post without proofreading'
        ]
      },
      hashtags: {
        primary: ['brandname', 'industry', 'expertise'],
        secondary: ['motivation', 'tips', 'community', 'growth'],
        forbidden: ['competitor', 'spam', 'irrelevant']
      },
      mentions: {
        regular: ['@partner1', '@collaborator2'],
        partners: ['@mainpartner', '@strategicalliance'],
        competitors: ['@competitor1', '@competitor2']
      },
      templates: [
        {
          id: 'template_1',
          name: 'Educational Post',
          content: '💡 Quick tip: {tip}\n\nThis can help you {benefit}.\n\nWhat\'s your experience with this? Share below! 👇\n\n{hashtags}',
          platforms: ['instagram', 'linkedin'],
          category: 'educational'
        },
        {
          id: 'template_2',
          name: 'Behind the Scenes',
          content: '🎬 Behind the scenes: {activity}\n\n{description}\n\nLove seeing the process? Let me know! ✨\n\n{hashtags}',
          platforms: ['instagram', 'twitter'],
          category: 'lifestyle'
        },
        {
          id: 'template_3',
          name: 'Question Engagement',
          content: '🤔 Question for you: {question}\n\n{context}\n\nComment your thoughts below! I read every one 💬\n\n{hashtags}',
          platforms: ['twitter', 'linkedin', 'instagram'],
          category: 'engagement'
        }
      ],
      guidelines: {
        postingFrequency: {
          instagram: 7, // posts per week
          twitter: 14,
          linkedin: 3,
          facebook: 5
        },
        contentMix: {
          educational: 40,
          entertainment: 25,
          promotional: 20,
          personal: 15
        },
        engagementRules: [
          'Respond to comments within 2 hours during business hours',
          'Like all positive comments',
          'Address complaints publicly and professionally',
          'Share user-generated content when appropriate'
        ],
        approvalRequired: false
      }
    };

    setBrandSettings(defaultBrand);
    generateConsistencyReport(defaultBrand);
  }, []);

  const generateConsistencyReport = useCallback(async (brand: BrandSettings) => {
    setIsLoading(true);
    
    // Simulate brand consistency analysis
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const report: BrandConsistencyReport = {
      overallScore: 78,
      hashtagConsistency: 85,
      voiceConsistency: 72,
      visualConsistency: 77,
      recommendations: [
        'Increase use of primary brand hashtags by 15%',
        'Maintain consistent tone across all platforms',
        'Use brand colors more consistently in visual content',
        'Create more educational content to match brand positioning'
      ],
      violations: [
        {
          type: 'Hashtag Inconsistency',
          description: 'Post missing primary brand hashtags',
          severity: 'medium',
          postId: 'post_123'
        },
        {
          type: 'Voice Mismatch',
          description: 'Tone too casual for LinkedIn platform',
          severity: 'low',
          postId: 'post_124'
        },
        {
          type: 'Content Mix',
          description: 'Too many promotional posts this week',
          severity: 'high',
          postId: 'post_125'
        }
      ]
    };

    setConsistencyReport(report);
    setIsLoading(false);
  }, []);

  const updateBrandSettings = (updates: Partial<BrandSettings>) => {
    if (!brandSettings) return;
    
    const updatedBrand = { ...brandSettings, ...updates };
    setBrandSettings(updatedBrand);
    generateConsistencyReport(updatedBrand);
  };

  const addTemplate = () => {
    if (!brandSettings || !newTemplate.name || !newTemplate.content) {
      alert('Please fill in template name and content');
      return;
    }

    const template = {
      id: `template_${Date.now()}`,
      name: newTemplate.name,
      content: newTemplate.content,
      platforms: newTemplate.platforms,
      category: newTemplate.category
    };

    updateBrandSettings({
      templates: [...brandSettings.templates, template]
    });

    setNewTemplate({
      name: '',
      content: '',
      platforms: [platform],
      category: 'general'
    });
  };

  const removeTemplate = (templateId: string) => {
    if (!brandSettings) return;
    
    updateBrandSettings({
      templates: brandSettings.templates.filter(t => t.id !== templateId)
    });
  };

  const addHashtag = (category: 'primary' | 'secondary' | 'forbidden', hashtag: string) => {
    if (!brandSettings || !hashtag.trim()) return;
    
    const cleanHashtag = hashtag.replace('#', '').trim();
    const updatedHashtags = {
      ...brandSettings.hashtags,
      [category]: [...brandSettings.hashtags[category], cleanHashtag]
    };
    
    updateBrandSettings({ hashtags: updatedHashtags });
  };

  const removeHashtag = (category: 'primary' | 'secondary' | 'forbidden', hashtag: string) => {
    if (!brandSettings) return;
    
    const updatedHashtags = {
      ...brandSettings.hashtags,
      [category]: brandSettings.hashtags[category].filter(h => h !== hashtag)
    };
    
    updateBrandSettings({ hashtags: updatedHashtags });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600 dark:text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      default: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  if (!brandSettings) {
    return (
      <div className="bg-card rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-muted-foreground">Loading brand settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Brand Management Dashboard</h3>
        <Button 
          onClick={() => brandSettings && generateConsistencyReport(brandSettings)} 
          disabled={isLoading}
        >
          {isLoading ? 'Analyzing...' : 'Analyze Consistency'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b">
          {[
            { key: 'settings', label: 'Brand Settings' },
            { key: 'templates', label: `Templates (${brandSettings.templates.length})` },
            { key: 'guidelines', label: 'Guidelines' },
            { key: 'consistency', label: 'Consistency Report' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Brand Name</label>
              <Input
                value={brandSettings.name}
                onChange={(e) => updateBrandSettings({ name: e.target.value })}
                placeholder="Enter brand name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Brand Voice Tone</label>
              <select
                value={brandSettings.voice.tone}
                onChange={(e) => updateBrandSettings({
                  voice: { ...brandSettings.voice, tone: e.target.value as any }
                })}
                className="w-full px-3 py-2 border border-border rounded-lg"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="authoritative">Authoritative</option>
                <option value="playful">Playful</option>
              </select>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Primary Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={brandSettings.primaryColor}
                  onChange={(e) => updateBrandSettings({ primaryColor: e.target.value })}
                  className="w-12 h-10 border rounded"
                />
                <Input
                  value={brandSettings.primaryColor}
                  onChange={(e) => updateBrandSettings({ primaryColor: e.target.value })}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Secondary Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={brandSettings.secondaryColor}
                  onChange={(e) => updateBrandSettings({ secondaryColor: e.target.value })}
                  className="w-12 h-10 border rounded"
                />
                <Input
                  value={brandSettings.secondaryColor}
                  onChange={(e) => updateBrandSettings({ secondaryColor: e.target.value })}
                  placeholder="#EF4444"
                />
              </div>
            </div>
          </div>

          {/* Hashtags */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Brand Hashtags</h4>
            
            {(['primary', 'secondary', 'forbidden'] as const).map(category => (
              <div key={category} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium capitalize">{category} Hashtags</h5>
                  <Button
                    size="sm"
                    onClick={() => {
                      const hashtag = prompt(`Add ${category} hashtag:`);
                      if (hashtag) addHashtag(category, hashtag);
                    }}
                  >
                    Add
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {brandSettings.hashtags[category].map(hashtag => (
                    <span
                      key={hashtag}
                      className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 ${
                        category === 'forbidden' 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : category === 'primary'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <span>#{hashtag}</span>
                      <button
                        onClick={() => removeHashtag(category, hashtag)}
                        className="text-current hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Add New Template */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-3">Create New Template</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                placeholder="Template name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
              />
              <select
                value={newTemplate.category}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 border border-border rounded-lg"
              >
                <option value="general">General</option>
                <option value="educational">Educational</option>
                <option value="promotional">Promotional</option>
                <option value="engagement">Engagement</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
            </div>
            <textarea
              placeholder="Template content (use {variables} for dynamic content)"
              value={newTemplate.content}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
              className="w-full p-3 border rounded-lg h-24 resize-none mb-4"
            />
            <div className="flex justify-end">
              <Button onClick={addTemplate} size="sm">
                Add Template
              </Button>
            </div>
          </div>

          {/* Existing Templates */}
          <div className="space-y-4">
            {brandSettings.templates.map(template => (
              <div key={template.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-foreground">{template.name}</h4>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs">
                      {template.category}
                    </span>
                  </div>
                  <Button
                    onClick={() => removeTemplate(template.id)}
                    size="sm"
                    variant="outline"
                  >
                    Remove
                  </Button>
                </div>
                
                <p className="text-gray-800 dark:text-gray-200 mb-3 whitespace-pre-wrap">{template.content}</p>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>Platforms: {template.platforms.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guidelines Tab */}
      {activeTab === 'guidelines' && (
        <div className="space-y-6">
          {/* Posting Frequency */}
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Posting Frequency (per week)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(brandSettings.guidelines.postingFrequency).map(([platform, frequency]) => (
                <div key={platform} className="text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{frequency}</p>
                  <p className="text-sm text-muted-foreground capitalize">{platform}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Content Mix */}
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Content Mix Distribution</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(brandSettings.guidelines.contentMix).map(([type, percentage]) => (
                <div key={type} className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{percentage}%</p>
                  <p className="text-sm text-muted-foreground capitalize">{type}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement Rules */}
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Engagement Rules</h4>
            <ul className="space-y-2">
              {brandSettings.guidelines.engagementRules.map((rule, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-sm">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Consistency Report Tab */}
      {activeTab === 'consistency' && consistencyReport && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <p className={`text-3xl font-bold ${getScoreColor(consistencyReport.overallScore)}`}>
                {consistencyReport.overallScore}%
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Overall Score</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <p className={`text-3xl font-bold ${getScoreColor(consistencyReport.hashtagConsistency)}`}>
                {consistencyReport.hashtagConsistency}%
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">Hashtag Consistency</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
              <p className={`text-3xl font-bold ${getScoreColor(consistencyReport.voiceConsistency)}`}>
                {consistencyReport.voiceConsistency}%
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300">Voice Consistency</p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
              <p className={`text-3xl font-bold ${getScoreColor(consistencyReport.visualConsistency)}`}>
                {consistencyReport.visualConsistency}%
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Visual Consistency</p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h4 className="font-medium text-green-800 dark:text-green-300 mb-3">Recommendations</h4>
            <ul className="space-y-2">
              {consistencyReport.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2 text-green-700 dark:text-green-300">
                  <span className="text-green-500 mt-1">💡</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Violations */}
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Brand Violations</h4>
            <div className="space-y-3">
              {consistencyReport.violations.map((violation, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${getSeverityColor(violation.severity)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-medium text-foreground">{violation.type}</h5>
                    <span className="text-xs uppercase font-medium">{violation.severity}</span>
                  </div>
                  <p className="text-sm">{violation.description}</p>
                  {violation.postId && (
                    <p className="text-xs mt-1 opacity-75">Post ID: {violation.postId}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
