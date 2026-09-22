# YouTube Integration Setup

This document explains how to configure real YouTube integration for complaint ingestion. This is a **FREE** feature that uses the YouTube Data API v3 to fetch comments from your videos and convert them into complaints.

## How It Works

1. The system polls your YouTube channels every 10 minutes (configurable)
2. New comments from your videos are automatically converted to complaints
3. Customer profiles are created automatically if they don't exist
4. Complaints are assigned to default region and category
5. Each comment is tracked by its unique ID to prevent duplicates

## Setup Instructions

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3:
   - Navigate to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

### Step 2: Create API Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key (you won't see it again)
4. **Important**: Restrict the API key:
   - Click on the API key you just created
   - Under "Application restrictions", select "IP addresses" or "None" (for development)
   - Under "API restrictions", select only "YouTube Data API v3"

### Step 3: Get YouTube Channel IDs

1. Go to your YouTube channel
2. The channel ID is in the URL: `https://www.youtube.com/channel/CHANNEL_ID`
3. Alternatively, use a tool like [Comment Picker](https://commentpicker.com/youtube-channel-id/) to find your channel ID
4. For multiple channels, separate IDs with commas

### Step 4: Configure Environment Variables

Add to your `.env` file:

```bash
YOUTUBE_API_KEY=your_youtube_api_key_here
YOUTUBE_CHANNEL_IDS=UC_xxxxxxxxxxxxxxxxxxxxxxx,UC_yyyyyyyyyyyyyyyyyyyyyyy
YOUTUBE_POLLING_INTERVAL_MINUTES=10
```

## Configuration Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| YOUTUBE_API_KEY | YouTube Data API v3 key | - | Yes |
| YOUTUBE_CHANNEL_IDS | Comma-separated list of channel IDs to monitor | - | Yes |
| YOUTUBE_POLLING_INTERVAL_MINUTES | How often to check for new comments | 10 | No |

## How Complaints Are Created

When a YouTube comment is detected:

1. **Comment Information**: Extracted from YouTube API (author, text, video title)
2. **Subject**: Formatted as "Comment on video: [Video Title] [Comment ID]"
3. **Body**: Comment text content
4. **Customer Profile**: Created automatically using YouTube channel ID as email
5. **Region**: Default active region is assigned
6. **Category**: Default active category is assigned
7. **Channel**: Marked as "YOUTUBE" channel
8. **Priority**: Set to "MEDIUM" by default
9. **Deduplication**: Comment ID is stored in subject to prevent duplicates

## Testing the Integration

1. Start the backend server:
   ```bash
   npm run dev:backend
   ```

2. Check logs for YouTube polling status:
   ```
   Starting YouTube polling every 10 minutes
   Checking YouTube for new comments...
   ```

3. Add a new comment to one of your monitored videos

4. The comment will appear as a new complaint in the system

## Troubleshooting

**"YouTube integration not configured"**
- Ensure YOUTUBE_API_KEY and YOUTUBE_CHANNEL_IDS are set in .env
- Restart the backend server

**"YouTube connection test failed"**
- Verify API key is correct and has YouTube Data API v3 enabled
- Check if API key has proper restrictions
- Verify channel IDs are correct

**No comments being processed**
- Check that comments are new (published after last check)
- Verify the polling interval (default 10 minutes)
- Check backend logs for API errors
- Ensure videos have comments enabled

**API quota exceeded**
- YouTube API has daily limits (10,000 units/day for free tier)
- Each comment thread fetch uses ~1 unit
- Adjust polling interval to reduce API calls
- Consider upgrading to paid tier for higher quotas

## Security Notes

- **Never commit .env file** with actual API keys
- Restrict API key to only YouTube Data API v3
- Consider using IP restrictions for production environments
- The system only reads comments, never posts or modifies
- Monitor API usage in Google Cloud Console

## Customization

### Change Polling Interval

Edit `backend/src/server.ts`:
```typescript
youtubePollingService.startPolling(20); // Poll every 20 minutes
```

Or set in `.env`:
```bash
YOUTUBE_POLLING_INTERVAL_MINUTES=20
```

### Filter Comments by Keywords

Modify `backend/src/integrations/channels/youtube.service.ts` in the `checkYouTubeComments()` method to add filtering logic.

### Custom Comment Parsing

The `YouTubeChannelAdapter` in `backend/src/integrations/channels/adapters.ts` can be customized to parse specific comment formats or extract additional metadata.

## API Usage and Costs

- **Free Tier**: 10,000 units/day
- **Cost per comment thread**: ~1 unit
- **Estimated daily cost**: 0 (within free tier for moderate usage)
- **Paid tier**: Available for higher quotas

## Next Steps

After setting up YouTube integration:

1. Test with a few sample comments
2. Verify complaints appear correctly in dashboard
3. Adjust default region/category as needed
4. Monitor API usage in Google Cloud Console
5. Set up alerts for quota limits if needed

## Additional Resources

- [YouTube Data API v3 Documentation](https://developers.google.com/youtube/v3)
- [Google Cloud Console](https://console.cloud.google.com/)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
