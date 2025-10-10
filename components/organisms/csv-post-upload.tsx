"use client";

import React, { useState, useCallback } from 'react';
import { Dialog, Text, Button as RadixButton } from "@radix-ui/themes";
import { Button } from "@/components/atoms/button";
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';

interface CSVPostUploadProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accountGroupId: string;
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
  onUploadComplete 
}: CSVPostUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedPosts, setParsedPosts] = useState<ParsedPost[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  // CSV template for download
  const csvTemplate = `title,content,platforms,scheduledDate,mediaUrl1,mediaUrl2,mediaUrl3
"My First Post","This is the content of my first post","instagram,x","2024-01-15T14:30:00Z","https://example.com/image1.jpg","",""
"Scheduled Post","Another post with multiple platforms","instagram,x,linkedin","2024-01-16T10:00:00Z","https://example.com/image2.jpg","https://example.com/image3.jpg",""
"Simple Post","Just text, no media","x","","","",""`;

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
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const posts: ParsedPost[] = [];
    const errors: string[] = [];

    // Validate headers
    const requiredHeaders = ['title', 'content', 'platforms'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
      setParseErrors(errors);
      return [];
    }

    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i];
        if (!line.trim()) continue;

        // Simple CSV parsing (handles quoted fields)
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const post: ParsedPost = {
          title: '',
          content: '',
          platforms: [],
          errors: []
        };

        // Map values to post fields
        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          switch (header) {
            case 'title':
              post.title = value;
              break;
            case 'content':
              post.content = value;
              break;
            case 'platforms':
              post.platforms = value.split(',').map(p => p.trim()).filter(Boolean);
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
            default:
              // Handle media URLs (mediaUrl1, mediaUrl2, etc.)
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

        // Validate required fields
        if (!post.title.trim()) {
          post.errors!.push('Title is required');
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
        const parsed = parseCSV(text);
        setParsedPosts(parsed);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || parsedPosts.length === 0) return;

    setIsUploading(true);
    setUploadResults(null);

    try {
      // Filter out posts with errors
      const validPosts = parsedPosts.filter(post => !post.errors || post.errors.length === 0);
      
      if (validPosts.length === 0) {
        throw new Error('No valid posts found in CSV');
      }

      const response = await fetch('/api/posts/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountGroupId,
          posts: validPosts
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const results = await response.json();
      setUploadResults(results);
      onUploadComplete(results);
      
    } catch (error) {
      console.error('CSV upload error:', error);
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
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <Text size="3" weight="medium" className="block mb-1">
                  CSV Template
                </Text>
                <Text size="2" color="gray">
                  Download the template to see the required format
                </Text>
              </div>
              <Button
                size="2"
                variant="soft"
                onClick={downloadTemplate}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          {/* File Upload */}
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
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
                    setParsedPosts([]);
                    setParseErrors([]);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
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
              disabled={!file || validPosts.length === 0 || isUploading}
              className="bg-lime-600 hover:bg-lime-700 text-white"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
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
