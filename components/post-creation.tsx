"use client";

import { useState } from "react";
import { Button, Card, TextArea } from "@radix-ui/themes";
import { Dialog, Label } from "radix-ui";
import { Input } from "./input";
import {
	Edit3,
	Save,
  Plus,
  Calendar
} from "lucide-react";
import { Post, PostFullyLoaded } from "../app/schema";
import Image from "next/image";
import { MediaItem } from "../app/schema";
import { accountGroups, platformIcons } from "../app/page";

type SeriesType = "reply" | "multi";

// Ayrshare API configuration
const AYRSHARE_API_KEY = process.env.NEXT_PUBLIC_AYRSHARE_API_KEY;
const AYRSHARE_API_URL = "https://app.ayrshare.com/api";

export default function PostCreationComponent({ post }: { post: PostFullyLoaded }) {
	const [activeTab, setActiveTab] = useState("base");
	const [seriesType, setSeriesType] = useState<SeriesType | null>(null);
	const [title, setTitle] = useState("Title");
	const [replyUrl, setReplyUrl] = useState("");
	const [postingInterval, setPostingInterval] = useState(5);
	const [showSettings, setShowSettings] = useState(false);
	const [showReplyDialog, setShowReplyDialog] = useState(false);
	const [showSaveButton, setShowSaveButton] = useState(false);
	const [contextText, setContextText] = useState<string | null>(null);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

	const handleSave = async () => {
		setShowSaveButton(false);
		setContextText(null);
    const uneditedPostPlatforms = Object.keys(post.variants).filter((key) => {
      const variant = post.variants[key as keyof typeof post.variants];
      return typeof variant !== 'function' && !variant.edited;
    });

    const editedPostPlatforms = Object.keys(post.variants).filter((key) => {
      const variant = post.variants[key as keyof typeof post.variants];
      return typeof variant !== 'function' && variant.edited;
    });

    if (scheduledDate) {
      setIsScheduling(true);
      try {
        // Prepare post data for Ayrshare, if post unedited then map over platforms, otherwise if edited treat as own post with single platform
        const postData = {
          post: post.variants.base?.text?.toString(),
          platforms: uneditedPostPlatforms,
          mediaUrls: post.variants[activeTab]?.media?.map(m => 
            m?.type === "image" ? m?.image?.toString() : m?.video?.toString()
          ),
          scheduleDate: scheduledDate.toISOString()
        };

        // Call Ayrshare API to schedule post
        const response = await fetch(`${AYRSHARE_API_URL}/post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AYRSHARE_API_KEY}`
          },
          body: JSON.stringify(postData)
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to schedule post');
        }

        if (editedPostPlatforms.length > 0) {
          editedPostPlatforms.forEach(async (platform) => {
            const postData = {
              post: post.variants[platform]?.text?.toString(),
              platforms: [platform],
              mediaUrls: post.variants[platform]?.media?.map(m => 
                m?.type === "image" ? m?.image?.toString() : m?.video?.toString()
              ),
            };
            const response = await fetch(`${AYRSHARE_API_URL}/post/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AYRSHARE_API_KEY}`
              },
              body: JSON.stringify(postData)
            });

            const result = await response.json();
            if (!response.ok) {
              throw new Error(result.message || 'Failed to edit post');
            }
            console.log('Post edited successfully:', result);
          });
        }

        console.log('Post scheduled successfully:', result);
      } catch (error) {
        console.error('Error scheduling post:', error);
      } finally {
        setIsScheduling(false);
      }
    }
	};

	const postPlatformsKeys = Object.keys(post.variants).filter((key) => key !== "title");
	const postPlatforms = postPlatformsKeys.map((key) => {
		const account = accountGroups[0].accounts[key as keyof typeof accountGroups[0]['accounts']];
		return { name: account?.name || key, icon: key === "base" ? platformIcons.base : platformIcons[account.platform as keyof typeof platformIcons]};
	});

	return (
		<div className="w-full max-w-4xl mx-auto p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex gap-2">
					{postPlatformsKeys.map((platformAccount, index) => (
						<Button
							key={platformAccount}
							variant={activeTab === platformAccount ? "solid" : "outline"}
							size="1"
							className="w-10 h-10 rounded-full"
							onClick={() => setActiveTab(platformAccount)}
						>
              {postPlatforms[index].icon && postPlatforms[index].icon}
							{postPlatforms[index].name}
						</Button>
					))}
          <Button variant="outline" size="1" className="w-5 h-5" onClick={() => setShowAddAccountDialog(true)} aria-label="Add Account">
            <Plus className="w-5 h-5" />
          </Button>
          <Dialog.Root open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
            <Dialog.Content>
              <Dialog.Title className="sr-only">Add Account</Dialog.Title>
              {accountGroups.map((group) => (
                <div key={group.id}>
                  {Object.keys(group.accounts).filter((account) => !postPlatformsKeys.includes(account)).map((account) => (
                    <div key={account}>{account}</div>
                  ))}
                </div>
              ))}
            </Dialog.Content>
          </Dialog.Root>
				</div>
			</div>

			{/* Title and Series Type */}
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold cursor-pointer">
					{post.title?.toString()}
				</h1>
				<div className="flex items-center relative gap-4">
          <div className="flex items-center gap-2 justify-center h-full">
            <Button variant={seriesType === "reply" ? "solid" : "outline"} size="1" onClick={() => setSeriesType("reply")}>
              Reply
            </Button>
            <Button variant={seriesType === "multi" ? "solid" : "outline"} size="1" onClick={() => setSeriesType("multi")}>
              Multi
            </Button>
            <Button variant="outline" size="1" onClick={() => setShowSettings(true)}>
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
          
          <Dialog.Root open={showSettings} onOpenChange={setShowSettings}>
            <div className="flex-col relative h-5">
              <Dialog.Content>
                <div className="absolute top-6 right-0 bg-white p-4 rounded-md z-50 shadow-md border-1 border-gray-200">
                  <Dialog.Title>Posting Settings</Dialog.Title>
                  <div className="space-y-4">
                    <div>
                      <Label.Root htmlFor="schedule">Schedule Post</Label.Root>
                      <Input
                        id="schedule"
                        type="datetime-local"
                        onChange={(e) => setScheduledDate(new Date(e.target.value))}
                      />
                    </div>
                    {seriesType === "multi" && (
                      <div>
                        <Label.Root htmlFor="interval">
                          Posting Interval (minutes)
                        </Label.Root>
                        <Input
                          id="interval"
                          type="number"
                          value={postingInterval}
                          onChange={(e) => setPostingInterval(Number(e.target.value))}
                          min={1}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Content>
            </div>
          </Dialog.Root>
        </div>
			</div>

      {showReplyDialog || seriesType === "reply" && (
        <div>
          <Input type="text" placeholder="url to post to reply to" value={replyUrl} onChange={(e) => setReplyUrl(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReplyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowReplyDialog(false)}>Confirm</Button>
          </div>
        </div>
      )}

			{post && (
				<Card>
					<div className="p-6">
						{post.variants[activeTab]?.media?.map((mediaItem, imageIndex) => (
							<div
								key={imageIndex}
								className={imageIndex > 0 ? "border-t pt-6 mt-6" : ""}
							>
								<div className="mb-6 flex justify-center">
									{mediaItem && <MediaComponent mediaItem={mediaItem} />}
								</div>

								{post.variants[activeTab]?.edited && (
									<div className="flex justify-end mb-4">
										<Button variant="ghost" size="1">
											<Edit3 className="w-5 h-5" />
										</Button>
									</div>
								)}

								<div className="space-y-4 relative w-full">
									<TextArea
										value={contextText || post.variants[activeTab]?.text?.toString() || ""}
										onChange={(e) => {
											setContextText(e.target.value);
											setShowSaveButton(true);
                      post.variants[activeTab] = {
                        ...post.variants[activeTab],
                        text: e.target.value,
                        edited: true,
                      } as Post['variants'][keyof Post['variants']]
										}}
										className="min-h-32 resize-none border-none p-0 text-sm leading-relaxed"
										placeholder="Enter your post content..."
									/>

									{showSaveButton && (
										<Button
											variant="outline"
											onClick={() => handleSave()}
											className="absolute bottom-0 right-0"
                      disabled={isScheduling}
										>
											<Save className="w-5 h-5 text-green-500" />
                      {isScheduling && <span className="ml-2">Scheduling...</span>}
										</Button>
									)}
								</div>
							</div>
						))}
					</div>
				</Card>
			)}
		</div>
	);
}

const MediaComponent = ({ mediaItem }: { mediaItem: MediaItem }) => {
	return (
		<>
			{mediaItem.type === "image" && (
				<Image
					src={mediaItem.image?.toString() ?? ""}
					alt={mediaItem.alt?.toString() ?? "image"}
					width={500}
					height={500}
				/>
			)}
			{mediaItem.type === "video" && (
				<video src={mediaItem.video?.toString() ?? ""} width={100} height={100} />
			)}
		</>
	);
};
