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

export const ReplyPreview = ({ htmlContent, author, username, platform }: { htmlContent: string | undefined, author: string, username: string, platform: string | null }) => {
  useEffect(() => {
    if (htmlContent && platform === 'x' && window.twttr?.widgets?.load) {
      window.twttr.widgets.load();
    }
  }, [htmlContent, platform]);

  if (!htmlContent) return null;

  if (platform === 'instagram') {
    return <InstagramPreview author={author} content={htmlContent} />;
  }

  // Default to Twitter oEmbed for 'x' or any other case
  return (
    <div
      className="mt-4 [&>blockquote]:!m-0"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

const InstagramPreview = ({ author, content }: { author: string, content: string }) => {
  // FROM META DESCRIPTION (content prop): "44 likes, 1 comments - scapesquared on January 1, 2025: ..."
  const handleMatch = content.match(/-\s*(\w+)\s+on/);
  const handle = handleMatch ? handleMatch[1] : 'unknown';
  
  const statsMatch = content.match(/(\d+)\s+likes,\s*(\d+)\s+comments\s+-\s+.*?on\s+(.*?):/);
  const likes = statsMatch ? statsMatch[1] : '0';
  const comments = statsMatch ? statsMatch[2] : '0';
  const date = statsMatch ? statsMatch[3] : '';
  
  // FROM PAGE TITLE (author prop): "scape² | Flowerscape No.64... | Instagram"
  const authorParts = author.split('|');
  const postContent = authorParts.length > 1 ? authorParts[1].trim() : 'Could not extract content.';

  return (
    <Box className="mt-4 p-4 border rounded-lg bg-card text-sm">
      <Text weight="bold">{handle}</Text>
      <Text as="p" className="mt-2 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
        {postContent}
      </Text>
      <div className="mt-3 text-xs text-muted-foreground">
        <span>{likes} likes</span> &middot; <span>{comments} comments</span> &middot; <span>{date}</span>
      </div>
    </Box>
  );
};
