"use client";

import { useState } from "react";
import { Button, Card, TextArea } from "@radix-ui/themes";
import { Dialog, Select, Label, DropdownMenu, VisuallyHidden } from "radix-ui";
import { Input } from "./input";
import {
	Edit3,
	Settings,
	Save,
  Plus,
} from "lucide-react";
import { Post, PostFullyLoaded } from "../app/schema";
import Image from "next/image";
import { MediaItem } from "../app/schema";

import { accountGroups, platformIcons } from "../app/page";
import clsx from "clsx";

type SeriesType = "reply" | "multi";

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
	// const [socialConfigs, setSocialConfigs] = useState<SocialConfig[]>([
	// 	{
	// 		platform: "sprout",
	// 		isActive: true,
	// 		isEdited: false,
	// 		content: [
	// 			{
	// 				id: "1",
	// 				images: [
	// 					"/placeholder.svg?height=300&width=300&query=social media post image",
	// 				],
	// 				text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum",
	// 				currentImageIndex: 0,
	// 			},
	// 		],
	// 	},
	// 	{
	// 		platform: "butterfly",
	// 		isActive: false,
	// 		isEdited: false,
	// 		content: [],
	// 	},
	// 	{
	// 		platform: "youtube",
	// 		isActive: false,
	// 		isEdited: false,
	// 		content: [],
	// 	},
	// 	{
	// 		platform: "instagram",
	// 		isActive: false,
	// 		isEdited: false,
	// 		content: [],
	// 	},
	// 	{
	// 		platform: "linkedin",
	// 		isActive: false,
	// 		isEdited: false,
	// 		content: [],
	// 	},
	// 	{
	// 		platform: "twitter",
	// 		isActive: false,
	// 		isEdited: false,
	// 		content: [],
	// 	},
	// ]);

	console.log(post);

	// const handleSeriesTypeChange = (value: SeriesType) => {
	// 	setSeriesType(value);
	// 	if (value === "reply") {
	// 		setShowReplyDialog(true);
	// 	}

		// Update content structure based on series type
		// setSocialConfigs((prev) =>
		// 	prev.map((config) => ({
		// 		...config,
		// 		content:
		// 			value === "multi"
		// 				? [
		// 						{
		// 							id: "1",
		// 							images: [
		// 								"/placeholder.svg?height=300&width=300",
		// 								"/placeholder.svg?height=300&width=300",
		// 								"/placeholder.svg?height=300&width=300",
		// 							],
		// 							text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum",
		// 							currentImageIndex: 0,
		// 						},
		// 						{
		// 							id: "2",
		// 							images: [
		// 								"/placeholder.svg?height=300&width=300",
		// 								"/placeholder.svg?height=300&width=300",
		// 							],
		// 							text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
		// 							currentImageIndex: 0,
		// 						},
		// 				  ]
		// 				: [
		// 						{
		// 							id: "1",
		// 							images: ["/placeholder.svg?height=400&width=400"],
		// 							text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum",
		// 							currentImageIndex: 0,
		// 						},
		// 				  ],
		// 	}))
		// );
	// };

	// const navigateImage = (
	// 	platform: SocialPlatform,
	// 	postId: string,
	// 	direction: "prev" | "next"
	// ) => {
	// 	setSocialConfigs((prev) =>
	// 		prev.map((config) => {
	// 			if (config.platform === platform) {
	// 				return {
	// 					...config,
	// 					content: config.content.map((post) => {
	// 						if (post.id === postId) {
	// 							const newIndex =
	// 								direction === "next"
	// 									? (post.currentImageIndex + 1) % post.images.length
	// 									: (post.currentImageIndex - 1 + post.images.length) %
	// 									  post.images.length;
	// 							return { ...post, currentImageIndex: newIndex };
	// 						}
	// 						return post;
	// 					}),
	// 				};
	// 			}
	// 			return config;
	// 		})
	// 	);
	// };

	const handleSave = () => {
		setShowSaveButton(false);
		// set context text to post.base.text
		setContextText(null);
		console.log("save");
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
				<h1
					className="text-3xl font-bold cursor-pointer"
					// onClick={() => markAsEdited(activeConfig?.platform || "sprout")}
				>
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
          </div>
          {seriesType && (
            <Dialog.Root open={showSettings} onOpenChange={setShowSettings}>
              <div className="flex-col relative h-5">
              <Dialog.Trigger asChild>
                <Button variant="ghost" size="1" className="p-0">
                  <Settings className="w-4 h-4" />
                </Button>
              </Dialog.Trigger>
              <Dialog.Content>
                <div className="absolute top-6 right-0 bg-white p-4 rounded-md z-50 shadow-md border-1 border-gray-200">
                  <Dialog.Title>Posting Settings</Dialog.Title>
                  <div className="space-y-4">
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
                  </div>
                </div>
              </Dialog.Content>
            </div>
           </Dialog.Root>
          )}
        </div>
			</div>

      {showReplyDialog || seriesType === "reply" && (
        <div>
          <Input type="text" placeholder="url to post to reply to" value={replyUrl} onChange={(e) => setReplyUrl(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReplyDialog(false)}
            >
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
								{/* Image Carousel */}
								<div className="mb-6 flex justify-center">
									{mediaItem && <MediaComponent mediaItem={mediaItem} />}
								</div>

								{/* Edit Button */}
								{/* show edit  button only for platofmr accounts not not base in content */}
								{post.variants[activeTab]?.edited && (
									<div className="flex justify-end mb-4">
										<Button
											variant="ghost"
											size="1"
											// onClick={() => markAsEdited(activeConfig.platform)}
										>
											<Edit3 className="w-5 h-5" />
										</Button>
									</div>
								)}

								{/* Text Content */}
								<div className="space-y-4 relative w-full">
									<TextArea
										value={contextText || post.variants[activeTab]?.text?.toString() || ""}
										onChange={(e) => {
											// markAsEdited(activeConfig.platform);
											// Update text logic here
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

									{/* {seriesType === "reply" && postIndex === 0 && (
										<div className="border-l-2 border-gray-300 pl-4 space-y-4">
											<p className="text-sm text-gray-600 leading-relaxed">
												Lorem ipsum dolor sit amet, consectetur adipiscing elit,
												sed do eiusmod tempor incididunt ut labore et dolore
												magna aliqua. Ut enim ad minim veniam, quis nostrud
												exercitation ullamco laboris nisi ut aliquip ex ea
												commodo consequat. Duis aute irure dolor in
												reprehenderit in voluptate velit esse cillum dolore eu
												fugiat nulla pariatur. Excepteur sint occaecat cupidatat
												non proident, sunt in culpa qui officia deserunt mollit
												anim id est laborum
											</p>
											<p className="text-sm text-gray-600 leading-relaxed">
												Lorem ipsum dolor sit amet, consectetur adipiscing elit,
												sed do eiusmod tempor incididunt ut labore et dolore
												magna aliqua. Ut enim ad minim veniam, quis nostrud
												exercitation ullamco laboris nisi ut aliquip ex ea
												commodo consequat. Duis aute irure dolor in
												reprehenderit in voluptate velit esse cillum dolore eu
												fugiat nulla pariatur. Excepteur sint occaecat cupidatat
												non proident, sunt in culpa qui officia deserunt mollit
												anim id est laborum
											</p>
										</div>
									)} */}
									{showSaveButton && (
										<Button
											variant="outline"
											onClick={() => handleSave()}
											className="absolute bottom-0 right-0"
										>
											<Save className="w-5 h-5 text-green-500" />
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
