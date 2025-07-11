"use client";

import { Card, Text } from "@radix-ui/themes";
import {
	AlertCircle,
	Check,
} from "lucide-react";
import { PostFullyLoaded } from "@/app/schema";
import type { MediaItem } from "@/types";
import { PreviewModal } from "./preview-modal";
import { usePostCreation } from "@/hooks/use-post-creation";
import { PostCreationHeader } from "./post-creation/post-creation-header";
import { PostActions } from "./post-creation/post-actions";
import { ReplyPanel } from "./post-creation/reply-panel";
import { PostContent } from "./post-creation/post-content";
import { ThreadPreview } from "./post-creation/thread-preview";
import { AddAccountDialog } from "./post-creation/add-account-dialog";
import { SettingsDialog } from "./post-creation/settings-dialog";

interface PostCreationProps {
	post: PostFullyLoaded;
	accountGroup: {
		id: string;
		name: string;
		accounts: Record<string, any>;
	};
}

export default function PostCreationComponent({ post, accountGroup }: PostCreationProps) {
	const {
		activeTab, setActiveTab,
		seriesType,
		title, setTitle,
		isEditingTitle, setIsEditingTitle,
		replyUrl,
		postingInterval, setPostingInterval,
		showSettings, setShowSettings,
		showSaveButton,
		showPublishButton,
		contextText,
		showAddAccountDialog, setShowAddAccountDialog,
		scheduledDate, setScheduledDate,
		isScheduling,
		isSaving,
		errors,
		success,
		threadPosts,
		selectedPlatforms,
		showPreviewModal, setShowPreviewModal,
		manualThreadMode, setManualThreadMode,
		isFetchingReply,
		fetchReplyError,
		isQuoteTweet, setIsQuoteTweet,
		post: currentPost,
		hasMultipleAccounts,
		isThread,
		isValidReplyUrl,
		detectedPlatform,
		availableAccounts,
		hasUnsavedChanges,
		handleToggleReplyMode,
		handleSaveContent,
		handlePublishPost,
		handleContentChange,
		handleReplyUrlChange,
		handleTitleSave,
		handleClearSchedule,
		handleAddAccount,
		handleRemoveAccount,
		getReplyDescription,
		handlePreview,
		handleImageUpload,
		isExplicitThread,
		isImplicitThread
	} = usePostCreation({ post, accountGroup });

	return (
		<div className="space-y-6">
			<PostCreationHeader
				title={title}
				setTitle={setTitle}
				isEditingTitle={isEditingTitle}
				setIsEditingTitle={setIsEditingTitle}
				handleTitleSave={handleTitleSave}
				selectedPlatforms={selectedPlatforms}
				accountGroup={accountGroup}
				seriesType={seriesType}
				detectedPlatform={detectedPlatform}
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				handleRemoveAccount={handleRemoveAccount}
				availableAccounts={availableAccounts}
				setShowAddAccountDialog={setShowAddAccountDialog}
				post={currentPost}
			/>

			<PostActions
				seriesType={seriesType}
				handleToggleReplyMode={handleToggleReplyMode}
				hasMultipleAccounts={hasMultipleAccounts}
				detectedPlatform={detectedPlatform}
				isQuoteTweet={isQuoteTweet}
				setIsQuoteTweet={setIsQuoteTweet}
				manualThreadMode={manualThreadMode}
				setManualThreadMode={setManualThreadMode}
				handlePreview={handlePreview}
				scheduledDate={scheduledDate}
				setShowSettings={setShowSettings}
				showPublishButton={showPublishButton}
				handlePublishPost={handlePublishPost}
				isScheduling={isScheduling}
				getReplyDescription={getReplyDescription}
				isThread={isThread}
			/>

			{seriesType === "reply" && (
				<ReplyPanel
					replyUrl={replyUrl}
					handleReplyUrlChange={handleReplyUrlChange}
					isValidReplyUrl={isValidReplyUrl}
					detectedPlatform={detectedPlatform}
					isFetchingReply={isFetchingReply}
					fetchReplyError={fetchReplyError}
					post={currentPost}
					activeTab={activeTab}
				/>
			)}

			<PostContent
				seriesType={seriesType}
				post={currentPost}
				activeTab={activeTab}
				handleImageUpload={handleImageUpload}
				contextText={contextText}
				handleContentChange={handleContentChange}
				hasUnsavedChanges={hasUnsavedChanges}
				showSaveButton={showSaveButton}
				handleSaveContent={handleSaveContent}
				isSaving={isSaving}
				isImplicitThread={isImplicitThread}
				isExplicitThread={isExplicitThread}
			/>

			<ThreadPreview isThread={isThread} threadPosts={threadPosts} />
			
			{/* Status Messages */}
			{errors.length > 0 && (
				<Card>
					<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
						<div className="flex items-center gap-2 mb-2">
							<AlertCircle className="w-4 h-4 text-red-500" />
							<Text weight="medium" color="red">Errors</Text>
						</div>
						<ul className="space-y-1">
							{errors.map((error, index) => (
								<li key={index} className="text-sm text-red-600">• {error}</li>
							))}
						</ul>
					</div>
				</Card>
			)}

			{success && (
				<Card>
					<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
						<div className="flex items-center gap-2">
							<Check className="w-4 h-4 text-green-500" />
							<Text weight="medium" color="green">{success}</Text>
						</div>
					</div>
				</Card>
			)}

			<AddAccountDialog
				open={showAddAccountDialog}
				onOpenChange={setShowAddAccountDialog}
				availableAccounts={availableAccounts}
				handleAddAccount={handleAddAccount}
			/>

			<SettingsDialog
				open={showSettings}
				onOpenChange={setShowSettings}
				scheduledDate={scheduledDate}
				setScheduledDate={setScheduledDate}
				isThread={isThread}
				postingInterval={postingInterval}
				setPostingInterval={setPostingInterval}
				handleClearSchedule={handleClearSchedule}
			/>

			{/* Preview Modal */}
			<PreviewModal
				isOpen={showPreviewModal}
				onClose={() => setShowPreviewModal(false)}
				content={contextText || currentPost.variants[activeTab]?.text?.toString() || ""}
				selectedPlatforms={selectedPlatforms}
				accountGroup={accountGroup}
				activeTab={activeTab}
				media={currentPost.variants[activeTab]?.media?.filter(Boolean) as any[] || []}
				isReply={seriesType === "reply"}
				isQuote={isQuoteTweet}
				replyTo={currentPost.variants[activeTab]?.replyTo}
				isThread={isThread}
				threadPosts={threadPosts}
				replyUrl={replyUrl}
			/>
		</div>
	);
}
