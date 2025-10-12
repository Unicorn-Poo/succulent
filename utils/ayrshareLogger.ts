/**
 * Comprehensive Ayrshare API logging utility
 * This helps debug post publishing issues by providing detailed logging
 * that will show up in Vercel function logs
 */

export interface AyrshareLogEntry {
  timestamp: string;
  operation: string;
  platform?: string;
  postId?: string;
  ayrsharePostId?: string;
  status: 'started' | 'success' | 'error' | 'warning';
  data?: any;
  error?: string;
  responseTime?: number;
  requestId?: string;
}

/**
 * Log Ayrshare API operations with structured data for Vercel logs
 */
export function logAyrshareOperation(entry: AyrshareLogEntry) {
  const timestamp = new Date().toISOString();
  const logData = {
    ...entry,
    timestamp,
    service: 'ayrshare',
    environment: process.env.NODE_ENV || 'development'
  };

  // Use different log levels based on status
  switch (entry.status) {
    case 'error':
      console.error(`🚨 [AYRSHARE ERROR] ${entry.operation}:`, logData);
      break;
    case 'warning':
      console.warn(`⚠️ [AYRSHARE WARNING] ${entry.operation}:`, logData);
      break;
    case 'success':
      console.log(`✅ [AYRSHARE SUCCESS] ${entry.operation}:`, logData);
      break;
    case 'started':
      console.log(`🔄 [AYRSHARE STARTED] ${entry.operation}:`, logData);
      break;
    default:
      console.log(`📋 [AYRSHARE INFO] ${entry.operation}:`, logData);
  }
}

/**
 * Log detailed API request/response for debugging
 */
export function logAyrshareAPICall(
  operation: string,
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: any,
  requestId?: string
) {
  logAyrshareOperation({
    timestamp: new Date().toISOString(),
    operation: `${operation} - API Request`,
    status: 'started',
    data: {
      url,
      method,
      headers: {
        ...headers,
        // Mask sensitive data
        'Authorization': headers.Authorization ? `Bearer ${headers.Authorization.slice(-8)}...` : undefined,
        'Profile-Key': headers['Profile-Key'] ? `${headers['Profile-Key'].slice(0, 8)}...` : undefined
      },
      bodySize: body ? JSON.stringify(body).length : 0,
      bodyPreview: body ? JSON.stringify(body).substring(0, 500) : undefined
    },
    requestId
  });
}

/**
 * Log API response details
 */
export function logAyrshareAPIResponse(
  operation: string,
  status: number,
  statusText: string,
  response: any,
  responseTime: number,
  requestId?: string
) {
  const isError = status >= 400;
  
  logAyrshareOperation({
    timestamp: new Date().toISOString(),
    operation: `${operation} - API Response`,
    status: isError ? 'error' : 'success',
    data: {
      httpStatus: status,
      statusText,
      responseTime: `${responseTime}ms`,
      responseSize: JSON.stringify(response).length,
      response: response,
      // Extract key info for easy scanning
      postIds: response?.postIds,
      id: response?.id,
      message: response?.message,
      errors: response?.errors,
      platforms: response?.platforms,
      // X/Twitter specific debugging
      twitterStatus: response?.postIds?.twitter ? 'posted' : 'failed',
      twitterId: response?.postIds?.twitter,
      twitterError: response?.errors?.twitter
    },
    error: isError ? response?.message || response?.error || `HTTP ${status}` : undefined,
    responseTime,
    requestId
  });
}

/**
 * Log platform-specific post status
 */
export function logPlatformPostStatus(
  platform: string,
  postId: string,
  status: string,
  ayrsharePostId?: string,
  error?: string,
  additionalData?: any
) {
  logAyrshareOperation({
    timestamp: new Date().toISOString(),
    operation: 'Platform Post Status',
    platform,
    postId,
    ayrsharePostId,
    status: error ? 'error' : 'success',
    data: {
      postStatus: status,
      platform,
      postId,
      ayrsharePostId,
      ...additionalData
    },
    error
  });
}

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log X/Twitter specific debugging info
 */
export function logTwitterDebug(
  operation: string,
  data: {
    platforms?: string[];
    mappedPlatforms?: string[];
    hasTwitter?: boolean;
    postLength?: number;
    needsThreading?: boolean;
    twitterOptions?: any;
    scheduledDate?: string;
    originalPlatforms?: string[];
    willIncludeTwitter?: boolean;
  }
) {
  logAyrshareOperation({
    timestamp: new Date().toISOString(),
    operation: `Twitter Debug - ${operation}`,
    platform: 'x',
    status: 'started',
    data: {
      ...data,
      twitterInOriginal: data.platforms?.includes('x') || data.platforms?.includes('twitter'),
      twitterInMapped: data.mappedPlatforms?.includes('twitter'),
      platformMapping: data.platforms?.map(p => {
        const mapped = p === 'x' ? 'twitter' : p;
        return `${p} -> ${mapped}`;
      })
    }
  });
}

/**
 * Log post creation workflow
 */
export function logPostWorkflow(
  step: string,
  postData: any,
  status: 'started' | 'success' | 'error',
  error?: string,
  additionalData?: any
) {
  logAyrshareOperation({
    timestamp: new Date().toISOString(),
    operation: `Post Workflow - ${step}`,
    status,
    data: {
      step,
      platforms: postData?.platforms,
      contentLength: postData?.post?.length || postData?.content?.length,
      hasMedia: !!(postData?.mediaUrls?.length || postData?.media?.length),
      isScheduled: !!postData?.scheduleDate || !!postData?.scheduledDate,
      publishImmediately: postData?.publishImmediately,
      ...additionalData
    },
    error
  });
}
