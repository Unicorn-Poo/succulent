import Image from "next/image";
import { TextField, Badge } from "@radix-ui/themes";
import { Button } from "@/components/atoms/button";
import { Edit3, Check, X, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/atoms";
import { platformIcons } from "@/utils/postConstants";
import { PostFullyLoaded } from "@/app/schema";

interface PostCreationHeaderProps {
    title: string;
    setTitle: (title: string) => void;
    isEditingTitle: boolean;
    setIsEditingTitle: (isEditing: boolean) => void;
    handleTitleSave: () => void;
    selectedPlatforms: string[];
    accountGroup?: PostFullyLoaded['accountGroup'];
    seriesType: "reply" | null;
    detectedPlatform: string | null;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    handleRemoveAccount: (platform: string) => void;
    availableAccounts: [string, any][];
    setShowAddAccountDialog: (show: boolean) => void;
    post: PostFullyLoaded;
}

export const PostCreationHeader = ({
    title,
    setTitle,
    isEditingTitle,
    setIsEditingTitle,
    handleTitleSave,
    selectedPlatforms,
    accountGroup,
    seriesType,
    detectedPlatform,
    activeTab,
    setActiveTab,
    handleRemoveAccount,
    availableAccounts,
    setShowAddAccountDialog,
    post
}: PostCreationHeaderProps) => {
    return (
        <div className="space-y-4">
            {/* Editable Title */}
            <div className="flex items-center gap-2">
                {isEditingTitle ? (
                    <div className="flex items-center gap-2 flex-1">
                        <TextField.Root
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleTitleSave();
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setIsEditingTitle(false);
                                }
                            }}
                            placeholder="Enter post title..."
                            className="flex-1"
                        />
                        <Button size="1" onClick={handleTitleSave}>
                            <Check className="w-4 h-4" />
                        </Button>
                        <Button size="1" variant="soft" onClick={() => setIsEditingTitle(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 flex-1">
                        <h1 className="text-3xl font-bold cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                            {title || "Untitled Post"}
                        </h1>
                        <Button size="1" variant="ghost" onClick={() => setIsEditingTitle(true)}>
                            <Edit3 className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Platform Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {selectedPlatforms.map((platform) => {
                    const account = accountGroup.accounts[platform];
                    const platformIcon = platform === "base"
                        ? platformIcons.base
                        : platformIcons[account?.platform as keyof typeof platformIcons] || platformIcons.base;
                    const displayName = platform === "base"
                        ? "Base"
                        : account?.name || platform;
                    const isDisabled = seriesType === 'reply' && platform !== 'base' && detectedPlatform && detectedPlatform !== account?.platform;

                    return (
                        <TooltipProvider key={platform}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center">
                                        <Button variant={activeTab === platform ? "solid" : "outline"}
                                            size="2"
                                            onClick={() => !isDisabled && setActiveTab(platform)}
                                            className="flex items-center gap-2"
                                            disabled={isDisabled || false}
                                        >
                                            <Image
                                                src={platformIcon}
                                                alt={platform}
                                                width={16}
                                                height={16}
                                            />
                                            {displayName}
                                            {/* Hide edited badge in reply mode */}
                                            {seriesType !== 'reply' && platform !== "base" && post.variants[platform]?.edited && (
                                                <Badge variant="soft" color="orange" className="ml-1">
                                                    •
                                                </Badge>
                                            )}
                                            {platform !== "base" && (
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent tab switch
                                                        handleRemoveAccount(platform);
                                                    }}
                                                    className="ml-1 p-0.5 rounded-full hover:bg-gray-500/20"
                                                >
                                                    <X className="w-3 h-3" />
                                                </span>
                                            )}
                                        </Button>                                      </div>
                                </TooltipTrigger>
                                {isDisabled && (
                                    <TooltipContent>
                                        <p>Replies are only available for the detected platform.</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}

                {availableAccounts.length > 0 && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline"
                                    size="2"
                                    onClick={() => setShowAddAccountDialog(true)}
                                    className="flex items-center gap-2"
                                    disabled={seriesType === 'reply'}
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Account
                                </Button>                            
                              </TooltipTrigger>
                            {seriesType === 'reply' && (
                                <TooltipContent>
                                    <p>You cannot add accounts while in reply mode.</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );
}; 