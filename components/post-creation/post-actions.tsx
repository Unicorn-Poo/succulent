import { Button, Card, Switch, Box, Text } from "@radix-ui/themes";
import { Label } from "radix-ui";
import { MessageSquare, Eye, CalendarDays, Calendar, Loader2, Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../tooltip";

interface PostActionsProps {
    seriesType: "reply" | null;
    handleToggleReplyMode: () => void;
    hasMultipleAccounts: boolean;
    detectedPlatform: string | null;
    isQuoteTweet: boolean;
    setIsQuoteTweet: (isQuote: boolean) => void;
    manualThreadMode: boolean;
    setManualThreadMode: (manual: boolean) => void;
    handlePreview: () => void;
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
    scheduledDate,
    setShowSettings,
    showPublishButton,
    handlePublishPost,
    isScheduling,
    getReplyDescription,
    isThread
}: PostActionsProps) => {
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
                                <Label.Root htmlFor="quote-tweet-toggle" className="text-sm font-medium">
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
                            <Label.Root htmlFor="thread-toggle" className="text-sm font-medium">
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
                            <Button
                                variant="outline"
                                size="2"
                                onClick={handlePreview}
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">Preview</span>
                            </Button>

                            {/* Schedule Button */}
                            <Button
                                variant="outline"
                                size="2"
                                onClick={() => setShowSettings(true)}
                                className="flex items-center gap-2"
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
                                    className="flex items-center gap-2"
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
                    <Box className="bg-blue-50 p-3 rounded-lg mt-4">
                        <Text size="2" color="blue">
                            {getReplyDescription()} Replies do not support media.
                        </Text>
                    </Box>
                )}

                {isThread && seriesType !== 'reply' && (
                    <Box className="bg-green-50 p-3 rounded-lg">
                        <Text size="2" color="green">
                            This post will be published as a thread.
                        </Text>
                    </Box>
                )}
            </div>
        </Card>
    )
} 