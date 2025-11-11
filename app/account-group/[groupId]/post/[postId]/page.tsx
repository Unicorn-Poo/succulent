"use client";
import { useParams, useRouter } from "next/navigation"; 
import { useState, useEffect } from "react";
// Legacy accountGroups import removed - using Jazz account groups instead
import PostCreationComponent from "@/components/organisms/post-creation";
import { PostFullyLoaded } from "@/app/schema";
import { Button } from "@radix-ui/themes";
import { Home, Users, ArrowLeft } from "lucide-react";
import { useAccount } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  
  const accountGroupId = params.groupId as string;
  const postId = params.postId as string;
  
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
  
  // Legacy accountGroups removed - using Jazz account groups only
  const jazzAccountGroup = me?.root?.accountGroups?.find((group: any, index: number) => {
    if (!group) return false;
    
    const groupId = params.groupId as string;
    
    if (group.id === groupId) return true;
    if (groupId === 'demo') return index === 0;
    
    if (groupId.startsWith('group-')) {
      const groupIndex = parseInt(groupId.replace('group-', ''));
      return index === groupIndex;
    }
    
    if (group?.name) {
      const safeName = group.name.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return safeName === groupId;
    }
    
    return false;
  });
  
  const accountGroup = jazzAccountGroup;
  
  const safeArrayAccess = (collaborativeArray: any): any[] => {
    try {
      if (!collaborativeArray) {
        return [];
      }
      
      if (Array.isArray(collaborativeArray)) {
        return collaborativeArray.filter(item => item != null);
      }
      
      const array = Array.from(collaborativeArray || []);
      return array.filter(item => item != null);
    } catch (error) {
      console.error('🚨 Jazz collaborative array is corrupted:', error);
      return [];
    }
  };

  const getPostsArray = () => {
    if (jazzAccountGroup) {
      return safeArrayAccess(jazzAccountGroup.posts);
    }
    return [];
  };
  
  const posts = getPostsArray();
  const post = posts.find((post: any) => {
    const currentPostId = post.id || post.postId || post.variants?.base?.id || post.variants?.base?.postId;
    return currentPostId === postId;
  });
  
  if (!accountGroup?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Account Group Not Found</h2>
          <p className="text-gray-600 mb-4">The account group you&apos;re looking for doesn&apos;t exist.</p>
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
            The post you&apos;re looking for doesn&apos;t exist in {accountGroup.name}.
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
      {/* Back Button */}
      <div className="mb-6">
        <Button 
          variant="soft" 
          onClick={() => router.push(`/account-group/${accountGroupId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {accountGroup.name || "Account Group"}
        </Button>
      </div>
      
      <PostCreationComponent 
        post={post as unknown as PostFullyLoaded} 
        accountGroup={accountGroup as any}
      />
    </div>
  );
}