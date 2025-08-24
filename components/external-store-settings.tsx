"use client";

import React, { useState } from "react";
import { Card, Text, Button, TextField, Badge, Dialog, Select, Switch } from "@radix-ui/themes";
import { Store, Key, CheckCircle, XCircle, Loader2, ExternalLink, Plus, Trash2, Settings, AlertCircle } from "lucide-react";
import type { AccountGroupType } from "../app/schema";

interface ExternalStoreSettingsProps {
	accountGroup: AccountGroupType;
}

export const ExternalStoreSettings = ({ accountGroup }: ExternalStoreSettingsProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
	const [testMessage, setTestMessage] = useState("");
	const [forceRefresh, setForceRefresh] = useState(0);
	
	const [formData, setFormData] = useState({
		name: accountGroup.externalStore?.name || '',
		storeType: accountGroup.externalStore?.storeType || 'custom',
		apiUrl: accountGroup.externalStore?.apiUrl || '',
		apiKey: accountGroup.externalStore?.apiKey || '',
		webhookSecret: accountGroup.externalStore?.webhookSecret || '',
		// Settings
		currency: accountGroup.externalStore?.settings?.currency || 'USD',
		taxIncluded: accountGroup.externalStore?.settings?.taxIncluded || false,
		autoPublish: accountGroup.externalStore?.settings?.autoPublish || false,
		defaultCategory: accountGroup.externalStore?.settings?.defaultCategory || '',
		markupPercentage: accountGroup.externalStore?.settings?.markupPercentage || 50,
	});

	const storeTypes = [
		{ value: 'custom', label: 'Custom API', description: 'Generic REST API' },
		{ value: 'woocommerce', label: 'WooCommerce', description: 'WordPress WooCommerce store' },
		{ value: 'shopify', label: 'Shopify', description: 'Shopify store' },
		{ value: 'medusa', label: 'Medusa', description: 'Medusa.js commerce' },
		{ value: 'magento', label: 'Magento', description: 'Magento commerce' },
	];

	const handleTestConnection = async () => {
		if (!formData.apiUrl.trim() || !formData.apiKey.trim()) {
			setTestResult('error');
			setTestMessage('API URL and API key are required');
			return;
		}

		setIsTesting(true);
		setTestResult(null);
		setTestMessage("");

		try {
			const response = await fetch('/api/test-external-store', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					storeType: formData.storeType,
					apiUrl: formData.apiUrl.trim(),
					apiKey: formData.apiKey.trim(),
					webhookSecret: formData.webhookSecret.trim() || undefined,
				}),
			});

			const result = await response.json();
			setTestResult(result.success ? 'success' : 'error');
			setTestMessage(result.message || result.error || 'Unknown result');
		} catch (error) {
			setTestResult('error');
			setTestMessage('Network error occurred');
		} finally {
			setIsTesting(false);
		}
	};

	const handleSave = async () => {
		if (!formData.name.trim() || !formData.apiUrl.trim() || !formData.apiKey.trim()) {
			setTestResult('error');
			setTestMessage('Name, API URL, and API key are required');
			return;
		}

		// Update account group with external store credentials
		if (accountGroup.externalStore) {
			accountGroup.externalStore.name = formData.name.trim();
			accountGroup.externalStore.storeType = formData.storeType as any;
			accountGroup.externalStore.apiUrl = formData.apiUrl.trim();
			accountGroup.externalStore.apiKey = formData.apiKey.trim();
			accountGroup.externalStore.webhookSecret = formData.webhookSecret.trim() || undefined;
			accountGroup.externalStore.isConfigured = true;
			
			// Update settings
			if (!accountGroup.externalStore.settings) {
				(accountGroup.externalStore as any).settings = {};
			}
			accountGroup.externalStore.settings!.currency = formData.currency;
			accountGroup.externalStore.settings!.taxIncluded = formData.taxIncluded;
			accountGroup.externalStore.settings!.autoPublish = formData.autoPublish;
			accountGroup.externalStore.settings!.defaultCategory = formData.defaultCategory.trim() || undefined;
			accountGroup.externalStore.settings!.markupPercentage = formData.markupPercentage;
		} else {
			// Create new external store connection
			(accountGroup as any).externalStore = {
				name: formData.name.trim(),
				storeType: formData.storeType,
				apiUrl: formData.apiUrl.trim(),
				apiKey: formData.apiKey.trim(),
				webhookSecret: formData.webhookSecret.trim() || undefined,
				isConfigured: true,
				connectedAt: new Date(),
				settings: {
					currency: formData.currency,
					taxIncluded: formData.taxIncluded,
					autoPublish: formData.autoPublish,
					defaultCategory: formData.defaultCategory.trim() || undefined,
					markupPercentage: formData.markupPercentage,
				},
				postedProducts: [],
				lastSync: undefined,
				syncErrors: [],
			};
		}

		setIsEditing(false);
		setTestResult(null);
		setTestMessage("");
		setForceRefresh(prev => prev + 1);
	};

	const handleDisconnect = () => {
		if (accountGroup.externalStore) {
			accountGroup.externalStore.name = '';
			accountGroup.externalStore.apiUrl = '';
			accountGroup.externalStore.apiKey = '';
			accountGroup.externalStore.isConfigured = false;
			// Clear posted products
			if (accountGroup.externalStore.postedProducts) {
				while (accountGroup.externalStore.postedProducts.length > 0) {
					accountGroup.externalStore.postedProducts.splice(0, 1);
				}
			}
		}
		setFormData({
			name: '',
			storeType: 'custom',
			apiUrl: '',
			apiKey: '',
			webhookSecret: '',
			currency: 'USD',
			taxIncluded: false,
			autoPublish: false,
			defaultCategory: '',
			markupPercentage: 50,
		});
		setIsEditing(false);
		setTestResult(null);
		setTestMessage("");
		setForceRefresh(prev => prev + 1);
	};

	const isConnected = !!accountGroup.externalStore?.isConfigured;
	const postedProducts = accountGroup.externalStore?.postedProducts || [];
	const selectedStoreType = storeTypes.find(st => st.value === formData.storeType);

	return (
		<Card className="p-6">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<Store className="w-5 h-5 text-purple-600" />
					<div>
						<Text size="4" weight="bold" className="mb-1 block">
							External Store Integration
						</Text>
						<Text size="2" color="gray">
							Connect your self-hosted store to automatically post products
						</Text>
					</div>
				</div>
				<Badge color={isConnected ? "green" : "gray"}>
					{isConnected ? "Connected" : "Not Connected"}
				</Badge>
			</div>

			{isConnected && (
				<div className="mb-6 p-4 bg-purple-50 rounded-lg">
					<div className="flex items-center gap-2 mb-2">
						<Store className="w-4 h-4 text-purple-600" />
						<Text size="2" weight="medium" color="purple">
							{accountGroup.externalStore?.name} ({selectedStoreType?.label})
						</Text>
					</div>
					<Text size="1" color="purple">
						Products will be automatically posted to your external store
					</Text>
				</div>
			)}

			{!isConnected ? (
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-2">Store Name</label>
						<TextField.Root
							value={formData.name}
							onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
							placeholder="My Store"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2">Store Type</label>
						<Select.Root value={formData.storeType} onValueChange={(value) => setFormData(prev => ({ ...prev, storeType: value }))}>
							<Select.Trigger placeholder="Select store type" />
							<Select.Content>
								{storeTypes.map((type) => (
									<Select.Item key={type.value} value={type.value}>
										<div>
											<Text size="2" weight="medium">{type.label}</Text>
											<Text size="1" color="gray" className="block">{type.description}</Text>
										</div>
									</Select.Item>
								))}
							</Select.Content>
						</Select.Root>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2">API URL</label>
						<TextField.Root
							value={formData.apiUrl}
							onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
							placeholder="https://your-store.com"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2">API Key</label>
						<TextField.Root
							value={formData.apiKey}
							onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
							placeholder="Your API key"
							type="password"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2">Webhook Secret (Optional)</label>
						<TextField.Root
							value={formData.webhookSecret}
							onChange={(e) => setFormData(prev => ({ ...prev, webhookSecret: e.target.value }))}
							placeholder="Webhook secret for secure communication"
							type="password"
						/>
					</div>

					{/* Store Settings */}
					<div className="border-t pt-4">
						<Text size="3" weight="medium" className="mb-3 block">Store Settings</Text>
						
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium mb-2">Currency</label>
								<Select.Root value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
									<Select.Trigger placeholder="Select currency" />
									<Select.Content>
										<Select.Item value="USD">USD</Select.Item>
										<Select.Item value="EUR">EUR</Select.Item>
										<Select.Item value="GBP">GBP</Select.Item>
										<Select.Item value="CAD">CAD</Select.Item>
										<Select.Item value="AUD">AUD</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">Markup Percentage</label>
								<TextField.Root
									value={formData.markupPercentage.toString()}
									onChange={(e) => setFormData(prev => ({ ...prev, markupPercentage: parseInt(e.target.value) || 0 }))}
									placeholder="50"
									type="number"
								/>
							</div>
						</div>

						<div className="space-y-3 mt-4">
							<div className="flex items-center gap-3">
								<Switch
									checked={formData.autoPublish}
									onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoPublish: checked }))}
								/>
								<Text size="2">Auto-publish products</Text>
							</div>

							<div className="flex items-center gap-3">
								<Switch
									checked={formData.taxIncluded}
									onCheckedChange={(checked) => setFormData(prev => ({ ...prev, taxIncluded: checked }))}
								/>
								<Text size="2">Prices include tax</Text>
							</div>
						</div>

						<div className="mt-4">
							<label className="block text-sm font-medium mb-2">Default Category</label>
							<TextField.Root
								value={formData.defaultCategory}
								onChange={(e) => setFormData(prev => ({ ...prev, defaultCategory: e.target.value }))}
								placeholder="Print on Demand"
							/>
						</div>
					</div>

					<div className="flex gap-2">
						<Button
							onClick={handleTestConnection}
							disabled={isTesting || !formData.apiUrl.trim() || !formData.apiKey.trim()}
							className="flex items-center gap-2"
						>
							{isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
							Test Connection
						</Button>
						
						{testResult === 'success' && (
							<Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
								Save Configuration
							</Button>
						)}
					</div>

					{testResult === 'success' && (
						<div className="flex items-center gap-2 text-green-600">
							<CheckCircle className="w-4 h-4" />
							<Text size="2">{testMessage}</Text>
						</div>
					)}

					{testResult === 'error' && (
						<div className="flex items-center gap-2 text-red-600">
							<XCircle className="w-4 h-4" />
							<Text size="2">{testMessage}</Text>
						</div>
					)}
				</div>
			) : (
				<div className="space-y-6">
					{/* Connection Status */}
					<div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
						<div className="flex items-center gap-3">
							<CheckCircle className="w-5 h-5 text-green-600" />
							<div>
								<Text size="2" weight="medium" className="block">
									Connected to {accountGroup.externalStore?.name}
								</Text>
								<Text size="1" color="gray">
									{postedProducts.length} product{postedProducts.length !== 1 ? 's' : ''} posted
								</Text>
							</div>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => setIsEditing(true)} size="1">
								Edit
							</Button>
							<Button variant="outline" onClick={handleDisconnect} size="1" color="red">
								Disconnect
							</Button>
						</div>
					</div>

					{/* Posted Products */}
					<div>
						<div className="flex items-center justify-between mb-4">
							<Text size="3" weight="bold">Posted Products</Text>
							<Badge color="blue">
								{postedProducts.length} products
							</Badge>
						</div>

						{postedProducts.length === 0 ? (
							<div className="text-center py-6 bg-gray-50 rounded-lg">
								<Store className="w-8 h-8 text-gray-400 mx-auto mb-2" />
								<Text size="2" color="gray">No products posted yet</Text>
								<Text size="1" color="gray">
									Create products using Prodigi templates and they'll appear here
								</Text>
							</div>
						) : (
							<div className="space-y-3">
								{postedProducts.map((product: any) => (
									<div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4">
										<div className="flex items-center justify-between mb-2">
											<Text size="2" weight="bold" className="line-clamp-1">
												{product.name}
											</Text>
											<Badge color={
												product.status === 'published' ? 'green' : 
												product.status === 'draft' ? 'blue' : 'gray'
											}>
												{product.status}
											</Badge>
										</div>
										
										<div className="grid grid-cols-2 gap-4 text-xs">
											<div>
												<Text size="1" weight="medium">Price:</Text>
												<Text size="1" color="gray">
													{product.currency || 'USD'} {product.price || '0.00'}
												</Text>
											</div>
											<div>
												<Text size="1" weight="medium">Posted:</Text>
												<Text size="1" color="gray">
													{new Date(product.postedAt).toLocaleDateString()}
												</Text>
											</div>
										</div>

										{product.externalProductUrl && (
											<div className="mt-3 pt-3 border-t border-gray-100">
												<a 
													href={product.externalProductUrl} 
													target="_blank" 
													rel="noopener noreferrer"
													className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
												>
													<ExternalLink className="w-3 h-3" />
													View in Store
												</a>
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Edit Dialog */}
			<Dialog.Root open={isEditing} onOpenChange={setIsEditing}>
				<Dialog.Content style={{ maxWidth: 600 }}>
					<Dialog.Title>Edit External Store Settings</Dialog.Title>
					<Dialog.Description>
						Update your external store configuration
					</Dialog.Description>

					<div className="space-y-4 mt-4 max-h-96 overflow-y-auto">
						<div>
							<label className="block text-sm font-medium mb-2">Store Name</label>
							<TextField.Root
								value={formData.name}
								onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
								placeholder="My Store"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2">API URL</label>
							<TextField.Root
								value={formData.apiUrl}
								onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
								placeholder="https://your-store.com"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2">API Key</label>
							<TextField.Root
								value={formData.apiKey}
								onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
								placeholder="Your API key"
								type="password"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium mb-2">Currency</label>
								<Select.Root value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
									<Select.Trigger />
									<Select.Content>
										<Select.Item value="USD">USD</Select.Item>
										<Select.Item value="EUR">EUR</Select.Item>
										<Select.Item value="GBP">GBP</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">Markup %</label>
								<TextField.Root
									value={formData.markupPercentage.toString()}
									onChange={(e) => setFormData(prev => ({ ...prev, markupPercentage: parseInt(e.target.value) || 0 }))}
									type="number"
								/>
							</div>
						</div>

						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<Switch
									checked={formData.autoPublish}
									onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoPublish: checked }))}
								/>
								<Text size="2">Auto-publish products</Text>
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<Button variant="soft" onClick={() => setIsEditing(false)}>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={!formData.name.trim() || !formData.apiUrl.trim() || !formData.apiKey.trim()}>
							Save Changes
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Root>
		</Card>
	);
}; 