"use client";

import { useState } from "react";
import { Button, Card, Dialog, TextField, Select, Text, Heading, Flex, Box } from "@radix-ui/themes";
import { Plus, X, Save, Users } from "lucide-react";
import { Input } from "./input";
import { PlatformNames } from "../app/schema";
import Image from "next/image";

interface PlatformAccount {
  id: string;
  platform: typeof PlatformNames[number];
  name: string;
  apiUrl: string;
}

interface AccountGroupFormData {
  name: string;
  accounts: PlatformAccount[];
}

interface AccountGroupCreationProps {
  onSave: (groupData: AccountGroupFormData) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const platformIcons = {
  x: "/icons8-twitter.svg",
  instagram: "/icons8-instagram.svg",
  youtube: "/icons8-youtube-logo.svg",
  facebook: "/icons8-facebook.svg",
  linkedin: "/icons8-linkedin.svg",
};

export default function AccountGroupCreation({ onSave, isOpen, onOpenChange }: AccountGroupCreationProps) {
  const [groupName, setGroupName] = useState("");
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    platform: "instagram" as typeof PlatformNames[number],
    name: "",
    apiUrl: "",
  });

  const handleAddAccount = () => {
    if (newAccount.name && newAccount.apiUrl) {
      const account: PlatformAccount = {
        id: Date.now().toString(),
        platform: newAccount.platform,
        name: newAccount.name,
        apiUrl: newAccount.apiUrl,
      };
      setAccounts([...accounts, account]);
      setNewAccount({ platform: "instagram", name: "", apiUrl: "" });
      setShowAddAccount(false);
    }
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts(accounts.filter(account => account.id !== id));
  };

  const handleSaveGroup = () => {
    if (groupName && accounts.length > 0) {
      onSave({
        name: groupName,
        accounts: accounts,
      });
      // Reset form
      setGroupName("");
      setAccounts([]);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setGroupName("");
    setAccounts([]);
    setShowAddAccount(false);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>
          <Flex align="center" gap="2">
            <Users className="w-5 h-5" />
            Create Account Group
          </Flex>
        </Dialog.Title>
        <Dialog.Description>
          Create a new account group and add your social media accounts to it.
        </Dialog.Description>

        <Flex direction="column" gap="4" mt="4">
          {/* Group Name */}
          <Box>
            <Text size="2" weight="medium" as="label">
              Group Name
            </Text>
            <TextField.Root
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name (e.g., Personal Brand, Company Social)"
              mt="1"
            />
          </Box>

          {/* Accounts List */}
          <Box>
            <Flex justify="between" align="center" mb="2">
              <Text size="2" weight="medium">
                Accounts ({accounts.length})
              </Text>
              <Button
                variant="soft"
                size="1"
                onClick={() => setShowAddAccount(true)}
              >
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </Flex>

            {accounts.length === 0 ? (
              <Card>
                <Text size="2" color="gray">
                  No accounts added yet. Click "Add Account" to get started.
                </Text>
              </Card>
            ) : (
              <Flex direction="column" gap="2">
                {accounts.map((account) => (
                  <Card key={account.id}>
                    <Flex justify="between" align="center">
                      <Flex align="center" gap="2">
                        <Image
                          src={platformIcons[account.platform]}
                          alt={account.platform}
                          width={20}
                          height={20}
                        />
                        <Box>
                          <Text size="2" weight="medium">
                            {account.name}
                          </Text>
                          <Text size="1" color="gray">
                            {account.platform}
                          </Text>
                        </Box>
                      </Flex>
                      <Button
                        variant="ghost"
                        size="1"
                        color="red"
                        onClick={() => handleRemoveAccount(account.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            )}
          </Box>

          {/* Add Account Form */}
          {showAddAccount && (
            <Card>
              <Heading size="3" mb="3">Add New Account</Heading>
              <Flex direction="column" gap="3">
                <Box>
                  <Text size="2" weight="medium" as="label">
                    Platform
                  </Text>
                  <Select.Root
                    value={newAccount.platform}
                    onValueChange={(value) =>
                      setNewAccount({ ...newAccount, platform: value as typeof PlatformNames[number] })
                    }
                  >
                    <Select.Trigger />
                    <Select.Content>
                      {PlatformNames.map((platform) => (
                        <Select.Item key={platform} value={platform}>
                          <Flex align="center" gap="2">
                            <Image
                              src={platformIcons[platform]}
                              alt={platform}
                              width={16}
                              height={16}
                            />
                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                          </Flex>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Box>

                <Box>
                  <Text size="2" weight="medium" as="label">
                    Account Name
                  </Text>
                  <TextField.Root
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    placeholder="Enter account name or handle"
                    mt="1"
                  />
                </Box>

                <Box>
                  <Text size="2" weight="medium" as="label">
                    Profile URL
                  </Text>
                  <TextField.Root
                    value={newAccount.apiUrl}
                    onChange={(e) => setNewAccount({ ...newAccount, apiUrl: e.target.value })}
                    placeholder="https://instagram.com/yourhandle"
                    mt="1"
                  />
                </Box>

                <Flex gap="2" justify="end">
                  <Button
                    variant="soft"
                    onClick={() => setShowAddAccount(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddAccount}>
                    Add Account
                  </Button>
                </Flex>
              </Flex>
            </Card>
          )}
        </Flex>

        <Flex gap="3" mt="6" justify="end">
          <Dialog.Close>
            <Button variant="soft" onClick={handleCancel}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            onClick={handleSaveGroup}
            disabled={!groupName || accounts.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
} 