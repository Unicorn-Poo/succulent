import { Card, Switch, Box, Text } from "@radix-ui/themes";
import { Button } from "@/components/atoms/button";
import { Label } from "radix-ui";
import { MessageSquare, Eye, CalendarDays, Calendar, Loader2, Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/atoms/tooltip";

interface PostActionsProps {
    	seriesType: "reply" | "thread" | null;
    handleToggleReplyMode: () => void;
    hasMultipleAccounts: boolean;
    detectedPlatform: string | null;
    isQuoteTweet: boolean;
    setIsQuoteTweet: (isQuote: boolean) => void;
    manualThreadMode: boolean;
    setManualThreadMode: (manual: boolean) => void;
    handlePreview: () => void;
    selectedPlatforms: string[];
    scheduledDate: Date | null;
    setShowSettings: (show: boolean) => void;
    showPublishButton: boolean;
    handlePublishPost: () => void;
    isScheduling: boolean;
    getReplyDescription: () => string;
    isThread: boolean;
}

export const PostActions = ({
    seriesType,
    handleToggleReplyMode,
    hasMultipleAccounts,
    detectedPlatform,
    isQuoteTweet,
    setIsQuoteTweet,
    manualThreadMode,
    setManualThreadMode,
    handlePreview,
    selectedPlatforms,
    scheduledDate,
    setShowSettings,
    showPublishButton,
    handlePublishPost,
    isScheduling,
    getReplyDescription,
    isThread
}: PostActionsProps) => {
    // Check if any accounts are selected for preview
    const hasSelectedAccounts = selectedPlatforms.filter(p => p !== 'base').length > 0;
    return (
        <Card>
            <div className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-2">
                    {/* Post Type Actions */}
                    <div className="flex items-center gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={seriesType === 'reply' ? 'soft' : 'outline'}
										onClick={handleToggleReplyMode}
										disabled={hasMultipleAccounts}
									>
										<MessageSquare className="w-4 h-4" />
										<span className="hidden sm:inline ml-2">Reply</span>
									</Button>
								</TooltipTrigger>
								{hasMultipleAccounts && (
									<TooltipContent>
										<p>Replies can only be sent from a single account.</p>
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>

                        {/* Quote Tweet Toggle */}
                        {seriesType === 'reply' && detectedPlatform === 'x' && (
                            <div className="flex items-center gap-2">
                                <Label.Root htmlFor="quote-tweet-toggle" className="text-sm font-medium text-foreground">
                                    Quote Tweet
                                </Label.Root>
                                <Switch
                                    id="quote-tweet-toggle"
                                    checked={isQuoteTweet}
                                    onCheckedChange={setIsQuoteTweet}
                                />
                            </div>
                        )}
                    </div>

                    {/* Action Buttons & Toggles */}
                    <div className="flex items-center justify-end gap-4">
                        {/* Thread Toggle */}
                        <div className="flex items-center gap-2">
                            <Label.Root htmlFor="thread-toggle" className="text-sm font-medium text-foreground">
                                Create Thread
                            </Label.Root>
                            <Switch
                                id="thread-toggle"
                                checked={manualThreadMode}
                                onCheckedChange={setManualThreadMode}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Preview Button */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div>
                                            <Button
                                                variant="outline"
                                                size="2"
                                                onClick={handlePreview}
                                                disabled={!hasSelectedAccounts}
                                                className={hasSelectedAccounts 
                                                    ? "border-lime-600 text-lime-600 dark:text-lime-400 hover:bg-lime-50" 
                                                    : "border-gray-300 dark:border-gray-600 text-muted-foreground cursor-not-allowed"
                                                }
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                <span className="hidden sm:inline">Preview</span>
                                            </Button>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {hasSelectedAccounts 
                                            ? "Preview your post" 
                                            : "Select an account to enable preview"
                                        }
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            {/* Schedule Button */}
                            <Button
                                variant="outline"
                                size="2"
                                onClick={() => setShowSettings(true)}
                                className="flex items-center gap-2 border-amber-600 text-amber-600 hover:bg-amber-50"
                            >
                                {scheduledDate ? (
                                    <>
                                        <CalendarDays className="w-4 h-4" />
                                        <span className="hidden sm:inline">
                                            {scheduledDate.toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        <span className="sm:hidden">
                                            {scheduledDate.toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Calendar className="w-4 h-4" />
                                        <span className="hidden sm:inline">Schedule</span>
                                    </>
                                )}
                            </Button>

                            {/* Publish Button - appears when content is saved and ready to publish */}
                            {showPublishButton && (
                                                <Button
                    onClick={handlePublishPost}
                    disabled={isScheduling}
                    className="flex items-center gap-2 bg-lime-600 hover:bg-lime-700 text-white disabled:bg-gray-400"
                >
                                    {isScheduling ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="hidden sm:inline">{scheduledDate ? "Scheduling..." : "Publishing..."}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Globe className="w-4 h-4" />
                                            <span className="hidden sm:inline">{scheduledDate ? "Schedule" : "Publish"}</span>
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Post Type Descriptions */}
                {seriesType === "reply" && (
                    <Box className="bg-lime-50 p-3 rounded-lg mt-4">
                        <Text size="2" color="lime">
                            {getReplyDescription()} Replies do not support media.
                        </Text>
                    </Box>
                )}

                {isThread && seriesType !== 'reply' && (
                    <Box className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <Text size="2" color="green">
                            This post will be published as a thread.
                        </Text>
                    </Box>
                )}
            </div>
        </Card>
    )
} 