import { Post } from '@/sharedDataModel';
import {
  EyeIcon,
  Heart,
  HeartHandshake,
  MessageCircle,
  MessageCircleReply,
  PointerIcon,
  Save,
  Smile,
  UserRoundPlus,
  View,
} from 'lucide-react';

export const insightMeta = {
  likes: {
    title: 'likes',
    icon: Heart,
  },
  reach: {
    title: 'reach',
    icon: Smile,
  },
  totalInteractions: {
    title: 'interactionPc',
    icon: HeartHandshake,
  },
  comments: {
    title: 'comments',
    icon: MessageCircle,
  },
  saved: {
    title: 'saves',
    icon: Save,
  },
  shares: {
    title: 'shares',
    icon: MessageCircleReply,
  },
  profileVisits: {
    title: 'profileVisits',
    icon: View,
  },
  profileActivity: {
    title: 'profileActivity',
    icon: PointerIcon,
  },
  follows: {
    title: 'follows',
    icon: UserRoundPlus,
  },
  impressions: {
    title: 'impressions',
    icon: EyeIcon,
  },
};

export function insightsForPost(post: Post) {
  const insights = post.insights?.instagram;
  if (!insights) return;

  type Insights = keyof typeof insights;

  const getInteractionPc = () => {
    let interactionPc;
    if (!insights.totalInteractions || !insights.reach) {
      return (interactionPc = '0%');
    }
    interactionPc = (100 * insights?.totalInteractions) / insights.reach;
    return interactionPc.toPrecision(2) + '%';
  };

  const getInsights = (insight: Insights) => {
    const insightData:
      | number
      | { [breakdown: string]: number | undefined }
      | undefined = insights[insight];
    if (!insightData) return '0';
    return insightData.toString();
  };

  return {
    likes: getInsights('likes'),
    reach: getInsights('reach'),
    impressions: getInsights('impressions'),
    interactionPc: getInteractionPc(),
    totalInteractions: getInsights('totalInteractions'),
    comments: getInsights('comments'),
    saved: getInsights('saved'),
    shares: getInsights('shares'),
    profileVisits: getInsights('profileVisits'),
    profileActivity: JSON.stringify(insights.profileActivity),
    follows: getInsights('follows'),
  };
}
