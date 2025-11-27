'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';
import { BrandPersona, BrandPersonaManager, getDefaultBrandPersonas, saveBrandPersona, loadBrandPersona, deleteBrandPersona } from '../../utils/brandPersonaManager';
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

// Prompt for extracting brand voice from example posts
const generateExamplePostsPrompt = (posts: string[], brandName: string): string => {
  return `Analyze these example social media posts and create a detailed brand persona JSON.

EXAMPLE POSTS:
${posts.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

Brand Name: ${brandName || 'My Brand'}

Based on these posts, analyze:
1. The tone and voice (professional, casual, friendly, etc.)
2. Writing style patterns (formal, conversational, witty, etc.)
3. Emoji usage frequency
4. Content themes/pillars
5. Target audience inferred from content
6. Key messages being communicated

Return a JSON object with this EXACT structure:
{
  "name": "${brandName || 'My Brand'}",
  "description": "Brief description of the brand based on the posts",
  "voice": {
    "tone": "professional" | "casual" | "friendly" | "authoritative" | "playful" | "inspirational" | "educational",
    "personality": ["trait1", "trait2", "trait3"],
    "writingStyle": "formal" | "conversational" | "witty" | "direct" | "storytelling" | "technical",
    "emojiUsage": "none" | "minimal" | "moderate" | "frequent",
    "languageLevel": "simple" | "intermediate" | "advanced" | "expert"
  },
  "messaging": {
    "keyMessages": ["message1", "message2", "message3"],
    "valueProposition": "The core value this brand provides",
    "targetAudience": "Description of target audience",
    "contentPillars": ["pillar1", "pillar2", "pillar3"],
    "avoidTopics": ["topic1", "topic2"]
  },
  "engagement": {
    "commentStyle": "brief" | "detailed" | "questions" | "supportive" | "expert",
    "dmApproach": "professional" | "friendly" | "direct" | "collaborative",
    "hashtagStrategy": "branded" | "trending" | "niche" | "mixed",
    "mentionStyle": "conservative" | "active" | "strategic"
  },
  "contentGuidelines": {
    "postLength": "short" | "medium" | "long" | "varies",
    "contentMix": { "educational": 40, "entertainment": 30, "promotional": 20, "personal": 10 },
    "callToActionStyle": "subtle" | "direct" | "creative" | "none",
    "questionFrequency": "rare" | "occasional" | "frequent" | "always"
  },
  "platformCustomization": {},
  "examples": {
    "samplePosts": ${JSON.stringify(posts.slice(0, 3))},
    "sampleReplies": [],
    "sampleDMs": []
  }
}

IMPORTANT: Return ONLY the JSON object, no additional text.`;
};

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
  
  // Example posts import states
  const [examplePosts, setExamplePosts] = useState<string[]>(['', '', '']);
  const [showExamplePostsPrompt, setShowExamplePostsPrompt] = useState(false);
  const [examplePostsPrompt, setExamplePostsPrompt] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // New states for copy/paste JSON and re-import
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonImportValue, setJsonImportValue] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load existing persona
  useEffect(() => {
    if (accountGroup) {
      const existingPersona = loadBrandPersona(accountGroup);
      if (existingPersona) {
        setCurrentPersona(existingPersona);
        setSetupMethod('edit');
      }
    }
  }, [accountGroup]);

  const handleSavePersona = async () => {
    if (!currentPersona || !accountGroup) return;

    setIsSaving(true);
    try {
      await saveBrandPersona(accountGroup, currentPersona);
      onPersonaUpdated?.(currentPersona);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving persona:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate prompt from example posts
  const handleGenerateFromExamples = () => {
    const filledPosts = examplePosts.filter(p => p.trim().length > 0);
    if (filledPosts.length < 2) {
      alert('Please enter at least 2 example posts to analyze');
      return;
    }

    const prompt = generateExamplePostsPrompt(filledPosts, promptInput.brandName);
    setExamplePostsPrompt(prompt);
    setShowExamplePostsPrompt(true);
  };

  const copyExamplePostsPrompt = async () => {
    try {
      await navigator.clipboard.writeText(examplePostsPrompt);
      alert('Prompt copied! Paste it into ChatGPT or Claude.');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleUseTemplate = (templateId: string) => {
    const template = defaultPersonas.find(p => p.id === templateId);
    if (template) {
      setCurrentPersona({ ...template });
      setSetupMethod('edit');
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

  // Delete persona handler
  const handleDeletePersona = async () => {
    if (!accountGroup) return;
    
    setIsDeleting(true);
    try {
      await deleteBrandPersona(accountGroup);
      setCurrentPersona(null);
      setSetupMethod('choose');
      setShowDeleteConfirm(false);
      onPersonaUpdated?.(null as any);
    } catch (error) {
      console.error('Error deleting persona:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate JSON prompt template for external ChatGPT
  const getJsonPromptTemplate = () => {
    return `Create a brand persona JSON for my social media AI tools. Return ONLY valid JSON with this exact structure:

{
  "name": "Brand Name",
  "description": "Brief brand description",
  "voice": {
    "tone": "professional|casual|friendly|authoritative|playful|inspirational|educational",
    "personality": ["trait1", "trait2", "trait3"],
    "writingStyle": "formal|conversational|witty|direct|storytelling|technical",
    "emojiUsage": "none|minimal|moderate|frequent",
    "languageLevel": "simple|intermediate|advanced|expert"
  },
  "messaging": {
    "keyMessages": ["message1", "message2", "message3"],
    "valueProposition": "Your unique value statement",
    "targetAudience": "Description of target audience",
    "contentPillars": ["pillar1", "pillar2", "pillar3"],
    "avoidTopics": ["topic1", "topic2"]
  },
  "engagement": {
    "commentStyle": "brief|detailed|questions|supportive|expert",
    "dmApproach": "professional|friendly|direct|collaborative",
    "hashtagStrategy": "branded|trending|niche|mixed",
    "mentionStyle": "conservative|active|strategic"
  },
  "contentGuidelines": {
    "postLength": "short|medium|long|varies",
    "contentMix": { "educational": 40, "entertainment": 30, "promotional": 20, "personal": 10 },
    "callToActionStyle": "subtle|direct|creative|none",
    "questionFrequency": "rare|occasional|frequent|always"
  },
  "examples": {
    "samplePosts": ["Example post 1", "Example post 2"],
    "sampleReplies": ["Example reply 1"],
    "sampleDMs": ["Example DM 1"]
  }
}

Return ONLY the JSON, no additional text or markdown.`;
  };

  // Copy JSON prompt template
  const copyJsonPromptTemplate = async () => {
    try {
      await navigator.clipboard.writeText(getJsonPromptTemplate());
      alert('JSON prompt template copied! Paste it into your ChatGPT conversation.');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Import persona from pasted JSON
  const handleImportFromJson = () => {
    if (!jsonImportValue.trim()) {
      alert('Please paste JSON content');
      return;
    }

    const parsedPersona = parseChatGPTPersonaResponse(jsonImportValue);
    if (parsedPersona) {
      setCurrentPersona(parsedPersona);
      setIsEditing(true);
      setShowJsonImport(false);
      setJsonImportValue('');
      alert('Persona imported successfully!');
    } else {
      alert('Failed to parse JSON. Please check the format and try again.');
    }
  };

  // Handle manual setup
  useEffect(() => {
    if (setupMethod === 'manual') {
      handleCreateCustom();
    }
  }, [setupMethod]);

  // Render different interfaces based on setup method
  const renderChooseInterface = () => (
    <div className="bg-card rounded-lg shadow-sm border dark:border-border p-6">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-white">🎨</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Set Your Brand Persona</h3>
        <p className="text-muted-foreground mb-6">
          Define your brand voice and tone to ensure all AI automation matches your style perfectly.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {defaultPersonas.map(persona => (
            <div
              key={persona.id}
              className="p-4 border border-border rounded-lg hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors dark:bg-muted"
              onClick={() => handleUseTemplate(persona.id)}
            >
              <h4 className="font-medium text-foreground mb-2">{persona.name}</h4>
              <p className="text-sm text-muted-foreground mb-3">{persona.description}</p>
              <div className="flex items-center space-x-2 text-xs">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                  {persona.voice.tone}
                </span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
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

  const renderChatGPTInterface = () => (
    <div className="bg-card rounded-lg shadow-sm border dark:border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">🤖 ChatGPT Persona Generator</h3>
          <p className="text-sm text-muted-foreground">Let AI create your perfect brand persona in seconds</p>
        </div>
        <Button onClick={() => setSetupMethod('choose')} variant="outline" size="1">
          ← Back to Options
        </Button>
      </div>

      {/* Quick Import from Example Posts */}
      {!showPrompt && !showExamplePostsPrompt && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-2">⚡ Quick Import: Learn from Your Posts</h4>
          <p className="text-sm text-purple-600 dark:text-purple-400 dark:text-purple-400 mb-4">
            Paste 2-5 of your best performing posts and AI will extract your brand voice automatically.
          </p>
          
          <div className="space-y-3">
            <Input
              placeholder="Brand name (optional)"
              value={promptInput.brandName}
              onChange={(e) => setPromptInput(prev => ({ ...prev, brandName: e.target.value }))}
            />
            {examplePosts.map((post, index) => (
              <textarea
                key={index}
                placeholder={`Example post ${index + 1}${index < 2 ? ' (required)' : ' (optional)'}`}
                value={post}
                onChange={(e) => {
                  const newPosts = [...examplePosts];
                  newPosts[index] = e.target.value;
                  setExamplePosts(newPosts);
                }}
                className="w-full p-3 border dark:border-border rounded-lg h-20 resize-none text-sm bg-card dark:text-foreground"
              />
            ))}
            <Button 
              onClick={() => setExamplePosts([...examplePosts, ''])}
              variant="outline"
              size="1"
              className="w-full"
            >
              + Add Another Post
            </Button>
            <Button 
              onClick={handleGenerateFromExamples}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              🎯 Generate Prompt from My Posts
            </Button>
          </div>
        </div>
      )}

      {/* Show generated prompt from example posts */}
      {showExamplePostsPrompt && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-foreground">📋 Generated Analysis Prompt</h4>
            <div className="flex gap-2">
              <Button onClick={copyExamplePostsPrompt} size="1" variant="outline">
                📋 Copy Prompt
              </Button>
              <Button onClick={() => setShowExamplePostsPrompt(false)} size="1" variant="outline">
                ← Back
              </Button>
            </div>
          </div>
          
          <div className="p-4 bg-muted border dark:border-border rounded-lg max-h-64 overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap text-foreground">{examplePostsPrompt}</pre>
          </div>
          
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <strong>Steps:</strong> 1. Copy this prompt → 2. Paste into ChatGPT or Claude → 3. Copy the JSON response → 4. Paste below
            </p>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-3">🤖 Paste AI Response</h4>
            <textarea
              placeholder="Paste the complete JSON response here..."
              value={chatgptResponse}
              onChange={(e) => setChatgptResponse(e.target.value)}
              className="w-full p-4 border dark:border-border rounded-lg h-40 resize-none font-mono text-sm bg-card dark:text-foreground"
            />
            
            <div className="flex gap-3 mt-4">
              <Button 
                onClick={handleParseChatGPTResponse}
                disabled={!chatgptResponse.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                🎯 Import Persona
              </Button>
            </div>
          </div>
        </div>
      )}

      {!showPrompt && !showExamplePostsPrompt && (
        <div className="space-y-6">
          {/* Quick Examples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">🚀 Quick Setup (30 seconds)</h4>
              <p className="text-sm text-blue-600 dark:text-blue-400 dark:text-blue-400 mb-3">Just fill in the basics and get a simple prompt</p>
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
                  className="w-full p-3 border dark:border-border rounded-lg h-20 resize-none bg-card dark:text-foreground"
                />
                <Button onClick={handleQuickPrompt} className="w-full">
                  Generate Quick Prompt
                </Button>
              </div>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">⚡ Detailed Setup (2 minutes)</h4>
              <p className="text-sm text-green-600 dark:text-green-400 dark:text-green-400 mb-3">Fill out more details for a comprehensive persona</p>
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
            <h4 className="font-medium text-foreground mb-3">💡 Use These Examples (Click to Fill)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promptExamples.slice(0, 4).map((example, index) => (
                <div
                  key={index}
                  className="p-4 border border-border rounded-lg hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors dark:bg-muted"
                  onClick={() => handleUseExample(example)}
                >
                  <h5 className="font-medium text-foreground mb-2">{example.brandName}</h5>
                  <p className="text-sm text-muted-foreground mb-2">{example.industry}</p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">{example.brandDescription.substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          </div>

          {/* Manual Input Form */}
          <div className="border-t dark:border-border pt-6">
            <h4 className="font-medium text-foreground mb-4">📝 Or Fill Out Details Manually</h4>
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
                className="w-full p-3 border dark:border-border rounded-lg h-20 resize-none bg-card dark:text-foreground"
              />
              
              <textarea
                placeholder="Brand Description (e.g., 'We help entrepreneurs automate their workflows and scale efficiently')"
                value={promptInput.brandDescription}
                onChange={(e) => setPromptInput(prev => ({ ...prev, brandDescription: e.target.value }))}
                className="w-full p-3 border dark:border-border rounded-lg h-20 resize-none bg-card dark:text-foreground"
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
      )}

      {showPrompt && !showExamplePostsPrompt && (
        <div className="space-y-6">
          {/* Generated Prompt Display */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">📋 Generated ChatGPT Prompt</h4>
              <div className="flex gap-2">
                <Button onClick={copyPromptToClipboard} size="1" variant="outline">
                  📋 Copy Prompt
                </Button>
                <Button onClick={() => setShowPrompt(false)} size="1" variant="outline">
                  ← Edit Details
                </Button>
              </div>
            </div>
            
            <div className="p-4 bg-muted border dark:border-border rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap text-foreground">{generatedPrompt}</pre>
            </div>
            
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
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
            <h4 className="font-medium text-foreground mb-3">🤖 Paste ChatGPT Response</h4>
            <textarea
              placeholder="Paste the complete JSON response from ChatGPT here..."
              value={chatgptResponse}
              onChange={(e) => setChatgptResponse(e.target.value)}
              className="w-full p-4 border dark:border-border rounded-lg h-40 resize-none font-mono text-sm bg-card dark:text-foreground"
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
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                💡 <strong>Tip:</strong> Make sure you copied the complete JSON response from ChatGPT
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderEditInterface = () => {
    if (!currentPersona) return null;

    return (
      <div className="bg-card rounded-lg shadow-sm border dark:border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">🎨 Brand Persona: {currentPersona.name}</h3>
            <p className="text-sm text-muted-foreground">{currentPersona.description}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button onClick={testPersona} variant="outline" size="1">
              🧪 Test
            </Button>
            
            {isEditing ? (
              <>
                <Button 
                  onClick={handleSavePersona} 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isSaving}
                >
                  {isSaving ? '💾 Saving...' : '💾 Save'}
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" disabled={isSaving}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  ✏️ Edit
                </Button>
                <Button onClick={() => setShowDeleteConfirm(true)} variant="outline" intent="danger" size="1">
                  🗑️ Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">⚠️ Delete Brand Persona?</h4>
            <p className="text-sm text-red-600 dark:text-red-400 dark:text-red-400 mb-4">
              This will permanently delete your brand persona. All AI automation will use default settings.
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={handleDeletePersona} 
                intent="danger"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </Button>
              <Button onClick={() => setShowDeleteConfirm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Copy/Paste JSON Section */}
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-indigo-800 dark:text-indigo-300">🔄 Update via ChatGPT</h4>
            <div className="flex gap-2">
              <Button onClick={copyJsonPromptTemplate} variant="outline" size="1">
                📋 Copy JSON Prompt
              </Button>
              <Button onClick={() => setShowJsonImport(!showJsonImport)} variant="outline" size="1">
                {showJsonImport ? '✕ Close' : '📥 Paste JSON'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
            Copy the JSON prompt template, paste into your ChatGPT, then paste the response back here to update your persona.
          </p>
          
          {showJsonImport && (
            <div className="mt-4 space-y-3">
              <textarea
                placeholder="Paste the JSON response from ChatGPT here..."
                value={jsonImportValue}
                onChange={(e) => setJsonImportValue(e.target.value)}
                className="w-full p-4 border dark:border-border rounded-lg h-32 resize-none font-mono text-sm bg-card dark:text-foreground"
              />
              <Button 
                onClick={handleImportFromJson}
                disabled={!jsonImportValue.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                🎯 Import & Update Persona
              </Button>
            </div>
          )}
        </div>

        {!isEditing ? (
          // Display Mode
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-300">Voice Tone</h4>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 capitalize">{currentPersona.voice.tone}</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-300">Writing Style</h4>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100 capitalize">{currentPersona.voice.writingStyle}</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-medium text-purple-800 dark:text-purple-300">Emoji Usage</h4>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 capitalize">{currentPersona.voice.emojiUsage}</p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Comment Style</h4>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 capitalize">{currentPersona.engagement.commentStyle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border dark:border-border rounded-lg">
                <h4 className="font-medium mb-3 dark:text-foreground">Content Pillars</h4>
                <div className="flex flex-wrap gap-2">
                  {currentPersona.messaging.contentPillars.map(pillar => (
                    <span key={pillar} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                      {pillar}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 border dark:border-border rounded-lg">
                <h4 className="font-medium mb-3 dark:text-foreground">Content Mix</h4>
                <div className="space-y-2">
                  {Object.entries(currentPersona.contentGuidelines.contentMix).map(([type, percentage]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="capitalize dark:text-muted-foreground">{type}</span>
                      <span className="font-medium dark:text-foreground">{percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2 dark:text-foreground">Value Proposition</h4>
              <p className="text-foreground">{currentPersona.messaging.valueProposition}</p>
            </div>
          </div>
        ) : (
          // Full Edit Mode
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground border-b dark:border-border pb-2">Basic Info</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Brand Name</label>
                  <Input
                    value={currentPersona.name}
                    onChange={(e) => updatePersona({ name: e.target.value })}
                    placeholder="Enter your brand name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Description</label>
                  <Input
                    value={currentPersona.description}
                    onChange={(e) => updatePersona({ description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
              </div>
            </div>

            {/* Voice Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground border-b dark:border-border pb-2">Voice & Tone</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Tone</label>
                  <select
                    value={currentPersona.voice.tone}
                    onChange={(e) => updateVoice({ tone: e.target.value as any })}
                    className="w-full p-2 border dark:border-border rounded-lg bg-card dark:text-foreground"
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
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Writing Style</label>
                  <select
                    value={currentPersona.voice.writingStyle}
                    onChange={(e) => updateVoice({ writingStyle: e.target.value as any })}
                    className="w-full p-2 border dark:border-border rounded-lg bg-card dark:text-foreground"
                  >
                    <option value="formal">Formal</option>
                    <option value="conversational">Conversational</option>
                    <option value="witty">Witty</option>
                    <option value="direct">Direct</option>
                    <option value="storytelling">Storytelling</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Emoji Usage</label>
                  <select
                    value={currentPersona.voice.emojiUsage}
                    onChange={(e) => updateVoice({ emojiUsage: e.target.value as any })}
                    className="w-full p-2 border dark:border-border rounded-lg bg-card dark:text-foreground"
                  >
                    <option value="none">None</option>
                    <option value="minimal">Minimal</option>
                    <option value="moderate">Moderate</option>
                    <option value="frequent">Frequent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Language Level</label>
                  <select
                    value={currentPersona.voice.languageLevel}
                    onChange={(e) => updateVoice({ languageLevel: e.target.value as any })}
                    className="w-full p-2 border dark:border-border rounded-lg bg-card dark:text-foreground"
                  >
                    <option value="simple">Simple</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Messaging */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground border-b dark:border-border pb-2">Messaging</h4>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Value Proposition</label>
                <textarea
                  value={currentPersona.messaging.valueProposition}
                  onChange={(e) => updateMessaging({ valueProposition: e.target.value })}
                  placeholder="What unique value do you provide?"
                  className="w-full p-3 border dark:border-border rounded-lg h-20 resize-none bg-card dark:text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Target Audience</label>
                <textarea
                  value={currentPersona.messaging.targetAudience}
                  onChange={(e) => updateMessaging({ targetAudience: e.target.value })}
                  placeholder="Describe your ideal audience"
                  className="w-full p-3 border dark:border-border rounded-lg h-20 resize-none bg-card dark:text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Content Pillars (comma-separated)</label>
                <Input
                  value={currentPersona.messaging.contentPillars.join(', ')}
                  onChange={(e) => updateMessaging({ contentPillars: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="tips, insights, community"
                />
              </div>
            </div>

            {/* Engagement */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground border-b dark:border-border pb-2">Engagement Style</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Comment Style</label>
                  <select
                    value={currentPersona.engagement.commentStyle}
                    onChange={(e) => updateEngagement({ commentStyle: e.target.value as any })}
                    className="w-full p-2 border dark:border-border rounded-lg bg-card dark:text-foreground"
                  >
                    <option value="brief">Brief</option>
                    <option value="detailed">Detailed</option>
                    <option value="questions">Questions</option>
                    <option value="supportive">Supportive</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">DM Approach</label>
                  <select
                    value={currentPersona.engagement.dmApproach}
                    onChange={(e) => updateEngagement({ dmApproach: e.target.value as any })}
                    className="w-full p-2 border dark:border-border rounded-lg bg-card dark:text-foreground"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="direct">Direct</option>
                    <option value="collaborative">Collaborative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Hashtag Strategy</label>
                  <select
                    value={currentPersona.engagement.hashtagStrategy}
                    onChange={(e) => updateEngagement({ hashtagStrategy: e.target.value as any })}
                    className="w-full p-2 border dark:border-border rounded-lg bg-card dark:text-foreground"
                  >
                    <option value="branded">Branded</option>
                    <option value="trending">Trending</option>
                    <option value="niche">Niche</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Mention Style</label>
                  <select
                    value={currentPersona.engagement.mentionStyle}
                    onChange={(e) => updateEngagement({ mentionStyle: e.target.value as any })}
                    className="w-full p-2 border dark:border-border rounded-lg bg-card dark:text-foreground"
                  >
                    <option value="conservative">Conservative</option>
                    <option value="active">Active</option>
                    <option value="strategic">Strategic</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Guidelines */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground border-b dark:border-border pb-2">Content Guidelines</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Post Length</label>
                  <select
                    value={currentPersona.contentGuidelines.postLength}
                    onChange={(e) => updateContentGuidelines({ postLength: e.target.value as any })}
                    className="w-full p-2 border dark:border-border rounded-lg bg-card dark:text-foreground"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                    <option value="varies">Varies</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Call to Action Style</label>
                  <select
                    value={currentPersona.contentGuidelines.callToActionStyle}
                    onChange={(e) => updateContentGuidelines({ callToActionStyle: e.target.value as any })}
                    className="w-full p-2 border dark:border-border rounded-lg bg-card dark:text-foreground"
                  >
                    <option value="subtle">Subtle</option>
                    <option value="direct">Direct</option>
                    <option value="creative">Creative</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 dark:text-foreground">Question Frequency</label>
                  <select
                    value={currentPersona.contentGuidelines.questionFrequency}
                    onChange={(e) => updateContentGuidelines({ questionFrequency: e.target.value as any })}
                    className="w-full p-2 border dark:border-border rounded-lg bg-card dark:text-foreground"
                  >
                    <option value="rare">Rare</option>
                    <option value="occasional">Occasional</option>
                    <option value="frequent">Frequent</option>
                    <option value="always">Always</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Integration Notice */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">🤖 AI Integration</h4>
          <p className="text-sm text-blue-700 dark:text-blue-300 dark:text-blue-400">
            This persona will guide all AI automation tools including auto-replies, content generation, 
            hashtag selection, and DM campaigns to ensure consistent brand voice across all platforms.
          </p>
        </div>
      </div>
    );
  };

  // Main render logic
  if (!currentPersona && setupMethod === 'choose') {
    return renderChooseInterface();
  }

  if (setupMethod === 'chatgpt') {
    return renderChatGPTInterface();
  }

  if (currentPersona || setupMethod === 'edit') {
    return renderEditInterface();
  }

  return renderChooseInterface();
}