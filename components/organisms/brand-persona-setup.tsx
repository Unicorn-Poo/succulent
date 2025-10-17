'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';
import { BrandPersona, BrandPersonaManager, getDefaultBrandPersonas, saveBrandPersona, loadBrandPersona } from '../../utils/brandPersonaManager';
import { 
  generateChatGPTPersonaPrompt, 
  parseChatGPTPersonaResponse, 
  getPersonaPromptExamples,
  generateQuickPersonaPrompt,
  validatePersonaCompleteness,
  PersonaPromptInput 
} from '../../utils/personaPromptGenerator';

interface BrandPersonaSetupProps {
  accountGroup?: any;
  onPersonaUpdated?: (persona: BrandPersona) => void;
}

export default function BrandPersonaSetup({
  accountGroup,
  onPersonaUpdated
}: BrandPersonaSetupProps) {
  const [currentPersona, setCurrentPersona] = useState<BrandPersona | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [setupMethod, setSetupMethod] = useState<'choose' | 'chatgpt' | 'manual' | 'edit'>('choose');
  const [activeTab, setActiveTab] = useState<'overview' | 'voice' | 'messaging' | 'engagement' | 'content' | 'examples'>('overview');
  const [defaultPersonas] = useState(getDefaultBrandPersonas());
  const [promptExamples] = useState(getPersonaPromptExamples());
  
  // ChatGPT setup states
  const [promptInput, setPromptInput] = useState<PersonaPromptInput>({
    brandName: '',
    industry: '',
    targetAudience: '',
    brandDescription: '',
    personalityTraits: '',
    contentFocus: '',
    platforms: ['instagram']
  });
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [chatgptResponse, setChatgptResponse] = useState<string>('');
  const [showPrompt, setShowPrompt] = useState(false);

  // Load existing persona
  useEffect(() => {
    if (accountGroup) {
      const existingPersona = loadBrandPersona(accountGroup);
      if (existingPersona) {
        setCurrentPersona(existingPersona);
      }
    }
  }, [accountGroup]);

  const handleSavePersona = async () => {
    if (!currentPersona || !accountGroup) return;

    try {
      await saveBrandPersona(accountGroup, currentPersona);
      onPersonaUpdated?.(currentPersona);
      setIsEditing(false);
      alert('Brand persona saved successfully!');
    } catch (error) {
      console.error('Error saving persona:', error);
      alert('Failed to save brand persona');
    }
  };

  const handleUseTemplate = (templateId: string) => {
    const template = defaultPersonas.find(p => p.id === templateId);
    if (template) {
      setCurrentPersona({ ...template });
      setIsEditing(true);
    }
  };

  const handleGeneratePrompt = () => {
    if (!promptInput.brandName || !promptInput.industry || !promptInput.brandDescription) {
      alert('Please fill in at least Brand Name, Industry, and Brand Description');
      return;
    }

    const prompt = generateChatGPTPersonaPrompt(promptInput);
    setGeneratedPrompt(prompt);
    setShowPrompt(true);
  };

  const handleQuickPrompt = () => {
    if (!promptInput.brandName || !promptInput.brandDescription) {
      alert('Please fill in Brand Name and Description for quick prompt');
      return;
    }

    const quickPrompt = generateQuickPersonaPrompt(
      promptInput.brandName,
      promptInput.brandDescription,
      promptInput.platforms
    );
    setGeneratedPrompt(quickPrompt);
    setShowPrompt(true);
  };

  const handleParseChatGPTResponse = () => {
    if (!chatgptResponse.trim()) {
      alert('Please paste the ChatGPT response');
      return;
    }

    const parsedPersona = parseChatGPTPersonaResponse(chatgptResponse);
    if (parsedPersona) {
      setCurrentPersona(parsedPersona);
      setSetupMethod('edit');
      setIsEditing(true);
      alert('Persona imported successfully from ChatGPT!');
    } else {
      alert('Failed to parse ChatGPT response. Please check the format and try again.');
    }
  };

  const handleUseExample = (example: PersonaPromptInput) => {
    setPromptInput(example);
  };

  const copyPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      alert('Prompt copied to clipboard! Paste it into ChatGPT.');
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      alert('Failed to copy prompt. Please select and copy manually.');
    }
  };

  const handleCreateCustom = () => {
    const customPersona: BrandPersona = {
      id: `custom_${Date.now()}`,
      name: 'My Brand',
      description: 'Custom brand persona',
      voice: {
        tone: 'friendly',
        personality: ['authentic', 'helpful'],
        writingStyle: 'conversational',
        emojiUsage: 'moderate',
        languageLevel: 'intermediate'
      },
      messaging: {
        keyMessages: ['Quality content', 'Community first'],
        valueProposition: 'Providing value to my community',
        targetAudience: 'My ideal followers',
        contentPillars: ['tips', 'insights', 'community'],
        avoidTopics: ['controversial topics']
      },
      engagement: {
        commentStyle: 'supportive',
        dmApproach: 'friendly',
        hashtagStrategy: 'mixed',
        mentionStyle: 'active'
      },
      contentGuidelines: {
        postLength: 'medium',
        contentMix: { educational: 40, entertainment: 30, promotional: 20, personal: 10 },
        callToActionStyle: 'direct',
        questionFrequency: 'frequent'
      },
      platformCustomization: {},
      examples: {
        samplePosts: [],
        sampleReplies: [],
        sampleDMs: []
      }
    };

    setCurrentPersona(customPersona);
    setSetupMethod('edit');
    setIsEditing(true);
  };

  const updatePersona = (updates: Partial<BrandPersona>) => {
    if (!currentPersona) return;
    setCurrentPersona({ ...currentPersona, ...updates });
  };

  const updateVoice = (updates: Partial<BrandPersona['voice']>) => {
    if (!currentPersona) return;
    setCurrentPersona({
      ...currentPersona,
      voice: { ...currentPersona.voice, ...updates }
    });
  };

  const updateMessaging = (updates: Partial<BrandPersona['messaging']>) => {
    if (!currentPersona) return;
    setCurrentPersona({
      ...currentPersona,
      messaging: { ...currentPersona.messaging, ...updates }
    });
  };

  const updateEngagement = (updates: Partial<BrandPersona['engagement']>) => {
    if (!currentPersona) return;
    setCurrentPersona({
      ...currentPersona,
      engagement: { ...currentPersona.engagement, ...updates }
    });
  };

  const updateContentGuidelines = (updates: Partial<BrandPersona['contentGuidelines']>) => {
    if (!currentPersona) return;
    setCurrentPersona({
      ...currentPersona,
      contentGuidelines: { ...currentPersona.contentGuidelines, ...updates }
    });
  };

  // Test the persona with sample content
  const testPersona = () => {
    if (!currentPersona) return;

    const manager = new BrandPersonaManager(currentPersona);
    const testPost = manager.generateBrandedContent('social media tips', 'post', 'instagram');
    const testReply = manager.generateContextualReply('Great post!', 'positive', 'instagram');
    
    alert(`Test Results:\n\nSample Post:\n${testPost}\n\nSample Reply:\n${testReply}`);
  };

  if (!currentPersona && setupMethod === 'choose') {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white">🎨</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Set Your Brand Persona</h3>
          <p className="text-gray-600 mb-6">
            Define your brand voice and tone to ensure all AI automation matches your style perfectly.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {defaultPersonas.map(persona => (
              <div
                key={persona.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                onClick={() => handleUseTemplate(persona.id)}
              >
                <h4 className="font-medium text-gray-900 mb-2">{persona.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{persona.description}</p>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {persona.voice.tone}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    {persona.voice.emojiUsage} emojis
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <Button 
              onClick={() => setSetupMethod('chatgpt')} 
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              🤖 Use ChatGPT (Recommended)
            </Button>
            <Button 
              onClick={() => setSetupMethod('manual')} 
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              🎨 Create Custom Persona
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ChatGPT Setup Interface
  if (setupMethod === 'chatgpt') {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🤖 ChatGPT Persona Generator</h3>
            <p className="text-sm text-gray-600">Let AI create your perfect brand persona in seconds</p>
          </div>
          <Button onClick={() => setSetupMethod('choose')} variant="outline" size="sm">
            ← Back to Options
          </Button>
        </div>

        {!showPrompt ? (
          <div className="space-y-6">
            {/* Quick Examples */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">🚀 Quick Setup (30 seconds)</h4>
                <p className="text-sm text-blue-600 mb-3">Just fill in the basics and get a simple prompt</p>
                <div className="space-y-3">
                  <Input
                    placeholder="Brand name (e.g., 'Wellness With Sarah')"
                    value={promptInput.brandName}
                    onChange={(e) => setPromptInput(prev => ({ ...prev, brandName: e.target.value }))}
                  />
                  <textarea
                    placeholder="Brief brand description (e.g., 'I help busy women prioritize wellness...')"
                    value={promptInput.brandDescription}
                    onChange={(e) => setPromptInput(prev => ({ ...prev, brandDescription: e.target.value }))}
                    className="w-full p-3 border rounded-lg h-20 resize-none"
                  />
                  <Button onClick={handleQuickPrompt} className="w-full">
                    Generate Quick Prompt
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">⚡ Detailed Setup (2 minutes)</h4>
                <p className="text-sm text-green-600 mb-3">Fill out more details for a comprehensive persona</p>
                <div className="space-y-3">
                  <Input
                    placeholder="Industry (e.g., 'Health & Wellness')"
                    value={promptInput.industry}
                    onChange={(e) => setPromptInput(prev => ({ ...prev, industry: e.target.value }))}
                  />
                  <Input
                    placeholder="Target audience (e.g., 'Busy professionals aged 25-45')"
                    value={promptInput.targetAudience}
                    onChange={(e) => setPromptInput(prev => ({ ...prev, targetAudience: e.target.value }))}
                  />
                  <Button onClick={handleGeneratePrompt} className="w-full">
                    Generate Detailed Prompt
                  </Button>
                </div>
              </div>
            </div>

            {/* Example Templates */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">💡 Use These Examples (Click to Fill)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promptExamples.slice(0, 4).map((example, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                    onClick={() => handleUseExample(example)}
                  >
                    <h5 className="font-medium text-gray-900 mb-2">{example.brandName}</h5>
                    <p className="text-sm text-gray-600 mb-2">{example.industry}</p>
                    <p className="text-xs text-gray-500">{example.brandDescription.substring(0, 100)}...</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual Input Form */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">📝 Or Fill Out Details Manually</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  placeholder="Brand Name"
                  value={promptInput.brandName}
                  onChange={(e) => setPromptInput(prev => ({ ...prev, brandName: e.target.value }))}
                />
                <Input
                  placeholder="Industry"
                  value={promptInput.industry}
                  onChange={(e) => setPromptInput(prev => ({ ...prev, industry: e.target.value }))}
                />
              </div>

              <div className="space-y-4">
                <textarea
                  placeholder="Target Audience (e.g., 'Busy professionals aged 25-45 who want to improve productivity')"
                  value={promptInput.targetAudience}
                  onChange={(e) => setPromptInput(prev => ({ ...prev, targetAudience: e.target.value }))}
                  className="w-full p-3 border rounded-lg h-20 resize-none"
                />
                
                <textarea
                  placeholder="Brand Description (e.g., 'We help entrepreneurs automate their workflows and scale efficiently')"
                  value={promptInput.brandDescription}
                  onChange={(e) => setPromptInput(prev => ({ ...prev, brandDescription: e.target.value }))}
                  className="w-full p-3 border rounded-lg h-20 resize-none"
                />
                
                <Input
                  placeholder="Personality Traits (e.g., 'professional, helpful, innovative, trustworthy')"
                  value={promptInput.personalityTraits}
                  onChange={(e) => setPromptInput(prev => ({ ...prev, personalityTraits: e.target.value }))}
                />
                
                <Input
                  placeholder="Content Focus (e.g., 'productivity tips, automation tools, case studies')"
                  value={promptInput.contentFocus}
                  onChange={(e) => setPromptInput(prev => ({ ...prev, contentFocus: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleQuickPrompt} variant="outline" className="flex-1">
                  Generate Quick Prompt
                </Button>
                <Button onClick={handleGeneratePrompt} className="flex-1 bg-green-600 hover:bg-green-700">
                  Generate Detailed Prompt
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Generated Prompt Display */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">📋 Generated ChatGPT Prompt</h4>
                <div className="flex gap-2">
                  <Button onClick={copyPromptToClipboard} size="sm" variant="outline">
                    📋 Copy Prompt
                  </Button>
                  <Button onClick={() => setShowPrompt(false)} size="sm" variant="outline">
                    ← Edit Details
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 border rounded-lg max-h-64 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap text-gray-700">{generatedPrompt}</pre>
              </div>
              
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Instructions:</strong>
                  1. Copy the prompt above
                  2. Paste it into ChatGPT
                  3. Copy ChatGPT's JSON response
                  4. Paste it below to import your persona
                </p>
              </div>
            </div>

            {/* ChatGPT Response Input */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">🤖 Paste ChatGPT Response</h4>
              <textarea
                placeholder="Paste the complete JSON response from ChatGPT here..."
                value={chatgptResponse}
                onChange={(e) => setChatgptResponse(e.target.value)}
                className="w-full p-4 border rounded-lg h-40 resize-none font-mono text-sm"
              />
              
              <div className="flex gap-3 mt-4">
                <Button 
                  onClick={handleParseChatGPTResponse}
                  disabled={!chatgptResponse.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  🎯 Import Persona from ChatGPT
                </Button>
                <Button 
                  onClick={() => setSetupMethod('manual')}
                  variant="outline"
                >
                  Skip ChatGPT & Create Manually
                </Button>
              </div>
            </div>

            {/* Validation Helper */}
            {chatgptResponse && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  💡 <strong>Tip:</strong> Make sure you copied the complete JSON response from ChatGPT, 
                  including the opening { and closing } brackets.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Manual Setup Interface  
  if (setupMethod === 'manual') {
    setIsEditing(true);
    handleCreateCustom();
  }

  if (!currentPersona) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">🎨 Brand Persona: {currentPersona.name}</h3>
          <p className="text-sm text-gray-600">{currentPersona.description}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={testPersona} variant="outline" size="sm">
            🧪 Test Persona
          </Button>
          
          {isEditing ? (
            <>
              <Button onClick={handleSavePersona} className="bg-green-600 hover:bg-green-700">
                💾 Save Persona
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline">
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              ✏️ Edit Persona
            </Button>
          )}
        </div>
      </div>

      {!isEditing ? (
        // Display Mode
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800">Voice Tone</h4>
              <p className="text-2xl font-bold text-blue-900 capitalize">{currentPersona.voice.tone}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800">Writing Style</h4>
              <p className="text-2xl font-bold text-green-900 capitalize">{currentPersona.voice.writingStyle}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-800">Emoji Usage</h4>
              <p className="text-2xl font-bold text-purple-900 capitalize">{currentPersona.voice.emojiUsage}</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-800">Comment Style</h4>
              <p className="text-2xl font-bold text-yellow-900 capitalize">{currentPersona.engagement.commentStyle}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Content Pillars</h4>
              <div className="flex flex-wrap gap-2">
                {currentPersona.messaging.contentPillars.map(pillar => (
                  <span key={pillar} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {pillar}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Content Mix</h4>
              <div className="space-y-2">
                {Object.entries(currentPersona.contentGuidelines.contentMix).map(([type, percentage]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="capitalize">{type}</span>
                    <span className="font-medium">{percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Value Proposition</h4>
            <p className="text-gray-700">{currentPersona.messaging.valueProposition}</p>
          </div>
        </div>
      ) : (
        // Edit Mode
        <div>
          {/* Tabs */}
          <div className="mb-6">
            <div className="flex space-x-1 border-b">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'voice', label: 'Voice & Tone' },
                { key: 'messaging', label: 'Messaging' },
                { key: 'engagement', label: 'Engagement' },
                { key: 'content', label: 'Content Guidelines' },
                { key: 'examples', label: 'Examples' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Brand Name</label>
                <Input
                  value={currentPersona.name}
                  onChange={(e) => updatePersona({ name: e.target.value })}
                  placeholder="Enter your brand name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={currentPersona.description}
                  onChange={(e) => updatePersona({ description: e.target.value })}
                  placeholder="Describe your brand persona"
                  className="w-full p-3 border rounded-lg h-20 resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tone</label>
                  <select
                    value={currentPersona.voice.tone}
                    onChange={(e) => updateVoice({ tone: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="friendly">Friendly</option>
                    <option value="authoritative">Authoritative</option>
                    <option value="playful">Playful</option>
                    <option value="inspirational">Inspirational</option>
                    <option value="educational">Educational</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Writing Style</label>
                  <select
                    value={currentPersona.voice.writingStyle}
                    onChange={(e) => updateVoice({ writingStyle: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="formal">Formal</option>
                    <option value="conversational">Conversational</option>
                    <option value="witty">Witty</option>
                    <option value="direct">Direct</option>
                    <option value="storytelling">Storytelling</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Emoji Usage</label>
                  <select
                    value={currentPersona.voice.emojiUsage}
                    onChange={(e) => updateVoice({ emojiUsage: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="none">None</option>
                    <option value="minimal">Minimal (0-2 per post)</option>
                    <option value="moderate">Moderate (1-4 per post)</option>
                    <option value="frequent">Frequent (2-8 per post)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Language Level</label>
                  <select
                    value={currentPersona.voice.languageLevel}
                    onChange={(e) => updateVoice({ languageLevel: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="simple">Simple & Clear</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert/Technical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Personality Traits</label>
                <Input
                  value={currentPersona.voice.personality.join(', ')}
                  onChange={(e) => updateVoice({ 
                    personality: e.target.value.split(',').map(trait => trait.trim()) 
                  })}
                  placeholder="authentic, helpful, inspiring, professional"
                />
                <p className="text-xs text-gray-500 mt-1">Separate traits with commas</p>
              </div>
            </div>
          )}

          {activeTab === 'messaging' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Value Proposition</label>
                <textarea
                  value={currentPersona.messaging.valueProposition}
                  onChange={(e) => updateMessaging({ valueProposition: e.target.value })}
                  placeholder="What unique value do you provide to your audience?"
                  className="w-full p-3 border rounded-lg h-20 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Target Audience</label>
                <Input
                  value={currentPersona.messaging.targetAudience}
                  onChange={(e) => updateMessaging({ targetAudience: e.target.value })}
                  placeholder="Who is your ideal audience?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content Pillars</label>
                <Input
                  value={currentPersona.messaging.contentPillars.join(', ')}
                  onChange={(e) => updateMessaging({ 
                    contentPillars: e.target.value.split(',').map(pillar => pillar.trim()) 
                  })}
                  placeholder="wellness, productivity, technology, lifestyle"
                />
                <p className="text-xs text-gray-500 mt-1">Main topics you focus on (separate with commas)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Topics to Avoid</label>
                <Input
                  value={currentPersona.messaging.avoidTopics.join(', ')}
                  onChange={(e) => updateMessaging({ 
                    avoidTopics: e.target.value.split(',').map(topic => topic.trim()) 
                  })}
                  placeholder="politics, controversial topics, negative news"
                />
                <p className="text-xs text-gray-500 mt-1">Topics that don't align with your brand</p>
              </div>
            </div>
          )}

          {activeTab === 'engagement' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Comment Reply Style</label>
                  <select
                    value={currentPersona.engagement.commentStyle}
                    onChange={(e) => updateEngagement({ commentStyle: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="brief">Brief & Concise</option>
                    <option value="detailed">Detailed & Thorough</option>
                    <option value="questions">Ask Follow-up Questions</option>
                    <option value="supportive">Supportive & Encouraging</option>
                    <option value="expert">Expert & Informative</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">DM Approach</label>
                  <select
                    value={currentPersona.engagement.dmApproach}
                    onChange={(e) => updateEngagement({ dmApproach: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="direct">Direct</option>
                    <option value="collaborative">Collaborative</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Hashtag Strategy</label>
                  <select
                    value={currentPersona.engagement.hashtagStrategy}
                    onChange={(e) => updateEngagement({ hashtagStrategy: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="branded">Brand-focused</option>
                    <option value="trending">Trending-focused</option>
                    <option value="niche">Niche-specific</option>
                    <option value="mixed">Mixed Strategy</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Mention Style</label>
                  <select
                    value={currentPersona.engagement.mentionStyle}
                    onChange={(e) => updateEngagement({ mentionStyle: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="conservative">Conservative</option>
                    <option value="active">Active</option>
                    <option value="strategic">Strategic</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred Post Length</label>
                  <select
                    value={currentPersona.contentGuidelines.postLength}
                    onChange={(e) => updateContentGuidelines({ postLength: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="short">Short (50-150 chars)</option>
                    <option value="medium">Medium (100-300 chars)</option>
                    <option value="long">Long (200-500 chars)</option>
                    <option value="varies">Varies by Content</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Call-to-Action Style</label>
                  <select
                    value={currentPersona.contentGuidelines.callToActionStyle}
                    onChange={(e) => updateContentGuidelines({ callToActionStyle: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="subtle">Subtle</option>
                    <option value="direct">Direct</option>
                    <option value="creative">Creative</option>
                    <option value="none">No CTAs</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Content Mix Distribution</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(currentPersona.contentGuidelines.contentMix).map(([type, percentage]) => (
                    <div key={type}>
                      <label className="block text-xs text-gray-600 mb-1 capitalize">{type}</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={percentage}
                        onChange={(e) => updateContentGuidelines({
                          contentMix: {
                            ...currentPersona.contentGuidelines.contentMix,
                            [type]: parseInt(e.target.value)
                          }
                        })}
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Sample Posts (AI will learn from these)</h4>
                {currentPersona.examples.samplePosts.map((post, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg mb-3">
                    <p className="text-sm whitespace-pre-wrap">{post}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-medium mb-3">Sample Replies</h4>
                {currentPersona.examples.sampleReplies.map((reply, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg mb-2">
                    <p className="text-sm">{reply}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Integration Notice */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">🤖 AI Integration</h4>
        <p className="text-sm text-blue-700">
          This persona will guide all AI automation tools including auto-replies, content generation, 
          hashtag selection, and DM campaigns to ensure consistent brand voice across all platforms.
        </p>
      </div>
    </div>
  );
}
