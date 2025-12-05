"use client";

import { useState } from "react";
import { Card, Text, Heading, Button, Switch } from "@radix-ui/themes";
import { Bell, TestTube, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { testPushoverConfig } from "@/utils/pushoverNotifications";
import type { AccountGroupType } from "../app/schema";

interface NotificationSettingsProps {
  accountGroup: AccountGroupType;
}

export const NotificationSettings = ({ accountGroup }: NotificationSettingsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState("");

  // Get current settings with defaults
  const currentSettings = accountGroup.notificationSettings?.pushover || {
    enabled: false,
    apiToken: '',
    userKey: '',
    notifyOnPublish: true,
    notifyOnSchedule: true,
    notifyOnFailure: true,
    notifyOnBulkComplete: true,
  };

  const [formData, setFormData] = useState({
    enabled: currentSettings.enabled,
    apiToken: currentSettings.apiToken || '',
    userKey: currentSettings.userKey || '',
    notifyOnPublish: currentSettings.notifyOnPublish ?? true,
    notifyOnSchedule: currentSettings.notifyOnSchedule ?? true,
    notifyOnFailure: currentSettings.notifyOnFailure ?? true,
    notifyOnBulkComplete: currentSettings.notifyOnBulkComplete ?? true,
  });

  const handleTestNotification = async () => {
    if (!formData.apiToken.trim() || !formData.userKey.trim()) {
      setTestResult('error');
      setTestMessage('API Token and User Key are required for testing');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setTestMessage("");

    try {
      const result = await testPushoverConfig({
        apiToken: formData.apiToken.trim(),
        userKey: formData.userKey.trim(),
        enabled: true,
      });

      if (result.success) {
        setTestResult('success');
        setTestMessage('Test notification sent successfully! Check your Pushover app.');
      } else {
        setTestResult('error');
        setTestMessage(result.error || 'Test notification failed');
      }
    } catch (error) {
      setTestResult('error');
      setTestMessage(error instanceof Error ? error.message : 'Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (formData.enabled && (!formData.apiToken.trim() || !formData.userKey.trim())) {
      setTestResult('error');
      setTestMessage('API Token and User Key are required when notifications are enabled');
      return;
    }

    // Update account group with notification settings
    const accountGroupWithSettings = accountGroup as AccountGroupType & {
      notificationSettings?: {
        pushover?: {
          enabled: boolean;
          apiToken: string;
          userKey: string;
          notifyOnPublish?: boolean;
          notifyOnSchedule?: boolean;
          notifyOnFailure?: boolean;
          notifyOnBulkComplete?: boolean;
        };
      };
    };

    if (!accountGroupWithSettings.notificationSettings) {
      accountGroupWithSettings.notificationSettings = {};
    }

    accountGroupWithSettings.notificationSettings.pushover = {
      enabled: formData.enabled,
      apiToken: formData.apiToken.trim(),
      userKey: formData.userKey.trim(),
      notifyOnPublish: formData.notifyOnPublish,
      notifyOnSchedule: formData.notifyOnSchedule,
      notifyOnFailure: formData.notifyOnFailure,
      notifyOnBulkComplete: formData.notifyOnBulkComplete,
    };

    setIsEditing(false);
    setTestResult('success');
    setTestMessage('Notification settings saved successfully');
  };

  const handleCancel = () => {
    setFormData({
      enabled: currentSettings.enabled,
      apiToken: currentSettings.apiToken || '',
      userKey: currentSettings.userKey || '',
      notifyOnPublish: currentSettings.notifyOnPublish ?? true,
      notifyOnSchedule: currentSettings.notifyOnSchedule ?? true,
      notifyOnFailure: currentSettings.notifyOnFailure ?? true,
      notifyOnBulkComplete: currentSettings.notifyOnBulkComplete ?? true,
    });
    setIsEditing(false);
    setTestResult(null);
    setTestMessage("");
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <div>
              <Heading size="4">Push Notifications</Heading>
              <Text size="2" color="gray">
                Get notified when posts are published via Pushover
              </Text>
            </div>
          </div>
          {!isEditing && (
            <Button variant="soft" onClick={() => setIsEditing(true)}>
              Configure
            </Button>
          )}
        </div>

        {/* Current Status */}
        {!isEditing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Text size="2" weight="medium">Status:</Text>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${currentSettings.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                <Text size="2" color={currentSettings.enabled ? "green" : "gray"}>
                  {currentSettings.enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </div>
            </div>

            {currentSettings.enabled && (
              <div className="space-y-2">
                <Text size="2" color="gray">Notifications enabled for:</Text>
                <div className="grid grid-cols-2 gap-2 ml-4">
                  {currentSettings.notifyOnPublish && (
                    <Text size="2">• Post publishing</Text>
                  )}
                  {currentSettings.notifyOnSchedule && (
                    <Text size="2">• Post scheduling</Text>
                  )}
                  {currentSettings.notifyOnFailure && (
                    <Text size="2">• Publishing failures</Text>
                  )}
                  {currentSettings.notifyOnBulkComplete && (
                    <Text size="2">• Bulk upload completion</Text>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configuration Form */}
        {isEditing && (
          <div className="space-y-6">
            {/* Setup Instructions */}
            <div className="bg-brand-mint/10 dark:bg-brand-seafoam/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-brand-seafoam dark:text-brand-mint mt-0.5" />
                <div>
                  <Text size="2" weight="medium" className="text-brand-seafoam block mb-2">
                    Pushover Setup Required
                  </Text>
                  <Text size="2" className="text-brand-seafoam dark:text-brand-mint mb-3 block">
                    To receive notifications, you&apos;ll need a Pushover account and app token:
                  </Text>
                  <ol className="text-sm text-brand-seafoam dark:text-brand-mint space-y-1 ml-4">
                    <li>1. Sign up at <a href="https://pushover.net" target="_blank" rel="noopener noreferrer" className="underline">pushover.net</a></li>
                    <li>2. Create an application to get your API Token</li>
                    <li>3. Find your User Key in your account dashboard</li>
                    <li>4. Install the Pushover app on your device</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Text size="2" weight="medium" className="block">
                  Enable Push Notifications
                </Text>
                <Text size="2" color="gray">
                  Receive real-time notifications when posts are published
                </Text>
              </div>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            {/* API Configuration */}
            {formData.enabled && (
              <>
                <div className="space-y-4">
                  <div>
                    <Text size="2" weight="medium" className="block mb-2">
                      API Token *
                    </Text>
                    <input
                      type="password"
                      value={formData.apiToken}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiToken: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-seafoam"
                      placeholder="Your Pushover API Token"
                    />
                  </div>

                  <div>
                    <Text size="2" weight="medium" className="block mb-2">
                      User Key *
                    </Text>
                    <input
                      type="password"
                      value={formData.userKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, userKey: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-seafoam"
                      placeholder="Your Pushover User Key"
                    />
                  </div>

                  {/* Test Button */}
                  <Button
                    variant="soft"
                    onClick={handleTestNotification}
                    disabled={isTesting || !formData.apiToken.trim() || !formData.userKey.trim()}
                    className="w-full"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {isTesting ? 'Sending Test...' : 'Send Test Notification'}
                  </Button>
                </div>

                {/* Notification Types */}
                <div className="space-y-4">
                  <Text size="2" weight="medium">Notification Types</Text>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="2">Post Publishing</Text>
                        <Text size="1" color="gray">When posts are successfully published</Text>
                      </div>
                      <Switch
                        checked={formData.notifyOnPublish}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifyOnPublish: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="2">Post Scheduling</Text>
                        <Text size="1" color="gray">When posts are scheduled for later</Text>
                      </div>
                      <Switch
                        checked={formData.notifyOnSchedule}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifyOnSchedule: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="2">Publishing Failures</Text>
                        <Text size="1" color="gray">When posts fail to publish</Text>
                      </div>
                      <Switch
                        checked={formData.notifyOnFailure}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifyOnFailure: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="2">Bulk Upload Completion</Text>
                        <Text size="1" color="gray">When bulk CSV uploads finish</Text>
                      </div>
                      <Switch
                        checked={formData.notifyOnBulkComplete}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifyOnBulkComplete: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Test Result */}
            {testResult && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                testResult === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
              }`}>
                {testResult === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <Text size="2">{testMessage}</Text>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isTesting}>
                Save Settings
              </Button>
              <Button variant="soft" onClick={handleCancel} disabled={isTesting}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

