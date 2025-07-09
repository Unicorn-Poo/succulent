import { Dialog, Button } from "@radix-ui/themes";
import Image from "next/image";
import { platformIcons } from "../../utils/postConstants";

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
                            onClick={() => handleAddAccount(key)}
                            className="w-full flex items-center gap-2 justify-start"
                        >
                            <Image
                                src={platformIcons[account.platform as keyof typeof platformIcons] || platformIcons.base}
                                alt={account.platform}
                                width={20}
                                height={20}
                            />
                            <div className="text-left">
                                <div className="font-medium">{account.name}</div>
                                <div className="text-sm text-gray-500">{account.platform}</div>
                            </div>
                        </Button>
                    ))}
                </div>
            </Dialog.Content>
        </Dialog.Root>
    );
}; 