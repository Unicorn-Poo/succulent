import { Card } from "@radix-ui/themes"
import { FlowerIcon as Butterfly, Instagram, Linkedin, Twitter, Youtube } from "lucide-react"

interface PostViewCardProps {
  title?: string
  bodyText?: string
  imageUrl?: string
}

export default function PostViewCard({
  title = "Title",
  bodyText = "Body copy text Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna",
  imageUrl,
}: PostViewCardProps = {}) {
  return (
    <Card className="w-full max-w-2xl bg-gray-200 border-0 rounded-3xl">
      <div className="p-6">
        <div className="flex gap-6 items-start">
          {/* Image placeholder */}
          <div className="flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl || "/placeholder.svg"}
                alt="Post image"
                className="w-32 h-32 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-32 h-32 bg-pink-300 rounded-2xl flex items-center justify-center">
                <span className="text-black font-medium text-sm">IMAGE</span>
              </div>
            )}
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {/* Social media icons */}
            <div className="flex justify-end gap-3 mb-4">
              <Butterfly className="w-5 h-5 text-gray-700" />
              <Youtube className="w-5 h-5 text-gray-700" />
              <Instagram className="w-5 h-5 text-gray-700" />
              <Linkedin className="w-5 h-5 text-gray-700" />
              <Twitter className="w-5 h-5 text-gray-700" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-black mb-3">{title}</h2>

            {/* Body text */}
            <p className="text-black text-sm leading-relaxed">{bodyText}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
