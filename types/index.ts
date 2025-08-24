// =============================================================================
// 🎯 SHARED TYPES & INTERFACES
// =============================================================================

export interface PlatformAccount {
  id: string;
  platform: 'instagram' | 'x' | 'youtube' | 'facebook' | 'linkedin';
  name: string;
  profileKey?: string;
  isLinked: boolean;
  status: 'pending' | 'linked' | 'error' | 'expired';
  lastError?: string;
  avatar?: string;
  username?: string;
  displayName?: string;
  url?: string;
  linkedAt?: Date;
}

export interface AccountGroup {
  id: string;
  name: string;
  accounts: Record<string, PlatformAccount>;
  posts: Post[];
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Post {
  id: string;
  title: string;
  content?: string;
  platforms: string[];
  status: 'draft' | 'scheduled' | 'published';
  publishedAt?: string;
  scheduledFor?: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
  variants?: Record<string, PostVariant>;
}

export interface PostVariant {
  id: string;
  text: string;
  postDate: Date;
  edited: boolean;
  lastModified?: Date;
  media?: MediaItem[];
  replyTo?: ReplyTo;
}

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'gif';
  altText?: string;
  thumbnail?: string;
}

export interface ReplyTo {
  url?: string;
  platform?: string;
  author?: string;
  content?: string;
}

// =============================================================================
// 🎨 UI COMPONENT PROPS
// =============================================================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface NavigationProps {
  title?: string;
}

export interface PostCreationProps {
  post: Post;
  accountGroup: AccountGroup;
}

// =============================================================================
// 🔧 UTILITY TYPES
// =============================================================================

export type Platform = 'instagram' | 'x' | 'youtube' | 'facebook' | 'linkedin';

export type PostStatus = 'draft' | 'scheduled' | 'published';

export type AccountStatus = 'pending' | 'linked' | 'error' | 'expired';

export type ViewMode = 'overview' | 'calendar' | 'platform-profile';

// =============================================================================
// 🎵 JAZZ COLLABORATIVE TYPES (extending base types)
// =============================================================================

export interface JazzAccountGroup extends Omit<AccountGroup, 'accounts' | 'posts'> {
  accounts: any[]; // Jazz collaborative list
  posts: any[]; // Jazz collaborative list
  _owner: any; // Jazz owner reference
}

// =============================================================================
// 🚀 API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AyrshareResponse {
  status: string;
  id?: string;
  errors?: string[];
  warnings?: string[];
}

// =============================================================================
// 📝 FORM TYPES
// =============================================================================

export interface CreateAccountGroupFormData {
  name: string;
  accounts: Array<{
    platform: Platform;
    name: string;
    profileKey?: string;
    isLinked: boolean;
    status: AccountStatus;
    lastError?: string;
  }>;
}

export interface CreatePostFormData {
  title: string;
  content: string;
  platforms: Platform[];
  scheduledDate?: Date;
  media?: MediaItem[];
} 