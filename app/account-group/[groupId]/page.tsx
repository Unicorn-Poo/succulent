"use client";

import { useParams } from "next/navigation";
import { accountGroups } from "../../page";
import Image from "next/image";
import Link from "next/link";
import { Button, Dialog, TextField, TextArea } from "@radix-ui/themes";
import { Plus, Edit3, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Navigation from "../../../components/navigation";
import { platformIcons, platformLabels } from "../../../utils/postConstants";

export default function AccountGroupPage() {
	const params = useParams();
	const router = useRouter();
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [newPostTitle, setNewPostTitle] = useState("");
	const [newPostText, setNewPostText] = useState("");
	
	const accountGroup = accountGroups.find(
		(group) => group.id === params.groupId
	);

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

	const handleCreatePost = () => {
		if (newPostTitle.trim()) {
			// Create a new post ID
			const newPostId = Date.now().toString();
			
			// Create the new post object
			const newPost = {
				title: newPostTitle,
				variants: {
					base: {
						id: newPostId,
						text: newPostText,
						postDate: new Date(),
						edited: false,
					},
				},
			};
			
			// Add the post to the account group (in a real app, this would be saved to backend)
			accountGroup.posts.push(newPost);
			
			// Navigate to the new post
			router.push(`/account-group/${accountGroup.id}/post/${newPostId}`);
			
			// Reset form
			setNewPostTitle("");
			setNewPostText("");
			setShowCreateDialog(false);
		}
	};

	return (
		<div className="w-full max-w-4xl mx-auto p-6">
			<Navigation 
				title={accountGroup.name}
			/>

			{/* Account Group Info */}
			<div className="bg-gray-50 rounded-lg p-4 mb-6">
				<div className="flex items-center justify-between mb-3">
					<h3 className="font-medium">Connected Accounts</h3>
					<span className="text-xs text-gray-500">{Object.keys(accountGroup.accounts).length} accounts</span>
				</div>
				<div className="flex flex-wrap gap-2">
					{Object.entries(accountGroup.accounts).map(([key, account]) => {
						const platformIcon = platformIcons[account.platform as keyof typeof platformIcons] || platformIcons.base;
						const platformLabel = platformLabels[account.platform as keyof typeof platformLabels] || account.platform;
						
						return (
							<div key={account.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
								<div className="relative">
									<Image
										src={platformIcon}
										alt={platformLabel}
										width={16}
										height={16}
										className="rounded"
									/>
									<div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
								</div>
								<span className="text-sm font-medium truncate max-w-[120px]">{account.name}</span>
							</div>
						);
					})}
				</div>
				
				{Object.keys(accountGroup.accounts).length === 0 && (
					<div className="text-center py-6 text-gray-500">
						<p className="text-sm">No accounts connected yet</p>
					</div>
				)}
			</div>

			{/* Posts */}
			<div className="mb-4">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold">Posts ({accountGroup.posts.length})</h2>
					<Button onClick={() => setShowCreateDialog(true)}>
						<Plus className="w-4 h-4 mr-2" />
						Create New Post
					</Button>
				</div>
				
				{accountGroup.posts.length === 0 ? (
					<div className="text-center py-12 bg-gray-50 rounded-lg">
						<div className="text-gray-500 mb-4">
							<p className="text-lg mb-2">No posts yet</p>
							<p className="text-sm">Create your first post to get started!</p>
						</div>
						<Button onClick={() => setShowCreateDialog(true)}>
							<Plus className="w-4 h-4 mr-2" />
							Create First Post
						</Button>
					</div>
				) : (
					<div className="space-y-2">
						{accountGroup.posts.map((post) => (
							<Link
								href={`/account-group/${accountGroup.id}/post/${post.variants.base.id}`}
								className="flex gap-4 border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
								key={post.variants.base.id}
							>
								<div className="flex-1">
									<h3 className="font-semibold mb-1">{post.title}</h3>
									<p className="text-gray-600 line-clamp-2">{post.variants.base.text}</p>
									<div className="text-xs text-gray-500 mt-2">
										{new Date(post.variants.base.postDate).toLocaleDateString()}
									</div>
								</div>
								{post.variants.base.media && post.variants.base.media[0] && (
									<div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
										<Image
											src={post.variants.base.media[0].image}
											alt="Post media"
											width={80}
											height={80}
											className="w-full h-full object-cover"
										/>
									</div>
								)}
							</Link>
						))}
					</div>
				)}
			</div>

			{/* Create New Post Dialog */}
			<Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<Dialog.Content style={{ maxWidth: 500 }}>
					<Dialog.Title>Create New Post</Dialog.Title>
					<Dialog.Description>
						Create a new post for {accountGroup.name}
					</Dialog.Description>
					
					<div className="space-y-4 mt-4">
						<div>
							<label className="block text-sm font-medium mb-1">Post Title</label>
							<TextField.Root
								value={newPostTitle}
								onChange={(e) => setNewPostTitle(e.target.value)}
								placeholder="Enter a title for your post..."
							/>
						</div>
						
						<div>
							<label className="block text-sm font-medium mb-1">Initial Content (optional)</label>
							<TextArea
								value={newPostText}
								onChange={(e) => setNewPostText(e.target.value)}
								placeholder="Start writing your post..."
								rows={4}
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<Button variant="soft" onClick={() => setShowCreateDialog(false)}>
							Cancel
						</Button>
						<Button 
							onClick={handleCreatePost}
							disabled={!newPostTitle.trim()}
						>
							<Edit3 className="w-4 h-4 mr-2" />
							Create Post
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	);
}
