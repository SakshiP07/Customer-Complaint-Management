# Email Integration Setup

This document explains how to configure real email integration for complaint ingestion. This is a **FREE** feature that uses IMAP to fetch emails from your inbox and convert them into complaints.

## How It Works

1. The system polls your email inbox every 5 minutes (configurable)
2. New emails are automatically converted to complaints
3. Customer profiles are created automatically if they don't exist
4. Complaints are assigned to default region and category

## Setup Instructions

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Google Account
2. **Generate App-Specific Password**:
   - Go to Google Account settings → Security
   - Enable 2-Step Verification
   - Go to App passwords
   - Generate a new app password for "Mail"
   - Copy this password (you won't see it again)

3. **Configure Environment Variables** in your `.env` file:
   ```bash
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-specific-password
   EMAIL_IMAP_HOST=imap.gmail.com
   EMAIL_IMAP_PORT=993
   EMAIL_TLS=true
   ```

### Other Email Providers

**Outlook/Hotmail:**
```bash
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
EMAIL_IMAP_HOST=outlook.office365.com
EMAIL_IMAP_PORT=993
EMAIL_TLS=true
```

**Custom IMAP Server:**
```bash
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-password
EMAIL_IMAP_HOST=imap.your-domain.com
EMAIL_IMAP_PORT=993
EMAIL_TLS=true
```

## Configuration Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| EMAIL_USER | Email address for IMAP login | - | Yes |
| EMAIL_PASSWORD | Password or app-specific password | - | Yes |
| EMAIL_IMAP_HOST | IMAP server hostname | imap.gmail.com | No |
| EMAIL_IMAP_PORT | IMAP server port | 993 | No |
| EMAIL_TLS | Use TLS/SSL connection | true | No |

## How Complaints Are Created

When an email is received:

1. **Sender Information**: Extracted from email (name and email address)
2. **Subject**: Used as complaint subject
3. **Body**: Email text content becomes complaint description
4. **Customer Profile**: Created automatically if doesn't exist
5. **Region**: Default active region is assigned
6. **Category**: Default active category is assigned
7. **Channel**: Marked as "EMAIL" channel
8. **Priority**: Set to "MEDIUM" by default

## Testing the Integration

1. Start the backend server:
   ```bash
   npm run dev:backend
   ```

2. Check logs for email polling status:
   ```
   Starting email polling every 5 minutes
   Checking for new emails...
   ```

3. Send a test email to the configured address

4. The email will appear as a new complaint in the system

## Troubleshooting

**"Email integration not configured"**
- Ensure EMAIL_USER and EMAIL_PASSWORD are set in .env
- Restart the backend server

**"Email connection test failed"**
- Verify IMAP credentials are correct
- Check if 2FA is enabled (use app-specific password for Gmail)
- Verify IMAP host and port are correct

**No emails being processed**
- Check that emails are marked as "UNSEEN" in inbox
- Verify the polling interval (default 5 minutes)
- Check backend logs for errors

**Complaints created with wrong region/category**
- Ensure at least one active region exists in database
- Ensure at least one active category exists in database
- The system uses the first active region/category as default

## Security Notes

- **Never commit .env file** with actual passwords
- Use app-specific passwords for Gmail (not your main password)
- Consider using a dedicated email address for complaints
- Enable TLS for secure connections (default)
- The system only reads emails, never sends or deletes

## Customization

### Change Polling Interval

Edit `backend/src/server.ts`:
```typescript
emailPollingService.startPolling(10); // Poll every 10 minutes
```

### Filter Emails by Subject

Modify `backend/src/integrations/channels/email.service.ts` to add filtering logic in the `checkEmails()` method.

### Custom Email Parsing

The `EmailChannelAdapter` in `backend/src/integrations/channels/adapters.ts` can be customized to parse specific email formats or extract additional metadata.

## Next Steps

After setting up email integration:

1. Test with a few sample emails
2. Verify complaints appear correctly in dashboard
3. Adjust default region/category as needed
4. Consider setting up email forwarding from multiple addresses
