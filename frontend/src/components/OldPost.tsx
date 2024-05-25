import { Post } from '@/sharedDataModel';
import { useState } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { insightsForPost } from '@/lib/postInsights';
import { ProgressiveImg } from 'jazz-react';

export function PostComponent({
  post,
  border = true,
  styling,
}: {
  post: Post;
  border?: boolean;
  styling?: string;
  onDelete?: () => void;
}) {
  const [copiedText, setCopiedText] = useState<string | false>(false);
  const extractHashtags = () => {
    const copyArray = post?.content?.split(' ');
    const hashTags = copyArray?.filter((copy) => copy.charAt(0) === '#');
    return hashTags?.join(', ');
  };

  const copyHashtags = () => {
    const hashTags = extractHashtags();
    hashTags && setCopiedText(hashTags);
    navigator.clipboard.writeText(copiedText as string);
    setTimeout(() => setCopiedText(false), 1000);
  };

  return (
    <div
      className={cn('rounded p-4 flex flex-col gap-4', styling, {
        'border bg-neutral-900': border,
      })}
    >
      <div className="flex gap-2 overflow-x-scroll">
        {post.images?.map((image) => (
          <ProgressiveImg
            key={image?.id}
            image={image?.imageFile}
            maxWidth={512}
          >
            {({ src }) => (
              <img className="w-40 h-40 object-cover shrink-0" src={src} />
            )}
          </ProgressiveImg>
        ))}
      </div>
      <div className="relative">
        <Button
          className={cn('absolute right-0 bg-neutral-500', {
            'bg-green-700 hover:bg-green-500': !!copiedText,
          })}
          onClick={copyHashtags}
        >
          #
        </Button>
        <p className="h-40 overflow-auto p-3 bg-neutral-900 whitespace-pre-line">
          {post?.content}
        </p>
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        {insightsForPost(post)?.map((insight) => (
          <p>
            {insight.title} {insight.data}
          </p>
        ))}
      </div>
      {/* <div className="text-xs">Succulent post id: {post.id}</div> */}
      {/* <div className="text-xs">Instagram post id: {post.instagram.state === "posted" && post.instagram.postId}</div> */}
    </div>
  );
}
