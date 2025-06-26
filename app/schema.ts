// schema.ts
import { co, z } from "jazz-tools";

export const PlatformNames = [
	"x",
	"instagram",
	"youtube",
	"facebook",
	"linkedin",
] as const; // 'tiktok', 'threads', 'pinterest', 'reddit', 'snapchat', 'twitch', 'website', 'other']

export const ThreadItem = co.map({
	text: co.plainText(),
	postDate: z.date(),
});

export const ImageItem = co.map({
	type: z.literal("image"),
	image: co.image(),
	alt: z.optional(co.plainText()),
});

export const VideoItem = co.map({
	type: z.literal("video"),
	video: co.fileStream(),
});

export const MediaItem = z.discriminatedUnion("type", [ImageItem, VideoItem]);
export type MediaItem = co.loaded<typeof MediaItem>;

export const Content = co.map({
	text: co.plainText(),
	postDate: z.date(),
	media: z.optional(co.list(MediaItem)),
	replyTo: z.optional(z.string()),
	thread: z.optional(co.list(ThreadItem)),
  edited: z.optional(z.boolean()),
});

export const Post = co.map({
  title: z.string(),
  variants: co.record(z.string(), Content),
});
export type Post = co.loaded<typeof Post>;
export type PostFullyLoaded = co.loaded<typeof Post, {
  variants: { $each: true }
}>;

export const PlatformAccount = co.map({
	type: z.enum(PlatformNames),
	id: z.string(),
	name: z.string(),
	apiUrl: z.string(),
  platform: z.enum(PlatformNames),
});

export const PlatformGroup = co.map({
	id: z.string(),
	name: z.string(),
	accounts: co.list(PlatformAccount),
	posts: co.list(Post),
});

export const AccountRoot = co.map({
	platformGroups: co.list(PlatformGroup),
});

export const MyAppAccount = co.account({
	root: AccountRoot,
	profile: co.map({ name: z.string() }),
});
