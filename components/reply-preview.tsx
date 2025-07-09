"use client";

import { useEffect, useState } from "react";
import { Box, Avatar, Text } from "@radix-ui/themes";
import { Heart, MessageCircle, Repeat, BarChart2, Bookmark, Upload, Check } from 'lucide-react';
import parse, { domToReact, HTMLReactParserOptions } from 'html-react-parser';

declare global {
  interface Window {
    twttr?: any;
  }
}

export const ReplyPreview = ({ htmlContent, author, username }: { htmlContent: string | undefined, author: string, username: string }) => {
  if (!htmlContent) return null;

  const [showMore, setShowMore] = useState(false);

  const cleanAndFormatText = (html: string) => {
    const options: HTMLReactParserOptions = {
      replace: (domNode: any) => {
        if (domNode.type === 'tag') {
          if (domNode.name === 'a') {
            const href = domNode.attribs.href;
            const isMention = domNode.attribs.class?.includes('u-url.profile');
            const textContent = domToReact(domNode.children, options);
            if (isMention) {
              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{textContent}</a>;
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{textContent}</a>;
          }
        }
      },
    };

    let content = html;
    const pTagMatch = html.match(/<p lang="en" dir="ltr">(.*?)<\/p>/s);
    if (pTagMatch) {
      content = pTagMatch[1];
    }
    
    // Truncate and add "Show more" if necessary
    const maxLength = 150;
    if (content.length > maxLength && !showMore) {
      content = content.substring(0, maxLength) + '...';
    }

    const parsedContent = parse(content, options);

    return (
      <>
        {parsedContent}
        {content.length > maxLength && (
          <button onClick={() => setShowMore(!showMore)} className="text-blue-500 hover:underline">
            {showMore ? 'Show less' : 'Show more'}
          </button>
        )}
      </>
    );
  };

  return (
    <Box className="mt-4 p-4 border rounded-lg bg-white">
      <div className="flex items-start gap-3">
        <Avatar src={`https://avatar.vercel.sh/${username}`} fallback={author[0]} size="3" radius="full" />
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <Text weight="bold">{author}</Text>
            <Check className="w-4 h-4 text-blue-500" />
            <Text color="gray">@{username}</Text>
          </div>
          <div className="mt-1 text-gray-800">
            {cleanAndFormatText(htmlContent)}
          </div>
          <div className="mt-3 flex items-center justify-between text-gray-500">
            <button className="flex items-center gap-1 hover:text-blue-500">
              <MessageCircle size={18} />
              <span className="text-xs">1</span>
            </button>
            <button className="flex items-center gap-1 hover:text-green-500">
              <Repeat size={18} />
              <span className="text-xs">7</span>
            </button>
            <button className="flex items-center gap-1 hover:text-red-500">
              <Heart size={18} />
              <span className="text-xs">22</span>
            </button>
            <button className="flex items-center gap-1 hover:text-blue-500">
              <BarChart2 size={18} />
              <span className="text-xs">1.9K</span>
            </button>
            <div className="flex items-center gap-1">
              <button className="hover:text-blue-500"><Bookmark size={18} /></button>
              <button className="hover:text-blue-500"><Upload size={18} /></button>
            </div>
          </div>
        </div>
      </div>
    </Box>
  );
};
