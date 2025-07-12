"use client";

import { useState } from "react";
import { Card, Text, Button, TextField, Badge } from "@radix-ui/themes";
import { Settings, Key, Store, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";
import type { AccountGroupType } from "../app/schema";

interface GelatoSettingsProps {
	accountGroup: AccountGroupType;
}

export const GelatoSettings = ({ accountGroup }: GelatoSettingsProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
	const [formData, setFormData] = useState({
		apiKey: accountGroup.gelatoCredentials?.apiKey || '',
		storeId: accountGroup.gelatoCredentials?.storeId || '',
		storeName: accountGroup.gelatoCredentials?.storeName || '',
	});

	const isConfigured = accountGroup.gelatoCredentials?.isConfigured || false;
	const connectedAt = accountGroup.gelatoCredentials?.connectedAt;

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
			const { GelatoCredentials } = await import('../app/schema');
			accountGroup.gelatoCredentials = GelatoCredentials.create({
				apiKey: formData.apiKey,
				storeId: formData.storeId || '',
				storeName: formData.storeName || '',
				isConfigured: true,
				connectedAt: new Date(),
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

				{/* Security Notice */}
				<div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
					<Text size="1" color="gray">
						🔐 <strong>Security:</strong> Your API credentials are encrypted using Jazz's built-in encryption 
						and stored securely for this account group. They are never shared or exposed to other users.
					</Text>
				</div>
			</div>
		</Card>
	);
}; 