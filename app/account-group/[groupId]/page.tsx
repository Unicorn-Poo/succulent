"use client";

import { useParams } from "next/navigation";
import { accountGroups } from "../../page";
import Image from "next/image";
import Link from "next/link";
import { Button, Dialog, TextField, TextArea, Card } from "@radix-ui/themes";
import { Plus, Edit3, Home, Trash2, Users, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Navigation from "../../../components/navigation";
import { platformIcons, platformLabels } from "../../../utils/postConstants";
import { useAccount } from "jazz-react";
import { Post, AccountGroup } from "../../schema";
import { MyAppAccount } from "../../schema";
import AyrshareAccountLinking from "../../../components/ayrshare-account-linking";
import { PlatformAccount } from "../../schema";
import { PostVariant, MediaItem, ReplyTo } from "../../schema";
import { co, z } from "jazz-tools";

export default function AccountGroupPage() {
	const params = useParams();
	const router = useRouter();
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [newPostTitle, setNewPostTitle] = useState("");
	const [newPostText, setNewPostText] = useState("");
	const [localAccounts, setLocalAccounts] = useState<any[]>([]);
	
	// Account management state - moved to top to fix hooks order
	const [showAddAccountForm, setShowAddAccountForm] = useState(false);
	const [newAccountName, setNewAccountName] = useState("");
	const [newAccountPlatform, setNewAccountPlatform] = useState<"instagram" | "facebook" | "x" | "linkedin" | "youtube">("instagram");
	const [isRemovalMode, setIsRemovalMode] = useState(false);
	
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
	
	// Use whichever one we found
	const accountGroup = legacyAccountGroup || jazzAccountGroup;

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
		if (!newPostTitle.trim()) return;

		if (jazzAccountGroup) {
			// Create a proper Jazz Post for collaborative account groups
			console.log('🎵 Creating Jazz Post for collaborative account group');
			
			// Create the collaborative objects with the correct syntax
			const titleText = co.plainText().create(newPostTitle, { owner: jazzAccountGroup._owner });
			const baseText = co.plainText().create(newPostText || "", { owner: jazzAccountGroup._owner });
			const mediaList = co.list(MediaItem).create([], { owner: jazzAccountGroup._owner });
			const replyToObj = ReplyTo.create({}, { owner: jazzAccountGroup._owner });
			
			// Create the base post variant
			const baseVariant = PostVariant.create({
				text: baseText,
				postDate: new Date(),
				media: mediaList,
				replyTo: replyToObj,
				edited: false,
				lastModified: undefined,
			}, { owner: jazzAccountGroup._owner });

			// Create the variants record
			const variantsRecord = co.record(z.string(), PostVariant).create({
				base: baseVariant
			}, { owner: jazzAccountGroup._owner });

			// Create the post
			const newPost = Post.create({
				title: titleText,
				variants: variantsRecord,
			}, { owner: jazzAccountGroup._owner });

			// Add the post to the account group
			jazzAccountGroup.posts.push(newPost);
			
			console.log('✅ Jazz Post created with ID:', newPost.id);
			
			// Navigate to the newly created post
			router.push(`/account-group/${accountGroup.id}/post/${newPost.id}`);
		} else {
			// For legacy account groups, use the old approach
			const newPostId = Date.now().toString();
			router.push(`/account-group/${accountGroup.id}/post/${newPostId}?title=${encodeURIComponent(newPostTitle)}&content=${encodeURIComponent(newPostText)}`);
		}
		
		// Reset form
		setNewPostTitle("");
		setNewPostText("");
		setShowCreateDialog(false);
	};

	// Helper function to get accounts array from either format
	const getAccountsArray = () => {
		if (legacyAccountGroup) {
			return Object.values(legacyAccountGroup.accounts);
		} else if (jazzAccountGroup) {
			return jazzAccountGroup.accounts || [];
		}
		return [];
	};

	// Helper function to get posts array from either format
	const getPostsArray = () => {
		if (legacyAccountGroup) {
			return legacyAccountGroup.posts || [];
		} else if (jazzAccountGroup) {
			return jazzAccountGroup.posts || [];
		}
		return [];
	};

	// Handle account updates from the Ayrshare linking component
	const handleAccountsUpdated = (updatedAccounts: any[]) => {
		if (jazzAccountGroup) {
			// For Jazz account groups, update the collaborative accounts
			// Instead of clearing everything, update existing accounts individually
			updatedAccounts.forEach(updatedAccount => {
				const existingAccount = jazzAccountGroup.accounts.find((a: any) => 
					a.platform === updatedAccount.platform && a.name === updatedAccount.name
				);
				
				if (existingAccount) {
					// Update existing account properties
					existingAccount.isLinked = updatedAccount.isLinked;
					existingAccount.status = updatedAccount.status;
					if (updatedAccount.lastError) {
						existingAccount.lastError = updatedAccount.lastError;
					}
					if (updatedAccount.isLinked) {
						existingAccount.linkedAt = new Date();
					}
				} else {
					// Add new account if it doesn't exist
					console.log('Adding new account to Jazz account group:', updatedAccount);
					const platformAccount = PlatformAccount.create({
						name: updatedAccount.name,
						platform: updatedAccount.platform,
						apiUrl: undefined,
						profileKey: updatedAccount.profileKey,
						isLinked: updatedAccount.isLinked,
						linkedAt: updatedAccount.isLinked ? new Date() : undefined,
						avatar: undefined,
						username: undefined,
						displayName: undefined,
						url: undefined,
						status: updatedAccount.status,
						lastError: updatedAccount.lastError,
					}, { owner: jazzAccountGroup._owner });
					
					jazzAccountGroup.accounts.push(platformAccount);
				}
			});
		} else {
			// For legacy account groups, use local state
			setLocalAccounts(updatedAccounts);
		}
	};

	// Use local state for account updates or fall back to original accounts
	const accounts = localAccounts.length > 0 ? localAccounts : getAccountsArray();
	const posts = getPostsArray();

	const handleAddAccount = () => {
		if (!newAccountName.trim() || !jazzAccountGroup) {
			return;
		}

		const platformAccount = PlatformAccount.create({
			name: newAccountName.trim(),
			platform: newAccountPlatform,
			apiUrl: undefined,
			profileKey: undefined,
			isLinked: false,
			linkedAt: undefined,
			avatar: undefined,
			username: undefined,
			displayName: undefined,
			url: undefined,
			status: "pending",
			lastError: undefined,
		}, { owner: jazzAccountGroup._owner });

		jazzAccountGroup.accounts.push(platformAccount);
		
		// Reset form and close
		setNewAccountName("");
		setNewAccountPlatform("instagram");
		setShowAddAccountForm(false);
	};

	const handleRemoveAccount = (accountToRemove: any) => {
		if (!jazzAccountGroup) return;
		
		const index = jazzAccountGroup.accounts.findIndex((account: any) => 
			account.id === accountToRemove.id
		);
		if (index !== -1) {
			jazzAccountGroup.accounts.splice(index, 1);
			// Turn off removal mode after removing an account
			setIsRemovalMode(false);
		}
	};

	return (
		<div className="w-full max-w-4xl mx-auto p-6">
			{/* Account Group Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
						{accountGroup.name}
						{jazzAccountGroup && (
							<div className="w-3 h-3 bg-blue-500 rounded-full" title="Jazz Collaborative"></div>
						)}
						{legacyAccountGroup && (
							<div className="w-3 h-3 bg-green-500 rounded-full" title="Demo Account Group"></div>
						)}
					</h1>
					<p className="text-gray-600">
						{jazzAccountGroup ? "Collaborative account group" : "Demo account group"}
					</p>
				</div>
				<Button onClick={() => setShowCreateDialog(true)}>
					<Plus className="w-4 h-4 mr-2" />
					Create Post
				</Button>
			</div>

				{/* Ayrshare Account Linking */}
				{accounts.length > 0 && (
					<div className="mb-6">
						<h3 className="text-lg font-semibold mb-4">Account Linking Status</h3>
						<AyrshareAccountLinking 
							accounts={accounts}
							onAccountsUpdated={handleAccountsUpdated}
							isJazzAccountGroup={!!jazzAccountGroup}
						/>
					</div>
				)}

				{/* Account Group Info */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold">Connected Accounts</h3>
						<div className="flex items-center gap-3">
							<span className="text-sm text-gray-500">
								{accounts.filter((acc: any) => acc.isLinked).length} linked of {accounts.length} total
							</span>
							<div className="flex items-center gap-1">
								<Button
									size="1"
									variant="ghost"
									onClick={() => setShowAddAccountForm(!showAddAccountForm)}
									title="Add Account"
								>
									<Plus className="w-4 h-4" />
								</Button>
								<Button
									size="1"
									variant="ghost"
									onClick={() => {
										setIsRemovalMode(!isRemovalMode);
										if (!isRemovalMode) setShowAddAccountForm(false);
									}}
									title="Manage Accounts"
									color={isRemovalMode ? "red" : "gray"}
								>
									<Settings className="w-4 h-4" />
								</Button>
							</div>
						</div>
					</div>

					{/* Add Account Form */}
					{showAddAccountForm && (
						<Card className="mb-4">
							<div className="p-4 bg-gray-50">
								<h4 className="font-medium mb-3">Add New Account</h4>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
									<div>
										<label className="block text-sm font-medium mb-1">Platform</label>
										<select 
											value={newAccountPlatform}
											onChange={(e) => setNewAccountPlatform(e.target.value as any)}
											className="w-full px-3 py-2 border border-gray-200 rounded-md"
										>
											<option value="instagram">Instagram</option>
											<option value="x">X (Twitter)</option>
											<option value="youtube">YouTube</option>
											<option value="facebook">Facebook</option>
											<option value="linkedin">LinkedIn</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">Account Name</label>
										<input
											type="text"
											value={newAccountName}
											onChange={(e) => setNewAccountName(e.target.value)}
											placeholder="@username or display name"
											className="w-full px-3 py-2 border border-gray-200 rounded-md"
										/>
									</div>
									<div className="flex items-end gap-2">
										<Button 
											size="2"
											onClick={handleAddAccount}
											disabled={!newAccountName.trim()}
										>
											Add
										</Button>
										<Button 
											size="2"
											variant="soft"
											onClick={() => {
												setShowAddAccountForm(false);
												setNewAccountName("");
												setNewAccountPlatform("instagram");
											}}
										>
											Cancel
										</Button>
									</div>
								</div>
							</div>
						</Card>
					)}

					{/* Removal Mode Notice */}
					{isRemovalMode && (
						<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
							<p className="text-red-800 text-sm font-medium">
								Removal Mode: Click the trash icon to remove accounts
							</p>
						</div>
					)}
					
					{accounts.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{accounts.map((account: any, index: number) => {
								const platformIcon = platformIcons[account.platform as keyof typeof platformIcons] || platformIcons.base;
								const platformLabel = platformLabels[account.platform as keyof typeof platformLabels] || account.platform;
								
								return (
									<div key={account.id || index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
										<div className="relative">
											<Image
												src={platformIcon}
												alt={platformLabel}
												width={20}
												height={20}
												className="rounded"
											/>
											<div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
												account.isLinked 
													? 'bg-green-500' 
													: account.status === 'error' 
													? 'bg-red-500' 
													: 'bg-gray-400'
											}`}></div>
										</div>
										<div className="flex-1">
											<p className="font-medium text-gray-900">{account.name}</p>
											<p className={`text-sm ${
												account.isLinked 
													? 'text-green-600' 
													: account.status === 'error' 
													? 'text-red-600' 
													: 'text-gray-500'
											}`}>
												{account.isLinked 
													? 'Connected' 
													: account.status === 'error' 
													? 'Error' 
													: 'Pending'
												}
											</p>
										</div>
										{isRemovalMode && (
											<Button
												size="1"
												variant="ghost"
												color="red"
												onClick={() => handleRemoveAccount(account)}
												title="Remove Account"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										)}
									</div>
								);
							})}
						</div>
					) : (
						<div className="text-center py-8 text-gray-500">
							<Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
							<p className="text-sm">No accounts connected yet</p>
							<p className="text-xs mt-1">Click the + icon to add your first account</p>
						</div>
					)}
				</div>

				{/* Posts */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-xl font-semibold">Posts ({posts.length})</h2>
						<Button variant="outline" onClick={() => setShowCreateDialog(true)}>
							<Plus className="w-4 h-4 mr-2" />
							New Post
						</Button>
					</div>
					
					{posts.length === 0 ? (
						<div className="text-center py-12">
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
						<div className="space-y-4">
							{posts.map((post: any, index: number) => {
								const postId = post.id || post.variants?.base?.id || index;
								
								// Handle collaborative vs legacy text access
								let postTitle = "Untitled Post";
								let postContent = "";
								
								if (post.title) {
									// For Jazz posts, title is a collaborative object
									postTitle = typeof post.title === 'string' ? post.title : post.title.toString();
								}
								
								if (post.content) {
									// Legacy posts might have direct content
									postContent = post.content;
								} else if (post.variants?.base?.text) {
									// For Jazz posts, text is a collaborative object
									postContent = typeof post.variants.base.text === 'string' 
										? post.variants.base.text 
										: post.variants.base.text.toString();
								}
								
								const postDate = post.createdAt || post.variants?.base?.postDate || new Date();
								
								return (
									<Link
										key={postId}
										href={`/account-group/${accountGroup.id}/post/${postId}`}
										className="flex gap-4 border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
									>
										<div className="flex-1">
											<h3 className="font-semibold mb-1">{postTitle}</h3>
											<p className="text-gray-600 line-clamp-2">{postContent}</p>
											<div className="text-xs text-gray-500 mt-2">
												{new Date(postDate).toLocaleDateString()}
											</div>
										</div>
									</Link>
								);
							})}
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
							
							{jazzAccountGroup && (
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
									<p className="text-blue-800 text-sm">
										<strong>Collaborative:</strong> This post will be saved to your Jazz collaborative workspace.
									</p>
								</div>
							)}
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
