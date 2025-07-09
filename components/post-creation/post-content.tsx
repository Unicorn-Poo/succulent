import { Card, Button, Badge, Text, TextArea } from "@radix-ui/themes";
import { Plus, Upload, Edit3, Save, Loader2, ListTree } from "lucide-react";
import { MediaCarousel } from "./media-carousel";
import { PostFullyLoaded, MediaItem } from "../../app/schema";

interface PostContentProps {
    seriesType: "reply" | null;
    post: PostFullyLoaded;
    activeTab: string;
    handleImageUpload: () => void;
    contextText: string | null;
    handleContentChange: (content: string) => void;
    hasUnsavedChanges: boolean;
    showSaveButton: boolean;
    handleSaveContent: () => void;
    isSaving: boolean;
    isImplicitThread: boolean;
    isExplicitThread: boolean;
}

export const PostContent = ({
    seriesType,
    post,
    activeTab,
    handleImageUpload,
    contextText,
    handleContentChange,
    hasUnsavedChanges,
    showSaveButton,
    handleSaveContent,
    isSaving,
    isImplicitThread,
    isExplicitThread,
}: PostContentProps) => {
    return (
        <Card>
            <div className="p-6 space-y-6">
                {/* Media Display */}
                {seriesType !== 'reply' ? (
                    <div className="space-y-2">
                        {(post.variants[activeTab]?.media && post.variants[activeTab]!.media!.length > 0) ? (
                            <div className="relative group">
                                <MediaCarousel media={post.variants[activeTab]!.media!.filter(Boolean) as MediaItem[]} />
                                <Button
                                    variant="soft"
                                    size="1"
                                    onClick={handleImageUpload}
                                    className="absolute top-2 right-2 !rounded-full !w-8 !h-8 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8">
                                <Button
                                    variant="soft"
                                    onClick={handleImageUpload}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Add Media
                                </Button>
                            </div>
                        )}
                    </div>
                ) : null}

                {/* Content Editor */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {/* Don't show edited badge on base component */}
                            {seriesType !== 'reply' && activeTab !== "base" && post.variants[activeTab]?.edited && (
                                <Badge variant="soft" color="orange">
                                    <Edit3 className="w-3 h-3 mr-1" />
                                    Edited
                                </Badge>
                            )}
                        </div>

                        {hasUnsavedChanges && (
                            <Text size="1" color="orange">
                                Unsaved changes
                            </Text>
                        )}
                    </div>

                    <div className="relative">
                        <TextArea
                            value={contextText || post.variants[activeTab]?.text?.toString() || ""}
                            onChange={(e) => handleContentChange(e.target.value)}
                            placeholder="What's happening? Use double line breaks for threads."
                            className="min-h-32 resize-none text-lg leading-relaxed"
                            rows={6}
                        />

                        {/* Character count */}
                        <div className="absolute bottom-2 right-2 text-sm text-gray-500 flex items-center gap-2">
                            {isImplicitThread && (
                                <Badge color="blue" variant="soft">
                                    <ListTree className="w-3 h-3 mr-1" />
                                    Auto-threaded
                                </Badge>
                            )}
                            {isExplicitThread && (
                                <Badge color="green" variant="soft">
                                    <ListTree className="w-3 h-3 mr-1" />
                                    Thread
                                </Badge>
                            )}
                            <span>{(contextText || post.variants[activeTab]?.text?.toString() || "").length} characters</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center">

                        <div className="flex gap-2">
                            {/* Save Button - appears when there are unsaved changes */}
                            {showSaveButton && (
                                <Button
                                    onClick={handleSaveContent}
                                    disabled={isSaving}
                                    variant="soft"
                                    className="flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}; 