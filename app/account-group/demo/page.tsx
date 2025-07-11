"use client";

import { useState } from "react";
import { Button, Dialog, TextField, TextArea } from "@radix-ui/themes";
import { Plus, ArrowLeft, Calendar, Globe, Users, BarChart3, Heart, MessageCircle, Share, Clock, Edit3, Grid, List } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CalendarView from "../../../components/calendar-view";
import PlatformProfileView from "../../../components/platform-profile-view";
import { accountGroup1 } from "../../page"; // Import the demo data

type ViewMode = 'overview' | 'calendar' | 'platform-profile';

export default function DemoAccountGroupPage() {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  // Use the static demo data
  const accountGroup = accountGroup1;

  const handleCreatePost = () => {
    setShowCreateDialog(true);
  };

  const handleSaveNewPost = () => {
    if (newPostTitle.trim()) {
      // Create a new post ID
      const newPostId = `demo-post-${Date.now()}`;
      
      // Navigate to the new post creation page
      router.push(`/account-group/demo/post/${newPostId}?title=${encodeURIComponent(newPostTitle)}&content=${encodeURIComponent(newPostContent)}`);
      
      // Reset form
      setNewPostTitle("");
      setNewPostContent("");
      setShowCreateDialog(false);
    }
  };

  const handleAccountClick = (account: any) => {
    setSelectedAccount(account);
    setViewMode('platform-profile');
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedAccount(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      published: "bg-green-100 text-green-800",
      scheduled: "bg-blue-100 text-blue-800",
      draft: "bg-gray-100 text-gray-800"
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  if (!accountGroup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Demo Not Found</h1>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Platform Profile View
  if (viewMode === 'platform-profile' && selectedAccount) {
    return (
      <PlatformProfileView
        account={selectedAccount}
        posts={accountGroup.posts}
        onBack={handleBackToOverview}
        accountGroupId="demo"
      />
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{accountGroup.name}</h1>
                <div className="w-3 h-3 bg-green-500 rounded-full" title="Demo Account Group"></div>
              </div>
              <p className="text-gray-600">
                Demo account group with {Object.keys(accountGroup.accounts).length} connected accounts
              </p>
            </div>
          </div>
          <Button onClick={handleCreatePost} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 mb-8">
          <Button
            variant={viewMode === 'overview' ? 'solid' : 'outline'}
            size="2"
            onClick={() => setViewMode('overview')}
          >
            <Grid className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'solid' : 'outline'}
            size="2"
            onClick={() => setViewMode('calendar')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </Button>
        </div>

        {viewMode === 'calendar' ? (
          <CalendarView posts={accountGroup.posts} />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Connected Accounts</p>
                    <p className="text-2xl font-bold text-gray-900">{Object.keys(accountGroup.accounts).length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Posts Created</p>
                    <p className="text-2xl font-bold text-gray-900">{accountGroup.posts.length}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Platforms</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.values(accountGroup.accounts).filter(acc => acc.isLinked).length}
                    </p>
                  </div>
                  <Globe className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Engagement</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {accountGroup.posts.reduce((sum: number, post: any) => 
                        sum + (post.engagement?.likes || 0) + (post.engagement?.comments || 0) + (post.engagement?.shares || 0), 0
                      )}
                    </p>
                  </div>
                  <Heart className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Connected Accounts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Connected Accounts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(accountGroup.accounts).map((account: any, index: number) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer hover:border-blue-200"
                    onClick={() => handleAccountClick(account)}
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {account.platform.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{account.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500 capitalize">{account.platform}</p>
                        <div className={`w-2 h-2 rounded-full ${account.isLinked ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className={`text-xs ${account.isLinked ? 'text-green-600' : 'text-gray-500'}`}>
                          {account.isLinked ? 'Connected' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {accountGroup.posts.filter((post: any) => post.platforms.includes(account.platform)).length} posts
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">i</span>
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Demo Account Group</h3>
                  <p className="text-blue-700 text-sm">
                    This is a demonstration account group with sample social media accounts. 
                    Posts created here won't actually be published to social media platforms.
                    Click on any account above to view platform-specific previews.
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Posts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Posts</h2>
                <Button variant="outline" size="1" onClick={handleCreatePost}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </Button>
              </div>
              
              {accountGroup.posts.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                  <p className="text-gray-600 mb-4">Create your first post to get started</p>
                  <Button onClick={handleCreatePost}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {accountGroup.posts.map((post: any, index: number) => (
                    <Link 
                      key={index} 
                      href={`/account-group/demo/post/${post.id}`}
                      className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all cursor-pointer hover:border-blue-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">{post.title}</h3>
                          <p className="text-gray-700 leading-relaxed">{post.content}</p>
                        </div>
                        <span className={`ml-4 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(post.status)}`}>
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </span>
                      </div>
                      
                      {/* Platform badges */}
                      <div className="flex items-center gap-2 mb-4">
                        {post.platforms.map((platform: string, platformIndex: number) => (
                          <span key={platformIndex} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md capitalize">
                            {platform}
                          </span>
                        ))}
                      </div>

                      {/* Engagement metrics */}
                      {post.engagement && (
                        <div className="flex items-center gap-6 mb-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            <span>{post.engagement.likes}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.engagement.comments}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Share className="w-4 h-4" />
                            <span>{post.engagement.shares}</span>
                          </div>
                        </div>
                      )}

                      {/* Date */}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {post.status === 'scheduled' ? (
                          <span>Scheduled for {formatDate(post.scheduledFor)}</span>
                        ) : (
                          <span>Published {formatDate(post.publishedAt)}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Post Dialog */}
      <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Create New Post - Demo</Dialog.Title>
          <Dialog.Description>
            Create a new post for {accountGroup.name}. This won't be published to actual social media platforms.
          </Dialog.Description>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Post Title</label>
              <TextField.Root
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Enter a title for your post..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Initial Content (optional)</label>
              <TextArea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Start writing your post..."
                rows={4}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                <strong>Demo Mode:</strong> This post will not actually be published to social media platforms.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="soft" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNewPost}
              disabled={!newPostTitle.trim()}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}