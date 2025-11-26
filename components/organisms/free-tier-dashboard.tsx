"use client";

import { useState, useEffect } from "react";
import { Card, Text, Button, Badge, Progress } from "@radix-ui/themes";
import { 
  Zap, 
  TrendingUp, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  Target,
  BarChart3,
  ExternalLink,
  Clock,
  Lightbulb
} from "lucide-react";
import { useFreeTier } from "@/hooks/use-free-tier";

interface FreeTierDashboardProps {
  onUpgradeClick?: () => void;
  showDetailedView?: boolean;
}

export default function FreeTierDashboard({ 
  onUpgradeClick, 
  showDetailedView = true 
}: FreeTierDashboardProps) {
  const { usage, getStrategy, tips } = useFreeTier();
  const strategy = getStrategy();
  
  const [showTips, setShowTips] = useState(false);

  // Calculate usage percentage
  const usagePercentage = (usage.postsThisMonth / 20) * 100;
  
  // Get status color based on usage
  const getStatusColor = () => {
    if (usagePercentage >= 85) return "red";
    if (usagePercentage >= 70) return "orange";
    if (usagePercentage >= 50) return "yellow";
    return "green";
  };

  // Get urgency level
  const getUrgencyLevel = () => {
    if (usage.postsRemaining <= 3) return "critical";
    if (usage.postsRemaining <= 7) return "warning";
    if (usage.postsRemaining <= 12) return "caution";
    return "good";
  };

  const urgencyLevel = getUrgencyLevel();
  const statusColor = getStatusColor();

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-${statusColor}-100 rounded-lg`}>
              <Zap className={`w-5 h-5 text-${statusColor}-500`} />
            </div>
            <div>
              <Text size="4" weight="bold" className="block">Ayrshare Free Tier</Text>
              <Text size="2" color="gray">20 posts per month limit</Text>
            </div>
          </div>
          
          {urgencyLevel === 'critical' && (
            <Badge color="red" size="2">
              <AlertCircle className="w-3 h-3 mr-1" />
              Critical
            </Badge>
          )}
          {urgencyLevel === 'warning' && (
            <Badge color="orange" size="2">
              <AlertCircle className="w-3 h-3 mr-1" />
              Low Quota
            </Badge>
          )}
          {urgencyLevel === 'caution' && (
            <Badge color="yellow" size="2">
              <Clock className="w-3 h-3 mr-1" />
              Moderate Use
            </Badge>
          )}
          {urgencyLevel === 'good' && (
            <Badge color="green" size="2">
              <CheckCircle className="w-3 h-3 mr-1" />
              Good
            </Badge>
          )}
        </div>

        {/* Usage Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <Text size="2" weight="medium">Posts Used This Month</Text>
            <Text size="2" color="gray">
              {usage.postsThisMonth} / 20
            </Text>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          <div className="flex justify-between mt-1">
            <Text size="1" color="gray">
              {usage.postsRemaining} remaining
            </Text>
            <Text size="1" color="gray">
              Resets {new Date(usage.resetDate).toLocaleDateString()}
            </Text>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Text size="3" weight="bold" className="block text-lime-600 dark:text-lime-400">
              {strategy.dailyBudget}
            </Text>
            <Text size="1" color="gray">Daily Budget</Text>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Text size="3" weight="bold" className="block text-green-600 dark:text-green-400">
              {strategy.weeklyBudget}
            </Text>
            <Text size="1" color="gray">Weekly Budget</Text>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Text size="3" weight="bold" className="block text-purple-600 dark:text-purple-400">
              {Math.ceil((new Date(usage.resetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
            </Text>
            <Text size="1" color="gray">Days Left</Text>
          </div>
        </div>
      </Card>

      {/* Strategy Recommendations */}
      {showDetailedView && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-lime-500" />
            <Text size="4" weight="bold">Smart Strategy</Text>
          </div>
          
          <div className="space-y-3">
            {strategy.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-lime-50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-lime-500 mt-0.5" />
                <Text size="2">{rec}</Text>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Free Features Available */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <Text size="4" weight="bold">What's Free</Text>
          </div>
          <Button 
            variant="soft" 
            size="2" 
            onClick={() => setShowTips(!showTips)}
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            {showTips ? 'Hide Tips' : 'Show Tips'}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Text size="3" weight="medium" className="block">✅ Available Now:</Text>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <Text size="2">20 posts per month</Text>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <Text size="2">11 social platforms</Text>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <Text size="2">Single image uploads</Text>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <Text size="2">Post history tracking</Text>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <Text size="2">View comments</Text>
              </li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Text size="3" weight="medium" className="block">🚀 Upgrade for:</Text>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                <Text size="2">1,000 posts/month</Text>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                <Text size="2">Analytics & insights</Text>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                <Text size="2">Scheduled posting</Text>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                <Text size="2">Multiple images/videos</Text>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                <Text size="2">RSS auto-posting</Text>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Optimization Tips */}
      {showTips && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <Text size="4" weight="bold">Optimization Tips</Text>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
                <Text size="2">{tip}</Text>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Upgrade CTA */}
      <Card className="p-6 bg-gradient-to-r from-lime-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <Text size="4" weight="bold" className="mb-2 block">Ready to Scale?</Text>
            <Text size="2" color="gray" className="mb-4 block">
              Upgrade to Premium for 1,000 posts/month, analytics, scheduling, and more.
            </Text>
            <div className="flex items-center gap-4">
              <Button onClick={onUpgradeClick} size="2" className="bg-purple-600 hover:bg-purple-700 text-white">
                Upgrade to Premium
              </Button>
              <Button 
                variant="soft" 
                size="2"
                onClick={() => window.open('https://www.ayrshare.com/pricing', '_blank')}
                className="bg-lime-600 hover:bg-lime-700 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Pricing
              </Button>
            </div>
          </div>
          <div className="hidden md:block">
            <BarChart3 className="w-16 h-16 text-lime-200" />
          </div>
        </div>
      </Card>
    </div>
  );
} 