import { Dialog, Button } from "@radix-ui/themes";
import { Label } from "radix-ui";
import { Input } from "@/components/atoms";

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scheduledDate: Date | null;
    setScheduledDate: (date: Date | null) => void;
    isThread: boolean;
    postingInterval: number;
    setPostingInterval: (interval: number) => void;
    handleClearSchedule: () => void;
}

export const SettingsDialog = ({
    open,
    onOpenChange,
    scheduledDate,
    setScheduledDate,
    isThread,
    postingInterval,
    setPostingInterval,
    handleClearSchedule,
}: SettingsDialogProps) => {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: 500 }}>
                <Dialog.Title>Post Settings</Dialog.Title>
                <Dialog.Description>
                    Configure scheduling and advanced options for your post.
                </Dialog.Description>

                <div className="space-y-4 mt-4">
                    <div>
                        <Label.Root htmlFor="schedule">Schedule Post</Label.Root>
                        {scheduledDate && (
                            <div className="text-sm text-gray-600 mb-2">
                                Currently scheduled for: {scheduledDate.toLocaleString()}
                            </div>
                        )}
                        <Input
                            id="schedule"
                            type="datetime-local"
                            value={scheduledDate ? scheduledDate.toISOString().slice(0, 16) : ""}
                            onChange={(e) => setScheduledDate(new Date(e.target.value))}
                            className="mt-1"
                        />
                    </div>

                    {isThread && (
                        <div>
                            <Label.Root htmlFor="interval">
                                Posting Interval (minutes)
                            </Label.Root>
                            <div className="text-sm text-gray-500 mb-1">
                                Time between posts for multi-post sequences
                            </div>
                            <Input
                                id="interval"
                                type="number"
                                value={postingInterval}
                                onChange={(e) => setPostingInterval(Number(e.target.value))}
                                min={1}
                                max={60}
                                className="mt-1"
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-between gap-2 mt-6">
                    <div>
                        {scheduledDate && (
                            <Button
                                variant="outline"
                                onClick={handleClearSchedule}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                                Clear Schedule
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="soft" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => onOpenChange(false)}>
                            Save Settings
                        </Button>
                    </div>
                </div>
            </Dialog.Content>
        </Dialog.Root>
    );
}; 