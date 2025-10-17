import Link from "next/link";
import { MessageCircle, CheckSquare, Square, Calendar, Eye } from "lucide-react";
import { getPostStatus } from "@/utils/postValidation";

interface PostViewsProps {
  posts: any[];
  accountGroupId: string;
  accountGroupName: string;
  postsFilter: 'all' | 'draft' | 'scheduled' | 'published';
  selectedPosts: Set<string>;
  onPostSelect: (postId: string, selected: boolean) => void;
}

// Helper function to render media thumbnail
function MediaThumbnail({ mediaItem }: { mediaItem: any }) {
  if (!mediaItem) return null;
  
  // Handle different media types
  if (mediaItem.type === 'image' && mediaItem.url) {
    return (
      <img
        src={mediaItem.url}
        alt="Post media"
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );
  }
  
  if (mediaItem.type === 'video' && mediaItem.thumbnail) {
    return (
      <div className="relative w-full h-full">
        <img
          src={mediaItem.thumbnail}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
          <div className="w-8 h-8 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-l-2 border-l-gray-800 border-y-2 border-y-transparent ml-0.5" />
          </div>
        </div>
      </div>
    );
  }
  
  // Fallback for unknown media types
  return (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
      <span className="text-gray-500 text-xs">📎 Media</span>
    </div>
  );
}

