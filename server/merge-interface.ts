import express from 'express';
import jwt from 'jsonwebtoken';
import { robustAuth, DuplicateUser, MergeDecision } from './auth-system';

/**
 * Account Merge API Routes
 * Handles the user interface for merging duplicate accounts
 */

interface MergeSession {
  id: string;
  userId: string;
  duplicateAccounts: DuplicateUser[];
  createdAt: Date;
  expiresAt: Date;
}

class MergeSessionManager {
  private sessions = new Map<string, MergeSession>();
  
  createSession(sessionId: string, duplicateAccounts: DuplicateUser[]): MergeSession {
    const session: MergeSession = {
      id: sessionId,
      userId: duplicateAccounts[0]?.phone || '', // Use phone as identifier
      duplicateAccounts,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  getSession(sessionId: string): MergeSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    
    if (session) {
      this.sessions.delete(sessionId);
    }
    
    return undefined;
  }
  
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export const mergeSessionManager = new MergeSessionManager();

export function setupMergeRoutes(app: express.Application) {
  
  /**
   * Enhanced login endpoint with duplicate detection
   */
  app.post('/api/auth/login-robust', async (req, res) => {
    try {
      const { userId, password } = req.body;
      
      if (!userId || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "User ID and password are required" 
        });
      }
      
      const authResult = await robustAuth.authenticateUser(userId, password);
      
      if (authResult.requiresMerge) {
        // Create merge session
        const session = mergeSessionManager.createSession(
          authResult.mergeSessionId!, 
          authResult.duplicateAccounts!
        );
        
        return res.json({
          success: false,
          requiresMerge: true,
          mergeSessionId: authResult.mergeSessionId,
          duplicateAccounts: authResult.duplicateAccounts,
          requiresPasswordSetup: authResult.requiresPasswordSetup,
          message: "Multiple accounts found. Please choose how to proceed."
        });
      }
      
      if (authResult.success) {
        res.json({
          success: true,
          user: authResult.user,
          token: authResult.token,
          message: authResult.message || "Login successful",
          requiresPasswordSetup: authResult.requiresPasswordSetup
        });
      } else {
        res.status(401).json({
          success: false,
          message: authResult.message || "Invalid credentials"
        });
      }
      
    } catch (error) {
      console.error('Robust login error:', error);
      res.status(500).json({
        success: false,
        message: "Authentication system error"
      });
    }
  });

