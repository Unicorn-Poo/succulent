import { Card, Text, Badge } from "@radix-ui/themes";
import { ListOrdered } from "lucide-react";
import { ThreadPost } from "@/utils/threadUtils";

interface ThreadPreviewProps {
    isThread: boolean;
    threadPosts: ThreadPost[];
}

export const ThreadPreview = ({ isThread, threadPosts }: ThreadPreviewProps) => {
    if (!isThread || threadPosts.length <= 1) return null;

    return (
        <Card>
            <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ListOrdered className="w-4 h-4" />
                        <Text weight="medium">Thread Preview ({threadPosts.length} posts)</Text>
                    </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {threadPosts.map((thread, index) => (
                        				<div key={index} className="bg-muted p-3 rounded border-l-4 border-lime-500">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="soft" size="1">{thread.index}/{thread.total}</Badge>
                                <Text size="1" color="gray">{thread.characterCount} characters</Text>
                            </div>
                            <Text size="2">{thread.content}</Text>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}; 