"use client";

import { Card, Text, Heading, Tabs, Button } from "@radix-ui/themes";
import { Settings, User, Store, Bell, Shield, Key } from "lucide-react";
import { GelatoSettings } from "./gelato-settings";
import { NotificationSettings } from "./notification-settings";
import type { MyAppAccountLoaded, AccountGroupType } from "../app/schema";

interface AccountSettingsProps {
	account: MyAppAccountLoaded;
	accountGroup?: AccountGroupType;
	onClose?: () => void;
}

export const AccountSettings = ({ account, accountGroup, onClose }: AccountSettingsProps) => {
	return (
		<div className="max-w-4xl mx-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
									<div className="flex items-center justify-center w-10 h-10 bg-lime-100 dark:bg-lime-900/30 rounded-lg">
					<Settings className="w-5 h-5 text-lime-600 dark:text-lime-400" />
					</div>
					<div>
						<Heading size="5">Account Settings</Heading>
						<Text size="2" color="gray">
							Manage your account preferences and integrations
						</Text>
					</div>
				</div>
				{onClose && (
					<Button variant="soft" onClick={onClose}>
						Close
					</Button>
				)}
			</div>

			{/* Settings Tabs */}
			<Tabs.Root defaultValue="profile" className="w-full">
				<Tabs.List className="grid grid-cols-4 gap-2">
					<Tabs.Trigger value="profile" className="flex items-center gap-2 p-3">
						<User className="w-4 h-4" />
						<span>Profile</span>
					</Tabs.Trigger>
					<Tabs.Trigger value="integrations" className="flex items-center gap-2 p-3">
						<Store className="w-4 h-4" />
						<span>Integrations</span>
					</Tabs.Trigger>
					<Tabs.Trigger value="notifications" className="flex items-center gap-2 p-3">
						<Bell className="w-4 h-4" />
						<span>Notifications</span>
					</Tabs.Trigger>
					<Tabs.Trigger value="security" className="flex items-center gap-2 p-3">
						<Shield className="w-4 h-4" />
						<span>Security</span>
					</Tabs.Trigger>
				</Tabs.List>

				{/* Profile Tab */}
				<Tabs.Content value="profile" className="mt-6">
					<Card>
						<div className="p-6">
							<div className="flex items-center gap-3 mb-6">
								<User className="w-5 h-5 text-muted-foreground" />
								<Heading size="4">Profile Information</Heading>
							</div>
							
							<div className="space-y-4">
								<div>
									<Text size="2" weight="medium" className="block mb-2">
										Display Name
									</Text>
									<input
										type="text"
										value={account.profile?.name || ''}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
											if (account.profile) {
												account.profile.name = e.target.value;
											}
										}}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500 bg-card dark:text-gray-100"
										placeholder="Enter your display name"
									/>
								</div>

								<div>
									<Text size="2" weight="medium" className="block mb-2">
										Account ID
									</Text>
									<Text size="2" color="gray" className="font-mono">
										{account.id}
									</Text>
								</div>
							</div>
						</div>
					</Card>
				</Tabs.Content>

				{/* Integrations Tab */}
				<Tabs.Content value="integrations" className="mt-6">
					<div className="space-y-6">
						<div className="flex items-center gap-3 mb-6">
							<Store className="w-5 h-5 text-muted-foreground" />
							<Heading size="4">Third-Party Integrations</Heading>
						</div>

						{/* Gelato Integration */}
						{accountGroup && <GelatoSettings accountGroup={accountGroup} />}

						{/* Future integrations can be added here */}
						<Card>
							<div className="p-6">
								<div className="flex items-center gap-3 mb-4">
									<div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg">
										<Key className="w-5 h-5 text-muted-foreground" />
									</div>
									<div>
										<Text weight="medium" size="4">More Integrations</Text>
										<Text size="2" color="gray" className="block">
											Additional integrations coming soon
										</Text>
									</div>
								</div>
								<div className="space-y-3">
									<div className="p-3 bg-muted border border-border rounded-lg">
										<Text size="2" color="gray">
											🔜 <strong>Printful Integration</strong> - Print-on-demand products
										</Text>
									</div>
									<div className="p-3 bg-muted border border-border rounded-lg">
										<Text size="2" color="gray">
											🔜 <strong>Shopify Integration</strong> - E-commerce store connection
										</Text>
									</div>
									<div className="p-3 bg-muted border border-border rounded-lg">
										<Text size="2" color="gray">
											🔜 <strong>Etsy Integration</strong> - Marketplace integration
										</Text>
									</div>
								</div>
							</div>
						</Card>
					</div>
				</Tabs.Content>

				{/* Notifications Tab */}
				<Tabs.Content value="notifications" className="mt-6">
					<div className="space-y-6">
						{/* Push Notifications */}
						{accountGroup && <NotificationSettings accountGroup={accountGroup} />}
						
						{/* Legacy Product Notifications */}
						<Card>
							<div className="p-6">
								<div className="flex items-center gap-3 mb-6">
									<Store className="w-5 h-5 text-muted-foreground" />
									<Heading size="4">Product Creation Preferences</Heading>
								</div>
								
								<div className="space-y-4">
									<div className="flex items-center justify-between p-3 border border-border rounded-lg">
										<div>
											<Text size="2" weight="medium" className="block">
												Product Creation Notifications
											</Text>
											<Text size="1" color="gray">
												Get notified when Gelato products are created
											</Text>
										</div>
										<input
											type="checkbox"
											checked={account.profile?.preferences?.notifyOnProductCreation || false}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
												if (account.profile) {
													if (!(account.profile as any).preferences) {
														(account.profile as any).preferences = {
															autoCreateProducts: false,
															defaultProductType: undefined,
															notifyOnProductCreation: false,
														};
													}
													(account.profile as any).preferences.notifyOnProductCreation = e.target.checked;
												}
											}}
											className="w-4 h-4"
										/>
									</div>

									<div className="flex items-center justify-between p-3 border border-border rounded-lg">
										<div>
											<Text size="2" weight="medium" className="block">
												Auto-Create Products
											</Text>
											<Text size="1" color="gray">
												Automatically create products when posting with images
											</Text>
										</div>
										<input
											type="checkbox"
											checked={account.profile?.preferences?.autoCreateProducts || false}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
												if (account.profile) {
													if (!(account.profile as any).preferences) {
														(account.profile as any).preferences = {
															autoCreateProducts: false,
															defaultProductType: undefined,
															notifyOnProductCreation: false,
														};
													}
													(account.profile as any).preferences.autoCreateProducts = e.target.checked;
												}
											}}
											className="w-4 h-4"
										/>
									</div>
								</div>
							</div>
						</Card>
					</div>
				</Tabs.Content>

				{/* Security Tab */}
				<Tabs.Content value="security" className="mt-6">
					<Card>
						<div className="p-6">
							<div className="flex items-center gap-3 mb-6">
								<Shield className="w-5 h-5 text-muted-foreground" />
								<Heading size="4">Security & Privacy</Heading>
							</div>
							
							<div className="space-y-4">
								<div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
									<Text size="2" className="text-green-800 dark:text-green-300">
										🔐 <strong>End-to-End Encryption</strong>
									</Text>
									<Text size="2" className="text-green-700 dark:text-green-300 block mt-1">
										All your data is encrypted using Jazz's built-in encryption. Only you can access your information.
									</Text>
								</div>

								<div className="p-4 bg-lime-50 border border-lime-200 rounded-lg">
									<Text size="2" className="text-lime-800 dark:text-lime-300">
										🔑 <strong>API Key Security</strong>
									</Text>
									<Text size="2" className="text-lime-700 block mt-1">
										Your API keys are encrypted and stored securely. They are never shared or exposed to other users.
									</Text>
								</div>

								<div className="p-4 bg-muted border border-border rounded-lg">
									<Text size="2" className="text-gray-800 dark:text-gray-200">
										📱 <strong>Device Access</strong>
									</Text>
									<Text size="2" className="text-foreground block mt-1">
										Manage which devices can access your account (coming soon).
									</Text>
								</div>
							</div>
						</div>
					</Card>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	);
}; 