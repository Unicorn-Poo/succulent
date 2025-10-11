"use client";

import React, { useState, useCallback } from 'react';
import { Dialog, Text, Button as RadixButton } from "@radix-ui/themes";
import { Button } from "@/components/atoms/button";
import { FileUp, Download, FileText, AlertCircle, CheckCircle, X, Clipboard } from 'lucide-react';

interface CSVPostUploadProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accountGroupId: string;
  accountGroup: any; // Jazz account group for direct post creation
  onUploadComplete: (results: any) => void;
}

interface ParsedPost {
  title: string;
  content: string;
  platforms: string[];
  scheduledDate?: string;
  mediaUrls?: string[];
  errors?: string[];
}

export default function CSVPostUpload({ 
  isOpen, 
  onOpenChange, 
  accountGroupId,
  accountGroup, 
  onUploadComplete 
}: CSVPostUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [parsedPosts, setParsedPosts] = useState<ParsedPost[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [inputMethod, setInputMethod] = useState<'paste' | 'file'>('paste');

  // CSV template for download
  const csvTemplate = `title,content,platforms,scheduledDate,mediaUrls
"My First Post","This is the content of my first post","instagram,x","2024-01-15T14:30:00Z","https://example.com/image1.jpg"
"Scheduled Post","Another post with multiple platforms","instagram,x,linkedin","2024-01-16T10:00:00Z","https://example.com/image2.jpg|https://example.com/image3.jpg"
"Simple Post","Just text, no media","x","",""`;

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'posts-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ParsedPost[] => {
    console.log('🔍 Raw CSV text:', text);
    
    // Pre-process the CSV to fix ChatGPT's unquoted JSON arrays
    let fixedText = text;
    
    // Fix unquoted JSON arrays in the middle of lines
    fixedText = fixedText.replace(/,(\[.*?\]),/g, ',"$1",');
    // Fix unquoted JSON arrays at the end of lines  
    fixedText = fixedText.replace(/,(\[.*?\])$/gm, ',"$1"');
    
    console.log('🔍 Fixed CSV text:', fixedText);
    
    const lines = fixedText.trim().split('\n');
    console.log('🔍 Split into lines:', lines.length);
    
    // Proper CSV parser that handles JSON arrays within quoted fields
    const parseCSVLine = (line: string): string[] => {
      console.log('🔍 Parsing line:', line);
      
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      let bracketDepth = 0;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
          current += char;
        } else if (char === '[' && inQuotes) {
          bracketDepth++;
          current += char;
        } else if (char === ']' && inQuotes) {
          bracketDepth--;
          current += char;
        } else if (char === ',' && !inQuotes) {
          // Only split on comma if we're not inside quotes
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add the last field
      result.push(current.trim());
      
      console.log('🔍 Split fields:', result);
      
      // Clean each field - remove outer quotes
      const cleanedFields = result.map(field => {
        let cleaned = field.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
          cleaned = cleaned.slice(1, -1);
        }
        return cleaned;
      });
      
      console.log('🔍 Cleaned fields:', cleanedFields);
      return cleanedFields;
    };

    const headers = parseCSVLine(lines[0]);
    console.log('🔍 Parsed headers:', headers);
    
    const posts: ParsedPost[] = [];
    const errors: string[] = [];

    // Validate headers
    const requiredHeaders = ['title', 'content', 'platforms'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    console.log('🔍 Required headers:', requiredHeaders);
    console.log('🔍 Missing headers:', missingHeaders);
    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
      setParseErrors(errors);
      return [];
    }

    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = parseCSVLine(line);

        const post: ParsedPost = {
          title: '',
          content: '',
          platforms: [],
          errors: []
        };

        // Map values to post fields
        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          console.log(`🔍 Field mapping - ${header} (index ${index}):`, `"${value}"`);
          
          switch (header) {
            case 'title':
              post.title = value;
              break;
            case 'content':
              post.content = value;
              break;
            case 'platforms':
              // Handle JSON array format like ["x","threads"]
              try {
                if (value.startsWith('[') && value.endsWith(']')) {
                  // Parse as JSON array
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed)) {
                    post.platforms = parsed.map(p => p.toString().trim()).filter(Boolean);
                  } else {
                    post.errors!.push(`Invalid platforms format: ${value}`);
                  }
                } else {
                  // Handle simple comma-separated format
                  post.platforms = value.split(',').map(p => p.trim()).filter(Boolean);
                }
              } catch (error) {
                post.errors!.push(`Invalid platforms format: ${value} (${error})`);
              }
              break;
            case 'scheduledDate':
              if (value && value !== '') {
                try {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    post.scheduledDate = date.toISOString();
                  } else {
                    post.errors!.push(`Invalid date format: ${value}`);
                  }
                } catch {
                  post.errors!.push(`Invalid date: ${value}`);
                }
              }
              break;
            case 'mediaUrls':
              // Handle JSON array format like [] or ["url1","url2"]
              try {
                if (value.startsWith('[') && value.endsWith(']')) {
                  // Parse as JSON array
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed)) {
                    post.mediaUrls = [];
                    for (const url of parsed) {
                      if (url && url.trim()) {
                        try {
                          new URL(url); // Validate URL
                          post.mediaUrls.push(url);
                        } catch {
                          post.errors!.push(`Invalid media URL: ${url}`);
                        }
                      }
                    }
                  }
                } else if (value && value !== '') {
                  // Handle pipe or comma separated URLs
                  const urls = value.split(/[|,]/).map(url => url.trim()).filter(Boolean);
                  post.mediaUrls = [];
                  for (const url of urls) {
                    try {
                      new URL(url); // Validate URL
                      post.mediaUrls.push(url);
                    } catch {
                      post.errors!.push(`Invalid media URL: ${url}`);
                    }
                  }
                }
              } catch (error) {
                post.errors!.push(`Invalid mediaUrls format: ${value} (${error})`);
              }
              break;
            default:
              // Handle legacy media URLs (mediaUrl1, mediaUrl2, etc.)
              if (header.startsWith('mediaUrl') && value && value !== '') {
                if (!post.mediaUrls) post.mediaUrls = [];
                try {
                  new URL(value); // Validate URL
                  post.mediaUrls.push(value);
                } catch {
                  post.errors!.push(`Invalid media URL: ${value}`);
                }
              }
              break;
          }
        });

        // Validate and enhance title
        if (!post.title.trim()) {
          post.errors!.push('Title is required');
        } else {
          // Check if this looks like it should be auto-incremented
          const existingPosts = posts.slice(0, i); // Only check posts processed so far
          if (existingPosts.length > 0) {
            // Simple auto-increment for CSV uploads
            const pattern = post.title.match(/^(.+?)(\d+)$/);
            if (pattern) {
              const baseName = pattern[1].trim();
              const number = parseInt(pattern[2], 10);
              
              // Check if there are other posts with similar names
              const similarPosts = existingPosts.filter(p => 
                p.title.toLowerCase().includes(baseName.toLowerCase())
              );
              
              if (similarPosts.length > 0) {
                console.log(`📝 Auto-incrementing title pattern detected: ${post.title}`);
              }
            }
          }
        }
        if (!post.content.trim()) {
          post.errors!.push('Content is required');
        }
        if (post.platforms.length === 0) {
          post.errors!.push('At least one platform is required');
        }

        // Validate platforms
        const validPlatforms = ["instagram", "facebook", "x", "linkedin", "youtube", "tiktok", "pinterest", "reddit", "telegram", "threads", "google"];
        const invalidPlatforms = post.platforms.filter(p => !validPlatforms.includes(p));
        if (invalidPlatforms.length > 0) {
          post.errors!.push(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
        }

        posts.push(post);
      } catch (error) {
        errors.push(`Error parsing line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setParseErrors(errors);
    return posts;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Parse CSV immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvText(text);
        const parsed = parseCSV(text);
        setParsedPosts(parsed);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleTextChange = (text: string) => {
    setCsvText(text);
    if (text.trim()) {
      const parsed = parseCSV(text);
      setParsedPosts(parsed);
    } else {
      setParsedPosts([]);
      setParseErrors([]);
    }
  };

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(csvTemplate);
      // Could add a toast notification here
      console.log('✅ Template copied to clipboard');
    } catch (error) {
      console.error('Failed to copy template:', error);
      // Fallback - still allow download
      downloadTemplate();
    }
  };

  const handleUpload = async () => {
    if ((!file && !csvText.trim()) || parsedPosts.length === 0) return;

    setIsUploading(true);
    setUploadResults(null);

    try {
      // Filter out posts with errors
      const validPosts = parsedPosts.filter(post => !post.errors || post.errors.length === 0);
      
      console.log('📊 Upload Summary:');
      console.log('  - Total parsed posts:', parsedPosts.length);
      console.log('  - Valid posts:', validPosts.length);
      console.log('  - Posts with errors:', parsedPosts.length - validPosts.length);
      console.log('📦 Valid posts being sent:', validPosts);
      console.log('🔍 Account Group Debug:', {
        accountGroupId,
        hasAccountGroup: !!accountGroup,
        accountGroupType: typeof accountGroup,
        hasOwner: !!(accountGroup?._owner),
        hasPosts: !!(accountGroup?.posts),
        postsType: typeof accountGroup?.posts
      });
      
      if (validPosts.length === 0) {
        throw new Error('No valid posts found in CSV');
      }

      const requestBody = {
        accountGroupId,
        posts: validPosts
      };
      
      // Create posts directly using Jazz (no API needed for UI)
      const results = {
        success: true,
        created: 0,
        scheduled: 0,
        failed: 0,
        errors: [] as string[]
      };

      if (!accountGroup) {
        throw new Error('Account group not available for post creation');
      }

      // Ensure posts array exists
      if (!accountGroup.posts) {
        console.log('🔧 Creating posts array for account group...');
        const { co } = await import('jazz-tools');
        const { Post } = await import('@/app/schema');
        accountGroup.posts = co.list(Post).create([], { owner: accountGroup._owner });
      }

      const { co, z } = await import('jazz-tools');
      const { Post, PostVariant, MediaItem, URLImageMedia, ReplyTo } = await import('@/app/schema');

      console.log(`🎯 Creating ${validPosts.length} Jazz posts directly...`);

      // Create each post
      for (let i = 0; i < validPosts.length; i++) {
        const post = validPosts[i];
        
        try {
          console.log(`🎯 Creating Jazz post ${i + 1}: ${post.title}`);
          
          // Create the collaborative objects
          const titleText = co.plainText().create(post.title, { owner: accountGroup._owner });
          const baseText = co.plainText().create(post.content, { owner: accountGroup._owner });
          const mediaList = co.list(MediaItem).create([], { owner: accountGroup._owner });
          
          // Add media if provided
          if (post.mediaUrls && post.mediaUrls.length > 0) {
            for (const mediaUrl of post.mediaUrls) {
              const altText = co.plainText().create(`Image for ${post.title}`, { owner: accountGroup._owner });
              const urlImageMedia = URLImageMedia.create({
                type: 'url-image',
                url: mediaUrl,
                alt: altText,
                filename: `bulk-upload-${Date.now()}.jpg`
              }, { owner: accountGroup._owner });
              mediaList.push(urlImageMedia);
            }
          }
          
          const replyToObj = ReplyTo.create({}, { owner: accountGroup._owner });
          
          // Create the base post variant
          const baseVariant = PostVariant.create({
            text: baseText,
            postDate: new Date(),
            media: mediaList,
            replyTo: replyToObj,
            status: post.scheduledDate ? "scheduled" : "draft",
            scheduledFor: post.scheduledDate ? new Date(post.scheduledDate) : undefined,
            publishedAt: undefined,
            edited: false,
            lastModified: undefined,
          }, { owner: accountGroup._owner });

          // Create the variants record with platform-specific variants (like the working code)
          const variantsRecord = co.record(z.string(), PostVariant).create({
            base: baseVariant
          }, { owner: accountGroup._owner });

          // Create platform variants (this is what determines which platforms the post appears on)
          for (const platform of post.platforms) {
            console.log(`🎯 Creating variant for platform: ${platform}`);
            const platformVariant = PostVariant.create({
              text: baseText,
              postDate: new Date(),
              media: mediaList,
              replyTo: replyToObj,
              status: post.scheduledDate ? "scheduled" : "draft",
              scheduledFor: post.scheduledDate ? new Date(post.scheduledDate) : undefined,
              publishedAt: undefined,
              edited: false,
              lastModified: undefined,
            }, { owner: accountGroup._owner });
            variantsRecord[platform] = platformVariant;
            console.log(`✅ Created variant for platform: ${platform}`);
          }
          
          console.log(`📋 Post variants created:`, Object.keys(variantsRecord));

          // Create the post
          const newPost = Post.create({
            title: titleText,
            variants: variantsRecord,
          }, { owner: accountGroup._owner });

          // Add the post to the account group
          accountGroup.posts.push(newPost);
          
          results.created++;
          if (post.scheduledDate) {
            results.scheduled++;
          }
          
          console.log(`✅ Post ${i + 1} created successfully: ${newPost.id}`);
          
        } catch (postError) {
          console.error(`❌ Failed to create post ${i + 1}:`, postError);
          results.failed++;
          results.errors.push(`Post "${post.title}": ${postError instanceof Error ? postError.message : 'Creation failed'}`);
        }
      }

      console.log('📊 Final bulk upload results:', results);
      
      setUploadResults(results);
      onUploadComplete(results);
      
    } catch (error) {
      console.error('❌ CSV upload error:', error);
      setUploadResults({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const validPosts = parsedPosts.filter(post => !post.errors || post.errors.length === 0);
  const invalidPosts = parsedPosts.filter(post => post.errors && post.errors.length > 0);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }}>
        <Dialog.Title>Bulk Upload Posts from CSV</Dialog.Title>
        <Dialog.Description>
          Upload multiple posts at once using a CSV file. Download the template to get started.
        </Dialog.Description>

        <div className="space-y-6 mt-4">
          {/* Template Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <Text size="3" weight="medium" className="block mb-1">
                  CSV Template
                </Text>
                <Text size="2" color="gray">
                  Copy the template or download it to get started
                </Text>
              </div>
              <div className="flex gap-2">
                <Button
                  size="2"
                  variant="soft"
                  onClick={copyTemplate}
                >
                  <Clipboard className="w-4 h-4 mr-2" />
                  Copy Template
                </Button>
                <Button
                  size="2"
                  variant="soft"
                  onClick={downloadTemplate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>

          {/* Input Method Tabs */}
          <div>
            <div className="flex gap-2 mb-4">
              <Button
                size="2"
                variant={inputMethod === 'paste' ? 'solid' : 'outline'}
                onClick={() => setInputMethod('paste')}
              >
                <Clipboard className="w-4 h-4 mr-2" />
                Paste CSV
              </Button>
              <Button
                size="2"
                variant={inputMethod === 'file' ? 'solid' : 'outline'}
                onClick={() => setInputMethod('file')}
              >
                <FileUp className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            </div>

            {inputMethod === 'paste' ? (
              /* Copy-Paste Interface */
              <div>
                <Text size="3" weight="medium" className="block mb-2">
                  Paste CSV Data
                </Text>
                <textarea
                  value={csvText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Paste your CSV data here...&#10;&#10;title,content,platforms,scheduledDate,mediaUrls&#10;&quot;My Post&quot;,&quot;Content here&quot;,&quot;instagram,x&quot;,&quot;2024-01-15T14:30:00Z&quot;,&quot;&quot;"
                  className="w-full h-48 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                />
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>{csvText.length} characters</span>
                    <span>{csvText.split('\n').length} lines</span>
                  </div>
                  {csvText.trim() && (
                    <Button
                      size="1"
                      variant="ghost"
                      onClick={() => {
                        setCsvText('');
                        setParsedPosts([]);
                        setParseErrors([]);
                      }}
                      className="text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* File Upload Interface */
              <div>
                <Text size="3" weight="medium" className="block mb-2">
                  Upload CSV File
                </Text>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <Text size="3" className="block mb-2">
                      Click to upload CSV file
                    </Text>
                    <Text size="2" color="gray">
                      Supports .csv files with posts data
                    </Text>
                  </label>
                </div>
                
                {file && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{file.name}</span>
                    <Button
                      size="1"
                      variant="ghost"
                      onClick={() => {
                        setFile(null);
                        setCsvText('');
                        setParsedPosts([]);
                        setParseErrors([]);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <Text size="3" weight="medium" color="red">
                  CSV Parsing Errors
                </Text>
              </div>
              {parseErrors.map((error, index) => (
                <Text key={index} size="2" color="red" className="block">
                  • {error}
                </Text>
              ))}
            </div>
          )}

          {/* Parsed Posts Preview */}
          {parsedPosts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <Text size="3" weight="medium">
                  Parsed Posts ({parsedPosts.length} total)
                </Text>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">{validPosts.length} valid</span>
                  </div>
                  {invalidPosts.length > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-700">{invalidPosts.length} with errors</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-3">
                {parsedPosts.map((post, index) => (
                  <div 
                    key={index}
                    className={`border rounded-lg p-3 ${
                      post.errors && post.errors.length > 0 
                        ? 'border-red-200 bg-red-50' 
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <Text size="2" weight="medium" className="block mb-1">
                          {post.title || `Post ${index + 1}`}
                        </Text>
                        <Text size="1" color="gray" className="block mb-2 truncate">
                          {post.content.substring(0, 100)}...
                        </Text>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>Platforms: {post.platforms.join(', ')}</span>
                          {post.scheduledDate && (
                            <span>• Scheduled: {new Date(post.scheduledDate).toLocaleDateString()}</span>
                          )}
                          {post.mediaUrls && post.mediaUrls.length > 0 && (
                            <span>• {post.mediaUrls.length} media</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-3">
                        {post.errors && post.errors.length > 0 ? (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </div>
                    
                    {/* Show errors */}
                    {post.errors && post.errors.length > 0 && (
                      <div className="mt-2 text-xs text-red-700">
                        {post.errors.map((error, errorIndex) => (
                          <div key={errorIndex}>• {error}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Results */}
          {uploadResults && (
            <div className={`border rounded-lg p-4 ${
              uploadResults.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {uploadResults.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <Text size="3" weight="medium" color={uploadResults.success ? "green" : "red"}>
                  {uploadResults.success ? 'Upload Successful' : 'Upload Failed'}
                </Text>
              </div>
              
              {uploadResults.success && (
                <div className="text-sm text-green-700">
                  <div>✅ Created {uploadResults.created} posts</div>
                  {uploadResults.scheduled > 0 && (
                    <div>📅 {uploadResults.scheduled} posts scheduled</div>
                  )}
                  {uploadResults.failed > 0 && (
                    <div>❌ {uploadResults.failed} posts failed</div>
                  )}
                </div>
              )}
              
              {uploadResults.error && (
                <Text size="2" color="red">
                  {uploadResults.error}
                </Text>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center gap-2 mt-6">
          <Button
            variant="soft"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            
            <Button
              onClick={handleUpload}
              disabled={(!file && !csvText.trim()) || validPosts.length === 0 || isUploading}
              className="bg-lime-600 hover:bg-lime-700 text-white"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 mr-2" />
                  Upload {validPosts.length} Posts
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
