"use client";

import { Card, Text, Button, Badge, Avatar } from "@radix-ui/themes";
import {
  Star,
  MessageSquare,
  RefreshCw,
  Filter,
  Send,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Check,
  X,
  ChevronDown,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";

interface Review {
  id: string;
  platform: string;
  authorName: string;
  authorId?: string;
  rating: number;
  content: string;
  timestamp: string;
  replied: boolean;
  replyContent?: string;
  replyTimestamp?: string;
}

interface ReviewStats {
  total: number;
  averageRating: string | number;
  unreplied: number;
  byRating: Record<number, number>;
}

interface ReviewsManagementProps {
  profileKey?: string;
  brandPersona?: {
    tone?: string;
    personality?: string[];
    businessName?: string;
  };
}

const PLATFORM_COLORS: Record<string, string> = {
  google: "blue",
  facebook: "indigo",
  yelp: "red",
  tripadvisor: "green",
};

export default function ReviewsManagement({ profileKey, brandPersona }: ReviewsManagementProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [showUnrepliedOnly, setShowUnrepliedOnly] = useState(false);

  // Reply state
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch reviews
  const fetchReviews = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (platformFilter !== "all") params.append("platform", platformFilter);
      if (ratingFilter) params.append("minRating", ratingFilter.toString());
      if (showUnrepliedOnly) params.append("unrepliedOnly", "true");
      if (profileKey) params.append("profileKey", profileKey);

      const response = await fetch(`/api/reviews?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch reviews");
      }

      setReviews(data.reviews || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate AI reply
  const handleGenerateReply = async (review: Review) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: review.id,
          platform: review.platform,
          generateAI: true,
          reviewContent: review.content,
          reviewRating: review.rating,
          authorName: review.authorName,
          brandPersona,
          profileKey,
        }),
      });

      const data = await response.json();

      if (data.generatedReply || data.reply) {
        setReplyText(data.generatedReply || data.reply);
      } else if (!response.ok) {
        throw new Error(data.error || "Failed to generate reply");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate reply");
    } finally {
      setIsGenerating(false);
    }
  };

  // Send reply
  const handleSendReply = async () => {
    if (!selectedReview || !replyText.trim()) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          platform: selectedReview.platform,
          reply: replyText,
          profileKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reply");
      }

      // Update local state
      setReviews((prev) =>
        prev.map((r) =>
          r.id === selectedReview.id
            ? { ...r, replied: true, replyContent: replyText, replyTimestamp: new Date().toISOString() }
            : r
        )
      );

      setSuccess("Reply posted successfully!");
      setSelectedReview(null);
      setReplyText("");

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformFilter, ratingFilter, showUnrepliedOnly, profileKey]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-start justify-between">
        <div>
          <Text size="5" weight="bold" className="flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Reviews Management
          </Text>
          <Text size="2" color="gray" className="mt-1">
            Monitor and respond to customer reviews across platforms
          </Text>
        </div>
        <Button variant="soft" onClick={fetchReviews} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <Text size="1" color="gray" className="block mb-1">
              Total Reviews
            </Text>
            <Text size="6" weight="bold">
              {stats.total}
            </Text>
          </Card>
          <Card className="p-4">
            <Text size="1" color="gray" className="block mb-1">
              Average Rating
            </Text>
            <div className="flex items-center gap-2">
              <Text size="6" weight="bold">
                {stats.averageRating}
              </Text>
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            </div>
          </Card>
          <Card className="p-4">
            <Text size="1" color="gray" className="block mb-1">
              Needs Reply
            </Text>
            <Text size="6" weight="bold" color={stats.unreplied > 0 ? "orange" : undefined}>
              {stats.unreplied}
            </Text>
          </Card>
          <Card className="p-4">
            <Text size="1" color="gray" className="block mb-1">
              Response Rate
            </Text>
            <Text size="6" weight="bold" color="green">
              {stats.total > 0
                ? Math.round(((stats.total - stats.unreplied) / stats.total) * 100)
                : 100}
              %
            </Text>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Text size="2" weight="medium">
              Filters:
            </Text>
          </div>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
          >
            <option value="all">All Platforms</option>
            <option value="google">Google</option>
            <option value="facebook">Facebook</option>
            <option value="yelp">Yelp</option>
          </select>

          {/* Rating Filter */}
          <div className="flex gap-1">
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => setRatingFilter(ratingFilter === rating ? null : rating)}
                className={`px-2 py-1 text-sm rounded flex items-center gap-1 transition-colors ${
                  ratingFilter === rating
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {rating}
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              </button>
            ))}
          </div>

          {/* Unreplied Toggle */}
          <button
            onClick={() => setShowUnrepliedOnly(!showUnrepliedOnly)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              showUnrepliedOnly
                ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            Needs Reply Only
          </button>
        </div>
      </Card>

      {/* Status Messages */}
      {error && (
        <Card>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <Text color="red">{error}</Text>
            </div>
          </div>
        </Card>
      )}

      {success && (
        <Card>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <Text color="green">{success}</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Reviews List */}
      {isLoading && reviews.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <Text size="2" color="gray" className="mt-2">
              Loading reviews...
            </Text>
          </div>
        </Card>
      ) : reviews.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <Star className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <Text size="3" weight="medium" className="block mb-2">
                No Reviews Found
              </Text>
              <Text size="2" color="gray">
                {showUnrepliedOnly
                  ? "All reviews have been replied to!"
                  : "Connect your business profiles to start managing reviews"}
              </Text>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      size="2"
                      fallback={review.authorName.charAt(0).toUpperCase()}
                    />
                    <div>
                      <Text size="2" weight="medium">
                        {review.authorName}
                      </Text>
                      <div className="flex items-center gap-2 mt-0.5">
                        {renderStars(review.rating)}
                        <Badge
                          variant="soft"
                          color={PLATFORM_COLORS[review.platform] as any || "gray"}
                          size="1"
                        >
                          {review.platform}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.replied ? (
                      <Badge color="green" variant="soft" size="1">
                        <Check className="w-3 h-3 mr-1" />
                        Replied
                      </Badge>
                    ) : (
                      <Badge color="orange" variant="soft" size="1">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    <Text size="1" color="gray">
                      {formatDate(review.timestamp)}
                    </Text>
                  </div>
                </div>

                {/* Review Content */}
                <Text size="2" className="block">
                  {review.content}
                </Text>

                {/* Existing Reply */}
                {review.replied && review.replyContent && (
                  <div className="ml-6 p-3 bg-muted rounded-lg border-l-2 border-lime-500">
                    <Text size="1" color="gray" className="block mb-1">
                      Your Reply ({review.replyTimestamp && formatDate(review.replyTimestamp)})
                    </Text>
                    <Text size="2">{review.replyContent}</Text>
                  </div>
                )}

                {/* Reply Actions */}
                {!review.replied && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="1"
                      variant="soft"
                      onClick={() => {
                        setSelectedReview(review);
                        setReplyText("");
                      }}
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Reply
                    </Button>
                    <Button
                      size="1"
                      variant="soft"
                      color="purple"
                      onClick={() => {
                        setSelectedReview(review);
                        handleGenerateReply(review);
                      }}
                      disabled={isGenerating}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {isGenerating ? "Generating..." : "AI Reply"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Text size="3" weight="bold">
                  Reply to Review
                </Text>
                <button
                  onClick={() => {
                    setSelectedReview(null);
                    setReplyText("");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Original Review */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Text size="2" weight="medium">
                    {selectedReview.authorName}
                  </Text>
                  {renderStars(selectedReview.rating)}
                </div>
                <Text size="2" color="gray">
                  {selectedReview.content}
                </Text>
              </div>

              {/* Reply Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Text size="2" weight="medium">
                    Your Reply
                  </Text>
                  <Button
                    size="1"
                    variant="ghost"
                    color="purple"
                    onClick={() => handleGenerateReply(selectedReview)}
                    disabled={isGenerating}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {isGenerating ? "Generating..." : "Generate AI Reply"}
                  </Button>
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="soft"
                  onClick={() => {
                    setSelectedReview(null);
                    setReplyText("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || isSending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSending ? "Sending..." : "Post Reply"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

