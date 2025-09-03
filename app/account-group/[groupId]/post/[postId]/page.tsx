"use client";
import { useParams, useRouter } from "next/navigation"; 
import { useState, useEffect } from "react";
import { accountGroups } from "@/app/page";
import PostCreationComponent from "@/components/organisms/post-creation";
import { PostFullyLoaded } from "@/app/schema";
import { Button } from "@radix-ui/themes";
import { Home, Users } from "lucide-react";
import { useAccount } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  
  // State for API posts - must be at top for React Hooks order
  const [apiPosts, setApiPosts] = useState<any[]>([]);
  const [loadingApiPosts, setLoadingApiPosts] = useState(false);
  
  // Get account group ID and post ID from params
  const accountGroupId = params.groupId as string;
  const postId = params.postId as string;
  
  // Get Jazz account to access collaborative account groups
  const { me } = useAccount(MyAppAccount, {
    resolve: {
      root: {
        accountGroups: { $each: {
          accounts: { $each: true },
          posts: { $each: {
            variants: { $each: {
              text: true,
              media: { $each: true },
              replyTo: true
            }}
          }}
        }}
      }
    }
  });
  
  // Try to find the account group in legacy groups first, then in Jazz groups
  const legacyAccountGroup = Object.values(accountGroups).find(
    (group) => group.id === params.groupId
  );
  
  const jazzAccountGroup = me?.root?.accountGroups?.find((group: any, index: number) => {
    if (!group) return false;
    
    const groupId = params.groupId as string;
    
    // 1. Direct Jazz ID match (for newly created groups)
    if (group.id === groupId) return true;
    
    // 2. Legacy "demo" mapping  
    if (groupId === 'demo') return index === 0;
    
    // 3. Index-based routing (group-0, group-1, etc.)
    if (groupId.startsWith('group-')) {
      const groupIndex = parseInt(groupId.replace('group-', ''));
      return index === groupIndex;
    }
    
    // 4. Name-based routing (convert Jazz name to URL-safe format)
    if (group?.name) {
      const safeName = group.name.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return safeName === groupId;
    }
    
    return false;
  });
  
  // Prioritize Jazz account group (which has real accounts) over legacy account group
  const accountGroup = jazzAccountGroup || legacyAccountGroup;
  
  // Fetch API posts for this account group - must be before early returns
  useEffect(() => {
    const fetchApiPosts = async () => {
      if (!accountGroup) return;
      
      setLoadingApiPosts(true);
      try {
        // Use URL-friendly accountGroupId for API calls
        const response = await fetch(`/api/posts/list?accountGroupId=${encodeURIComponent(accountGroupId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('📋 Loaded API posts for post detail:', data.data.posts);
            setApiPosts(data.data.posts || []);
          }
        }
      } catch (error) {
        console.error('❌ Error loading API posts for post detail:', error);
      } finally {
        setLoadingApiPosts(false);
      }
    };

    fetchApiPosts();
  }, [accountGroupId, accountGroup]);
  
  // Helper function to safely access potentially corrupted Jazz collaborative arrays
  const safeArrayAccess = (collaborativeArray: any): any[] => {
    try {
      if (!collaborativeArray) {
        return [];
      }
      
      // Handle null references in collaborative lists
      if (Array.isArray(collaborativeArray)) {
        return collaborativeArray.filter(item => item != null);
      }
      
      // Try to convert Jazz collaborative list to regular array
      const array = Array.from(collaborativeArray || []);
      return array.filter(item => item != null);
    } catch (error) {
      console.error('🚨 Jazz collaborative array is corrupted:', error);
      return [];
    }
  };

  // Helper function to get posts array from either format
  const getPostsArray = () => {
    if (legacyAccountGroup) {
      return legacyAccountGroup.posts || [];
    } else if (jazzAccountGroup) {
      return safeArrayAccess(jazzAccountGroup.posts);
    }
    return [];
  };
  
  // Get all posts (Jazz + API)
  const getAllPosts = () => {
    const jazzPosts = getPostsArray();
    return [...jazzPosts, ...apiPosts];
  };
  
  // Find the specific post in both Jazz and API posts
  const posts = getAllPosts();
  const post = posts.find((post: any) => {
    // Handle different post ID formats
    const currentPostId = post.id || post.postId || post.variants?.base?.id || post.variants?.base?.postId;
    return currentPostId === postId;
  });
  
  if (!accountGroup?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Account Group Not Found</h2>
          <p className="text-gray-600 mb-4">The account group you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/")}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Post Not Found</h2>
          <p className="text-gray-600 mb-4">
            The post you're looking for doesn't exist in {accountGroup.name}.
          </p>
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              {jazzAccountGroup ? "📍 Jazz Collaborative Group" : "📍 Demo Account Group"}
            </p>
          </div>
          <Button onClick={() => router.push(`/account-group/${params.groupId}`)}>
            <Users className="w-4 h-4 mr-2" />
            Back to Account Group
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <PostCreationComponent 
        post={post as unknown as PostFullyLoaded} 
        accountGroup={accountGroup as any}
      />
    </div>
  );
}