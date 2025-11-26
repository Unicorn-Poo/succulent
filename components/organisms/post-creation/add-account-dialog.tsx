import { Dialog } from "@radix-ui/themes";
import { Button } from "@/components/atoms/button";
import Image from "next/image";
import { platformIcons } from "@/utils/postConstants";

interface AddAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableAccounts: [string, any][];
    handleAddAccount: (platform: string) => void;
}

export const AddAccountDialog = ({ open, onOpenChange, availableAccounts, handleAddAccount }: AddAccountDialogProps) => {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: 400 }}>
                <Dialog.Title>Add Account</Dialog.Title>
                <Dialog.Description>
                    Select an account to add to this post.
                </Dialog.Description>

                <div className="space-y-2 mt-4">
                    {availableAccounts.map(([key, account]) => (
                        <Button
                            key={key}
                            variant="outline"
                            intent="secondary"
                            onClick={() => handleAddAccount(key)}
                            className="w-full flex items-center gap-3 justify-start p-3 h-auto"
                        >
                            <Image
                                src={platformIcons[account.platform as keyof typeof platformIcons] || platformIcons.base}
                                alt={account.platform}
                                width={24}
                                height={24}
                                className="flex-shrink-0"
                            />
                            <div className="text-left flex-1">
                                <div className="font-medium text-base">{account.name || account.displayName || 'Unknown Account'}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{account.platform || 'unknown'}</div>
                            </div>
                        </Button>
                    ))}
                    
                    {availableAccounts.length === 0 && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            <p>No additional accounts available</p>
                            <p className="text-xs mt-1">All accounts are already added to this post</p>
                        </div>
                    )}
                </div>
            </Dialog.Content>
        </Dialog.Root>
    );
}; 