"use client";
import { useParams, useRouter } from "next/navigation"; 
import { accountGroups } from "@/app/page";
import PostCreationComponent from "@/components/organisms/post-creation";
import { PostFullyLoaded } from "@/app/schema";
import { Button } from "@radix-ui/themes";
import { Home, Users } from "lucide-react";
import { useAccount } from "jazz-react";
import { MyAppAccount } from "@/app/schema";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  
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
  
  const jazzAccountGroup = me?.root?.accountGroups?.find(
    (group: any) => group.id === params.groupId
  );
  
  // Prioritize Jazz account group (which has real accounts) over legacy account group
  const accountGroup = jazzAccountGroup || legacyAccountGroup;
  
  // Helper function to get posts array from either format
  const getPostsArray = () => {
    if (legacyAccountGroup) {
      return legacyAccountGroup.posts || [];
    } else if (jazzAccountGroup) {
      return jazzAccountGroup.posts || [];
    }
    return [];
  };
  
  // Find the specific post
  const posts = getPostsArray();
  const post = posts.find((post: any) => {
    // Handle different post ID formats
    const postId = post.id || post.variants?.base?.id || post.variants?.base?.postId;
    return postId === params.postId;
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