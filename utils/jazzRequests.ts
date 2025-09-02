import { experimental_defineRequest, z } from "jazz-tools";
import { Post, AccountGroup } from "@/app/schema";

// Worker ID from environment
const workerId = process.env.NEXT_PUBLIC_JAZZ_WORKER_ACCOUNT || 'worker_account_id';

/**
 * Jazz request schema for creating posts via API
 * This allows server-side creation of real Jazz Post objects
 */
export const createApiPost = experimental_defineRequest({
  url: "/api/posts/jazz",
  workerId,
  // Data sent from client/API to server
  request: {
    schema: {
      accountGroup: AccountGroup,
      postData: z.object({
        content: z.string(),
        title: z.string().optional(),
        platforms: z.array(z.string()),
        scheduledDate: z.string().datetime().optional(),
        publishImmediately: z.boolean().optional(),
        media: z.array(z.object({
          type: z.enum(['image', 'video']),
          url: z.string(),
          alt: z.string().optional(),
          filename: z.string().optional()
        })).optional(),
        replyTo: z.object({
          url: z.string(),
          platform: z.string()
        }).optional()
      })
    },
    resolve: {
      // Ensure account group posts are loaded
      accountGroup: { 
        posts: { $each: true },
        accounts: { $each: true }
      }
    }
  },
  // Data returned from server to client
  response: {
    schema: { 
      post: Post,
      success: z.boolean(),
      message: z.string()
    },
    resolve: { 
      post: {
        title: true,
        variants: { $each: true }
      }
    }
  }
}); 