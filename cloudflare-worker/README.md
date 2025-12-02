# Succulent Autopilot Cron Worker

A Cloudflare Worker that triggers the autopilot every hour to generate and schedule content.

## Setup

1. **Install Wrangler** (Cloudflare's CLI):
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Deploy the Worker**:
   ```bash
   cd cloudflare-worker
   wrangler deploy
   ```

3. **Configure Environment Variables** in Cloudflare Dashboard:
   - Go to Workers & Pages > succulent-autopilot-cron > Settings > Variables
   - Add these secrets:
     - `CRON_SECRET`: A secure random string (also add to your app's `.env`)
     - `APP_URL`: Your app URL (e.g., `https://succulent.vercel.app`)
     - `AUTOPILOT_TASKS`: JSON array of tasks (see format below)

## Task Format

Set `AUTOPILOT_TASKS` to a JSON array like this:

```json
[
  {
    "accountGroupId": "co_xxxxx",
    "platform": "instagram",
    "profileKey": "your-ayrshare-profile-key",
    "settings": {
      "postsPerWeek": 7,
      "postsPerDayPerPlatform": 2,
      "autoExecuteThreshold": 85,
      "autoHashtags": true
    },
    "brandPersona": {
      "name": "Brand Name",
      "tone": "friendly",
      "contentPillars": ["topic1", "topic2"]
    },
    "postsThisWeek": 0,
    "postsToday": 0
  }
]
```

## Testing

Manually trigger the worker:

```bash
curl -X POST https://succulent-autopilot-cron.your-subdomain.workers.dev/trigger \
  -H "x-cron-secret: your-cron-secret"
```

## Cron Schedule

The worker runs every hour (`0 * * * *`). You can modify this in `wrangler.toml`.

## Monitoring

View logs in Cloudflare Dashboard:
- Workers & Pages > succulent-autopilot-cron > Logs

