/**
 * Email Service for OTP and notifications
 * Uses Gmail SMTP for reliable email delivery
 */

import nodemailer from 'nodemailer';

interface EmailOTPData {
  email: string;
  otpCode: string;
  expiryTime: Date;
  createdAt: Date;
}

class EmailService {
  private transporter: any;
  private emailOTPs = new Map<string, EmailOTPData>();

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Use Gmail SMTP configuration
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'noreply.qaaq@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'your-app-password'
      }
    });
  }

  /**
   * Generate and send email OTP
   */
  async sendEmailOTP(email: string): Promise<{ success: boolean; message: string; otpCode?: string }> {
    try {
      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP temporarily (expires in 10 minutes)
      const otpData: EmailOTPData = {
        email,
        otpCode,
        expiryTime: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date()
      };

      this.emailOTPs.set(email, otpData);

      // Send email with OTP
      const mailOptions = {
        from: 'QaaqConnect <noreply.qaaq@gmail.com>',
        to: email,
        subject: '🚢 QaaqConnect - Your Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background: linear-gradient(135deg, #ea580c, #dc2626); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🚢 QaaqConnect</h1>
              <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">Maritime Community Platform</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #374151; margin: 0 0 20px 0;">Welcome to QaaqConnect!</h2>
              
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Thank you for joining our maritime community. To complete your account verification, please use the code below:
              </p>
              
              <div style="background: #f3f4f6; border: 2px dashed #ea580c; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code:</p>
                <p style="font-size: 32px; font-weight: bold; color: #ea580c; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otpCode}
                </p>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  ⏰ <strong>Important:</strong> This code expires in 10 minutes for security purposes.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0;">
                If you didn't request this verification code, please ignore this email. Someone may have entered your email address by mistake.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <div style="text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  QaaqConnect - Connecting Maritime Professionals Worldwide<br>
                  This is an automated email. Please do not reply to this message.
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
QaaqConnect - Email Verification

Thank you for joining our maritime community platform!

Your verification code is: ${otpCode}

This code expires in 10 minutes for security purposes.

If you didn't request this verification code, please ignore this email.

---
QaaqConnect - Connecting Maritime Professionals Worldwide
        `
      };

      await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 Email OTP sent to ${email}: ${otpCode}`);
      return {
        success: true,
        message: 'Verification code sent to your email address',
        otpCode
      };
    } catch (error) {
      console.error('Email OTP sending failed:', error);
      return {
        success: false,
        message: 'Failed to send email verification code'
      };
    }
  }

  /**
   * Verify email OTP
   */
  verifyEmailOTP(email: string, otpCode: string): { success: boolean; message: string } {
    const otpData = this.emailOTPs.get(email);
    
    if (!otpData) {
      return { success: false, message: 'No email verification code found' };
    }

    if (new Date() > otpData.expiryTime) {
      // Clean up expired OTP
      this.emailOTPs.delete(email);
      return { success: false, message: 'Email verification code has expired' };
    }

    if (otpData.otpCode !== otpCode) {
      return { success: false, message: 'Invalid email verification code' };
    }

    // OTP is valid - clean it up
    this.emailOTPs.delete(email);

    return { success: true, message: 'Email verification successful' };
  }

  /**
   * Test email configuration
   */
  async testEmailConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service configured successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service configuration failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();