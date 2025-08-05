'use client';

import React, { useState, useEffect } from 'react';
import { Text, Button } from '@radix-ui/themes';
import { RefreshCw, Calendar, ExternalLink } from 'lucide-react';
import { PlatformPreview } from "@/components/organisms/platform-previews";
import { Post, PostVariant, ReplyTo, MediaItem } from '@/app/schema';
import { co, z } from 'jazz-tools';

// =============================================================================
// 📱 PLATFORM FEED VIEW WITH HISTORICAL DATA
// =============================================================================

interface PlatformFeedViewProps {
  account: {
    id: string;
    name: string;
    platform: string;
    profileKey?: string;
    isLinked: boolean;
  };
  localPosts: any[];
  accountGroupId?: string;
  jazzAccountGroup?: any; // Jazz AccountGroup object
  onCreatePost?: (platform: string) => void;
}

interface HistoricalPost {
  id: string;
  content: string;
  created: string;
  postIds: Array<{
    platform: string;
    postUrl?: string;
    isVideo?: boolean;
  }>;
  mediaUrls: string[];
  isHistorical: true;
}

export const PlatformFeedView: React.FC<PlatformFeedViewProps> = ({
  account,
  localPosts,
  accountGroupId,
  jazzAccountGroup,
  onCreatePost
}) => {
  const [historicalPosts, setHistoricalPosts] = useState<HistoricalPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jazz import function - creates real Jazz Post objects
  const importPostsToJazz = async (ayrshareHistoryPosts: any[]) => {
    if (!jazzAccountGroup || !ayrshareHistoryPosts.length) {
      console.log('❌ No Jazz AccountGroup or posts to import');
      return { imported: 0, errors: ['No Jazz AccountGroup available'], skipped: 0 };
    }

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    console.log(`📥 Starting real Jazz import of ${ayrshareHistoryPosts.length} ${account.platform} posts...`);

    for (const ayrsharePost of ayrshareHistoryPosts) {
      try {
        // Check if post already exists by Ayrshare ID
        const existingPost = jazzAccountGroup.posts?.find((post: any) => 
          post.variants && post.variants[account.platform]?.ayrsharePostId === ayrsharePost.id
        );

        if (existingPost) {
          console.log(`⏭️ Post ${ayrsharePost.id} already exists, skipping`);
          skipped++;
          continue;
        }

        console.log(`📝 Creating Jazz post for ${account.platform}: ${ayrsharePost.id}`);

        // Create Jazz collaborative objects
        const titleText = co.plainText().create(
          ayrsharePost.content.substring(0, 50) + '...', 
          { owner: jazzAccountGroup._owner }
        );
        
        const contentText = co.plainText().create(
          ayrsharePost.content, 
          { owner: jazzAccountGroup._owner }
        );
        
        const mediaList = co.list(MediaItem).create([], { owner: jazzAccountGroup._owner });
        const replyToObj = ReplyTo.create({}, { owner: jazzAccountGroup._owner });

        // Create the platform variant
        const platformVariant = PostVariant.create({
          text: contentText,
          postDate: new Date(ayrsharePost.created),
          media: mediaList,
          replyTo: replyToObj,
          status: 'published',
          scheduledFor: undefined,
          publishedAt: new Date(ayrsharePost.created),
          edited: false,
          lastModified: undefined,
          // Ayrshare integration fields
          ayrsharePostId: ayrsharePost.id,
          socialPostUrl: ayrsharePost.postIds[0]?.postUrl || null,
        }, { owner: jazzAccountGroup._owner });

        // Create the variants record
        const variantsRecord = co.record(z.string(), PostVariant).create({
          [account.platform]: platformVariant
        }, { owner: jazzAccountGroup._owner });

        // Create the Jazz Post
        const newPost = Post.create({
          title: titleText,
          variants: variantsRecord,
        }, { owner: jazzAccountGroup._owner });

        // Add to Jazz AccountGroup
        jazzAccountGroup.posts.push(newPost);
        imported++;

        console.log(`✅ Successfully imported Jazz post: ${ayrsharePost.id}`);

      } catch (error) {
        console.error(`❌ Error importing ${account.platform} post ${ayrsharePost.id}:`, error);
        errors.push(`Failed to import post ${ayrsharePost.id}: ${error}`);
      }
    }

    const message = `Successfully imported ${imported} ${account.platform} posts to Jazz! ${skipped > 0 ? `(${skipped} already existed)` : ''}`;
    console.log(`🎉 Jazz import complete: ${message}`);

    return { imported, errors, skipped, message };
  };

  // Check Jazz posts first, then supplement with Ayrshare if needed
  const syncPostsWithAyrshare = async () => {
    if (!account.isLinked || !account.profileKey) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First check if we have Jazz posts for this platform
      const platformPosts = localPosts.filter(post => 
        post.variants && post.variants[account.platform]
      );

      console.log(`📊 Found ${platformPosts.length} Jazz posts for ${account.platform}`);

      // Only fetch from Ayrshare if we have an accountGroupId (to import) 
      // or if we have very few local posts
      const shouldFetchAyrshare = accountGroupId && (platformPosts.length < 5);

      if (shouldFetchAyrshare) {
        console.log(`🔍 Fetching fresh ${account.platform} posts from Ayrshare...`);
        
        const params = new URLSearchParams({
          platforms: account.platform,
          limit: '20', // Reasonable limit for supplemental data
          lastDays: '0', // 0 = ALL historical posts ever posted
          status: 'all' // Get all posts regardless of status
        });

        // Always auto-import when we have an accountGroupId
        params.append('import', 'true');
        params.append('accountGroupId', accountGroupId);

        if (account.profileKey) {
          params.append('profileKey', account.profileKey);
        }

        // Use platform-specific endpoint for better results
        const response = await fetch(`/api/post-history/${account.platform}?${params.toString()}`);
        const result = await response.json();

        if (response.ok && result.data.posts) {
          const transformedPosts: HistoricalPost[] = result.data.posts.map((post: any) => ({
            id: `ayrshare-${post.id}`,
            content: post.content,
            created: post.created,
            postIds: post.postIds,
            mediaUrls: post.mediaUrls || [],
            isHistorical: true
          }));
          setHistoricalPosts(transformedPosts);

          // Handle client-side Jazz import
          if (result.import && result.import.shouldImport && transformedPosts.length > 0) {
            console.log('🔄 Starting client-side Jazz import...');
            try {
              const importResult = await importPostsToJazz(result.data.posts);
              if (importResult.imported > 0) {
                setError(`✅ Imported ${importResult.imported} new posts from ${account.platform} to Jazz!`);
                setTimeout(() => setError(null), 4000);
              } else if (importResult.skipped > 0) {
                setError(`ℹ️ ${transformedPosts.length} posts from ${account.platform} (${importResult.skipped} already in Jazz)`);
                setTimeout(() => setError(null), 3000);
              }
            } catch (importError) {
              console.error('❌ Jazz import failed:', importError);
              setError(`⚠️ Fetched ${transformedPosts.length} posts but Jazz import failed`);
              setTimeout(() => setError(null), 4000);
            }
          } else if (transformedPosts.length > 0) {
            setError(`ℹ️ ${transformedPosts.length} posts from ${account.platform} (up to date)`);
            setTimeout(() => setError(null), 3000);
          }
        }
      } else {
        console.log(`📱 Using ${platformPosts.length} Jazz posts for ${account.platform}`);
        setHistoricalPosts([]); // Clear Ayrshare posts since we're using Jazz
        if (platformPosts.length > 0) {
          setError(`📱 Showing ${platformPosts.length} posts from Jazz database`);
          setTimeout(() => setError(null), 2000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync posts');
    } finally {
      setLoading(false);
    }
  };

  // Auto-sync on mount and when local posts change
  useEffect(() => {
    if (account.isLinked) {
      syncPostsWithAyrshare();
    }
  }, [account.platform, account.profileKey, account.isLinked, localPosts.length]);

  // Transform local posts to match the expected format, filtering for this platform
  const transformedLocalPosts = localPosts
    .filter(post => post.variants && post.variants[account.platform])
    .map(post => {
      const platformVariant = post.variants[account.platform];
      return {
        id: post.id,
        content: platformVariant?.text?.toString() || 'No content',
        created: platformVariant?.postDate || new Date().toISOString(),
        isHistorical: false,
        platform: account.platform,
        status: platformVariant?.status,
        ayrsharePostId: platformVariant?.ayrsharePostId,
        post: post // Keep original for platform preview
      };
    });

  // Combine and sort all posts by date
  const allPosts = [
    ...transformedLocalPosts,
    ...historicalPosts
  ].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4 mt-6">
      {/* Feed Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
          <div className="w-8 h-8 bg-lime-100 rounded-lg flex items-center justify-center">
            <Text size="2" weight="bold">{account.platform?.charAt(0).toUpperCase()}</Text>
          </div>
          <div>
            <Text size="3" weight="medium">{account.name}</Text>
            <Text size="2" color="gray" className="capitalize">{account.platform} Feed</Text>
          </div>
        </div>
      </div>

            {/* Feed Controls */}
      {account.isLinked && (
        <div className="flex justify-center mb-4">
          <Button 
            onClick={syncPostsWithAyrshare} 
            disabled={loading}
            variant="soft"
            size="2"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing...' : 'Sync Posts'}
          </Button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-center py-4">
          <Text size="2" color="red">{error}</Text>
        </div>
      )}

      {/* Posts Feed */}
      <div className="max-w-md mx-auto space-y-4">
        {allPosts.length > 0 ? (
          allPosts.map((post: any) => {
            // For historical posts, create a simulated post object for PlatformPreview
            if (post.isHistorical) {
              const platformPost = post.postIds.find((p: any) => p.platform === account.platform);
              
              return (
                <div key={post.id} className="relative">
                  {/* Historical post indicator */}
                  <div className="absolute top-2 right-2 z-10">
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(post.created)}
                    </div>
                  </div>
                  
                                     <PlatformPreview
                     platform={account.platform}
                     content={post.content}
                     media={post.mediaUrls.map((url: string) => ({ type: 'image', url }))}
                     timestamp={new Date(post.created)}
                     replyTo={undefined}
                   />
                  
                  {/* View original post link */}
                  {platformPost?.postUrl && (
                    <div className="mt-2 text-center">
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => window.open(platformPost.postUrl, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Original Post
                      </Button>
                    </div>
                  )}
                </div>
              );
            } else {
              // For local posts, use the existing logic
              return (
                <div key={post.id} className="relative">
                                     <PlatformPreview
                     platform={account.platform}
                     content={post.content}
                     media={post.post?.variants?.base?.media || []}
                     timestamp={new Date(post.created)}
                     replyTo={post.post?.variants?.base?.replyTo}
                   />
                </div>
              );
            }
          })
        ) : (
          <div className="text-center py-12">
            <Text size="4" weight="medium" className="mb-2 block">
              No Posts Yet
            </Text>
            <Text size="2" color="gray" className="mb-6 block">
              {account.isLinked 
                ? "Start creating posts to see them in your feed!" 
                : "Link your account to see your recent posts here."}
            </Text>
            {onCreatePost && (
              <Button onClick={() => onCreatePost(account.platform)}>
                Create Your First Post
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Feed Info */}
      {allPosts.length > 0 && (
        <div className="text-center py-4 border-t border-gray-200">
                     <Text size="1" color="gray">
             Showing {transformedLocalPosts.length} Jazz posts
             {historicalPosts.length > 0 && ` and ${historicalPosts.length} from Ayrshare`} for {account.platform}
           </Text>
        </div>
      )}
    </div>
  );
}; 