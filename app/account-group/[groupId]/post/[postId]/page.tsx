"use client";
import { useParams, useRouter } from "next/navigation"; 
import { accountGroups } from "../../../../page";
import PostCreationComponent from "../../../../../components/post-creation";
import Navigation from "../../../../../components/navigation";
import { PostFullyLoaded } from "../../../../schema";
import { Button } from "@radix-ui/themes";
import { Home, Users, Share2, Calendar } from "lucide-react";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  
  const accountGroup = accountGroups.find((group) => group.id === params.groupId);
  const post = accountGroup?.posts.find((post) => post.variants.base.id === params.postId);
  
  if (!accountGroup) {
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
          <p className="text-gray-600 mb-4">The post you're looking for doesn't exist.</p>
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
      <Navigation />
      
      {/* Page Actions */}
      <div className="flex justify-end gap-2 mb-6">
        <Button
          variant="outline"
          size="2"
          onClick={() => {
            // TODO: Add preview functionality
            console.log("Preview post");
          }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Preview
        </Button>
        
        <Button
          variant="outline"
          size="2"
          onClick={() => {
            // TODO: Add schedule functionality
            console.log("Schedule post");
          }}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule
        </Button>
      </div>
      
      <PostCreationComponent 
        post={post as unknown as PostFullyLoaded} 
        accountGroup={accountGroup}
      />
    </div>
  );
}