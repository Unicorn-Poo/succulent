import { Card } from "@radix-ui/themes";
import { FlowerIcon as Butterfly, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { memo, useMemo } from "react";
import type { BaseComponentProps } from "@/types";

interface PostViewCardProps extends BaseComponentProps {
  title?: string;
  bodyText?: string;
  imageUrl?: string;
}

const PLATFORM_ICONS = [
  { Icon: Butterfly, key: 'butterfly' },
  { Icon: Youtube, key: 'youtube' },
  { Icon: Instagram, key: 'instagram' },
  { Icon: Linkedin, key: 'linkedin' },
  { Icon: Twitter, key: 'twitter' },
] as const;

export const PostViewCard = memo(function PostViewCard({
  title = "Title",
  bodyText = "Body copy text Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna",
  imageUrl,
  className,
}: PostViewCardProps) {
  
  const platformIcons = useMemo(() => 
    PLATFORM_ICONS.map(({ Icon, key }) => (
      <Icon key={key} className="w-5 h-5 text-gray-700" />
    )),
    []
  );

  const imageComponent = useMemo(() => {
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt="Post image"
          className="w-32 h-32 rounded-2xl object-cover"
          loading="lazy"
        />
      );
    }
    
    return (
      <div className="w-32 h-32 bg-pink-300 rounded-2xl flex items-center justify-center">
        <span className="text-black font-medium text-sm">IMAGE</span>
      </div>
    );
  }, [imageUrl]);

  return (
    <Card className={`w-full max-w-2xl bg-gray-200 border-0 rounded-3xl ${className || ''}`}>
      <div className="p-6">
        <div className="flex gap-6 items-start">
          {/* Image placeholder */}
          <div className="flex-shrink-0">
            {imageComponent}
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {/* Social media icons */}
            <div className="flex justify-end gap-3 mb-4">
              {platformIcons}
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-black mb-3">{title}</h2>

            {/* Body text */}
            <p className="text-black text-sm leading-relaxed">{bodyText}</p>
          </div>
        </div>
      </div>
    </Card>
  );
});

export default PostViewCard;
