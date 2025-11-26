'use client';

import React, { useState } from 'react';
import { Button } from '@/components/atoms/button';

interface DebugResult {
  timestamp: string;
  debugType: string;
  environment: any;
  ayrshareConnection: any;
  recentPosts: any;
  platformStatus: any;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

interface TestResult {
  timestamp: string;
  testType: string;
  platforms: string[];
  steps: any[];
  success: boolean;
  error: string | null;
  ayrshareResponse: any;
  recommendations: string[];
}

export default function PostDebugPanel() {
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('x');

  const runDebug = async (type: string = 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (type === 'platform') {
        params.set('platform', selectedPlatform);
      }
      
      const response = await fetch(`/api/debug-posts?${params}`);
      const result = await response.json();
      setDebugResult(result);
    } catch (error) {
      console.error('Debug failed:', error);
      setDebugResult({
        timestamp: new Date().toISOString(),
        debugType: type,
        environment: {},
        ayrshareConnection: null,
        recentPosts: null,
        platformStatus: null,
        errors: [`Debug request failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        recommendations: ['Check network connection and try again']
      });
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType: 'simple',
          platforms: [selectedPlatform],
          content: `Test post from debug panel - ${new Date().toISOString()}`
        })
      });
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({
        timestamp: new Date().toISOString(),
        testType: 'simple',
        platforms: [selectedPlatform],
        steps: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ayrshareResponse: null,
        recommendations: ['Check network connection and try again']
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold">Post Debug Panel</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Debug API and bulk post issues
        </div>
      </div>

      {/* Platform Selection */}
      <div className="flex items-center gap-4">
        <label className="font-medium">Platform:</label>
        <select 
          value={selectedPlatform} 
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="x">X (Twitter)</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="linkedin">LinkedIn</option>
          <option value="threads">Threads</option>
          <option value="bluesky">Bluesky</option>
        </select>
      </div>

      {/* Debug Actions */}
      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={() => runDebug('all')} 
          disabled={loading}
          variant="default"
        >
          {loading ? 'Running...' : 'Full Debug Check'}
        </Button>
        
        <Button 
          onClick={() => runDebug('ayrshare')} 
          disabled={loading}
          variant="secondary"
        >
          Ayrshare Only
        </Button>
        
        <Button 
          onClick={() => runDebug('platform')} 
          disabled={loading}
          variant="secondary"
        >
          Platform Specific
        </Button>
        
        <Button 
          onClick={runTest} 
          disabled={loading}
          variant="outline"
        >
          Test Post
        </Button>
      </div>

      {/* Debug Results */}
      {debugResult && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-3">Debug Results</h3>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {debugResult.timestamp} | Type: {debugResult.debugType}
          </div>

          {/* Environment Info */}
          <div className="mb-4">
            <h4 className="font-medium mb-2">Environment</h4>
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm">
              <div>API Key: {debugResult.environment.hasAyrshareApiKey ? '✅ Present' : '❌ Missing'}</div>
              <div>Business Plan: {debugResult.environment.businessPlanMode ? '✅ Enabled' : '❌ Disabled'}</div>
              <div>Region: {debugResult.environment.vercelRegion}</div>
            </div>
          </div>

          {/* Ayrshare Connection */}
          {debugResult.ayrshareConnection && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Ayrshare Connection</h4>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm">
                <div>Status: {debugResult.ayrshareConnection.success ? '✅ Connected' : '❌ Failed'}</div>
                <div>Connected Platforms: {debugResult.ayrshareConnection.connectedPlatforms?.join(', ') || 'None'}</div>
                {debugResult.ayrshareConnection.error && (
                  <div className="text-red-600 dark:text-red-400">Error: {debugResult.ayrshareConnection.error}</div>
                )}
              </div>
            </div>
          )}

          {/* Recent Posts */}
          {debugResult.recentPosts && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Recent Posts</h4>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm">
                <div>Total Posts: {debugResult.recentPosts.totalPosts || 0}</div>
                <div>Platforms: {debugResult.recentPosts.platforms?.join(', ') || 'None'}</div>
                <div>Failed Posts: {debugResult.recentPosts.failedPosts?.length || 0}</div>
              </div>
            </div>
          )}

          {/* Errors */}
          {debugResult.errors.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 text-red-600 dark:text-red-400">Errors</h4>
              <ul className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-sm space-y-1">
                {debugResult.errors.map((error, i) => (
                  <li key={i} className="text-red-700 dark:text-red-300">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {debugResult.warnings.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 text-yellow-600">Warnings</h4>
              <ul className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-sm space-y-1">
                {debugResult.warnings.map((warning, i) => (
                  <li key={i} className="text-yellow-700 dark:text-yellow-300">• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {debugResult.recommendations.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 text-blue-600 dark:text-blue-400">Recommendations</h4>
              <ul className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-sm space-y-1">
                {debugResult.recommendations.map((rec, i) => (
                  <li key={i} className="text-blue-700 dark:text-blue-300">• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Test Results */}
      {testResult && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-3">Test Results</h3>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {testResult.timestamp} | Success: {testResult.success ? '✅' : '❌'}
          </div>

          {/* Test Steps */}
          <div className="mb-4">
            <h4 className="font-medium mb-2">Test Steps</h4>
            <div className="space-y-2">
              {testResult.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={step.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {step.status === 'success' ? '✅' : '❌'}
                  </span>
                  <span>{step.step}</span>
                  {step.data && (
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {JSON.stringify(step.data).substring(0, 100)}...
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {testResult.error && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 text-red-600 dark:text-red-400">Error</h4>
              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-sm text-red-700 dark:text-red-300">
                {testResult.error}
              </div>
            </div>
          )}

          {/* Ayrshare Response */}
          {testResult.ayrshareResponse && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Ayrshare Response</h4>
              <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(testResult.ayrshareResponse, null, 2)}
              </pre>
            </div>
          )}

          {/* Recommendations */}
          {testResult.recommendations.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 text-blue-600 dark:text-blue-400">Recommendations</h4>
              <ul className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-sm space-y-1">
                {testResult.recommendations.map((rec, i) => (
                  <li key={i} className="text-blue-700 dark:text-blue-300">• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-300">How to Use This Panel</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>Full Debug Check:</strong> Comprehensive analysis of Ayrshare connection and recent posts</li>
          <li>• <strong>Ayrshare Only:</strong> Tests API connectivity and connected accounts</li>
          <li>• <strong>Platform Specific:</strong> Debug issues with a specific social media platform</li>
          <li>• <strong>Test Post:</strong> Attempts to create a test post (won't actually publish)</li>
          <li>• Check Vercel function logs for detailed debugging information</li>
        </ul>
      </div>
    </div>
  );
}
