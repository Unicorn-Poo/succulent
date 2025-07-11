"use client";

import { useState } from "react";
import { Button, Badge } from "@radix-ui/themes";
import { ChevronLeft, ChevronRight, Calendar, Clock, Edit3, CheckCircle } from "lucide-react";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  status: 'published' | 'scheduled' | 'draft';
  publishedAt?: string;
  scheduledFor?: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
}

interface CalendarViewProps {
  posts: Post[];
  accountGroupId?: string;
}

export default function CalendarView({ posts, accountGroupId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Get first day of the month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Generate calendar days
  const calendarDays = [];
  
  // Previous month's trailing days
  const prevMonth = new Date(currentYear, currentMonth - 1, 0);
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonth.getDate() - i,
      isCurrentMonth: false,
      date: new Date(currentYear, currentMonth - 1, prevMonth.getDate() - i)
    });
  }
  
  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: new Date(currentYear, currentMonth, day)
    });
  }
  
  // Next month's leading days to fill the grid
  const remainingDays = 42 - calendarDays.length; // 6 rows × 7 days
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(currentYear, currentMonth + 1, day)
    });
  }
  
  // Get posts for a specific date
  const getPostsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return posts.filter(post => {
      const postDate = post.status === 'scheduled' 
        ? new Date(post.scheduledFor!) 
        : new Date(post.publishedAt!);
      return postDate.toDateString() === dateStr;
    });
  };
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500 border-green-600';
      case 'scheduled': return 'bg-blue-500 border-blue-600';
      case 'draft': return 'bg-gray-500 border-gray-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };
  
  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-100';
      case 'scheduled': return 'text-blue-100';
      case 'draft': return 'text-gray-100';
      default: return 'text-gray-100';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="w-3 h-3" />;
      case 'scheduled': return <Clock className="w-3 h-3" />;
      case 'draft': return <Edit3 className="w-3 h-3" />;
      default: return <Edit3 className="w-3 h-3" />;
    }
  };

  const getPlatformEmoji = (platform: string) => {
    switch (platform) {
      case 'instagram': return '📷';
      case 'x': return '🐦';
      case 'youtube': return '📹';
      default: return '📱';
    }
  };

  const truncateContent = (content: string, maxLength: number = 40) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Content Calendar</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Published</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Scheduled</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Draft</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="1" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-medium min-w-[140px] text-center">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <Button variant="outline" size="1" onClick={() => navigateMonth('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        {daysOfWeek.map(day => (
          <div key={day} className="bg-gray-50 p-3 text-center">
            <span className="text-sm font-medium text-gray-600">{day}</span>
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((calendarDay, index) => {
          const dayPosts = getPostsForDate(calendarDay.date);
          const isToday = calendarDay.date.toDateString() === new Date().toDateString();
          
          return (
            <div
              key={index}
              className={`bg-white p-2 min-h-[120px] ${
                !calendarDay.isCurrentMonth ? 'opacity-30' : ''
              } ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm ${
                  calendarDay.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {calendarDay.day}
                </span>
                {isToday && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
              
              {/* Posts for this day */}
              <div className="space-y-1">
                {dayPosts.slice(0, 2).map(post => (
                  <Link
                    key={post.id}
                    href={accountGroupId ? `/account-group/${accountGroupId}/post/${post.id}` : `/account-group/demo/post/${post.id}`}
                    className="block"
                  >
                    <div className={`border rounded-md p-2 cursor-pointer hover:shadow-sm transition-all ${getStatusColor(post.status)}`}>
                      {/* Platform badges and status */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          {post.platforms.slice(0, 2).map((platform, platformIndex) => (
                            <span key={platformIndex} className="text-xs">
                              {getPlatformEmoji(platform)}
                            </span>
                          ))}
                          {post.platforms.length > 2 && (
                            <span className="text-xs text-white">+{post.platforms.length - 2}</span>
                          )}
                        </div>
                        <div className={`${getStatusTextColor(post.status)}`}>
                          {getStatusIcon(post.status)}
                        </div>
                      </div>
                      
                      {/* Post title */}
                      <div className="text-xs font-medium text-white mb-1 leading-tight">
                        {truncateContent(post.title, 30)}
                      </div>
                      
                      {/* Post content preview */}
                      <div className={`text-xs ${getStatusTextColor(post.status)} leading-tight opacity-90`}>
                        {truncateContent(post.content, 35)}
                      </div>
                      
                      {/* Time indicator */}
                      <div className={`text-xs ${getStatusTextColor(post.status)} mt-1 opacity-75`}>
                        {post.status === 'scheduled' ? (
                          new Date(post.scheduledFor!).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })
                        ) : post.status === 'published' ? (
                          new Date(post.publishedAt!).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })
                        ) : (
                          'Draft'
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                {dayPosts.length > 2 && (
                  <div className="text-xs text-gray-500 text-center bg-gray-50 rounded px-2 py-1">
                    +{dayPosts.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 text-xs text-gray-500">
        Click on any post to view or edit it. Today is highlighted with a blue border. 
        Platform emojis: 📷 Instagram, 🐦 X/Twitter, 📹 YouTube
      </div>
    </div>
  );
} 