// Grid View (existing default view)
export function PostGridView({ posts, accountGroupId, accountGroupName, postsFilter, selectedPosts, onPostSelect }: PostViewsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return '✓';
      case 'scheduled': return '⏰';
      case 'draft': return '📝';
      default: return '📝';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts
        .filter(post => {
          if (postsFilter === 'all') return true;
          const postStatus = getPostStatus(post);
          return postStatus === postsFilter;
        })
        .map((post: any, index: number) => {
          const postId = post.id || post.variants?.base?.id || index;
          const postTitle = post.title?.toString() || post.title || "Untitled Post";
          const postContent = post.variants?.base?.text?.toString() || 
                            post.variants?.base?.text || 
                            post.content || 
                            "";
          const postStatus = getPostStatus(post);
          const postDate = post.variants?.base?.postDate || post.createdAt || new Date();
          const hasMedia = post.variants?.base?.media && post.variants.base.media.length > 0;
          const isSelected = selectedPosts.has(postId);
          
          return (
            <div
              key={postId}
              className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all duration-200 group relative ${
                isSelected ? 'border-lime-400 bg-lime-50' : 'border-gray-200 hover:border-lime-300'
              }`}
            >
              {/* Selection Checkbox */}
              <div
                className="absolute top-3 right-3 z-10 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPostSelect(postId, !isSelected);
                }}
              >
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-lime-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                )}
              </div>

              {/* Clickable content area */}
              <Link
                href={`/account-group/${accountGroupId}/post/${postId}`}
                className="block"
              >
                {/* Header with status and date */}
                <div className="flex items-center justify-between mb-3 pr-8">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(postStatus)}`}>
                    {getStatusIcon(postStatus)} {postStatus.charAt(0).toUpperCase() + postStatus.slice(1)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(postDate).toLocaleDateString()}
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-lime-600 transition-colors">
                  {postTitle}
                </h3>
                
                {/* Content Preview */}
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                  {postContent || "No content"}
                </p>
                
                {/* Footer with media indicator and platforms */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {hasMedia && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>📎</span>
                        <span>{post.variants.base.media.length} media</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-gray-400 group-hover:text-lime-500 transition-colors" />
                    <span className="text-xs text-gray-500 group-hover:text-lime-600">Edit</span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
    </div>
  );
}

// Image View - Focus on media content
export function PostImageView({ posts, accountGroupId, accountGroupName, postsFilter, selectedPosts, onPostSelect }: PostViewsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {posts
        .filter(post => {
          if (postsFilter === 'all') return true;
          const postStatus = getPostStatus(post);
          return postStatus === postsFilter;
        })
        .map((post: any, index: number) => {
          const postId = post.id || post.variants?.base?.id || index;
          const postTitle = post.title?.toString() || post.title || "Untitled Post";
          const postContent = post.variants?.base?.text?.toString() || 
                            post.variants?.base?.text || 
                            post.content || 
                            "";
          const postStatus = getPostStatus(post);
          const firstMediaItem = post.variants?.base?.media?.[0];
          const isSelected = selectedPosts.has(postId);
          
          return (
            <div
              key={postId}
              className={`aspect-square relative group cursor-pointer rounded-lg overflow-hidden ${
                isSelected ? 'ring-2 ring-lime-400' : 'hover:ring-2 hover:ring-lime-300'
              }`}
            >
              {/* Selection Checkbox */}
              <div
                className="absolute top-2 right-2 z-10 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPostSelect(postId, !isSelected);
                }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-lime-600' : 'bg-black bg-opacity-50'
                }`}>
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-white" />
                  ) : (
                    <Square className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 left-2 z-10">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  postStatus === 'published' ? 'bg-green-500 text-white' :
                  postStatus === 'scheduled' ? 'bg-yellow-500 text-white' :
                  'bg-gray-500 text-white'
                }`}>
                  {postStatus === 'published' ? '✓' : postStatus === 'scheduled' ? '⏰' : '📝'}
                </div>
              </div>

              {/* Clickable content area */}
              <Link
                href={`/account-group/${accountGroupId}/post/${postId}`}
                className="block w-full h-full"
              >
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:brightness-95 transition-all">
                  {firstMediaItem ? (
                    <MediaThumbnail mediaItem={firstMediaItem} />
                  ) : (
                    // Text preview when no media
                    <div className="text-center text-gray-600 p-3 flex flex-col items-center justify-center">
                      <div className="text-2xl mb-2">📝</div>
                      <div className="text-xs leading-tight line-clamp-4 max-w-full px-2">
                        {postTitle}
                      </div>
                      {postContent && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-full px-2">
                          {postContent.substring(0, 60)}...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Hover overlay with post info */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all duration-200 flex items-end">
                  <div className="w-full p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                    <h4 className="font-medium text-sm line-clamp-2 mb-1">{postTitle}</h4>
                    {postContent && (
                      <p className="text-xs text-gray-200 line-clamp-2">{postContent.substring(0, 80)}...</p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
    </div>
  );
}

// Succinct View - Compact list format
export function PostSuccinctView({ posts, accountGroupId, accountGroupName, postsFilter, selectedPosts, onPostSelect }: PostViewsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-600';
      case 'scheduled': return 'text-yellow-600';
      case 'draft': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <Eye className="w-3 h-3" />;
      case 'scheduled': return <Calendar className="w-3 h-3" />;
      case 'draft': return <MessageCircle className="w-3 h-3" />;
      default: return <MessageCircle className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-2">
      {posts
        .filter(post => {
          if (postsFilter === 'all') return true;
          const postStatus = getPostStatus(post);
          return postStatus === postsFilter;
        })
        .map((post: any, index: number) => {
          const postId = post.id || post.variants?.base?.id || index;
          const postTitle = post.title?.toString() || post.title || "Untitled Post";
          const postContent = post.variants?.base?.text?.toString() || 
                            post.variants?.base?.text || 
                            post.content || 
                            "";
          const postStatus = getPostStatus(post);
          const postDate = post.variants?.base?.postDate || post.createdAt || new Date();
          const hasMedia = post.variants?.base?.media && post.variants.base.media.length > 0;
          const mediaCount = post.variants?.base?.media?.length || 0;
          const isSelected = selectedPosts.has(postId);
          
          return (
            <div
              key={postId}
              className={`bg-white border rounded-lg p-4 hover:shadow-sm transition-all duration-200 group ${
                isSelected ? 'border-lime-400 bg-lime-50' : 'border-gray-200 hover:border-lime-300'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Selection Checkbox */}
                <div
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPostSelect(postId, !isSelected);
                  }}
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-lime-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  )}
                </div>

                {/* Media thumbnail (if available) */}
                {hasMedia && post.variants.base.media[0] && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    <MediaThumbnail mediaItem={post.variants.base.media[0]} />
                  </div>
                )}

                {/* Post content */}
                <Link
                  href={`/account-group/${accountGroupId}/post/${postId}`}
                  className="flex-1 min-w-0 group-hover:text-lime-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 group-hover:text-lime-600 line-clamp-1 mb-1">
                        {postTitle}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                        {postContent || "No content"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className={`flex items-center gap-1 ${getStatusColor(postStatus)}`}>
                          {getStatusIcon(postStatus)}
                          <span>{postStatus}</span>
                        </div>
                        <span>{new Date(postDate).toLocaleDateString()}</span>
                        {hasMedia && (
                          <span className="flex items-center gap-1">
                            📎 {mediaCount} media
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
    </div>
  );
}


