"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Text } from "@radix-ui/themes";
import { Wand2, Loader2, Check, AlertCircle, RefreshCw } from "lucide-react";
import { getPlatformIcon } from "@/utils/platformIcons";
import Image from "next/image";

// Platform character limits for display
const PLATFORM_LIMITS: Record<string, number> = {
  x: 280,
  twitter: 280,
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  tiktok: 2200,
  threads: 10000,
  bluesky: 300,
  pinterest: 500,
  youtube: 5000,
};

interface AdaptedContent {
  [platform: string]: {
    content: string;
    charCount: number;
    withinLimit: boolean;
  };
}

interface AIAdaptContentProps {
  baseContent: string;
  selectedPlatforms: string[];
  onAdapted: (adaptedContent: AdaptedContent) => void;
}

export default function AIAdaptContent({
  baseContent,
  selectedPlatforms,
  onAdapted,
}: AIAdaptContentProps) {
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptedContent, setAdaptedContent] = useState<AdaptedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdapt = async () => {
    if (!baseContent.trim()) {
      setError("Write some content first, then adapt it for each platform.");
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError("Add at least one platform to adapt content for.");
      return;
    }

    setIsAdapting(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-adapt-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: baseContent,
          platforms: selectedPlatforms,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to adapt content");
      }

      const data = await response.json();
      setAdaptedContent(data.adapted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adapt content");
    } finally {
      setIsAdapting(false);
    }
  };

  const applyToVariants = () => {
    if (adaptedContent) {
      onAdapted(adaptedContent);
    }
  };

  const platformsNeedingAdaptation = selectedPlatforms.filter((p) => {
    const limit = PLATFORM_LIMITS[p.toLowerCase()];
    return limit && baseContent.length > limit;
  });

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      <div className="flex items-center justify-between">
        <div>
          <Text size="2" weight="medium" className="block">
            Adapt Content for Each Platform
          </Text>
          <Text size="1" color="gray">
            AI will optimize your content for each platform&apos;s character limits and best practices
          </Text>
        </div>
      </div>

      {/* Warning for platforms over limit */}
      {platformsNeedingAdaptation.length > 0 && !adaptedContent && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <Text size="2" weight="medium" className="text-amber-800 dark:text-amber-200 block">
              Content exceeds limits for:
            </Text>
            <Text size="1" className="text-amber-700 dark:text-amber-300">
              {platformsNeedingAdaptation.map((p) => {
                const limit = PLATFORM_LIMITS[p.toLowerCase()];
                return `${p} (${baseContent.length}/${limit} chars)`;
              }).join(", ")}
            </Text>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <Text size="2" className="text-red-800 dark:text-red-200">{error}</Text>
        </div>
      )}

      {/* Adapt button */}
      {!adaptedContent && (
        <Button
          onClick={handleAdapt}
          disabled={isAdapting || !baseContent.trim() || selectedPlatforms.length === 0}
          className="w-full bg-gradient-to-r from-brand-lavender to-brand-plum hover:from-brand-plum hover:to-brand-lavender text-white"
        >
          {isAdapting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adapting for {selectedPlatforms.length} platforms...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Adapt Content for All Platforms
            </>
          )}
        </Button>
      )}

      {/* Results */}
      {adaptedContent && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Text size="2" weight="medium" className="text-green-700 dark:text-green-300">
              <Check className="w-4 h-4 inline mr-1" />
              Content adapted!
            </Text>
            <Button
              size="1"
              variant="ghost"
              onClick={() => setAdaptedContent(null)}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Re-adapt
            </Button>
          </div>

          {/* Platform results */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(adaptedContent).map(([platform, data]) => {
              const limit = PLATFORM_LIMITS[platform.toLowerCase()];
              const icon = getPlatformIcon(platform);
              
              return (
                <div
                  key={platform}
                  className="p-3 bg-card border border-border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {icon && (
                        <Image src={icon} alt={platform} width={16} height={16} />
                      )}
                      <Text size="2" weight="medium" className="capitalize">
                        {platform}
                      </Text>
                    </div>
                    <Text
                      size="1"
                      className={
                        data.withinLimit
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {data.charCount}/{limit || "∞"} chars
                      {data.withinLimit ? " ✓" : " ⚠"}
                    </Text>
                  </div>
                  <Text size="1" color="gray" className="line-clamp-3 block">
                    {data.content}
                  </Text>
                </div>
              );
            })}
          </div>

          {/* Apply button */}
          <Button
            onClick={applyToVariants}
            className="w-full bg-brand-seafoam hover:bg-brand-seafoam/90 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Apply to All Platform Variants
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!baseContent.trim() && (
        <div className="text-center py-4">
          <Text size="2" color="gray">
            Write your base content first, then use AI to adapt it for each platform.
          </Text>
        </div>
      )}
    </div>
  );
}

