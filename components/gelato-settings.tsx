"use client";

import React, { useState } from "react";
import { Card, Text, Button, TextField, Badge, Dialog } from "@radix-ui/themes";
import { Settings, Key, Store, CheckCircle, XCircle, Loader2, ExternalLink, Download, RefreshCw, Plus, Package, Trash2 } from "lucide-react";
import type { AccountGroupType } from "../app/schema";

interface GelatoSettingsProps {
	accountGroup: AccountGroupType;
}

export const GelatoSettings = ({ accountGroup }: GelatoSettingsProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
	const [isFetchingTemplates, setIsFetchingTemplates] = useState(false);
	const [templateFetchResult, setTemplateFetchResult] = useState<'success' | 'error' | null>(null);
	const [showImportDialog, setShowImportDialog] = useState(false);
	const [templateIdToImport, setTemplateIdToImport] = useState("");
	const [isImporting, setIsImporting] = useState(false);
	const [importResult, setImportResult] = useState<'success' | 'error' | null>(null);
	const [importError, setImportError] = useState("");
	const [forceRefresh, setForceRefresh] = useState(0);
	const [formData, setFormData] = useState({
		apiKey: accountGroup.gelatoCredentials?.apiKey || '',
		storeId: accountGroup.gelatoCredentials?.storeId || '',
		storeName: accountGroup.gelatoCredentials?.storeName || '',
	});
	
	// Shopify integration state
	const [showShopifyConfig, setShowShopifyConfig] = useState(false);
	const [shopifyFormData, setShopifyFormData] = useState({
		storeUrl: accountGroup.gelatoCredentials?.shopifyCredentials?.storeUrl || '',
		accessToken: accountGroup.gelatoCredentials?.shopifyCredentials?.accessToken || '',
		storeName: accountGroup.gelatoCredentials?.shopifyCredentials?.storeName || '',
		defaultChannels: accountGroup.gelatoCredentials?.shopifyCredentials?.defaultPublishingChannels || ['online-store'],
	});
	const [shopifyTestResult, setShopifyTestResult] = useState<'success' | 'error' | null>(null);
	const [isTestingShopify, setIsTestingShopify] = useState(false);
	const [publishingChannels, setPublishingChannels] = useState<any[]>(
		accountGroup.gelatoCredentials?.shopifyCredentials?.availableChannels || []
	);
	const [isFetchingChannels, setIsFetchingChannels] = useState(false);
	const [isUpdatingChannels, setIsUpdatingChannels] = useState(false);
	
	// Template tag editing state
	const [editingTags, setEditingTags] = useState<{[key: string]: boolean}>({});
	const [tempTags, setTempTags] = useState<{[key: string]: string}>({});

	// Update publishingChannels when accountGroup changes (for real-time sync)
	React.useEffect(() => {
		const savedChannels = accountGroup.gelatoCredentials?.shopifyCredentials?.availableChannels || [];
		const savedDefaultChannels = accountGroup.gelatoCredentials?.shopifyCredentials?.defaultPublishingChannels || ['online-store'];
		
		// Only sync channels from Jazz if we don't already have them loaded
		// This prevents overwriting freshly fetched channels
		if (savedChannels.length > 0 && publishingChannels.length === 0 && !isUpdatingChannels) {
			setPublishingChannels(savedChannels);
		}
		
		// Always sync form data and default channels
		if (accountGroup.gelatoCredentials?.shopifyCredentials?.isConfigured) {
			setShopifyFormData(prev => ({
				...prev,
				storeUrl: accountGroup.gelatoCredentials?.shopifyCredentials?.storeUrl || prev.storeUrl,
				accessToken: accountGroup.gelatoCredentials?.shopifyCredentials?.accessToken || prev.accessToken,
				storeName: accountGroup.gelatoCredentials?.shopifyCredentials?.storeName || prev.storeName,
				defaultChannels: savedDefaultChannels,
			}));
		}
	}, [
		accountGroup.gelatoCredentials?.shopifyCredentials?.defaultPublishingChannels,
		accountGroup.gelatoCredentials?.shopifyCredentials?.isConfigured
	]);

	const isConfigured = accountGroup.gelatoCredentials?.isConfigured || false;
	const connectedAt = accountGroup.gelatoCredentials?.connectedAt;
	const templatesLastFetched = accountGroup.gelatoCredentials?.templatesLastFetched;
	const cachedTemplatesCount = accountGroup.gelatoCredentials?.templates?.length || 0;
	
	// Shopify configuration status
	const isShopifyConfigured = accountGroup.gelatoCredentials?.shopifyCredentials?.isConfigured || false;
	const shopifyConnectedAt = accountGroup.gelatoCredentials?.shopifyCredentials?.connectedAt;
	const channelsLastFetched = accountGroup.gelatoCredentials?.shopifyCredentials?.channelsLastFetched;
	
	// Remove debug logging as requested
	
	// Function to remove a template
	const handleRemoveTemplate = (templateToRemove: any) => {
		if (!accountGroup.gelatoCredentials?.templates) return;
		
		const index = accountGroup.gelatoCredentials.templates.indexOf(templateToRemove);
		if (index > -1) {
			accountGroup.gelatoCredentials.templates.splice(index, 1);
			setForceRefresh(prev => prev + 1);
		}
	};

	// Template tag editing functions
	const handleEditTags = (templateId: string, currentTags: string[]) => {
		setEditingTags(prev => ({ ...prev, [templateId]: true }));
		setTempTags(prev => ({ ...prev, [templateId]: currentTags.join(', ') }));
	};

	const handleSaveTags = (templateId: string) => {
		if (!accountGroup.gelatoCredentials?.templates) return;
		
		const template = accountGroup.gelatoCredentials.templates.find(t => t.gelatoTemplateId === templateId);
		if (!template) return;
		
		const newTags = tempTags[templateId]?.split(',').map(tag => tag.trim()).filter(Boolean) || [];
		
		// Update template tags
		template.tags = newTags;
		
		// Update Shopify data tags if they exist
		if (template.shopifyData) {
			template.shopifyData.tags = [
				...newTags,
				'Print on Demand',
				'Custom',
				template.productType || 'Product'
			].filter(Boolean);
		}
		
		// Clear editing state
		setEditingTags(prev => ({ ...prev, [templateId]: false }));
		setTempTags(prev => ({ ...prev, [templateId]: '' }));
		setForceRefresh(prev => prev + 1);
	};

	const handleCancelEditTags = (templateId: string) => {
		setEditingTags(prev => ({ ...prev, [templateId]: false }));
		setTempTags(prev => ({ ...prev, [templateId]: '' }));
	};

	// Shopify integration functions
	const handleTestShopifyConnection = async () => {
		if (!shopifyFormData.storeUrl || !shopifyFormData.accessToken) {
			setShopifyTestResult('error');
			return;
		}

		setIsTestingShopify(true);
		setIsUpdatingChannels(true);
		setShopifyTestResult(null);

		try {
			const response = await fetch('/api/manage-shopify-publishing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'list-channels',
					shopifyStoreUrl: shopifyFormData.storeUrl,
					shopifyAccessToken: shopifyFormData.accessToken,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					const cleanChannels = data.channels || [];
					setPublishingChannels(cleanChannels);
					
					// Save fetched channels to Jazz object to prevent reverting to old data
					if (accountGroup.gelatoCredentials?.shopifyCredentials?.isConfigured) {
						accountGroup.gelatoCredentials.shopifyCredentials.availableChannels = cleanChannels;
						accountGroup.gelatoCredentials.shopifyCredentials.channelsLastFetched = new Date();
					}
					
					setShopifyTestResult('success');
				} else {
					setShopifyTestResult('error');
				}
			} else {
				setShopifyTestResult('error');
			}
		} catch (error) {
			setShopifyTestResult('error');
		} finally {
			setIsTestingShopify(false);
			setIsUpdatingChannels(false);
		}
	};

	const handleSaveShopify = async () => {
		if (!accountGroup.gelatoCredentials) {
			return;
		}

		const { ShopifyCredentials } = await import('../app/schema');

		if (accountGroup.gelatoCredentials.shopifyCredentials) {
			// Update existing credentials
			accountGroup.gelatoCredentials.shopifyCredentials.storeUrl = shopifyFormData.storeUrl;
			accountGroup.gelatoCredentials.shopifyCredentials.accessToken = shopifyFormData.accessToken;
			accountGroup.gelatoCredentials.shopifyCredentials.storeName = shopifyFormData.storeName;
			accountGroup.gelatoCredentials.shopifyCredentials.isConfigured = true;
			accountGroup.gelatoCredentials.shopifyCredentials.connectedAt = new Date();
			accountGroup.gelatoCredentials.shopifyCredentials.availableChannels = publishingChannels;
			accountGroup.gelatoCredentials.shopifyCredentials.defaultPublishingChannels = shopifyFormData.defaultChannels;
			accountGroup.gelatoCredentials.shopifyCredentials.channelsLastFetched = new Date();
		} else {
			// Create new Shopify credentials
			accountGroup.gelatoCredentials.shopifyCredentials = ShopifyCredentials.create({
				storeUrl: shopifyFormData.storeUrl,
				accessToken: shopifyFormData.accessToken,
				storeName: shopifyFormData.storeName || '',
				isConfigured: true,
				connectedAt: new Date(),
				availableChannels: publishingChannels,
				defaultPublishingChannels: shopifyFormData.defaultChannels,
				channelsLastFetched: new Date(),
			}, { owner: accountGroup._owner });
		}

		setShowShopifyConfig(false);
		setShopifyTestResult(null);
	};

	const handleDisconnectShopify = () => {
		if (accountGroup.gelatoCredentials?.shopifyCredentials) {
			accountGroup.gelatoCredentials.shopifyCredentials.isConfigured = false;
			accountGroup.gelatoCredentials.shopifyCredentials.storeUrl = '';
			accountGroup.gelatoCredentials.shopifyCredentials.accessToken = '';
			accountGroup.gelatoCredentials.shopifyCredentials.storeName = '';
		}
		setShopifyFormData({ storeUrl: '', accessToken: '', storeName: '', defaultChannels: ['online-store'] });
		setShowShopifyConfig(false);
		setShopifyTestResult(null);
		setPublishingChannels([]);
	};

	// Auto-save default channels when they change
	const handleDefaultChannelsChange = (newChannels: string[]) => {
		setIsUpdatingChannels(true);
		
		// Update form data
		setShopifyFormData(prev => ({
			...prev,
			defaultChannels: newChannels
		}));

		// Auto-save to Jazz if Shopify is already configured
		if (accountGroup.gelatoCredentials?.shopifyCredentials?.isConfigured) {
			accountGroup.gelatoCredentials.shopifyCredentials.defaultPublishingChannels = newChannels;
		}
		
		// Clear the updating flag after a short delay
		setTimeout(() => setIsUpdatingChannels(false), 100);
	};

	// Helper function for post creation component to access saved data
	// Usage in post creation:
	// const getShopifyChannelData = (accountGroup) => ({
	//   availableChannels: accountGroup.gelatoCredentials?.shopifyCredentials?.availableChannels || [],
	//   defaultChannels: accountGroup.gelatoCredentials?.shopifyCredentials?.defaultPublishingChannels || ['online-store'],
	//   isConfigured: accountGroup.gelatoCredentials?.shopifyCredentials?.isConfigured || false,
	//   lastFetched: accountGroup.gelatoCredentials?.shopifyCredentials?.channelsLastFetched
	// });

	const handleTestConnection = async () => {
		if (!formData.apiKey) {
			setTestResult('error');
			return;
		}

		setIsTesting(true);
		setTestResult(null);

		try {
			// Test the Gelato API connection with detailed debugging
			const response = await fetch('/api/test-gelato-connection-v2', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: formData.apiKey,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				setFormData(prev => ({ ...prev, storeName: data.storeName || prev.storeName }));
				setTestResult('success');
			} else {
				setTestResult('error');
			}
		} catch (error) {
			setTestResult('error');
		} finally {
			setIsTesting(false);
		}
	};

	const handleSave = async () => {
		// Update the account group's encrypted credentials
		if (accountGroup.gelatoCredentials) {
			// Update existing credentials
			accountGroup.gelatoCredentials.apiKey = formData.apiKey;
			accountGroup.gelatoCredentials.storeId = formData.storeId;
			accountGroup.gelatoCredentials.storeName = formData.storeName;
			accountGroup.gelatoCredentials.isConfigured = true;
			accountGroup.gelatoCredentials.connectedAt = new Date();
		} else {
			// Create new credentials object
			const { GelatoCredentials, GelatoTemplate } = await import('../app/schema');
			const { co } = await import('jazz-tools');
			accountGroup.gelatoCredentials = GelatoCredentials.create({
				apiKey: formData.apiKey,
				storeId: formData.storeId || '',
				storeName: formData.storeName || '',
				isConfigured: true,
				connectedAt: new Date(),
				templates: co.list(GelatoTemplate).create([]),
			}, { owner: accountGroup._owner });
		}

		setIsEditing(false);
		setTestResult(null);
	};

	const handleDisconnect = () => {
		if (accountGroup.gelatoCredentials) {
			accountGroup.gelatoCredentials.isConfigured = false;
			accountGroup.gelatoCredentials.apiKey = '';
			accountGroup.gelatoCredentials.storeId = '';
			accountGroup.gelatoCredentials.storeName = '';
		}
		setFormData({ apiKey: '', storeId: '', storeName: '' });
		setIsEditing(false);
		setTestResult(null);
	};

	const handleFetchTemplates = async () => {
		if (!isConfigured || !accountGroup.gelatoCredentials?.apiKey) {
			setTemplateFetchResult('error');
			return;
		}

		setIsFetchingTemplates(true);
		setTemplateFetchResult(null);

		try {
			// First try to get store-specific templates/products
			let response = await fetch('/api/gelato-templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: accountGroup.gelatoCredentials.apiKey,
					storeId: accountGroup.gelatoCredentials.storeId,
				}),
			});

			// If store templates fail, try catalog endpoint
			if (!response.ok) {
				response = await fetch('/api/gelato-catalog', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						apiKey: accountGroup.gelatoCredentials.apiKey,
					}),
				});
			}

			if (response.ok) {
				const data = await response.json();
				if (data.success && data.templates) {
					// Clear existing templates and add new ones
					const { GelatoTemplate } = await import('../app/schema');
					const { co } = await import('jazz-tools');
					
					// Clear existing templates
					while (accountGroup.gelatoCredentials.templates.length > 0) {
						accountGroup.gelatoCredentials.templates.pop();
					}
					
					// Add new templates
					for (const templateData of data.templates) {
						const template = GelatoTemplate.create({
							gelatoTemplateId: templateData.id,
							name: templateData.name,
							displayName: templateData.displayName,
							productType: templateData.productType,
							description: templateData.description,
							details: templateData.details,
							fetchedAt: new Date(),
							isActive: true,
						}, { owner: accountGroup._owner });
						
						accountGroup.gelatoCredentials.templates.push(template);
					}
					
					// Update last fetched timestamp
					accountGroup.gelatoCredentials.templatesLastFetched = new Date();
					
					setTemplateFetchResult('success');
				} else {
					setTemplateFetchResult('error');
				}
			} else {
				setTemplateFetchResult('error');
			}
		} catch (error) {
			setTemplateFetchResult('error');
		} finally {
			setIsFetchingTemplates(false);
		}
	};

	const handleImportTemplate = async () => {
		if (!templateIdToImport.trim() || !accountGroup.gelatoCredentials?.apiKey) {
			setImportResult('error');
			setImportError('Template ID is required');
			return;
		}

		setIsImporting(true);
		setImportResult(null);
		setImportError("");

		try {
			const response = await fetch('/api/gelato-templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: accountGroup.gelatoCredentials.apiKey,
					action: 'import',
					templateId: templateIdToImport.trim(),
				}),
			});

			const data = await response.json();

			if (data.success && data.template) {
				if (!accountGroup.gelatoCredentials) {
					setImportResult('error');
					setImportError('Gelato credentials not configured');
					return;
				}

				const { GelatoTemplate } = await import('../app/schema');
				
				const templateId = data.template.gelatoTemplateId || data.template.id;
				
				const processedTemplate = {
					gelatoTemplateId: templateId,
					name: data.template.name || 'Unnamed Template',
					displayName: data.template.name || 'Untitled',
					productType: data.template.productType || 'unknown',
					description: data.template.description || 'No description available',
					
					// Enhanced metadata from API
					tags: data.template.tags || [],
					categories: data.template.categories || [],
					keywords: data.template.keywords || [],
					seoTitle: data.template.seoTitle || data.template.name,
					seoDescription: data.template.seoDescription || data.template.description,
					
					// Pricing information
					pricing: data.template.pricing || {},
					
					// Product specifications
					specifications: data.template.specifications || {},
					
					// Variant information
					availableSizes: data.template.availableSizes || [],
					availableColors: data.template.availableColors || [],
					printAreas: data.template.printAreas || [],
					
					// Shopify-specific fields
					shopifyData: data.template.shopifyData || {
						productType: data.template.productType || 'Custom Product',
						vendor: data.template.vendor || 'Gelato',
						tags: [
							...(data.template.tags || []),
							'Print on Demand',
							'Custom',
							data.template.productType || 'Product'
						].filter(Boolean),
						status: 'draft',
						publishedScope: 'web',
						publishingChannels: ['online-store'],
					},
					
					details: {
						size: data.template.availableSizes?.[0] || 'Unknown',
						material: data.template.specifications?.material || 'Unknown',
						color: data.template.availableColors?.[0] || 'Unknown',
						orientation: 'Unknown',
						endpoint: data.endpoint,
						apiVersion: data.endpoint?.includes('v1') ? 'v1' : 'legacy',
					},
					fetchedAt: new Date(),
					isActive: true,
				};

				const template = GelatoTemplate.create(processedTemplate, { owner: accountGroup._owner });
				
				if (!accountGroup.gelatoCredentials.templates) {
					const { co } = await import('jazz-tools');
					accountGroup.gelatoCredentials.templates = co.list(GelatoTemplate).create([], { owner: accountGroup._owner });
				}
				
				accountGroup.gelatoCredentials.templates.push(template);
				accountGroup.gelatoCredentials.templatesLastFetched = new Date();
				
				setImportResult('success');
				setTemplateIdToImport("");
				setForceRefresh(prev => prev + 1);
				
				setTimeout(() => setShowImportDialog(false), 2000);
			} else {
				setImportResult('error');
				setImportError(data.message || data.error || 'Failed to import template');
			}
			
		} catch (error) {
			setImportResult('error');
			setImportError('Network error occurred while importing template');
		} finally {
			setIsImporting(false);
		}
	};



	return (
		<Card>
			<div className="p-6">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 bg-lime-100 dark:bg-lime-900/30 rounded-lg">
							<Store className="w-5 h-5 text-lime-600 dark:text-lime-400" />
						</div>
						<div>
							<Text weight="medium" size="4">Gelato Store Connection</Text>
							<Text size="2" color="gray" className="block">
								Connect your Gelato print-on-demand store for this account group
							</Text>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{isConfigured ? (
							<Badge color="green" variant="soft">
								<CheckCircle className="w-3 h-3 mr-1" />
								Connected
							</Badge>
						) : (
							<Badge color="gray" variant="soft">
								<XCircle className="w-3 h-3 mr-1" />
								Not Connected
							</Badge>
						)}
						<Button
							variant="soft"
							size="2"
							onClick={() => setIsEditing(!isEditing)}
						>
							<Settings className="w-4 h-4 mr-2" />
							{isEditing ? 'Cancel' : 'Configure'}
						</Button>
					</div>
				</div>

				{/* Connection Status */}
				{isConfigured && !isEditing && (
					<div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-6">
						<div className="flex items-center justify-between">
							<div>
								<Text weight="medium" size="3" className="text-green-800 dark:text-green-300">
									✅ Connected to {formData.storeName || 'Your Gelato Store'}
								</Text>
								<Text size="2" className="text-green-700 dark:text-green-300 block mt-1">
									{connectedAt && `Connected on ${connectedAt.toLocaleDateString()}`}
								</Text>
							</div>
							<Button
								variant="soft"
								color="red"
								size="1"
								onClick={handleDisconnect}
							>
								Disconnect
							</Button>
						</div>
					</div>
				)}

				{/* Setup Instructions */}
				{!isConfigured && !isEditing && (
					<div className="p-4 bg-lime-50 border border-lime-200 rounded-lg mb-6">
						<Text weight="medium" size="3" className="text-lime-800 dark:text-lime-300 block mb-2">
							🔒 Secure Gelato Integration
						</Text>
						<Text size="2" className="text-lime-700 block mb-3">
							Your Gelato API credentials will be encrypted and stored securely for this account group. 
							Each account group can have its own Gelato store connection.
						</Text>
						<div className="space-y-2">
							<Text size="2" className="text-lime-700 block">
								<strong>Step 1:</strong> Get your API credentials from{' '}
								<a 
									href="https://gelato.com/developers" 
									target="_blank" 
									className="underline inline-flex items-center gap-1"
								>
									Gelato Developers <ExternalLink className="w-3 h-3" />
								</a>
							</Text>
							<Text size="2" className="text-lime-700 block">
								<strong>Step 2:</strong> Click "Configure" to enter your credentials
							</Text>
							<Text size="2" className="text-lime-700 block">
								<strong>Step 3:</strong> Test the connection and save
							</Text>
						</div>
					</div>
				)}

				{/* Configuration Form */}
				{isEditing && (
					<div className="space-y-4">
						<div>
							<Text size="2" weight="medium" className="block mb-2">
								<Key className="w-4 h-4 inline mr-1" />
								Gelato API Key
							</Text>
							<input
								placeholder="Your Gelato API key"
								value={formData.apiKey}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
								type="password"
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500"
							/>
							<Text size="1" color="gray" className="block mt-1">
								This will be encrypted and stored securely for this account group
							</Text>
						</div>

						<div>
							<Text size="2" weight="medium" className="block mb-2">
								<Store className="w-4 h-4 inline mr-1" />
								Store ID (Optional)
							</Text>
							<input
								placeholder="Your internal store identifier (optional)"
								value={formData.storeId}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, storeId: e.target.value }))}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500"
							/>
							<Text size="1" color="gray" className="block mt-1">
								This is for your own reference and organization purposes
							</Text>
						</div>

						<div>
							<Text size="2" weight="medium" className="block mb-2">
								Store Name (Optional)
							</Text>
							<input
								placeholder="My Awesome Store"
								value={formData.storeName}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500"
							/>
						</div>

						{/* Test Result */}
						{testResult && (
							<div className={`p-3 rounded-lg ${
								testResult === 'success' 
									? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
									: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
							}`}>
								<Text size="2" className={
									testResult === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
								}>
									{testResult === 'success' 
										? '✅ Connection successful! Your credentials are valid.'
										: '❌ Connection failed. Please check your credentials.'
									}
								</Text>
							</div>
						)}

						{/* Action Buttons */}
						<div className="flex gap-2 pt-2">
							<Button
								onClick={handleTestConnection}
								disabled={!formData.apiKey || isTesting}
								variant="soft"
							>
								{isTesting ? (
									<>
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										Testing...
									</>
								) : (
									'Test Connection'
								)}
							</Button>
							<Button
								onClick={handleSave}
								disabled={!formData.apiKey || testResult !== 'success'}
								color="green"
							>
								Save Credentials
							</Button>
						</div>
					</div>
				)}

				{/* Template Management Section */}
				{isConfigured && !isEditing && (
					<div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
						<div className="flex items-center justify-between mb-4">
							<div>
								<Text weight="medium" size="3" className="text-purple-800 dark:text-purple-300 block">
									📚 Template Management
								</Text>
								<Text size="2" className="text-purple-700 dark:text-purple-300 block mt-1">
									Import specific templates by ID or refresh existing templates from your Gelato store
								</Text>
							</div>
							<div className="flex gap-2">
								<Button
									onClick={() => setShowImportDialog(true)}
									variant="soft"
									color="green"
									size="2"
								>
									<Plus className="w-4 h-4 mr-2" />
									Add Template
								</Button>
								<Button
									onClick={handleFetchTemplates}
									disabled={isFetchingTemplates}
									variant="soft"
									color="purple"
									size="2"
								>
									{isFetchingTemplates ? (
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											Refreshing...
										</>
									) : (
										<>
											<RefreshCw className="w-4 h-4 mr-2" />
											Refresh Templates
										</>
									)}
								</Button>
							</div>
						</div>

						{/* Template Status */}
						<div className="grid grid-cols-2 gap-4 mb-4">
							<div className="text-center p-3 bg-white dark:bg-gray-900 rounded border">
								<Text size="3" weight="bold" className="block">
									{cachedTemplatesCount}
								</Text>
								<Text size="1" color="gray">Cached Templates</Text>
							</div>
							<div className="text-center p-3 bg-white dark:bg-gray-900 rounded border">
								<Text size="1" color="gray" className="block">
									Last Fetched
								</Text>
								<Text size="2" weight="medium">
									{templatesLastFetched 
										? templatesLastFetched.toLocaleDateString()
										: 'Never'
									}
								</Text>
							</div>
						</div>

						{/* Template List */}
						{cachedTemplatesCount > 0 ? (
							<div className="mb-4">
								<Text weight="medium" size="2" className="text-purple-800 dark:text-purple-300 block mb-3">
									📄 Your Imported Templates ({cachedTemplatesCount} templates)
								</Text>
								<div className="space-y-2 max-h-64 overflow-y-auto">
									{accountGroup.gelatoCredentials?.templates?.map((template, index) => {
										if (!template) return null;
										
										const templateId = template.gelatoTemplateId || index.toString();
										const isEditingThisTemplate = editingTags[templateId];
										const currentTags = template.tags || [];
										
										return (
											<div key={templateId} className="p-3 bg-white dark:bg-gray-900 border rounded-lg">
												<div className="flex items-center justify-between">
													<div className="flex-1 min-w-0">
														<Text size="2" weight="medium" className="block truncate">
															{template.name || template.displayName || 'Unnamed Template'}
														</Text>
														<Text size="1" color="gray" className="block truncate">
															{template.productType || 'Unknown Type'} • 
															{template.fetchedAt ? ` Imported ${template.fetchedAt.toLocaleDateString()}` : ' Recently imported'}
														</Text>
														{template.description && (
															<Text size="1" color="gray" className="block truncate mt-1">
																{template.description.replace(/<[^>]*>/g, '').substring(0, 100)}...
															</Text>
														)}
													</div>
													<div className="flex items-center gap-2 ml-4">
														<Badge 
															color={template.isActive ? 'green' : 'gray'} 
															variant="soft"
															size="1"
														>
															{template.isActive ? 'Active' : 'Inactive'}
														</Badge>
														<Text size="1" color="gray">
															ID: {template.gelatoTemplateId?.substring(0, 8) || 'N/A'}...
														</Text>
														<Button
															variant="ghost"
															color="red"
															size="1"
															onClick={() => handleRemoveTemplate(template)}
														>
															<Trash2 className="w-3 h-3" />
														</Button>
													</div>
												</div>
												
												{/* Tags Section */}
												<div className="mt-3 pt-3 border-t border-gray-100">
													<div className="flex items-center justify-between mb-2">
														<Text size="1" weight="medium" color="gray">
															🏷️ Product Tags
														</Text>
														{!isEditingThisTemplate && (
															<Button
																variant="ghost"
																size="1"
																onClick={() => handleEditTags(templateId, currentTags)}
															>
																<Settings className="w-3 h-3 mr-1" />
																Edit
															</Button>
														)}
													</div>
													
													{isEditingThisTemplate ? (
														<div className="space-y-2">
															<input
																value={tempTags[templateId] || ''}
																onChange={(e) => setTempTags(prev => ({ ...prev, [templateId]: e.target.value }))}
																placeholder="Enter tags separated by commas"
																className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-lime-500"
															/>
															<div className="flex gap-2">
																<Button
																	size="1"
																	variant="soft"
																	color="green"
																	onClick={() => handleSaveTags(templateId)}
																>
																	Save
																</Button>
																<Button
																	size="1"
																	variant="ghost"
																	onClick={() => handleCancelEditTags(templateId)}
																>
																	Cancel
																</Button>
															</div>
														</div>
													) : (
														<div className="flex flex-wrap gap-1">
															{currentTags.length > 0 ? (
																currentTags.map((tag, tagIndex) => (
																	<Badge 
																		key={tagIndex} 
																		variant="soft" 
																		size="1"
																		color="lime"
																	>
																		{tag}
																	</Badge>
																))
															) : (
																<Text size="1" color="gray">
																	No tags set - click Edit to add tags
																</Text>
															)}
														</div>
													)}
												</div>
											</div>
										);
									}).filter(Boolean) || []}
								</div>
							</div>
						) : (
							<div className="mb-4 p-4 bg-white dark:bg-gray-900 border rounded-lg text-center">
								<Text size="2" color="gray" className="block mb-2">
									📄 No templates imported yet
								</Text>
								<Text size="1" color="gray">
									Use the "Add Template" button above to import your first template by ID
								</Text>
							</div>
						)}

						{/* Fetch Result */}
						{templateFetchResult && (
							<div className={`p-3 rounded-lg mb-4 ${
								templateFetchResult === 'success' 
									? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
									: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
							}`}>
								<Text size="2" className={
									templateFetchResult === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
								}>
									{templateFetchResult === 'success' 
										? `✅ Successfully fetched ${cachedTemplatesCount} templates from Gelato`
										: '❌ Failed to fetch templates. Please check your credentials and try again.'
									}
								</Text>
							</div>
						)}

						<Text size="1" color="gray">
							💡 <strong>Tip:</strong> Use "Add Template" to import specific templates by ID, or "Refresh Templates" to update your cached templates from your Gelato store.
						</Text>
					</div>
				)}

				{/* Shopify Integration Section */}
				{isConfigured && !isEditing && (
					<div className="mt-6 p-4 bg-lime-50 border border-lime-200 rounded-lg">
						<div className="flex items-center justify-between mb-4">
							<div>
								<Text weight="medium" size="3" className="text-lime-800 dark:text-lime-300 block">
									🛒 Shopify Integration
								</Text>
								<Text size="2" className="text-lime-700 block mt-1">
									Connect your Shopify store to manage product publishing and sales channels
								</Text>
							</div>
							<div className="flex items-center gap-2">
								{isShopifyConfigured ? (
									<Badge color="green" variant="soft">
										<CheckCircle className="w-3 h-3 mr-1" />
										Connected
									</Badge>
								) : (
									<Badge color="gray" variant="soft">
										<XCircle className="w-3 h-3 mr-1" />
										Not Connected
									</Badge>
								)}
								<Button
									variant="soft"
									size="2"
									onClick={() => setShowShopifyConfig(!showShopifyConfig)}
								>
									<Settings className="w-4 h-4 mr-2" />
									{showShopifyConfig ? 'Cancel' : 'Configure'}
								</Button>
							</div>
						</div>

						{/* Shopify Connection Status */}
						{isShopifyConfigured && !showShopifyConfig && (
							<div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
								<div className="flex items-center justify-between">
									<div>
										<Text weight="medium" size="3" className="text-green-800 dark:text-green-300">
											✅ Connected to {shopifyFormData.storeName || 'Your Shopify Store'}
										</Text>
										<Text size="2" className="text-green-700 dark:text-green-300 block mt-1">
											{shopifyConnectedAt && `Connected on ${shopifyConnectedAt.toLocaleDateString()}`}
										</Text>
										{shopifyFormData.defaultChannels && shopifyFormData.defaultChannels.length > 0 && (
											<Text size="1" className="text-green-700 dark:text-green-300 block mt-1">
												Default channels: {publishingChannels
													.filter(ch => shopifyFormData.defaultChannels.includes(ch.id))
													.map(ch => ch.name)
													.join(', ') || shopifyFormData.defaultChannels.join(', ')}
											</Text>
										)}
										<Text size="1" className="text-green-600 dark:text-green-400 block mt-1">
											💾 Saved to Jazz: {accountGroup.gelatoCredentials?.shopifyCredentials?.defaultPublishingChannels?.join(', ') || 'None'}
										</Text>
									</div>
									<Button
										variant="soft"
										color="red"
										size="1"
										onClick={handleDisconnectShopify}
									>
										Disconnect
									</Button>
								</div>
							</div>
						)}

						{/* Shopify Configuration Form */}
						{showShopifyConfig && (
							<div className="space-y-4 mb-4">
								<div>
									<Text size="2" weight="medium" className="block mb-2">
										🏪 Store URL
									</Text>
									<input
										placeholder="your-store.myshopify.com or https://your-store.myshopify.com"
										value={shopifyFormData.storeUrl}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
											setShopifyFormData(prev => ({ ...prev, storeUrl: e.target.value }))
										}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500"
									/>
									<Text size="1" color="gray" className="block mt-1">
										Your Shopify store domain (with or without https://)
									</Text>
								</div>

								<div>
									<Text size="2" weight="medium" className="block mb-2">
										🔑 Admin API Access Token
									</Text>
									<input
										placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
										value={shopifyFormData.accessToken}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
											setShopifyFormData(prev => ({ ...prev, accessToken: e.target.value }))
										}
										type="password"
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500"
									/>
									<Text size="1" color="gray" className="block mt-1">
										<strong>NOT</strong> the same as API key! Get this from Apps → Private apps → Admin API access token
									</Text>
								</div>

								<div>
									<Text size="2" weight="medium" className="block mb-2">
										Store Name (Optional)
									</Text>
									<input
										placeholder="My Shopify Store"
										value={shopifyFormData.storeName}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
											setShopifyFormData(prev => ({ ...prev, storeName: e.target.value }))
										}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500"
									/>
								</div>

								{/* Shopify Test Result */}
								{shopifyTestResult && (
									<div className={`p-3 rounded-lg ${
										shopifyTestResult === 'success' 
											? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
											: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
									}`}>
										<Text size="2" className={
											shopifyTestResult === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
										}>
											{shopifyTestResult === 'success' 
												? `✅ Connected successfully! Found ${publishingChannels.length} publishing channels.`
												: '❌ Connection failed. Please check your credentials.'
											}
										</Text>
									</div>
								)}

								{/* Action Buttons */}
								<div className="flex gap-2 pt-2">
									<Button
										onClick={handleTestShopifyConnection}
										disabled={!shopifyFormData.storeUrl || !shopifyFormData.accessToken || isTestingShopify}
										variant="soft"
									>
										{isTestingShopify ? (
											<>
												<Loader2 className="w-4 h-4 mr-2 animate-spin" />
												Testing...
											</>
										) : (
											'Test Connection'
										)}
									</Button>
									<Button
										onClick={handleSaveShopify}
										disabled={!shopifyFormData.storeUrl || !shopifyFormData.accessToken || shopifyTestResult !== 'success'}
										color="green"
									>
										Save Credentials
									</Button>
								</div>
							</div>
						)}

								{/* Publishing Channels */}
		{isShopifyConfigured && publishingChannels.length > 0 && (
			<div className="mb-4">
				<div className="flex items-center justify-between mb-3">
					<div>
						<Text weight="medium" size="2" className="text-lime-800 dark:text-lime-300 block">
							📡 Publishing Channels ({publishingChannels.length} channels)
						</Text>
						<Text size="1" className="text-lime-700 block mt-1">
							{channelsLastFetched 
								? `Last updated: ${channelsLastFetched.toLocaleDateString()}`
								: 'Channels available from your store'
							}
						</Text>
					</div>
					<Button
						variant="ghost"
						size="1"
						onClick={handleTestShopifyConnection}
						disabled={isTestingShopify}
					>
						<RefreshCw className={`w-3 h-3 ${isTestingShopify ? 'animate-spin' : ''}`} />
					</Button>
				</div>
				<Text size="1" className="text-lime-700 block mb-3">
					Select which channels should be preselected when creating new products:
				</Text>
				<div className="space-y-2">
					{publishingChannels.map((channel: any) => (
						<div key={channel.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border rounded">
							<div className="flex items-center gap-3">
								<input
									type="checkbox"
									id={`channel-${channel.id}`}
									checked={shopifyFormData.defaultChannels?.includes(channel.id) || false}
									onChange={(e) => {
										const isChecked = e.target.checked;
										const currentChannels = shopifyFormData.defaultChannels || [];
										
										let newChannels;
										if (isChecked) {
											newChannels = [...currentChannels, channel.id];
										} else {
											newChannels = currentChannels.filter(id => id !== channel.id);
										}
										
										handleDefaultChannelsChange(newChannels);
									}}
									className="w-4 h-4 text-lime-600 dark:text-lime-400 border-gray-300 dark:border-gray-600 rounded focus:ring-lime-500"
								/>
								<label htmlFor={`channel-${channel.id}`} className="cursor-pointer">
									<Text size="2" weight="medium">{channel.name}</Text>
								</label>
							</div>
							<div className="flex items-center gap-2">
								<Badge 
									color={channel.enabled ? 'green' : 'gray'} 
									variant="soft"
									size="1"
								>
									{channel.enabled ? 'Available' : 'Inactive'}
								</Badge>
								{shopifyFormData.defaultChannels?.includes(channel.id) && (
									<Badge 
										color="lime" 
										variant="soft"
										size="1"
									>
										Default
									</Badge>
								)}
							</div>
						</div>
					))}
				</div>
				<Text size="1" color="gray" className="block mt-2">
					💡 Tip: Online Store is typically preselected for most products
				</Text>
				{publishingChannels.some(ch => !ch.enabled) && (
					<div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
						<Text size="1" className="text-yellow-800 dark:text-yellow-300 block mb-2">
							<strong>📱 Activate Inactive Channels:</strong>
						</Text>
						<Text size="1" className="text-yellow-700 dark:text-yellow-300 block mb-2">
							Some channels appear as "Inactive" because they need to be enabled in your Shopify admin:
						</Text>
						<div className="space-y-1">
							<Text size="1" className="text-yellow-700 dark:text-yellow-300 block">
								• Go to <strong>Shopify Admin → Sales channels</strong>
							</Text>
							<Text size="1" className="text-yellow-700 dark:text-yellow-300 block">
								• Find the inactive channel and click <strong>"Connect"</strong> or <strong>"Add channel"</strong>
							</Text>
							<Text size="1" className="text-yellow-700 dark:text-yellow-300 block">
								• Once connected, refresh channels here to see them as "Available"
							</Text>
						</div>
					</div>
				)}
			</div>
		)}

						{!isShopifyConfigured && !showShopifyConfig && (
							<div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
								<Text size="2" className="text-yellow-800 dark:text-yellow-300 block mb-2">
									🔗 Connect Shopify for Enhanced Product Management
								</Text>
								<Text size="1" className="text-yellow-700 dark:text-yellow-300 block mb-3">
									Connect your Shopify store to automatically manage publishing channels, 
									sync product data, and control where your Gelato products appear.
								</Text>
								
								<div className="space-y-2">
									<Text size="1" className="text-yellow-700 dark:text-yellow-300 block">
										<strong>Step 1:</strong> Go to your Shopify Admin → Apps → "App and sales channel settings"
									</Text>
									<Text size="1" className="text-yellow-700 dark:text-yellow-300 block">
										<strong>Step 2:</strong> Click "Develop apps" → "Create an app" → "Configure Admin API scopes"
									</Text>
									<Text size="1" className="text-yellow-700 dark:text-yellow-300 block">
										<strong>Step 3:</strong> Enable: <code>read_products</code>, <code>write_products</code>, <code>read_publications</code>
									</Text>
									<Text size="1" className="text-yellow-700 dark:text-yellow-300 block">
										<strong>Step 4:</strong> Install app → Copy the <strong>Admin API access token</strong> (starts with shpat_)
									</Text>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Security Notice */}
				<div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
					<Text size="1" color="gray">
						🔐 <strong>Security:</strong> Your API credentials are encrypted using Jazz's built-in encryption 
						and stored securely for this account group. They are never shared or exposed to other users.
					</Text>
				</div>

				{/* Template Import Dialog */}
				<Dialog.Root open={showImportDialog} onOpenChange={setShowImportDialog}>
					<Dialog.Content style={{ maxWidth: 500 }}>
						<Dialog.Title>Import Template by ID</Dialog.Title>
						<Dialog.Description>
							Enter a specific Gelato template ID to import it into your account group. 
							You can find template IDs in your Gelato dashboard when you view or edit a template.
							<br/><br/>
							<Text size="1" color="gray">
								✅ Using official Gelato API endpoint: <code>ecommerce.gelatoapis.com/v1/templates</code>
							</Text>
						</Dialog.Description>

						<div className="space-y-4 mt-4">
							<div>
								<label className="block text-sm font-medium mb-2">
									<Package className="w-4 h-4 inline mr-1" />
									Template ID
								</label>
								<input
									value={templateIdToImport}
									onChange={(e) => setTemplateIdToImport(e.target.value)}
									placeholder="e.g., abc123-def456-ghi789"
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500"
									disabled={isImporting}
								/>
								<Text size="1" color="gray" className="block mt-1">
									Get template IDs from your Gelato dashboard or API responses
								</Text>
							</div>

							{/* Import Result */}
							{importResult && (
								<div className={`p-3 rounded-lg ${
									importResult === 'success' 
										? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
										: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
								}`}>
									<Text size="2" className={
										importResult === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
									}>
										{importResult === 'success' 
											? '✅ Template imported successfully! Check the template list below to see your new template.'
											: `❌ Import failed: ${importError}`
										}
									</Text>
								</div>
							)}
						</div>

						<div className="flex justify-end gap-2 mt-6">
							<Button 
								variant="soft" 
								onClick={() => {
									setShowImportDialog(false);
									setTemplateIdToImport("");
									setImportResult(null);
									setImportError("");
								}}
								disabled={isImporting}
							>
								Cancel
							</Button>
							<Button 
								onClick={handleImportTemplate}
								disabled={!templateIdToImport.trim() || isImporting}
								color="green"
							>
								{isImporting ? (
									<>
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										Importing...
									</>
								) : (
									<>
										<Plus className="w-4 h-4 mr-2" />
										Import Template
									</>
								)}
							</Button>
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</Card>
	);
}; 