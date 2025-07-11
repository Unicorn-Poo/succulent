"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { accountGroup1 } from "../../../../page";
import PostCreationComponent from "../../../../../components/post-creation";

export default function DemoPostPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const accountGroup = accountGroup1;
  const postId = params.postId as string;
  
  // Try to find existing demo post
  let post = accountGroup.posts.find((p: any) => p.id === postId);
  
  // If no existing post found, create a new one from URL params
  if (!post) {
    const title = searchParams.get('title') || 'New Demo Post';
    const content = searchParams.get('content') || '';
    
    post = {
      title,
      variants: {
        base: {
          id: postId,
          text: content,
          postDate: new Date(),
          edited: false,
        },
      },
    };
  } else {
    // Convert demo post to expected format
    post = {
      title: post.title,
      variants: {
        base: {
          id: post.id,
          text: post.content,
          postDate: new Date(post.publishedAt || post.scheduledFor || new Date()),
          edited: false,
        },
      },
    };
  }

  if (!accountGroup) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Demo Account Group Not Found</h2>
          <p className="text-gray-600 mb-4">The demo account group is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Demo Notice - Removed duplicate back button */}
      <div className="mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <h3 className="font-medium text-yellow-900 mb-1">Demo Post Creation</h3>
              <p className="text-yellow-700 text-sm">
                This is a demonstration of the post creation interface. 
                Posts created here won't actually be published to social media platforms.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Post Creation Component */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <PostCreationComponent 
          post={post as any} 
          accountGroup={accountGroup as any}
        />
      </div>
    </div>
  );
} 