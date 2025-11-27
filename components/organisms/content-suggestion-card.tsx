"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "../atoms/button";
import {
  Check,
  X,
  Edit2,
  RefreshCw,
  Copy,
  Calendar,
  Sparkles,
  ImageIcon,
  Download,
} from "lucide-react";
import { ContentFeedback } from "../../app/schema";

interface ContentSuggestionCardProps {
  id: string;
  content: string;
  contentPillar?: string;
  platform: string;
  confidenceScore: number;
  hashtags?: string[];
  bestTimeToPost?: string;
  expectedEngagement?: "high" | "medium" | "low";
  toneUsed?: string;
  accountGroup?: any;
  onAccept?: (content: string, edited?: string) => void;
  onReject?: (reason?: string) => void;
  onRegenerate?: () => void;
  onSchedule?: (content: string) => void;
}

export default function ContentSuggestionCard({
  id,
  content,
  contentPillar,
  platform,
  confidenceScore,
  hashtags = [],
  bestTimeToPost,
  expectedEngagement = "medium",
  toneUsed,
  accountGroup,
  onAccept,
  onReject,
  onRegenerate,
  onSchedule,
}: ContentSuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">(
    "pending"
  );
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    "quote" | "tip" | "stat" | "announcement"
  >("quote");

  // Generate OG image URL
  const getImageUrl = () => {
    const params = new URLSearchParams({
      text: editedContent.slice(0, 300), // Limit text length
      template: selectedTemplate,
      brand: accountGroup?.brandPersona?.name || "Succulent",
      color: "#84cc16",
      platform: platform,
    });
    if (contentPillar) params.set("headline", contentPillar);
    return `/api/og-image?${params.toString()}`;
  };

  // Download image
  const handleDownloadImage = async () => {
    const imageUrl = getImageUrl();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contentPillar || "content"}-${platform}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Error downloading image
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "low":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600 dark:text-red-400";
  };

  const saveFeedback = async (
    accepted: boolean,
    reason?: string,
    edited?: string
  ) => {
    if (!accountGroup) return;

    try {
      // Create feedback entry in Jazz
      const feedback = ContentFeedback.create({
        generatedContent: content,
        contentType: "post",
        platform,
        accepted,
        reason: reason || undefined,
        editedVersion: edited || undefined,
        contentPillar: contentPillar || undefined,
        toneUsed: toneUsed || undefined,
        confidenceScore,
        createdAt: new Date(),
      });

      // Add to account group's feedback list
      if (accountGroup.contentFeedback) {
        accountGroup.contentFeedback.push(feedback);
      }
    } catch (error) {
      console.error("Error saving feedback:", error);
    }
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    const finalContent = isEditing ? editedContent : content;
    const wasEdited = isEditing && editedContent !== content;

    await saveFeedback(true, undefined, wasEdited ? editedContent : undefined);
    setStatus("accepted");
    onAccept?.(finalContent, wasEdited ? editedContent : undefined);
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (!showRejectReason) {
      setShowRejectReason(true);
      return;
    }

    setIsSubmitting(true);
    await saveFeedback(false, rejectReason || "No reason provided");
    setStatus("rejected");
    onReject?.(rejectReason);
    setIsSubmitting(false);
    setShowRejectReason(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(isEditing ? editedContent : content);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleSchedule = () => {
    const finalContent = isEditing ? editedContent : content;
    onSchedule?.(finalContent);
  };

  if (status === "accepted") {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <Check className="w-5 h-5" />
          <span className="font-medium text-foreground">
            Content accepted!
          </span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          This feedback will help improve future suggestions.
        </p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <X className="w-5 h-5" />
            <span className="font-medium text-foreground">
              Content rejected
            </span>
          </div>
          {onRegenerate && (
            <Button onClick={onRegenerate} variant="outline" size="1">
              <RefreshCw className="w-4 h-4 mr-1" />
              Try Different
            </Button>
          )}
        </div>
        {rejectReason && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            Reason: {rejectReason}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-4 py-3 border-b border-border dark:border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="font-medium text-foreground">
              {contentPillar ? `${contentPillar}` : "AI Generated Content"}
            </span>
            <span className="text-xs px-2 py-0.5 bg-card rounded-full text-muted-foreground capitalize">
              {platform}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${getConfidenceColor(
                confidenceScore
              )}`}
            >
              {confidenceScore}% match
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full border ${getEngagementColor(
                expectedEngagement
              )}`}
            >
              {expectedEngagement} engagement
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full p-3 border border-border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={6}
            placeholder="Edit the content..."
          />
        ) : (
          <div className="text-foreground whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {hashtags.map((tag, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta info */}
        {bestTimeToPost && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Best time to post: {bestTimeToPost}</span>
          </div>
        )}
      </div>

      {/* Reject reason input */}
      {showRejectReason && (
        <div className="px-4 pb-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <label className="text-sm font-medium text-red-800 dark:text-red-300 block mb-2">
              Why doesn't this work for your brand? (helps AI learn)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2 border border-red-200 dark:border-red-800 rounded-lg resize-none text-sm"
              rows={2}
              placeholder="e.g., Too formal, wrong topic, doesn't match our voice..."
            />
            <div className="flex gap-2 mt-2">
              <Button
                onClick={handleReject}
                size="1"
                className="bg-red-600 hover:bg-red-700"
                disabled={isSubmitting}
              >
                Confirm Reject
              </Button>
              <Button
                onClick={() => setShowRejectReason(false)}
                variant="outline"
                size="1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {showImagePreview && (
        <div className="p-4 bg-card border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Template:
              </span>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as any)}
                className="text-sm bg-muted border border-border rounded px-2 py-1 text-white"
              >
                <option value="quote">Quote Card</option>
                <option value="tip">Tip Card</option>
                <option value="stat">Stat Card</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
            <Button
              onClick={handleDownloadImage}
              variant="outline"
              size="1"
              className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
          <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden">
            <Image
              src={getImageUrl()}
              alt="Generated image preview"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Image sized for {platform} • Click download to save
          </p>
        </div>
      )}

      {/* Actions */}
      {!showRejectReason && (
        <div className="bg-muted px-4 py-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="outline"
                size="1"
                className="text-muted-foreground"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                {isEditing ? "Preview" : "Edit"}
              </Button>
              <Button
                onClick={handleCopy}
                variant="outline"
                size="1"
                className="text-muted-foreground"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              {onRegenerate && (
                <Button
                  onClick={onRegenerate}
                  variant="outline"
                  size="1"
                  className="text-muted-foreground"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Regenerate
                </Button>
              )}
              <Button
                onClick={() => setShowImagePreview(!showImagePreview)}
                variant="outline"
                size="1"
                className={
                  showImagePreview
                    ? "text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                    : "text-muted-foreground"
                }
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                Image
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleReject}
                variant="outline"
                size="1"
                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:bg-red-900/20"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
              <Button
                onClick={handleAccept}
                size="1"
                className="bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                <Check className="w-4 h-4 mr-1" />
                Accept
              </Button>
              {onSchedule && (
                <Button
                  onClick={handleSchedule}
                  size="1"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Schedule
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
