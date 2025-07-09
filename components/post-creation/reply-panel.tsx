import { Card, Box, Text } from "@radix-ui/themes";
import { Link as LinkIcon, Loader2, AlertCircle, Check } from "lucide-react";
import { Input } from "../input";
import { ReplyPreview } from "../reply-preview";
import { PostFullyLoaded } from "../../app/schema";

interface ReplyPanelProps {
    replyUrl: string;
    handleReplyUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isValidReplyUrl: boolean;
    detectedPlatform: string | null;
    isFetchingReply: boolean;
    fetchReplyError: string | null;
    post: PostFullyLoaded;
    activeTab: string;
}

export const ReplyPanel = ({
    replyUrl,
    handleReplyUrlChange,
    isValidReplyUrl,
    detectedPlatform,
    isFetchingReply,
    fetchReplyError,
    post,
    activeTab,
}: ReplyPanelProps) => {
    return (
        <Card>
            <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    <Text weight="medium">Reply/Comment URL</Text>
                </div>
                <div className="space-y-2">
                    <Input
                        type="url"
                        placeholder="Paste the URL of the post you want to reply to..."
                        value={replyUrl}
                        onChange={handleReplyUrlChange}
                        className={isValidReplyUrl ? "border-green-500" : replyUrl ? "border-red-500" : ""}
                    />
                    {replyUrl && (
                        <div className="flex items-center gap-2 text-sm mt-2">
                            {isValidReplyUrl ? (
                                <>
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span className="text-green-600">Valid {detectedPlatform} URL detected</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                    <span className="text-red-600">Please enter a valid social media post URL</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
                {isFetchingReply && (
                    <Box className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Fetching post...</span>
                    </Box>
                )}
                {fetchReplyError && (
                    <Box className="text-sm text-red-600">
                        {fetchReplyError}
                    </Box>
                )}
                <ReplyPreview
                    htmlContent={post.variants[activeTab]?.replyTo?.authorPostContent}
                    author={post.variants[activeTab]?.replyTo?.author}
                    username={post.variants[activeTab]?.replyTo?.authorUsername}
                    platform={post.variants[activeTab]?.replyTo?.platform}
                />
            </div>
        </Card>
    );
}; 