  /**
   * Set custom password endpoint
   */
  app.post('/api/auth/set-password', async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      
      if (!userId || !newPassword) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID and new password are required' 
        });
      }
      
      const result = await robustAuth.setCustomPassword(userId, newPassword);
      res.json(result);
    } catch (error) {
      console.error('Set password error:', error);
      res.status(500).json({ success: false, message: 'Failed to set password' });
    }
  });

  /**
   * Request password reset via WhatsApp
   */
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID is required' 
        });
      }

      // Check if user exists in database
      const user = await robustAuth.findUserById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const result = await robustAuth.requestPasswordReset(userId);
      res.json(result);
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Failed to process password reset request' });
    }
  });

  /**
   * Reset password with verification code
   */
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { userId, resetCode, newPassword } = req.body;
      
      if (!userId || !resetCode || !newPassword) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID, reset code, and new password are required' 
        });
      }
      
      const result = await robustAuth.resetPasswordWithCode(userId, resetCode, newPassword);
      res.json(result);
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
  });

  /**
   * Send signup OTP endpoint (dual WhatsApp + Email)
   */
  app.post('/api/auth/send-signup-otp', async (req, res) => {
    try {
      const { whatsappNumber, email } = req.body;
      
      if (!whatsappNumber) {
        return res.status(400).json({ 
          success: false, 
          message: 'WhatsApp number is required' 
        });
      }

      // Validate WhatsApp number format
      if (!/^\+\d{10,15}$/.test(whatsappNumber)) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp number must be in format +919xxxxxxxxx'
        });
      }

      const result = await robustAuth.sendSignupOTP(whatsappNumber, email);
      res.json(result);
    } catch (error) {
      console.error('Send signup OTP error:', error);
      res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
  });

  /**
   * Verify OTP and create user endpoint
   */
  app.post('/api/auth/verify-signup-otp', async (req, res) => {
    try {
      const { whatsappNumber, otpCode, email, password, fullName, userType = 'local', emailOtpCode } = req.body;
      
      if (!whatsappNumber || !otpCode || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'WhatsApp number, OTP code, email, and password are required' 
        });
      }

      // Validate OTP format
      if (!/^\d{6}$/.test(otpCode)) {
        return res.status(400).json({
          success: false,
          message: 'OTP code must be 6 digits'
        });
      }

      const result = await robustAuth.verifyOTPAndCreateUser({
        whatsappNumber,
        otpCode,
        email,
        password,
        fullName: fullName || `User ${whatsappNumber}`,
        userType,
        emailOtpCode
      });

      res.json(result);
    } catch (error) {
      console.error('Verify OTP and signup error:', error);
      res.status(500).json({ success: false, message: 'Failed to verify OTP and create account' });
    }
  });
  
  /**
   * Get merge session details
   */
  app.get('/api/auth/merge-session/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = mergeSessionManager.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Merge session not found or expired"
        });
      }
      
      // Add recommendations for each account
      const accountsWithRecommendations = session.duplicateAccounts.map(account => ({
        ...account,
        recommendation: generateAccountRecommendation(account, session.duplicateAccounts)
      }));
      
      res.json({
        success: true,
        session: {
          id: session.id,
          accounts: accountsWithRecommendations,
          expiresAt: session.expiresAt
        }
      });
      
    } catch (error) {
      console.error('Get merge session error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve merge session"
      });
    }
  });
  
  /**
   * Execute account merge
   */
  app.post('/api/auth/merge-accounts', async (req, res) => {
    try {
      const { sessionId, primaryAccountId, duplicateAccountIds, mergeStrategy } = req.body;
      
      const session = mergeSessionManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Merge session not found or expired"
        });
      }
      
      // Validate the merge decision
      const validAccountIds = session.duplicateAccounts.map(acc => acc.id);
      if (!validAccountIds.includes(primaryAccountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid primary account ID"
        });
      }
      
      for (const dupId of duplicateAccountIds) {
        if (!validAccountIds.includes(dupId)) {
          return res.status(400).json({
            success: false,
            message: `Invalid duplicate account ID: ${dupId}`
          });
        }
      }
      
      const mergeDecision: MergeDecision = {
        primaryAccountId,
        duplicateAccountIds,
        mergeStrategy: mergeStrategy || 'merge_data'
      };
      
      const authResult = await robustAuth.mergeAccounts(mergeDecision);
      
      // Clean up session
      mergeSessionManager.deleteSession(sessionId);
      
      if (authResult.success) {
        res.json({
          success: true,
          user: authResult.user,
          token: authResult.token,
          message: "Accounts merged successfully"
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Account merge failed"
        });
      }
      
    } catch (error) {
      console.error('Merge accounts error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to merge accounts"
      });
    }
  });
  
  /**
   * Skip merge and use specific account
   */
  app.post('/api/auth/skip-merge', async (req, res) => {
    try {
      const { sessionId, selectedAccountId } = req.body;
      
      const session = mergeSessionManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Merge session not found or expired"
        });
      }
      
      const selectedAccount = session.duplicateAccounts.find(acc => acc.id === selectedAccountId);
      if (!selectedAccount) {
        return res.status(400).json({
          success: false,
          message: "Invalid account selection"
        });
      }
      
      // Generate token for selected account using jwt
      const token = jwt.sign({ userId: selectedAccount.id }, process.env.JWT_SECRET || 'qaaq-connect-secret-key', { expiresIn: '30d' });
      
      // Clean up session
      mergeSessionManager.deleteSession(sessionId);
      
      res.json({
        success: true,
        user: selectedAccount,
        token,
        message: "Login successful with selected account"
      });
      
    } catch (error) {
      console.error('Skip merge error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to skip merge"
      });
    }
  });
}

/**
 * Generate recommendation for each account during merge
 */
function generateAccountRecommendation(account: DuplicateUser, allAccounts: DuplicateUser[]): string {
  if (account.completeness >= 80) {
    return "RECOMMENDED - Most complete profile";
  }
  
  if (account.source === 'qaaq_main' && account.questionCount > 0) {
    return "RECOMMENDED - Active QAAQ user with Q&A history";
  }
  
  if (account.loginCount > 5) {
    return "RECOMMENDED - Frequently used account";
  }
  
  if (account.completeness < 30) {
    return "ARCHIVE - Incomplete profile, consider merging data into another account";
  }
  
  return "MERGE - Consider merging data into primary account";
}