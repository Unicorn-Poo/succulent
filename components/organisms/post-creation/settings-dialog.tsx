import { Dialog, Button } from "@radix-ui/themes";
import { Label } from "radix-ui";
import { Input } from "@/components/atoms";
import { EnhancedTimePicker } from "./enhanced-time-picker";

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
            <Dialog.Content style={{ maxWidth: 600 }}>
                <Dialog.Title>Post Settings</Dialog.Title>
                <Dialog.Description>
                    Configure scheduling and advanced options for your post.
                </Dialog.Description>

                <div className="space-y-6 mt-4">
                    <div>
                        <Label.Root className="text-base font-medium">Schedule Post</Label.Root>
                        <div className="mt-2">
                            <EnhancedTimePicker
                                value={scheduledDate}
                                onChange={setScheduledDate}
                                onClear={handleClearSchedule}
                            />
                        </div>
                    </div>

                    {isThread && (
                        <div>
                            <Label.Root htmlFor="interval">
                                Posting Interval (minutes)
                            </Label.Root>
                            <div className="text-sm text-muted-foreground mb-1">
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

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="soft" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>
                        Save Settings
                    </Button>
                </div>
            </Dialog.Content>
        </Dialog.Root>
    );
}; 