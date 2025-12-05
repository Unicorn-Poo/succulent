"use client";

import React, { useState } from "react";
import { Card, Text, Button, TextField, Badge, Dialog, Switch } from "@radix-ui/themes";
import { Settings, Key, CheckCircle, XCircle, Loader2, ExternalLink, Download, RefreshCw, Plus, Package, Trash2, AlertCircle } from "lucide-react";
import type { AccountGroupType } from "../app/schema";

interface ProdigiSettingsProps {
	accountGroup: AccountGroupType;
}

export const ProdigiSettings = ({ accountGroup }: ProdigiSettingsProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
	const [isFetchingProducts, setIsFetchingProducts] = useState(false);
	const [productFetchResult, setProductFetchResult] = useState<'success' | 'error' | null>(null);
	const [showImportDialog, setShowImportDialog] = useState(false);
	const [productIdToImport, setProductIdToImport] = useState("");
	const [isImporting, setIsImporting] = useState(false);
	const [importResult, setImportResult] = useState<'success' | 'error' | null>(null);
	const [importError, setImportError] = useState("");
	const [forceRefresh, setForceRefresh] = useState(0);
	const [formData, setFormData] = useState({
		apiKey: accountGroup.prodigiCredentials?.apiKey || '',
		sandboxMode: accountGroup.prodigiCredentials?.sandboxMode !== false, // Default to true
	});

	const handleTestConnection = async () => {
		if (!formData.apiKey.trim()) {
			setTestResult('error');
			return;
		}

		setIsTesting(true);
		setTestResult(null);

		try {
			const response = await fetch('/api/test-prodigi-connection', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					apiKey: formData.apiKey.trim(),
					sandboxMode: formData.sandboxMode,
				}),
			});

			const result = await response.json();
			if (result.success) {
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
		if (!formData.apiKey.trim()) {
			setTestResult('error');
			return;
		}

		// Update account group with Prodigi credentials
		if (accountGroup.prodigiCredentials) {
			accountGroup.prodigiCredentials.apiKey = formData.apiKey.trim();
			accountGroup.prodigiCredentials.sandboxMode = formData.sandboxMode;
		} else {
			// Create new credentials object - following the same pattern as Gelato
			const { ProdigiCredentials, ProdigiProduct } = await import('../app/schema');
			accountGroup.prodigiCredentials = ProdigiCredentials.create({
				apiKey: formData.apiKey.trim(),
				sandboxMode: formData.sandboxMode,
				isConfigured: true,
				connectedAt: new Date(),
			}, { owner: accountGroup._owner });
		}

		setIsEditing(false);
		setTestResult(null);
	};

	const handleDisconnect = () => {
		if (accountGroup.prodigiCredentials) {
			accountGroup.prodigiCredentials.apiKey = '';
			// Clear templates by removing all items from the collaborative list
			if (accountGroup.prodigiCredentials.templates) {
				while (accountGroup.prodigiCredentials.templates.length > 0) {
					accountGroup.prodigiCredentials.templates.splice(0, 1);
				}
			}
		}
		setFormData({
			apiKey: '',
			sandboxMode: true,
		});
		setIsEditing(false);
		setTestResult(null);
	};

	const handleFetchProducts = async () => {
		if (!accountGroup.prodigiCredentials?.apiKey) {
			setProductFetchResult('error');
			return;
		}

		setIsFetchingProducts(true);
		setProductFetchResult(null);

		try {
			const response = await fetch('/api/prodigi-catalog', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					apiKey: accountGroup.prodigiCredentials.apiKey,
					sandboxMode: accountGroup.prodigiCredentials.sandboxMode,
				}),
			});

			const result = await response.json();
			
			if (result.success && result.templates) {
				// Clear existing templates and add new ones
				if (accountGroup.prodigiCredentials?.templates) {
					// Clear the list first
					while (accountGroup.prodigiCredentials.templates.length > 0) {
						accountGroup.prodigiCredentials.templates.splice(0, 1);
					}
					// Add new templates
					result.templates.forEach((template: any) => {
						accountGroup.prodigiCredentials?.templates?.push(template);
					});
				}
				setProductFetchResult('success');
				setForceRefresh(prev => prev + 1);
			} else {
				setProductFetchResult('error');
			}
		} catch (error) {
			setProductFetchResult('error');
		} finally {
			setIsFetchingProducts(false);
		}
	};

	const handleRemoveProduct = (productToRemove: any) => {
		if (accountGroup.prodigiCredentials?.templates) {
			const index = accountGroup.prodigiCredentials.templates.findIndex(
				(template: any) => template.id === productToRemove.id
			);
			if (index >= 0) {
				accountGroup.prodigiCredentials.templates.splice(index, 1);
			}
			setForceRefresh(prev => prev + 1);
		}
	};

	const handleImportProduct = async () => {
		if (!productIdToImport.trim() || !accountGroup.prodigiCredentials?.apiKey) {
			setImportResult('error');
			setImportError('Product ID and API key are required');
			return;
		}

		setIsImporting(true);
		setImportResult(null);
		setImportError("");

		try {
			const response = await fetch('/api/prodigi-catalog', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					apiKey: accountGroup.prodigiCredentials.apiKey,
					sandboxMode: accountGroup.prodigiCredentials.sandboxMode,
					productId: productIdToImport.trim(),
				}),
			});

			const result = await response.json();
			
			if (result.success && result.templates) {
				const newProduct = result.templates.find((t: any) => t.id === productIdToImport.trim());
				if (newProduct) {
					// Add to existing products
					if (!accountGroup.prodigiCredentials?.templates) {
						// Templates list will be initialized properly when credentials are created
						return;
					}
					
					// Check if product already exists
					const existingIndex = accountGroup.prodigiCredentials.templates.findIndex(
						(p: any) => p.id === newProduct.id
					);
					
					if (existingIndex >= 0) {
						// Update existing product
						accountGroup.prodigiCredentials.templates[existingIndex] = newProduct;
					} else {
						// Add new product
						accountGroup.prodigiCredentials.templates.push(newProduct);
					}
					
					setImportResult('success');
					setProductIdToImport("");
					setShowImportDialog(false);
					setForceRefresh(prev => prev + 1);
				} else {
					setImportResult('error');
					setImportError('Product not found');
				}
			} else {
				setImportResult('error');
				setImportError(result.error || 'Failed to import product');
			}
		} catch (error) {
			setImportResult('error');
			setImportError('Network error occurred');
		} finally {
			setIsImporting(false);
		}
	};

	const isConnected = !!accountGroup.prodigiCredentials?.apiKey;
	const templates = accountGroup.prodigiCredentials?.templates || [];
	const createdProducts = accountGroup.prodigiCredentials?.createdProducts || [];
	const sandboxMode = accountGroup.prodigiCredentials?.sandboxMode !== false;

	return (
		<Card className="p-6">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<Package className="w-5 h-5 text-brand-seafoam dark:text-brand-mint" />
					<div>
						<Text size="4" weight="bold" className="mb-1 block">
							Prodigi Integration
						</Text>
						<Text size="2" color="gray">
							Connect your Prodigi account for print-on-demand products
						</Text>
					</div>
				</div>
				<Badge color={isConnected ? "green" : "gray"}>
					{isConnected ? "Connected" : "Not Connected"}
				</Badge>
			</div>

			{isConnected && (
				<div className="mb-6 p-4 bg-brand-mint/10 dark:bg-brand-seafoam/20 rounded-lg">
					<div className="flex items-center gap-2 mb-2">
						<AlertCircle className="w-4 h-4 text-brand-seafoam dark:text-brand-mint" />
						<Text size="2" weight="medium" color="blue">
							{sandboxMode ? "Sandbox Mode Active" : "Live Mode Active"}
						</Text>
					</div>
					<Text size="1" color="blue">
						{sandboxMode ? 
							"You're connected to Prodigi's sandbox environment for testing" :
							"You're connected to Prodigi's live environment for production orders"
						}
					</Text>
				</div>
			)}

			{!isConnected ? (
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">API Key</label>
						<TextField.Root
							value={formData.apiKey}
							onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
							placeholder="Enter your Prodigi API key"
							type="password"
						/>
					</div>

					<div className="flex items-center gap-3">
						<Switch
							checked={formData.sandboxMode}
							onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sandboxMode: checked }))}
						/>
						<Text size="2">Use Sandbox Mode (for testing)</Text>
					</div>

					<div className="flex gap-2">
						<Button
							onClick={handleTestConnection}
							disabled={isTesting || !formData.apiKey.trim()}
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
						<div className="flex items-center gap-2 text-green-600 dark:text-green-400">
							<CheckCircle className="w-4 h-4" />
							<Text size="2">Connection successful!</Text>
						</div>
					)}

					{testResult === 'error' && (
						<div className="flex items-center gap-2 text-red-600 dark:text-red-400">
							<XCircle className="w-4 h-4" />
							<Text size="2">Connection failed. Please check your API key.</Text>
						</div>
					)}
				</div>
			) : (
				<div className="space-y-6">
					{/* Connection Status */}
					<div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
						<div className="flex items-center gap-3">
							<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
							<div>
								<Text size="2" weight="medium" className="block">Connected to Prodigi</Text>
								<Text size="1" color="gray">
									{templates.length} template{templates.length !== 1 ? 's' : ''} available
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

					{/* Products Management */}
					<div>
						<div className="flex items-center justify-between mb-4">
							<Text size="3" weight="bold">Available Products</Text>
							<div className="flex gap-2">
								<Button
									onClick={() => setShowImportDialog(true)}
									size="1"
									variant="outline"
									className="flex items-center gap-2"
								>
									<Plus className="w-3 h-3" />
									Import Product
								</Button>
								<Button
									onClick={handleFetchProducts}
									disabled={isFetchingProducts}
									size="1"
									className="flex items-center gap-2"
								>
									{isFetchingProducts ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
									Refresh Products
								</Button>
							</div>
						</div>

						{/* Created Products Section */}
						<div className="mb-6">
							<div className="flex items-center justify-between mb-3">
								<Text size="2" weight="medium">Created Product Designs</Text>
								<Badge color="blue">
									{(accountGroup.prodigiCredentials?.createdProducts?.length || 0)} designs
								</Badge>
							</div>
							
							{accountGroup.prodigiCredentials?.createdProducts && accountGroup.prodigiCredentials.createdProducts.length > 0 ? (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
									{accountGroup.prodigiCredentials.createdProducts.map((product: any) => (
										<div key={product.id} className="bg-card border border-border rounded-lg p-4">
											<div className="flex items-center justify-between mb-2">
												<Text size="2" weight="bold" className="line-clamp-1">
													{product.name}
												</Text>
												<Badge color={
													product.status === 'published' ? 'green' : 
													product.status === 'ready' ? 'blue' : 'gray'
												}>
													{product.status}
												</Badge>
											</div>
											
											<Text size="1" color="gray" className="mb-3 line-clamp-2">
												{product.description}
											</Text>
											
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<Text size="1" weight="medium">Base Product:</Text>
													<Text size="1" color="gray">{product.baseProductId}</Text>
												</div>
												{product.selectedVariant && (
													<div className="flex items-center gap-2">
														<Text size="1" weight="medium">Variant:</Text>
														<Text size="1" color="gray">
															{[product.selectedVariant.size, product.selectedVariant.color, product.selectedVariant.material]
																.filter(Boolean).join(', ') || 'Default'}
														</Text>
													</div>
												)}
												{product.baseCost && (
													<div className="flex items-center gap-2">
														<Text size="1" weight="medium">Cost:</Text>
														<Text size="1" color="gray">
															{product.currency || 'USD'} {product.baseCost}
														</Text>
													</div>
												)}
												{product.assets && product.assets.length > 0 && (
													<div className="flex items-center gap-2">
														<Text size="1" weight="medium">Assets:</Text>
														<Text size="1" color="gray">{product.assets.length} image(s)</Text>
													</div>
												)}
											</div>
											
											<div className="mt-3 pt-3 border-t border-border">
												<Text size="1" color="gray">
													Created: {new Date(product.createdAt).toLocaleDateString()}
												</Text>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="text-center py-6 bg-muted rounded-lg mb-4">
									<Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
									<Text size="2" color="gray">No product designs created yet</Text>
									<Text size="1" color="gray">
										Create products from your social media posts using the Enhanced Tools
									</Text>
								</div>
							)}
						</div>

						{productFetchResult === 'success' && (
							<div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-4">
								<CheckCircle className="w-4 h-4" />
								<Text size="2">Products updated successfully!</Text>
							</div>
						)}

						{productFetchResult === 'error' && (
							<div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
								<XCircle className="w-4 h-4" />
								<Text size="2">Failed to fetch products. Please try again.</Text>
							</div>
						)}

						{templates.length === 0 ? (
							<div className="text-center py-12">
								<Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
								<Text size="4" weight="medium" className="mb-2 block">No Products Available</Text>
								<Text size="2" color="gray" className="mb-6 block">
									Fetch your Prodigi catalog to see available products for print-on-demand.
								</Text>
								<Button
									onClick={handleFetchProducts}
									disabled={isFetchingProducts}
									className="flex items-center gap-2"
								>
									{isFetchingProducts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
									Fetch Products
								</Button>
							</div>
						) : (
							<div>
								<Text size="2" weight="medium" className="mb-3 block">Base Products Catalog</Text>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{templates.map((product: any) => (
										<div key={product.id} className="bg-card border border-border rounded-lg p-4">
											<div className="flex items-center justify-between mb-3">
												<Text size="2" weight="bold" className="line-clamp-1">
													{product.displayName}
												</Text>
												<Button
													size="1"
													variant="ghost"
													onClick={() => handleRemoveProduct(product)}
													className="text-red-500 hover:text-red-700 dark:text-red-300"
												>
													<Trash2 className="w-3 h-3" />
												</Button>
											</div>
											
											<Text size="1" color="gray" className="mb-3 line-clamp-2">
												{product.description}
											</Text>
											
											<div className="space-y-2">
												<div className="flex items-center gap-2">
													<Text size="1" weight="medium">Category:</Text>
													<Text size="1" color="gray">{product.details.category}</Text>
												</div>
												<div className="flex items-center gap-2">
													<Text size="1" weight="medium">Variants:</Text>
													<Text size="1" color="gray">{product.variants?.length || 0}</Text>
												</div>
												<div className="flex items-center gap-2">
													<Text size="1" weight="medium">Print Areas:</Text>
													<Text size="1" color="gray">{product.printAreas?.length || 0}</Text>
												</div>
											</div>
											
											<div className="mt-3 pt-3 border-t border-border">
												<Text size="1" color="blue" className="cursor-pointer hover:underline">
													Use for Product Creation →
												</Text>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Edit Dialog */}
			<Dialog.Root open={isEditing} onOpenChange={setIsEditing}>
				<Dialog.Content style={{ maxWidth: 500 }}>
					<Dialog.Title>Edit Prodigi Settings</Dialog.Title>
					<Dialog.Description>
						Update your Prodigi API configuration
					</Dialog.Description>

					<div className="space-y-4 mt-4">
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">API Key</label>
							<TextField.Root
								value={formData.apiKey}
								onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
								placeholder="Enter your Prodigi API key"
								type="password"
							/>
						</div>

						<div className="flex items-center gap-3">
							<Switch
								checked={formData.sandboxMode}
								onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sandboxMode: checked }))}
							/>
							<Text size="2">Use Sandbox Mode (for testing)</Text>
						</div>
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<Button variant="soft" onClick={() => setIsEditing(false)}>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={!formData.apiKey.trim()}>
							Save Changes
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Root>

			{/* Import Product Dialog */}
			<Dialog.Root open={showImportDialog} onOpenChange={setShowImportDialog}>
				<Dialog.Content style={{ maxWidth: 500 }}>
					<Dialog.Title>Import Prodigi Product</Dialog.Title>
					<Dialog.Description>
						Enter a specific Prodigi product ID to import
					</Dialog.Description>

					<div className="space-y-4 mt-4">
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">Product ID</label>
							<TextField.Root
								value={productIdToImport}
								onChange={(e) => setProductIdToImport(e.target.value)}
								placeholder="Enter Prodigi product ID"
							/>
						</div>

						{importResult === 'success' && (
							<div className="flex items-center gap-2 text-green-600 dark:text-green-400">
								<CheckCircle className="w-4 h-4" />
								<Text size="2">Product imported successfully!</Text>
							</div>
						)}

						{importResult === 'error' && (
							<div className="flex items-center gap-2 text-red-600 dark:text-red-400">
								<XCircle className="w-4 h-4" />
								<Text size="2">{importError || 'Failed to import product'}</Text>
							</div>
						)}
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<Button variant="soft" onClick={() => setShowImportDialog(false)}>
							Cancel
						</Button>
						<Button 
							onClick={handleImportProduct} 
							disabled={!productIdToImport.trim() || isImporting}
							className="flex items-center gap-2"
						>
							{isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
							Import Product
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Root>
		</Card>
	);
}; 