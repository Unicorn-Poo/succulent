"use client";

import { useState } from "react";
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

	const isConfigured = accountGroup.gelatoCredentials?.isConfigured || false;
	const connectedAt = accountGroup.gelatoCredentials?.connectedAt;
	const templatesLastFetched = accountGroup.gelatoCredentials?.templatesLastFetched;
	const cachedTemplatesCount = accountGroup.gelatoCredentials?.templates?.length || 0;
	
	// Debug logging
	console.log('Template debugging - cachedTemplatesCount:', cachedTemplatesCount);
	console.log('Template debugging - templates array:', accountGroup.gelatoCredentials?.templates);
	console.log('Template debugging - isConfigured:', isConfigured);
	console.log('Template debugging - forceRefresh:', forceRefresh);
	
	// Debug each template's fields
	accountGroup.gelatoCredentials?.templates?.forEach((template, index) => {
		console.log(`Template ${index}:`, {
			gelatoTemplateId: template?.gelatoTemplateId,
			name: template?.name,
			allFields: template
		});
	});
	
	// Function to remove a template
	const handleRemoveTemplate = (templateToRemove: any) => {
		if (!accountGroup.gelatoCredentials?.templates) return;
		
		const index = accountGroup.gelatoCredentials.templates.indexOf(templateToRemove);
		if (index > -1) {
			accountGroup.gelatoCredentials.templates.splice(index, 1);
			setForceRefresh(prev => prev + 1);
		}
	};

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
			console.error('Connection test failed:', error);
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
				console.log('Store templates failed, trying catalog...');
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
			console.error('Error fetching templates:', error);
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
					details: {
						size: data.template.availableSizes?.[0] || 'Unknown',
						material: 'Unknown',
						color: 'Unknown',
						orientation: 'Unknown',
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
						<div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
							<Store className="w-5 h-5 text-purple-600" />
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
					<div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
						<div className="flex items-center justify-between">
							<div>
								<Text weight="medium" size="3" className="text-green-800">
									✅ Connected to {formData.storeName || 'Your Gelato Store'}
								</Text>
								<Text size="2" className="text-green-700 block mt-1">
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
					<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
						<Text weight="medium" size="3" className="text-blue-800 block mb-2">
							🔒 Secure Gelato Integration
						</Text>
						<Text size="2" className="text-blue-700 block mb-3">
							Your Gelato API credentials will be encrypted and stored securely for this account group. 
							Each account group can have its own Gelato store connection.
						</Text>
						<div className="space-y-2">
							<Text size="2" className="text-blue-700 block">
								<strong>Step 1:</strong> Get your API credentials from{' '}
								<a 
									href="https://gelato.com/developers" 
									target="_blank" 
									className="underline inline-flex items-center gap-1"
								>
									Gelato Developers <ExternalLink className="w-3 h-3" />
								</a>
							</Text>
							<Text size="2" className="text-blue-700 block">
								<strong>Step 2:</strong> Click "Configure" to enter your credentials
							</Text>
							<Text size="2" className="text-blue-700 block">
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
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						{/* Test Result */}
						{testResult && (
							<div className={`p-3 rounded-lg ${
								testResult === 'success' 
									? 'bg-green-50 border border-green-200' 
									: 'bg-red-50 border border-red-200'
							}`}>
								<Text size="2" className={
									testResult === 'success' ? 'text-green-700' : 'text-red-700'
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
					<div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
						<div className="flex items-center justify-between mb-4">
							<div>
								<Text weight="medium" size="3" className="text-purple-800 block">
									📚 Template Management
								</Text>
								<Text size="2" className="text-purple-700 block mt-1">
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
							<div className="text-center p-3 bg-white rounded border">
								<Text size="3" weight="bold" className="block">
									{cachedTemplatesCount}
								</Text>
								<Text size="1" color="gray">Cached Templates</Text>
							</div>
							<div className="text-center p-3 bg-white rounded border">
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
								<Text weight="medium" size="2" className="text-purple-800 block mb-3">
									📄 Your Imported Templates ({cachedTemplatesCount} templates)
								</Text>
								<div className="space-y-2 max-h-64 overflow-y-auto">
									{accountGroup.gelatoCredentials?.templates?.map((template, index) => {
										if (!template) return null;
										
										return (
											<div key={template.gelatoTemplateId || index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
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
										);
									}).filter(Boolean) || []}
								</div>
							</div>
						) : (
							<div className="mb-4 p-4 bg-white border rounded-lg text-center">
								<Text size="2" color="gray" className="block mb-2">
									📄 No templates imported yet (Debug: cachedTemplatesCount = {cachedTemplatesCount})
								</Text>
								<Text size="1" color="gray">
									Use the "Add Template" button above to import your first template by ID
								</Text>
								<div className="mt-2 p-2 bg-gray-50 rounded text-xs text-left">
									<strong>Debug Info:</strong><br/>
									Templates array: {JSON.stringify(accountGroup.gelatoCredentials?.templates || [], null, 2)}
								</div>
							</div>
						)}

						{/* Fetch Result */}
						{templateFetchResult && (
							<div className={`p-3 rounded-lg mb-4 ${
								templateFetchResult === 'success' 
									? 'bg-green-50 border border-green-200' 
									: 'bg-red-50 border border-red-200'
							}`}>
								<Text size="2" className={
									templateFetchResult === 'success' ? 'text-green-700' : 'text-red-700'
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

				{/* Security Notice */}
				<div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
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
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
										? 'bg-green-50 border border-green-200' 
										: 'bg-red-50 border border-red-200'
								}`}>
									<Text size="2" className={
										importResult === 'success' ? 'text-green-700' : 'text-red-700'
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