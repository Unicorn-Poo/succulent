"use client";
import { useParams } from "next/navigation"; 
import { accountGroups } from "../../../../page";
import PostCreationComponent from "../../../../../components/post-creation";
import { PostFullyLoaded } from "../../../../schema";

export default function PostPage() {
  const params = useParams();
  const accountGroup = accountGroups.find((group) => group.id === params.groupId);
  const post = accountGroup?.posts.find((post) => post.variants.base.id === params.postId);
  
  if (!accountGroup) {
    return <div>Account group not found</div>;
  }
  
  if (!post) {
    return <div>Post not found</div>;
  }
  
  return (
    <PostCreationComponent 
      post={post as unknown as PostFullyLoaded} 
      accountGroup={accountGroup}
    />
  );
}