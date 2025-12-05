"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button, Card, Text, TextField, Badge } from "@radix-ui/themes";
import { 
  MessageCircle, 
  Send, 
  AlertCircle, 
  CheckCircle,
  ExternalLink,
  Loader2,
  Instagram,
  Facebook,
  Linkedin,
  Youtube
} from "lucide-react";
import {
  getPostComments,
  replyToComment,
  CommentData,
  isFeatureAvailable
} from "@/utils/ayrshareAnalytics";
import { handleCommentPost } from "@/utils/apiHandlers";
import { detectPlatformFromUrl, extractPostIdFromUrl } from "@/utils/postValidation";

interface EnhancedReplyHandlerProps {
  postUrl?: string;
  onReplySuccess?: (result: any) => void;
  accountProfileKey?: string;
}

export default function EnhancedReplyHandler({ 
  postUrl = "", 
  onReplySuccess,
  accountProfileKey 
}: EnhancedReplyHandlerProps) {
  // State management
  const [url, setUrl] = useState(postUrl);
  const [replyText, setReplyText] = useState("");
  const [comments, setComments] = useState<CommentData[]>([]);
  const [selectedComment, setSelectedComment] = useState<CommentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Platform detection
  const detectedPlatform = detectPlatformFromUrl(url);
  const postId = extractPostIdFromUrl(url);
  const isValidUrl = Boolean(detectedPlatform && postId);

  // Platform configuration
  const platformConfig = {
    instagram: {
      name: "Instagram",
      icon: Instagram,
      color: "purple",
      supportsComments: true,
      description: "Reply to Instagram posts and comments"
    },
    facebook: {
      name: "Facebook", 
      icon: Facebook,
      color: "lime",
      supportsComments: true,
      description: "Reply to Facebook posts and comments"
    },
    linkedin: {
      name: "LinkedIn",
      icon: Linkedin,
      color: "lime",
      supportsComments: true,
      description: "Reply to LinkedIn posts and comments"
    },
    youtube: {
      name: "YouTube",
      icon: Youtube,
      color: "red",
      supportsComments: true,
      description: "Reply to YouTube videos and comments"
    },
    x: {
      name: "X (Twitter)",
      icon: MessageCircle,
      color: "gray",
      supportsComments: false,
      description: "Use native Twitter reply functionality"
    }
  };

  const currentPlatform = detectedPlatform ? platformConfig[detectedPlatform as keyof typeof platformConfig] : null;

  /**
   * Fetch existing comments for the post
   */
  const fetchComments = async () => {
    if (!isValidUrl || !currentPlatform?.supportsComments || !detectedPlatform) return;

    setLoading(true);
    setError("");

    try {
      const fetchedComments = await getPostComments(
        postId!,
        detectedPlatform,
        accountProfileKey
      );
      setComments(fetchedComments);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle posting a reply using Ayrshare comments API
   */
  const handleReply = async () => {
    if (!replyText.trim() || !isValidUrl) return;

    setPosting(true);
    setError("");
    setSuccess("");

    try {
      let result;

      if (selectedComment) {
        // Reply to a specific comment
        result = await replyToComment(
          postId!,
          selectedComment.id!,
          replyText,
          detectedPlatform!,
          accountProfileKey
        );
      } else {
        // Reply to the main post
        result = await handleCommentPost(
          {
            post: replyText,
            platforms: [detectedPlatform!],
            profileKey: accountProfileKey
          },
          postId!,
          detectedPlatform!
        );
      }

      setSuccess(`Reply posted successfully on ${currentPlatform?.name}!`);
      setReplyText("");
      setSelectedComment(null);
      
      // Refresh comments to show the new reply
      await fetchComments();
      
      // Notify parent component
      onReplySuccess?.(result);

    } catch (err) {
      console.error('Error posting reply:', err);
      setError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setPosting(false);
    }
  };

  /**
   * Handle URL changes
   */
  useEffect(() => {
    if (isValidUrl && currentPlatform?.supportsComments) {
      fetchComments();
    } else {
      setComments([]);
      setSelectedComment(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, detectedPlatform]);

  /**
   * Format comment display
   */
  const formatComment = (comment: CommentData) => (
    <div 
      key={comment.id}
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        selectedComment?.id === comment.id 
          ? 'border-lime-500 bg-lime-50' 
          : 'border-border hover:border-border'
      }`}
      onClick={() => setSelectedComment(selectedComment?.id === comment.id ? null : comment)}
    >
      <div className="flex items-start gap-3">
        {comment.authorAvatar && (
          <Image 
            src={comment.authorAvatar} 
            alt={comment.author}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover"
            unoptimized
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Text size="2" weight="medium">
              {comment.author || comment.authorUsername}
            </Text>
            {comment.createdAt && (
              <Text size="1" color="gray">
                {new Date(comment.createdAt).toLocaleDateString()}
              </Text>
            )}
            {comment.likes && (
              <Text size="1" color="gray">
                {comment.likes} likes
              </Text>
            )}
          </div>
          <Text size="2" className="break-words">
            {comment.comment}
          </Text>
          {selectedComment?.id === comment.id && (
            <Text size="1" color="lime" className="mt-1 block">
              Click "Reply" to respond to this comment
            </Text>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Text size="4" weight="bold" className="mb-2 block">
            Enhanced Reply Handler
          </Text>
          <Text size="2" color="gray">
            Use Ayrshare Comments API to reply to posts on Instagram, Facebook, LinkedIn, and YouTube
          </Text>
        </div>

        {/* URL Input */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Post URL</label>
          <TextField.Root
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste Instagram, Facebook, LinkedIn, or YouTube post URL..."
            className="w-full"
          />
          
          {/* Platform Detection */}
          {url && (
            <div className="mt-2 flex items-center gap-2">
              {currentPlatform ? (
                <>
                  <currentPlatform.icon className="w-4 h-4" />
                  <Text size="2" color={currentPlatform.color as any}>
                    {currentPlatform.name} detected
                  </Text>
                  {currentPlatform.supportsComments ? (
                    <Badge color="green" size="1">Comments supported</Badge>
                  ) : (
                    <Badge color="orange" size="1">Use native Twitter reply</Badge>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <Text size="2" color="red">Invalid or unsupported URL</Text>
                </>
              )}
            </div>
          )}
        </div>

        {/* Platform Info */}
        {currentPlatform && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <currentPlatform.icon className="w-5 h-5" />
              <Text size="3" weight="medium">{currentPlatform.name}</Text>
            </div>
            <Text size="2" color="gray">
              {currentPlatform.description}
            </Text>
            {!currentPlatform.supportsComments && (
              <Text size="2" color="orange" className="mt-2 block">
                ⚠️ For Twitter/X posts, use the native reply functionality in your post creation component
              </Text>
            )}
          </div>
        )}

        {/* Comments Section */}
        {isValidUrl && currentPlatform?.supportsComments && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <Text size="3" weight="medium">Existing Comments</Text>
              <Button 
                size="2" 
                variant="soft" 
                onClick={fetchComments}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <Text size="2" color="gray">Loading comments...</Text>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments.map(formatComment)}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <Text size="2">No comments found</Text>
                <Text size="1" className="block mt-1">
                  Be the first to comment on this post
                </Text>
              </div>
            )}
          </div>
        )}

        {/* Reply Form */}
        {isValidUrl && currentPlatform?.supportsComments && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Text size="3" weight="medium">
                {selectedComment ? "Reply to Comment" : "Reply to Post"}
              </Text>
              {selectedComment && (
                <Button 
                  size="1" 
                  variant="soft" 
                  onClick={() => setSelectedComment(null)}
                >
                  Clear Selection
                </Button>
              )}
            </div>

            {selectedComment && (
              <div className="p-3 bg-lime-50 border border-lime-200 rounded-lg mb-3">
                <Text size="2" color="lime" weight="medium" className="mb-1 block">
                  Replying to:
                </Text>
                <Text size="2" className="break-words">
                  "{selectedComment.comment}"
                </Text>
                <Text size="1" color="gray">
                  by {selectedComment.author || selectedComment.authorUsername}
                </Text>
              </div>
            )}

            <div className="space-y-3">
              <TextField.Root
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={selectedComment ? "Write your reply..." : "Write your comment..."}
                className="w-full"
              />
              
              <Button 
                onClick={handleReply}
                disabled={!replyText.trim() || posting}
                className="w-full"
              >
                {posting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {selectedComment ? "Post Reply" : "Post Comment"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <Text size="2" color="red">{error}</Text>
            </div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <Text size="2" color="green">{success}</Text>
            </div>
          </div>
        )}

        {/* Feature Availability Notice */}
        {!isFeatureAvailable('advanced-comments') && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <Text size="2" color="orange">
              ℹ️ Enhanced comment features require a premium Ayrshare plan. 
              Basic commenting is available on the free plan.
            </Text>
          </div>
        )}

        {/* Documentation Link */}
        <div className="text-center">
          <Button 
            variant="soft" 
            size="2"
            onClick={() => window.open('https://www.ayrshare.com/docs/apis/comments/post-comment', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Comments API Documentation
          </Button>
        </div>
      </div>
    </Card>
  );
} 