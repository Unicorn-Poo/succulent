"use client";
import { useParams, useRouter } from "next/navigation"; 
import { useState } from "react";
import { Dialog, TextField, TextArea, Text, Tabs } from "@radix-ui/themes";
import { Button } from "@/components/atoms/button";
import { Plus, Users, BarChart3, Settings, MessageCircle, Cog, Eye, Grid, List, Calendar } from "lucide-react";
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
import { PlatformPreview } from "@/components/organisms/platform-previews";
import PlatformProfileView from "@/components/organisms/platform-profile-view";
import CalendarView from "@/components/organisms/calendar-view";

export default function AccountGroupPage() {
	const params = useParams();
	const router = useRouter();
	const [activeTab, setActiveTab] = useState("posts");
	
	// Create post dialog state
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [newPostTitle, setNewPostTitle] = useState("");
	const [newPostText, setNewPostText] = useState("");
	
	// Preview state
	const [showPreview, setShowPreview] = useState(false);
	const [previewAccount, setPreviewAccount] = useState<any>(null);
	const [previewMode, setPreviewMode] = useState<'feed' | 'profile'>('feed');
	
	// Posts filter state
	const [postsFilter, setPostsFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');
	
	// Get account group ID from params
	const accountGroupId = params.groupId as string;
	
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
		(group) => group.id === accountGroupId
	);
	
	const jazzAccountGroup = me?.root?.accountGroups?.find(
		(group: any) => group.id === accountGroupId
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
				status: "draft",
				scheduledFor: undefined,
				publishedAt: undefined,
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
						<Button onClick={() => setShowCreateDialog(true)} className="bg-lime-600 hover:bg-lime-700 text-white">
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
						<Tabs.Trigger value="calendar">
							<Calendar className="w-4 h-4 mr-2" />
							Calendar
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
								<Button onClick={() => setShowCreateDialog(true)} className="bg-lime-600 hover:bg-lime-700 text-white">
									<Plus className="w-4 h-4 mr-2" />
									Create First Post
								</Button>
							</div>
						) : (
							<div className="space-y-6">
								{/* Posts Header with Filters */}
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-4">
										<h2 className="text-xl font-semibold text-gray-900">Posts</h2>
										<div className="text-sm text-gray-500">
											{(() => {
												const filterCounts = {
													all: posts.length,
													draft: posts.filter(p => (p.variants?.base?.status || p.status || 'draft') === 'draft').length,
													scheduled: posts.filter(p => (p.variants?.base?.status || p.status || 'draft') === 'scheduled').length,
													published: posts.filter(p => (p.variants?.base?.status || p.status || 'draft') === 'published').length
												};
												return `${filterCounts[postsFilter]} ${postsFilter === 'all' ? 'total' : postsFilter} post${filterCounts[postsFilter] !== 1 ? 's' : ''}`;
											})()}
										</div>
									</div>
									
									{/* Filter Controls */}
									<div className="flex items-center gap-2">
										{[
											{ key: 'all', label: 'All', icon: List },
											{ key: 'draft', label: 'Drafts', icon: MessageCircle },
											{ key: 'scheduled', label: 'Scheduled', icon: Calendar },
											{ key: 'published', label: 'Published', icon: Eye }
										].map(({ key, label, icon: Icon }) => (
											<Button
												key={key}
												variant={postsFilter === key ? 'solid' : 'outline'}
												size="1"
												onClick={() => setPostsFilter(key as any)}
												className={postsFilter === key ? 'bg-lime-600 text-white' : ''}
											>
												<Icon className="w-3 h-3 mr-1" />
												{label}
											</Button>
										))}
									</div>
								</div>

								{/* Posts Grid */}
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{posts
										.filter(post => {
											if (postsFilter === 'all') return true;
											const postStatus = post.variants?.base?.status || post.status || 'draft';
											return postStatus === postsFilter;
										})
										.map((post: any, index: number) => {
											const postId = post.id || post.variants?.base?.id || index;
											
											// Extract post data
											const postTitle = post.title?.toString() || post.title || "Untitled Post";
											const postContent = post.variants?.base?.text?.toString() || 
															  post.variants?.base?.text || 
															  post.content || 
															  "";
											const postStatus = post.variants?.base?.status || post.status || 'draft';
											const postDate = post.variants?.base?.postDate || post.createdAt || new Date();
											const hasMedia = post.variants?.base?.media && post.variants.base.media.length > 0;
											
											// Status styling
											const getStatusColor = (status: string) => {
												switch (status) {
													case 'published': return 'bg-green-100 text-green-800';
													case 'scheduled': return 'bg-yellow-100 text-yellow-800';
													case 'draft': return 'bg-gray-100 text-gray-800';
													default: return 'bg-gray-100 text-gray-800';
												}
											};
											
											const getStatusIcon = (status: string) => {
												switch (status) {
													case 'published': return '✓';
													case 'scheduled': return '⏰';
													case 'draft': return '📝';
													default: return '📝';
												}
											};
											
											return (
												<Link
													key={postId}
													href={`/account-group/${accountGroup.id}/post/${postId}`}
													className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-lime-300 group"
												>
													{/* Header with status and date */}
													<div className="flex items-center justify-between mb-3">
														<div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(postStatus)}`}>
															{getStatusIcon(postStatus)} {postStatus.charAt(0).toUpperCase() + postStatus.slice(1)}
														</div>
														<div className="text-xs text-gray-500">
															{new Date(postDate).toLocaleDateString()}
														</div>
													</div>
													
													{/* Title */}
													<h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-lime-600 transition-colors">
														{postTitle}
													</h3>
													
													{/* Content Preview */}
													<p className="text-sm text-gray-600 mb-3 line-clamp-3">
														{postContent || "No content"}
													</p>
													
													{/* Footer with media indicator and platforms */}
													<div className="flex items-center justify-between pt-3 border-t border-gray-100">
														<div className="flex items-center gap-2">
															{hasMedia && (
																<div className="flex items-center gap-1 text-xs text-gray-500">
																	<span>📎</span>
																	<span>{post.variants.base.media.length} media</span>
																</div>
															)}
														</div>
														
														<div className="flex items-center gap-1">
															<MessageCircle className="w-3 h-3 text-gray-400 group-hover:text-lime-500 transition-colors" />
															<span className="text-xs text-gray-500 group-hover:text-lime-600">Edit</span>
														</div>
													</div>
												</Link>
											);
										})}
								</div>
								
								{/* Empty state for filtered results */}
								{posts.filter(post => {
									if (postsFilter === 'all') return true;
									const postStatus = post.variants?.base?.status || post.status || 'draft';
									return postStatus === postsFilter;
								}).length === 0 && postsFilter !== 'all' && (
									<div className="text-center py-8">
										<div className="text-gray-400 mb-2">
											<MessageCircle className="w-8 h-8 mx-auto mb-2" />
										</div>
										<p className="text-gray-500">No {postsFilter} posts found</p>
										<p className="text-sm text-gray-400 mt-1">
											{postsFilter === 'draft' && "Create a new post to get started"}
											{postsFilter === 'scheduled' && "Schedule some posts for future publishing"}
											{postsFilter === 'published' && "Publish some posts to see them here"}
										</p>
									</div>
								)}
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
									className="bg-green-600 hover:bg-green-700 text-white"
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
									<Button onClick={() => window.open('https://app.ayrshare.com/social-accounts', '_blank')} className="bg-green-600 hover:bg-green-700 text-white">
										Connect Accounts
									</Button>
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{accounts.map((account: any) => (
										<div key={account.id || account._id} className="bg-white rounded-lg p-6 border border-gray-200">
											<div className="flex items-center gap-3 mb-3">
												<div className="w-10 h-10 bg-lime-100 rounded-lg flex items-center justify-center">
													<Text size="2" weight="bold">{account.platform?.charAt(0).toUpperCase()}</Text>
												</div>
												<div>
													<Text size="3" weight="medium" className="block">{account.name}</Text>
													<Text size="2" color="gray">{account.platform}</Text>
												</div>
											</div>
											<div className="flex items-center gap-2 mb-4">
												<div className={`w-2 h-2 rounded-full ${account.isLinked ? 'bg-green-500' : 'bg-gray-300'}`} />
												<Text size="2" color={account.isLinked ? "green" : "gray"}>
													{account.isLinked ? 'Connected' : 'Not Connected'}
												</Text>
											</div>
											
											{/* Preview Buttons */}
											{account.isLinked && (
												<div className="flex gap-2">
													<Button
														size="1"
														variant="soft"
														className="flex-1"
														onClick={() => {
															setPreviewAccount(account);
															setPreviewMode('feed');
															setShowPreview(true);
														}}
													>
														<List className="w-3 h-3 mr-1" />
														Feed
													</Button>
													<Button
														size="1"
														variant="soft"
														className="flex-1"
														onClick={() => {
															setPreviewAccount(account);
															setPreviewMode('profile');
															setShowPreview(true);
														}}
													>
														<Grid className="w-3 h-3 mr-1" />
														Profile
													</Button>
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					</Tabs.Content>

					{/* Calendar Tab */}
					<Tabs.Content value="calendar" className="mt-6">
						<CalendarView posts={posts} accountGroupId={accountGroup.id} />
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
										<Button onClick={handleCreatePost} disabled={!newPostTitle.trim()} className="bg-lime-600 hover:bg-lime-700 text-white disabled:bg-gray-400">
					Create Post
				</Button>
					</div>
				</Dialog.Content>
			</Dialog.Root>
			
			{/* Account Preview Modal */}
			<Dialog.Root open={showPreview} onOpenChange={setShowPreview}>
				<Dialog.Content style={{ maxWidth: '90vw', maxHeight: '90vh', width: '1200px' }}>
					<div className="flex items-center justify-between mb-4">
						<Dialog.Title>
							{previewAccount?.name} - {previewMode === 'feed' ? 'Feed View' : 'Profile View'}
						</Dialog.Title>
						<Button variant="ghost" size="1" onClick={() => setShowPreview(false)}>
							<MessageCircle className="w-4 h-4" />
						</Button>
					</div>
					
					<div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
						{previewAccount && previewMode === 'profile' ? (
							<PlatformProfileView
								account={previewAccount}
								posts={getPostsArray()}
								onBack={() => setShowPreview(false)}
								accountGroupId={accountGroup.id}
								onCreatePost={(platform) => {
									setShowPreview(false);
									setShowCreateDialog(true);
								}}
							/>
						) : previewAccount && previewMode === 'feed' ? (
							<div className="space-y-4">
								<div className="text-center mb-6">
									<div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
										<div className="w-8 h-8 bg-lime-100 rounded-lg flex items-center justify-center">
											<Text size="2" weight="bold">{previewAccount.platform?.charAt(0).toUpperCase()}</Text>
										</div>
										<div>
											<Text size="3" weight="medium">{previewAccount.name}</Text>
											<Text size="2" color="gray" className="capitalize">{previewAccount.platform} Feed</Text>
										</div>
									</div>
								</div>
								
								{/* Sample posts for feed preview */}
								<div className="max-w-md mx-auto space-y-4">
									{getPostsArray().length > 0 ? (
										getPostsArray().slice(0, 3).map((post: any) => (
											<PlatformPreview
												key={post.id}
												platform={previewAccount.platform}
												content={post.variants?.base?.text || post.content || "Sample post content"}
												account={{
													id: previewAccount.id || previewAccount._id,
													name: previewAccount.name,
													username: previewAccount.name.toLowerCase().replace(/\s+/g, ''),
													displayName: previewAccount.name,
													platform: previewAccount.platform,
													avatar: previewAccount.avatar || `https://avatar.vercel.sh/${previewAccount.name}`,
													apiUrl: previewAccount.apiUrl || '',
													url: previewAccount.url || ''
												}}
												timestamp={new Date()}
												media={post.variants?.base?.media || []}
											/>
										))
									) : (
										<div className="space-y-4">
											<PlatformPreview
												platform={previewAccount.platform}
												content="🌱 Welcome to my feed! This is how your posts will appear to your followers."
												account={{
													id: previewAccount.id || previewAccount._id,
													name: previewAccount.name,
													username: previewAccount.name.toLowerCase().replace(/\s+/g, ''),
													displayName: previewAccount.name,
													platform: previewAccount.platform,
													avatar: previewAccount.avatar || `https://avatar.vercel.sh/${previewAccount.name}`,
													apiUrl: previewAccount.apiUrl || '',
													url: previewAccount.url || ''
												}}
												timestamp={new Date()}
												media={[]}
											/>
											<PlatformPreview
												platform={previewAccount.platform}
												content="📱 This is a preview of how your content will look on this platform. Create your first post to see it here!"
												account={{
													id: previewAccount.id || previewAccount._id,
													name: previewAccount.name,
													username: previewAccount.name.toLowerCase().replace(/\s+/g, ''),
													displayName: previewAccount.name,
													platform: previewAccount.platform,
													avatar: previewAccount.avatar || `https://avatar.vercel.sh/${previewAccount.name}`,
													apiUrl: previewAccount.apiUrl || '',
													url: previewAccount.url || ''
												}}
												timestamp={new Date()}
												media={[]}
											/>
										</div>
									)}
								</div>
							</div>
						) : (
							<div className="text-center py-12">
								<Text size="4" color="gray">No preview available</Text>
							</div>
						)}
					</div>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	);
}
