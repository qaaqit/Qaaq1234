# Gmail Setup Troubleshooting for QaaqConnect

## Issue Identified
All SMTP configurations are failing with error: `535-5.7.8 Username and Password not accepted`

This indicates the App Password is either:
1. Incorrectly formatted
2. Not generated properly 
3. The Gmail account doesn't have proper 2FA setup

## Current App Password Tested
- `openirdaexgqcqbk` (no spaces)
- `open irda exgq cqbk` (with spaces)

Both formats failed, indicating the App Password itself needs to be regenerated.

## Step-by-Step Fix

### 1. Verify Gmail Account Setup
1. Log into support@qaaq.app
2. Go to **Google Account Settings** → **Security**
3. Ensure **2-Step Verification** is **ENABLED**

### 2. Generate New App Password
1. In Security settings, find **App passwords** section
2. Click **Generate app password**
3. Select **Mail** as the app
4. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
5. **Important**: Use it WITHOUT spaces for SMTP

### 3. Common Issues to Check
- App Password must be generated AFTER enabling 2FA
- Account must not have "Less secure app access" enabled (this conflicts with App Passwords)
- Make sure you're generating password for "Mail" not "Other"

### 4. Alternative: Test with Different Email Service
If Gmail continues to fail, we can switch to:
- SendGrid (requires API key)
- Mailgun (requires API key)
- Nodemailer with different SMTP provider

## Current Status
- WhatsApp OTP: ✅ Working perfectly
- Email OTP: ❌ Gmail authentication failing
- System: Gracefully handles email failures, signup works with WhatsApp only

## Next Steps
1. Regenerate Gmail App Password following above steps
2. Provide new 16-character App Password
3. Test email functionality
4. If still failing, switch to alternative email service