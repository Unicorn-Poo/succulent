"use client";
import { useParams, useRouter } from "next/navigation"; 
import { useState } from "react";
import { Button, Dialog, TextField, TextArea, Text, Tabs } from "@radix-ui/themes";
import { Plus, Users, BarChart3, Settings, MessageCircle, Cog } from "lucide-react";
import Link from "next/link";
import { accountGroups } from "@/app/page";
import { PostFullyLoaded } from "@/app/schema";
import { Home } from "lucide-react";
import { useAccount } from "jazz-react";
import { MyAppAccount } from "@/app/schema";
import AccountAnalyticsOverview from "@/components/organisms/account-analytics-overview";
import AccountGroupTools from "@/components/organisms/account-group-tools";
import { GelatoSettings } from "@/components/gelato-settings";
import { co, z } from "jazz-tools";
import { Post, AccountGroup, PostVariant, MediaItem, ReplyTo } from "@/app/schema";

export default function AccountGroupPage() {
	const params = useParams();
	const router = useRouter();
	const [activeTab, setActiveTab] = useState("posts");
	
	// Create post dialog state
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [newPostTitle, setNewPostTitle] = useState("");
	const [newPostText, setNewPostText] = useState("");
	
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
	
	if (!accountGroup) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h1 className="text-2xl font-bold text-gray-900 mb-2">Account Group Not Found</h1>
					<p className="text-gray-600 mb-6">The account group you're looking for doesn't exist.</p>
					<Link href="/">
						<Button>
							<Home className="w-4 h-4 mr-2" />
							Back to Dashboard
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	// Helper function to get accounts array from either format
	const getAccountsArray = () => {
		if (legacyAccountGroup) {
			return Object.values(legacyAccountGroup.accounts || {});
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

	const accounts = getAccountsArray();
	const posts = getPostsArray();

	// Transform accounts to the format expected by analytics components
	const transformedAccounts = accounts.map((account: any) => ({
		id: account.id || account._id || Math.random().toString(),
		name: account.name || account.displayName || "Unnamed Account",
		platform: account.platform || "unknown",
		profileKey: account.profileKey,
		isLinked: account.isLinked || false,
		status: account.status || "pending"
	}));

	const handleCreatePost = () => {
		if (!newPostTitle.trim()) return;

		if (jazzAccountGroup) {
			// Create a proper Jazz Post for collaborative account groups
			
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

	const handleToolUsed = (tool: string, result: any) => {
		// You can add specific handling for different tools here
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center">
							<Link href="/" className="text-gray-500 hover:text-gray-700 mr-4">
								<Home className="w-5 h-5" />
							</Link>
							<div>
								<h1 className="text-xl font-semibold text-gray-900">
									{accountGroup.name || "Account Group"}
								</h1>
								<p className="text-sm text-gray-500">
									{accounts.length} account{accounts.length !== 1 ? 's' : ''} • {posts.length} post{posts.length !== 1 ? 's' : ''}
								</p>
							</div>
						</div>
						<Button onClick={() => setShowCreateDialog(true)}>
							<Plus className="w-4 h-4 mr-2" />
							Create Post
						</Button>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<Tabs.Root value={activeTab} onValueChange={setActiveTab}>
					<Tabs.List>
						<Tabs.Trigger value="posts">
							<MessageCircle className="w-4 h-4 mr-2" />
							Posts
						</Tabs.Trigger>
						<Tabs.Trigger value="analytics">
							<BarChart3 className="w-4 h-4 mr-2" />
							Analytics
						</Tabs.Trigger>
						<Tabs.Trigger value="tools">
							<Settings className="w-4 h-4 mr-2" />
							Enhanced Tools
						</Tabs.Trigger>
						<Tabs.Trigger value="accounts">
							<Users className="w-4 h-4 mr-2" />
							Accounts
						</Tabs.Trigger>
						<Tabs.Trigger value="settings">
							<Cog className="w-4 h-4 mr-2" />
							Settings
						</Tabs.Trigger>
					</Tabs.List>

					{/* Posts Tab */}
					<Tabs.Content value="posts" className="mt-6">
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
					</Tabs.Content>

					{/* Analytics Tab */}
					<Tabs.Content value="analytics" className="mt-6">
						<AccountAnalyticsOverview 
							accounts={transformedAccounts}
							accountGroupId={accountGroup.id}
							title="Account Group Analytics"
						/>
					</Tabs.Content>

					{/* Enhanced Tools Tab */}
					<Tabs.Content value="tools" className="mt-6">
						<AccountGroupTools 
							accounts={transformedAccounts}
							accountGroupId={accountGroup.id}
							accountGroup={jazzAccountGroup}
							onToolUsed={handleToolUsed}
						/>
					</Tabs.Content>

					{/* Accounts Tab */}
					<Tabs.Content value="accounts" className="mt-6">
						<div className="space-y-6">
							<div className="flex items-center justify-between">
								<Text size="5" weight="bold">Connected Accounts</Text>
								<Button 
									onClick={() => window.open('https://app.ayrshare.com/social-accounts', '_blank')}
									variant="soft"
								>
									Link More Accounts
								</Button>
							</div>

							{accounts.length === 0 ? (
								<div className="text-center py-12">
									<Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
									<Text size="4" weight="medium" className="mb-2 block">No Accounts Connected</Text>
									<Text size="2" color="gray" className="mb-6 block">
										Connect your social media accounts to start posting and managing content.
									</Text>
									<Button onClick={() => window.open('https://app.ayrshare.com/social-accounts', '_blank')}>
										Connect Accounts
									</Button>
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{accounts.map((account: any) => (
										<div key={account.id || account._id} className="bg-white rounded-lg p-6 border border-gray-200">
											<div className="flex items-center gap-3 mb-3">
												<div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
													<Text size="2" weight="bold">{account.platform?.charAt(0).toUpperCase()}</Text>
												</div>
												<div>
													<Text size="3" weight="medium" className="block">{account.name}</Text>
													<Text size="2" color="gray">{account.platform}</Text>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<div className={`w-2 h-2 rounded-full ${account.isLinked ? 'bg-green-500' : 'bg-gray-300'}`} />
												<Text size="2" color={account.isLinked ? "green" : "gray"}>
													{account.isLinked ? 'Connected' : 'Not Connected'}
												</Text>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</Tabs.Content>

					{/* Settings Tab */}
					<Tabs.Content value="settings" className="mt-6">
						<div className="space-y-6">
							<div className="flex items-center gap-3 mb-6">
								<Cog className="w-5 h-5 text-gray-600" />
								<Text size="5" weight="bold">Account Group Settings</Text>
							</div>

							{/* Gelato Integration */}
							{jazzAccountGroup && (
								<GelatoSettings accountGroup={jazzAccountGroup as any} />
							)}

							{/* Future settings can be added here */}
							{!jazzAccountGroup && (
								<div className="text-center py-12">
									<Text size="4" weight="medium" className="mb-2 block">Settings Not Available</Text>
									<Text size="2" color="gray" className="mb-6 block">
										Settings are only available for collaborative account groups created with Jazz.
									</Text>
								</div>
							)}
						</div>
					</Tabs.Content>
				</Tabs.Root>
			</div>

			{/* Create Post Dialog */}
			<Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<Dialog.Content style={{ maxWidth: 500 }}>
					<Dialog.Title>Create New Post</Dialog.Title>
					<Dialog.Description>
						Create a new post for this account group. You can customize it for different platforms later.
					</Dialog.Description>

					<div className="space-y-4 mt-6">
						<div>
							<label className="block text-sm font-medium mb-2">Post Title</label>
							<TextField.Root
								value={newPostTitle}
								onChange={(e) => setNewPostTitle(e.target.value)}
								placeholder="Enter a title for your post..."
							/>
						</div>
						
						<div>
							<label className="block text-sm font-medium mb-2">Content (Optional)</label>
							<TextArea
								value={newPostText}
								onChange={(e) => setNewPostText(e.target.value)}
								placeholder="Start writing your post content..."
								rows={4}
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<Button variant="soft" onClick={() => setShowCreateDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleCreatePost} disabled={!newPostTitle.trim()}>
							Create Post
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	);
}
