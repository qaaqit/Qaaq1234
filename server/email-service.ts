/**
 * Email Service for OTP and Notifications
 * Using Gmail SMTP for email delivery
 */

import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: any;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // For development, we'll use a test account or console logging
    // In production, you would configure Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'qaaqconnect@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'test-password'
      }
    });
  }

  /**
   * Send OTP email
   */
  async sendOTPEmail(email: string, otpCode: string, whatsappNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const emailContent = {
        to: email,
        subject: '🔐 QaaqConnect - Your Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ea580c, #dc2626); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">QaaqConnect</h1>
              <p style="color: white; margin: 5px 0;">Maritime Professional Networking</p>
            </div>
            
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #374151; margin-bottom: 20px;">Welcome to QaaqConnect!</h2>
              
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                Your verification code for WhatsApp number <strong>${whatsappNumber}</strong> is:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #ea580c; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 5px; display: inline-block;">
                  ${otpCode}
                </div>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                This code expires in 10 minutes for your security.
              </p>
              
              <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; border-left: 4px solid #ea580c;">
                <h3 style="color: #374151; margin-top: 0;">About QaaqConnect</h3>
                <p style="color: #6b7280; margin-bottom: 0;">
                  Join the maritime community! Connect with sailors worldwide, discover who's nearby at ports, 
                  and access essential maritime services. Welcome aboard! ⚓
                </p>
              </div>
            </div>
            
            <div style="padding: 20px; text-align: center; background: #374151; color: white;">
              <p style="margin: 0; font-size: 14px;">
                QaaqConnect - Connecting Maritime Professionals Worldwide
              </p>
            </div>
          </div>
        `,
        text: `
QaaqConnect - Your Verification Code

Welcome to QaaqConnect!

Your verification code for WhatsApp number ${whatsappNumber} is: ${otpCode}

This code expires in 10 minutes for your security.

About QaaqConnect:
Join the maritime community! Connect with sailors worldwide, discover who's nearby at ports, and access essential maritime services. Welcome aboard!

QaaqConnect - Connecting Maritime Professionals Worldwide
        `
      };

      // For development, log the email content instead of sending
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📧 Email OTP (Development Mode):');
        console.log(`To: ${email}`);
        console.log(`Subject: ${emailContent.subject}`);
        console.log(`OTP Code: ${otpCode}`);
        console.log('────────────────────────────────────');
        
        return {
          success: true,
          message: 'Email OTP logged to console (development mode)'
        };
      }

      // In production, actually send the email
      await this.transporter.sendMail(emailContent);
      
      return {
        success: true,
        message: 'Verification code sent to your email'
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        message: 'Failed to send email verification code'
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetCode: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const emailContent = {
        to: email,
        subject: '🔑 QaaqConnect - Password Reset Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ea580c, #dc2626); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">QaaqConnect</h1>
              <p style="color: white; margin: 5px 0;">Password Reset</p>
            </div>
            
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #374151; margin-bottom: 20px;">Password Reset Request</h2>
              
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                You requested a password reset for account: <strong>${userId}</strong>
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #dc2626; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 5px; display: inline-block;">
                  ${resetCode}
                </div>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                This code expires in 10 minutes for your security.
              </p>
              
              <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; border-left: 4px solid #dc2626;">
                <p style="color: #6b7280; margin: 0;">
                  If you didn't request this password reset, please ignore this email. 
                  Your account security is important to us.
                </p>
              </div>
            </div>
            
            <div style="padding: 20px; text-align: center; background: #374151; color: white;">
              <p style="margin: 0; font-size: 14px;">
                QaaqConnect - Connecting Maritime Professionals Worldwide
              </p>
            </div>
          </div>
        `,
        text: `
QaaqConnect - Password Reset Code

You requested a password reset for account: ${userId}

Your reset code is: ${resetCode}

This code expires in 10 minutes for your security.

If you didn't request this password reset, please ignore this email.

QaaqConnect - Connecting Maritime Professionals Worldwide
        `
      };

      // For development, log the email content
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📧 Password Reset Email (Development Mode):');
        console.log(`To: ${email}`);
        console.log(`Subject: ${emailContent.subject}`);
        console.log(`Reset Code: ${resetCode}`);
        console.log('────────────────────────────────────');
        
        return {
          success: true,
          message: 'Password reset email logged to console (development mode)'
        };
      }

      // In production, actually send the email
      await this.transporter.sendMail(emailContent);
      
      return {
        success: true,
        message: 'Password reset code sent to your email'
      };
    } catch (error) {
      console.error('Password reset email error:', error);
      return {
        success: false,
        message: 'Failed to send password reset email'
      };
    }
  }
}

export const emailService = new EmailService();