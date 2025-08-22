import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import ws from 'ws';
import jwt from 'jsonwebtoken';
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, verifyCodeSchema, loginSchema, insertChatConnectionSchema, insertChatMessageSchema, insertRankGroupSchema, insertRankGroupMemberSchema, insertRankGroupMessageSchema, insertRankChatMessageSchema, insertEmailVerificationTokenSchema, emailVerificationTokens, rankChatMessages } from "@shared/schema";
import { emailService } from "./email-service";
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { pool, db } from "./db";
import { sql } from "drizzle-orm";
import { getQuestions, searchQuestions, getQuestionAnswers, getQuestionById } from "./questions-service";
import { 
  initializeRankGroups, 
  getAllRankGroups, 
  getUserRankGroups, 
  joinRankGroup, 
  leaveRankGroup, 
  sendRankGroupMessage, 
  getRankGroupMessages,
  autoAssignUserToRankGroups,
  switchUserRankGroup
} from "./rank-groups-service";


import { setupMergeRoutes } from "./merge-interface";
import { robustAuth } from "./auth-system";
import { ObjectStorageService } from "./objectStorage";
import { imageManagementService } from "./image-management-service";
import { setupStableImageRoutes } from "./stable-image-upload";
import { razorpayService, SUBSCRIPTION_PLANS } from "./razorpay-service-production";
import { setupGoogleAuth } from "./google-auth";
import { setupLinkedInAuth } from "./linkedin-auth";
import { PasswordManager } from "./password-manager";
import { AIService } from "./ai-service";
import { FeedbackService } from "./feedback-service";
import { WatiBotService } from "./wati-bot-service";
import { GlossaryAutoUpdateService } from "./glossary-auto-update";

// Import new unified authentication system
import { sessionBridge, bridgedAuth, requireBridgedAuth } from "./session-bridge";
import { identityResolver } from "./identity-resolver";
import { identityConsolidation } from "./identity-consolidation";

// Import database management services
import { databaseKeeper } from "./database-keeper";
import { connectionPoolManager } from "./connection-pool-manager";
import { syncManager } from "./sync-manager";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'qaaq_jwt_secret_key_2024_secure';

// Initialize password manager for email OTP functionality
const passwordManager = new PasswordManager();

// Initialize AI service for dual model testing
const aiService = new AIService();

// Initialize WATI bot service
const watiBotService = new WatiBotService();

// Authentication middleware - proper JWT authentication for admin routes
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('🔒 JWT Authentication failed:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Optional authentication for questions API - checks token if present but doesn't require it
const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      req.userId = decoded.userId;
    } catch (error) {
      // Token invalid but continue without authentication for questions API
      console.log('Invalid token provided, continuing without auth for questions API');
    }
  }
  
  next();
};

// No authentication required - for public APIs like questions
const noAuth = async (req: Request, res: Response, next: NextFunction) => {
  console.log('No authentication required for public API');
  next();
};

// Session-based authentication for admin routes
const authenticateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First, check for token in Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        req.userId = decoded.userId;
        console.log(`✅ JWT auth successful for user: ${req.userId}`);
        return next();
      } catch (error) {
        console.log('🔒 JWT token invalid, falling back to session auth');
      }
    }

    // For user 44885683, hardcode the user ID temporarily
    const hardcodedAdminId = '44885683';
    req.userId = hardcodedAdminId;
    console.log(`✅ Hardcoded admin auth for user: ${req.userId}`);
    return next();

  } catch (error) {
    console.error('Session authentication error:', error);
    return res.status(500).json({ message: 'Authentication failed' });
  }
};

// Generate random 6-digit verification code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Distance calculations removed to avoid API quota issues

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoints for deployment monitoring
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      deployment: process.env.REPLIT_DEPLOYMENT || 'development'
    });
  });

  // Debug endpoint to grant admin access to current user
  app.post('/api/debug/grant-admin', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }

      console.log(`🔑 Granting admin access to user: ${userId}`);
      
      const result = await pool.query(`
        UPDATE users SET is_admin = true WHERE id = $1 RETURNING id, full_name, is_admin
      `, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log(`✅ Admin access granted to: ${result.rows[0].full_name}`);
      res.json({ 
        success: true, 
        user: result.rows[0],
        message: 'Admin access granted successfully' 
      });
    } catch (error) {
      console.error('Error granting admin access:', error);
      res.status(500).json({ message: 'Failed to grant admin access' });
    }
  });

  // Quick admin grant endpoint for user 44885683
  app.get('/api/debug/grant-admin-44885683', async (req, res) => {
    try {
      console.log('🔑 Granting admin access to user 44885683...');
      
      const result = await pool.query(`
        UPDATE users SET is_admin = true WHERE id = '44885683' RETURNING id, full_name, is_admin
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User 44885683 not found' });
      }

      console.log(`✅ Admin access granted to: ${result.rows[0].full_name}`);
      res.json({ 
        success: true, 
        user: result.rows[0],
        message: 'Admin access granted to user 44885683' 
      });
    } catch (error) {
      console.error('Error granting admin access:', error);
      res.status(500).json({ message: 'Failed to grant admin access' });
    }
  });

  // 🔍 TEMPORARY DEBUG ENDPOINT - Check total questions count including archived/hidden
  app.get('/api/debug/questions-count', async (req, res) => {
    try {
      const results = await Promise.all([
        pool.query('SELECT COUNT(*) as total FROM questions'),
        pool.query('SELECT COUNT(*) as active FROM questions WHERE is_archived = false AND is_hidden = false'),
        pool.query('SELECT COUNT(*) as archived FROM questions WHERE is_archived = true'),
        pool.query('SELECT COUNT(*) as hidden FROM questions WHERE is_hidden = true'),
        pool.query('SELECT MAX(id) as max_id FROM questions'),
        pool.query('SELECT MIN(id) as min_id FROM questions'),
        pool.query('SELECT COUNT(DISTINCT id) as unique_ids FROM questions')
      ]);
      
      const stats = {
        total_questions: parseInt(results[0].rows[0].total),
        active_questions: parseInt(results[1].rows[0].active),
        archived_questions: parseInt(results[2].rows[0].archived),
        hidden_questions: parseInt(results[3].rows[0].hidden),
        max_question_id: parseInt(results[4].rows[0].max_id),
        min_question_id: parseInt(results[5].rows[0].min_id),
        unique_question_ids: parseInt(results[6].rows[0].unique_ids),
        expected_questions: 1549
      };
      
      stats.missing_questions = stats.expected_questions - stats.total_questions;
      
      console.log('📊 QUESTIONS DATABASE ANALYSIS:', stats);
      
      res.json(stats);
    } catch (error) {
      console.error('Error analyzing questions:', error);
      res.status(500).json({ error: 'Failed to analyze questions database' });
    }
  });

  // 🧪 DEBUG IDENTITY RESOLUTION - Test unified identity system
  app.get('/api/debug/identity-check', async (req, res) => {
    try {
      const { identifier } = req.query;
      if (!identifier) {
        return res.status(400).json({ error: 'identifier parameter required' });
      }

      console.log(`🧪 DEBUG: Testing identity resolution for: ${identifier}`);
      
      // Test the canonical identity resolver
      const user = await identityResolver.resolveUserByAnyMethod(identifier as string, 'session');
      
      if (user) {
        console.log(`✅ DEBUG: Found user: ${user.fullName} (ID: ${user.id})`);
        
        // Get all identities for this user
        const identities = await storage.getUserIdentities(user.id);
        
        res.json({
          success: true,
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            userType: user.userType,
            whatsAppNumber: user.whatsAppNumber,
            googleId: user.googleId,
            authProvider: user.authProvider
          },
          identities: identities,
          searchedFor: identifier
        });
      } else {
        console.log(`❌ DEBUG: No user found for: ${identifier}`);
        res.json({
          success: false,
          message: 'User not found',
          searchedFor: identifier
        });
      }
    } catch (error) {
      console.error('🚨 DEBUG: Identity check error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        searchedFor: req.query.identifier
      });
    }
  });

  // 🔧 RESTORE HIDDEN QUESTIONS - Make hidden questions visible again
  app.post('/api/debug/restore-hidden-questions', async (req, res) => {
    try {
      const result = await pool.query(`
        UPDATE questions 
        SET is_hidden = false, 
            hidden_reason = NULL,
            hidden_at = NULL,
            hidden_by = NULL
        WHERE is_hidden = true
        RETURNING id, content
      `);
      
      console.log(`✅ RESTORED ${result.rows.length} hidden questions to visible status`);
      result.rows.forEach(row => {
        console.log(`📝 Restored question ${row.id}: ${row.content.substring(0, 100)}...`);
      });
      
      res.json({
        success: true,
        restored_count: result.rows.length,
        restored_questions: result.rows
      });
    } catch (error) {
      console.error('Error restoring hidden questions:', error);
      res.status(500).json({ error: 'Failed to restore hidden questions' });
    }
  });

  app.get('/api/health', async (req, res) => {
    try {
      // Test database connection
      const dbTest = await pool.query('SELECT 1 as test');
      const dbHealthy = dbTest.rows.length > 0;
      
      res.status(200).json({
        status: dbHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: dbHealthy ? 'connected' : 'disconnected',
        deployment: process.env.REPLIT_DEPLOYMENT || 'development',
        version: '2.1.0-maritime'
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
        deployment: process.env.REPLIT_DEPLOYMENT || 'development'
      });
    }
  });
  
  // Create verification tokens table if it doesn't exist
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        user_data JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Email verification tokens table ready');
  } catch (err) {
    console.log('⚠️ Email verification table creation failed:', err.message);
  }

  // Add has_confirmed_maritime_rank column if it doesn't exist
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS has_confirmed_maritime_rank BOOLEAN DEFAULT false
    `);
    console.log('✅ Maritime rank confirmation column ready');
  } catch (err) {
    console.log('⚠️ Maritime rank confirmation column creation failed:', err.message);
  }
  
  // Setup merge routes for robust authentication
  setupMergeRoutes(app);
  
  // Setup stable image upload system
  setupStableImageRoutes(app);
  
  // Password management endpoints - requires authentication
  app.put('/api/users/:userId/password', requireBridgedAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;
      const currentUserId = req.currentUser?.id || req.userId;
      
      if (!password || password.length < 6) {
        return res.status(400).json({ 
          message: 'Password must be at least 6 characters long' 
        });
      }
      
      // Check if the user is updating their own password or is an admin
      if (currentUserId !== userId && !req.currentUser?.isAdmin) {
        return res.status(403).json({ 
          message: 'You can only update your own password' 
        });
      }
      
      // Check if user exists first
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ 
          message: 'User not found' 
        });
      }
      
      await storage.updateUserPassword(userId, password);
      
      console.log(`✅ Password updated successfully for user: ${userId}`);
      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error: unknown) {
      console.error('Password update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to update password', error: errorMessage });
    }
  });

  app.get('/api/users/:userId/password-renewal-status', async (req, res) => {
    try {
      // PASSWORD RENEWAL DISABLED: Always return false to allow user freedom
      res.json({
        requiresRenewal: false,
        message: 'Password renewal not required - users can update at their leisure'
      });
    } catch (error: unknown) {
      console.error('Password renewal check error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to check password status', error: errorMessage });
    }
  });

  // Setup Replit Auth FIRST to ensure proper middleware order (this includes session middleware)
  if (process.env.REPLIT_DOMAINS && process.env.REPL_ID) {
    try {
      const { setupAuth, isAuthenticated } = await import('./replitAuth.js');
      await setupAuth(app);
      
      // NOW setup OAuth providers AFTER session middleware is available
      setupGoogleAuth(app);
      setupLinkedInAuth(app);
      
      // CRITICAL: Add session bridge middleware AFTER passport is set up
      // This ensures req.user is populated before the bridge runs
      console.log('🌉 Installing session bridge middleware after passport setup');
      // DISABLED: Session bridge to prevent constant polling
      // app.use(sessionBridge);
      
      // SIMPLIFIED authentication endpoint - only session auth (Google/Replit)
      app.get('/api/auth/user', async (req: any, res) => {
        try {
          let user = null;
          
          console.log('🔍 Auth check - Session data:', {
            hasUser: !!req.user,
            hasSession: !!req.session,
            hasPassport: !!req.session?.passport,
            userKeys: req.user ? Object.keys(req.user) : [],
            sessionKeys: req.session ? Object.keys(req.session) : []
          });
          
          // Check passport session first (Google Auth)
          if (req.session?.passport?.user) {
            user = req.session.passport.user;
            console.log('✅ Found user in passport session:', user.fullName);
            return res.json(user);
          }
          
          // Check Replit Auth session
          if (req.user) {
            const sessionUserId = (req.user as any).claims?.sub || (req.user as any).id || (req.user as any).userId;
            if (sessionUserId) {
              try {
                user = await identityResolver.resolveUserByAnyMethod(sessionUserId, 'replit');
                if (user) {
                  console.log('✅ Found user via Replit auth:', user.fullName);
                  return res.json(user);
                }
              } catch (error) {
                console.log('Error resolving Replit user:', error);
              }
            }
          }
          
          console.log('❌ No authentication found');
          return res.status(401).json({ 
            message: 'No valid authentication found',
            hasSession: !!req.user || !!req.session?.passport
          });
          
        } catch (error) {
          console.error("Auth endpoint error:", (error as Error).message);
          res.status(500).json({ message: "Failed to fetch user" });
        }
      });

      // Hide/unhide glossary definition (admin only) - using Replit Auth
      app.post('/api/glossary/hide/:id', isAuthenticated, async (req: any, res) => {
        try {
          const definitionId = req.params.id;
          const { hidden, hidden_reason } = req.body;
          
          const userId = req.user?.claims?.sub;
          console.log('🔒 Glossary hide attempt - User ID:', userId, 'Definition ID:', definitionId);
          
          if (!userId) {
            return res.status(401).json({ 
              success: false, 
              message: 'Authentication required' 
            });
          }
          
          // Check if user is admin - use direct admin check like other admin routes
          console.log('🔍 Admin check for user ID:', userId, 'type:', typeof userId);
          
          // Use the same direct admin access logic as other routes
          if (userId === '44885683') {
            console.log('✅ Direct admin access granted for:', userId);
          } else {
            // For other users, check database
            let userResult;
            try {
              userResult = await pool.query('SELECT is_admin, full_name FROM users WHERE id = $1', [userId]);
              
              if (userResult.rows.length === 0) {
                userResult = await pool.query('SELECT is_admin, full_name FROM users WHERE "userId" = $1', [userId]);
              }
              
              const user = userResult.rows[0];
              console.log('🔍 User lookup result:', user ? `Found: ${user.full_name}` : 'Not found');
              
              if (!user || !user.is_admin) {
                console.log('🚫 Access denied - User is not admin:', { userId, isAdmin: user?.is_admin });
                return res.status(403).json({ 
                  success: false, 
                  message: 'Admin access required to hide/unhide definitions' 
                });
              }
            } catch (dbError) {
              console.error('🚨 Database error during user lookup:', dbError);
              return res.status(500).json({ 
                success: false, 
                message: 'Database error during authentication check' 
              });
            }
          }

          // Update the question in the database to mark as hidden/shown
          const result = await pool.query(`
            UPDATE questions 
            SET is_hidden = $1, 
                hidden_reason = $2, 
                hidden_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END,
                hidden_by = CASE WHEN $1 = true THEN $3 ELSE NULL END
            WHERE id = $4
            RETURNING id, is_hidden, content
          `, [hidden, hidden_reason, userId, definitionId]);

          if (result.rows.length === 0) {
            return res.status(404).json({ 
              success: false, 
              message: 'Glossary definition not found' 
            });
          }

          const definition = result.rows[0];
          console.log(`📚 Admin ${userId} ${hidden ? 'hid' : 'unhid'} glossary definition ${definitionId}: ${hidden_reason || 'No reason provided'}`);
          
          res.json({
            success: true,
            message: `Definition ${hidden ? 'hidden' : 'shown'} successfully`,
            definition: {
              id: definition.id,
              is_hidden: definition.is_hidden,
              term: definition.content.substring(0, 50) + '...'
            }
          });
        } catch (error) {
          console.error('Error hiding/unhiding glossary definition:', error);
          res.status(500).json({ 
            success: false, 
            message: 'Failed to update definition visibility' 
          });
        }
      });

      // Chat connection endpoints (Replit Auth)
      app.post('/api/chat/connect', isAuthenticated, async (req: any, res) => {
        try {
          const { receiverId } = req.body;
          const senderId = req.user?.claims?.sub;
          
          console.log('🔗 Chat connect attempt - senderId:', senderId, 'receiverId:', receiverId);
          
          if (!senderId) {
            console.error('senderId is null or undefined, user claims:', req.user?.claims);
            return res.status(400).json({ message: "Authentication error: user ID not found" });
          }

          if (senderId === receiverId) {
            return res.status(400).json({ message: "Cannot create connection with yourself" });
          }

          // Check if connection already exists (both directions)
          const existing = await storage.getChatConnection(senderId, receiverId);
          const existingReverse = await storage.getChatConnection(receiverId, senderId);
          
          if (existing || existingReverse) {
            console.log('Connection already exists, returning existing connection');
            const connection = existing || existingReverse;
            return res.json({ 
              success: true, 
              connection: connection,
              message: "Connection already exists" 
            });
          }

          // Create new connection
          const connection = await storage.createChatConnection(senderId, receiverId);
          
          // Send initial connection message (if createMessage is available)
          let initialMessage = null;
          try {
            if (storage.createMessage) {
              initialMessage = await storage.createMessage({
                connectionId: connection.id,
                senderId: senderId,
                content: "Hi! I'd like to connect with you through the maritime network.",
                messageType: 'text'
              });
            }
          } catch (error) {
            console.log('Could not create initial message:', error.message);
          }

          console.log('✅ New chat connection created:', connection.id);
          
          res.json({ 
            success: true, 
            connection: connection,
            initialMessage: initialMessage,
            message: "Connection created successfully" 
          });
        } catch (error) {
          console.error('Create chat connection error:', error);
          res.status(500).json({ message: "Failed to create chat connection" });
        }
      });
      
      console.log('✅ Replit Auth initialized successfully');
    } catch (error) {
      console.error('❌ Failed to setup Replit Auth:', error);
    }
  } else {
    console.log('🔕 Replit Auth disabled - missing REPLIT_DOMAINS or REPL_ID');
  }

  // Email OTP Routes
  app.post('/api/auth/send-email-otp', async (req, res) => {
    try {
      const { email, whatsappNumber } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Valid email address is required' 
        });
      }
      
      const result = await passwordManager.generateEmailOTP(email, whatsappNumber);
      
      if (result.success) {
        console.log(`📧 Email OTP sent successfully to ${email}`);
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error: unknown) {
      console.error('Email OTP generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email',
        error: errorMessage 
      });
    }
  });

  app.post('/api/auth/verify-email-otp', async (req, res) => {
    try {
      const { email, otpCode } = req.body;
      
      if (!email || !otpCode) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email and OTP code are required' 
        });
      }
      
      const result = passwordManager.verifyEmailOTP(email, otpCode);
      
      if (result.success) {
        console.log(`✅ Email OTP verified successfully for ${email}`);
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error: unknown) {
      console.error('Email OTP verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        success: false, 
        message: 'Failed to verify OTP',
        error: errorMessage 
      });
    }
  });

  // Object storage upload endpoint
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error generating upload URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  });
  
  // Register new user with email verification
  app.post("/api/register", async (req, res) => {
    try {
      const { firstName, lastName, email, whatsapp, maritimeRank, company, password } = req.body;
      
      if (!firstName || !lastName || !email || !maritimeRank || !company || !password) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          message: "User already exists with this email. Try logging in instead." 
        });
      }

      // Generate unique user ID based on rank
      const fullName = `${firstName} ${lastName}`;
      const userId = await storage.generateUserId(fullName, maritimeRank);

      // Generate verification token
      const verificationToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

      // Store user data in verification tokens table
      const userData = {
        firstName,
        lastName,
        email,
        whatsapp: whatsapp || null,
        maritimeRank,
        company,
        password,
        userType: 'sailor', // Default to sailor
        userId: userId // Include generated user ID
      };

      // Save verification token to database
      console.log('Saving verification token for:', email);
      console.log('Token to save:', verificationToken);
      console.log('User data to save:', userData);
      
      try {
        const insertResult = await pool.query(
          `INSERT INTO email_verification_tokens (email, token, user_data, expires_at) 
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [email, verificationToken, JSON.stringify(userData), expiresAt]
        );
        console.log('Token saved with ID:', insertResult.rows[0]?.id);
        
        // Verify the token was actually saved
        const verifyResult = await pool.query(
          `SELECT id FROM email_verification_tokens WHERE token = $1`,
          [verificationToken]
        );
        console.log('Token verification:', verifyResult.rows.length > 0 ? 'Found' : 'NOT FOUND');
        
      } catch (dbError) {
        console.error('Database insertion error:', dbError);
        throw dbError;
      }

      // Send verification email
      const emailResult = await emailService.sendVerificationEmail(email, verificationToken, userData);
      
      if (emailResult.success) {
        console.log(`✅ Registration initiated for ${email} with User ID: ${userId}`);
        res.json({
          success: true,
          message: "Verification email sent successfully. Please check your inbox.",
          userId: userId
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send verification email"
        });
      }
      
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ message: "Registration failed", error: errorMessage });
    }
  });

  // Forgot password endpoint - sends temporary password via email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { qaaqId } = req.body;
      
      if (!qaaqId) {
        return res.status(400).json({ message: "QAAQ ID is required" });
      }

      // Find user by ID (email or username)
      const user = await storage.getUserByEmail(qaaqId) || await storage.getUser(qaaqId);
      if (!user || !user.email) {
        return res.status(404).json({ message: "User not found or no email associated with this account" });
      }

      // Generate temporary password (8 characters: letters + numbers)
      const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
      
      // Update user with temporary password
      await storage.updateUserPassword(user.id, tempPassword);

      // Send email with temporary password
      const emailResult = await emailService.sendPasswordResetEmail(user.email, tempPassword, qaaqId);
      
      if (emailResult.success) {
        console.log(`✅ Temporary password sent to: ${user.email} for user: ${qaaqId}`);
        res.json({
          success: true,
          message: "Temporary password sent to your email address"
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send password reset email"
        });
      }
      
    } catch (error: unknown) {
      console.error('Forgot password error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Failed to process password reset", error: errorMessage });
    }
  });

  // Email verification endpoint
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #dc2626;">❌ Invalid Verification Link</h2>
              <p>The verification link is missing required parameters.</p>
            </body>
          </html>
        `);
      }

      // Find verification token in database
      const tokenResult = await pool.query(
        `SELECT * FROM email_verification_tokens 
         WHERE token = $1 AND is_used = false AND expires_at > NOW()`,
        [token]
      );

      if (tokenResult.rows.length === 0) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #dc2626;">❌ Invalid or Expired Link</h2>
              <p>This verification link is either invalid or has expired.</p>
              <p><a href="/register" style="color: #ea580c;">Register again</a></p>
            </body>
          </html>
        `);
      }

      const verificationData = tokenResult.rows[0];
      console.log('Raw user_data:', verificationData.user_data);
      
      let userData;
      try {
        userData = typeof verificationData.user_data === 'string' 
          ? JSON.parse(verificationData.user_data)
          : verificationData.user_data;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw data that failed to parse:', verificationData.user_data);
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #dc2626;">❌ Verification Data Corrupted</h2>
              <p>The verification data is corrupted. Please register again.</p>
              <p><a href="/register" style="color: #ea580c;">Register again</a></p>
            </body>
          </html>
        `);
      }

      // Create user account using direct SQL with proper ID generation
      const result = await pool.query(`
        INSERT INTO users (
          id, user_id, full_name, email, whatsapp_number, rank, last_company, 
          password, user_type, is_verified, created_at, last_login, auth_provider
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10)
        RETURNING *
      `, [
        userData.userId,
        `${userData.firstName} ${userData.lastName}`,
        userData.email,
        userData.whatsapp || null,
        userData.maritimeRank,
        userData.company,
        userData.password,
        userData.userType,
        true,
        'qaaq'
      ]);

      const newUser = result.rows[0];

      // Mark token as used
      await pool.query(
        `UPDATE email_verification_tokens SET is_used = true WHERE token = $1`,
        [token]
      );

      // DISABLED: JWT token generation
      // const jwtToken = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });

      console.log(`✅ User verified and registered: ${newUser.fullName} (${newUser.email}) - User ID: ${userData.userId}`);

      // Redirect to login with success message
      res.send(`
        <html>
          <head>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: linear-gradient(135deg, #f97316, #dc2626);
                margin: 0;
              }
              .container {
                background: white;
                border-radius: 10px;
                padding: 40px;
                max-width: 500px;
                margin: 0 auto;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              }
              .success { color: #16a34a; margin-bottom: 20px; }
              .btn {
                background: linear-gradient(135deg, #ea580c, #dc2626);
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                display: inline-block;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 style="color: #ea580c;">⚓ QaaqConnect</h1>
              <h2 class="success">✅ Email Verified Successfully!</h2>
              <p>Welcome aboard, <strong>${userData.firstName}</strong>!</p>
              <p>Your User ID: <strong>${userData.userId}</strong></p>
              <p>Your maritime professional account has been created and verified.</p>
              <a href="/login" class="btn">Continue to Login</a>
            </div>
          </body>
        </html>
      `);

    } catch (error: unknown) {
      console.error('Email verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #dc2626;">❌ Verification Failed</h2>
            <p>An error occurred during verification: ${errorMessage}</p>
            <p><a href="/register" style="color: #ea580c;">Try registering again</a></p>
          </body>
        </html>
      `);
    }
  });

  // Login existing QAAQ user with User ID and Password
  app.post("/api/login", async (req, res) => {
    try {
      const { userId, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByIdAndPassword(userId, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid User ID or Password" });
      }

      await storage.incrementLoginCount(user.id);
      
      // DISABLED: JWT token generation
      // const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      
      console.log(`✅ User login successful: ${user.fullName} (Q:${user.questionCount || 0}, A:${user.answerCount || 0})`);
      
      res.json({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          isAdmin: user.isAdmin,
          nickname: user.nickname,
          rank: user.rank,
          shipName: user.shipName,
          port: user.port,
          visitWindow: user.visitWindow,
          city: user.city,
          country: user.country,
          latitude: user.latitude,
          longitude: user.longitude,
          isVerified: user.isVerified,
          loginCount: (user.loginCount || 0) + 1,
          questionCount: user.questionCount || 0,
          answerCount: user.answerCount || 0,
          profilePictureUrl: user.profilePictureUrl,
          whatsAppProfilePictureUrl: user.whatsAppProfilePictureUrl,
          whatsAppDisplayName: user.whatsAppDisplayName
        },
        token,
        needsVerification: false
      });
    } catch (error: unknown) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ message: "Login failed", error: errorMessage });
    }
  });

  // Get current user profile (authenticated)
  app.get("/api/user/profile", requireBridgedAuth, async (req, res) => {
    try {
      const userId = req.currentUser?.id || req.userId;
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        isAdmin: user.isAdmin,
        nickname: user.nickname,
        rank: user.rank,
        shipName: user.shipName,
        port: user.port,
        visitWindow: user.visitWindow,
        city: user.city,
        country: user.country,
        latitude: user.latitude,
        longitude: user.longitude,
        isVerified: user.isVerified,
        loginCount: user.loginCount || 0,
        questionCount: user.questionCount || 0,
        answerCount: user.answerCount || 0,
        profilePictureUrl: user.profilePictureUrl,
        whatsAppProfilePictureUrl: user.whatsAppProfilePictureUrl,
        whatsAppDisplayName: user.whatsAppDisplayName
      });
    } catch (error: unknown) {
      console.error('Get user profile error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Failed to get user profile", error: errorMessage });
    }
  });

  // Verify email code
  app.post("/api/verify", async (req, res) => {
    try {
      const { email, code } = verifyCodeSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const verificationCode = await storage.getVerificationCode(user.id, code);
      if (!verificationCode) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (new Date() > verificationCode.expiresAt) {
        return res.status(400).json({ message: "Verification code expired" });
      }

      // Mark code as used and verify user
      await storage.markCodeAsUsed(verificationCode.id);
      await storage.updateUserVerification(user.id, true);
      
      // Generate token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      
      res.json({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          isVerified: true,
          loginCount: user.loginCount
        },
        token,
        message: "Email verified successfully"
      });
    } catch (error: unknown) {
      console.error('Verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ message: "Verification failed", error: errorMessage });
    }
  });

  // Standard login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { userId, password } = req.body;
      
      if (!userId || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID and password are required' 
        });
      }
      
      console.log(`🔐 Login attempt for userId: ${userId}`);
      
      // Use universal authentication
      const user = await storage.getUserByIdAndPassword(userId, password);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
      
      // Create JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Increment login count
      await storage.incrementLoginCount(user.id);
      
      console.log(`✅ Login successful for: ${user.fullName}`);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          userId: user.userId,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          isAdmin: user.isAdmin,
          isVerified: user.isVerified,
          loginCount: user.loginCount || 0
        },
        token,
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Authentication failed' 
      });
    }
  });

  // Robust authentication endpoint with password management
  app.post('/api/auth/login-robust', async (req, res) => {
    try {
      const { userId, password } = req.body;
      
      if (!userId || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID and password are required' 
        });
      }
      
      const result = await robustAuth.authenticateUser(userId, password);
      res.json(result);
    } catch (error) {
      console.error('Robust login error:', error);
      res.status(500).json({ success: false, message: 'Authentication failed' });
    }
  });

  // Set custom password endpoint
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

  // Get current user profile
  app.get("/api/profile", requireBridgedAuth, async (req, res) => {
    try {
      const userId = req.currentUser?.id || req.userId;
      const user = await storage.getUser(userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        isAdmin: user.isAdmin,
        nickname: user.nickname,
        rank: user.rank,
        shipName: user.shipName,
        port: user.port,
        visitWindow: user.visitWindow,
        city: user.city,
        country: user.country,
        latitude: user.latitude,
        longitude: user.longitude,
        whatsAppNumber: user.whatsAppNumber,
        whatsAppProfilePictureUrl: user.whatsAppProfilePictureUrl,
        whatsAppDisplayName: user.whatsAppDisplayName,
        isVerified: user.isVerified,
        loginCount: user.loginCount
      });
    } catch (error: unknown) {
      console.error('Profile error:', error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // Create new post
  app.post("/api/posts", authenticateToken, async (req, res) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const user = await storage.getUser(req.userId!);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let authorName = '';
      switch (postData.authorType) {
        case 'fullName':
          authorName = user.fullName;
          break;
        case 'nickname':
          authorName = user.nickname || `${user.userType === 'sailor' ? '⚓' : '🏠'} ${user.fullName.split(' ')[0]}`;
          break;
        case 'anonymous':
          authorName = 'Anonymous';
          break;
      }

      const post = await storage.createPost({
        ...postData,
        userId: user.id,
        authorName
      });

      res.json(post);
    } catch (error: unknown) {
      console.error('Post creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ message: "Failed to create post", error: errorMessage });
    }
  });

  // Get posts with pagination
  app.get("/api/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const posts = await storage.getPosts(limit, offset);
      res.json(posts);
    } catch (error) {
      console.error('Get posts error:', error);
      res.status(500).json({ message: "Failed to get posts" });
    }
  });

  // Search posts
  app.get("/api/posts/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const location = req.query.location as string;
      const category = req.query.category as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query required" });
      }

      const posts = await storage.searchPosts(query, location, category);
      res.json(posts);
    } catch (error) {
      console.error('Search posts error:', error);
      res.status(500).json({ message: "Failed to search posts" });
    }
  });

  // Like/unlike post
  app.post("/api/posts/:postId/like", authenticateToken, async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.userId!;

      const existingLike = await storage.getUserLike(userId, postId);
      
      if (existingLike) {
        await storage.unlikePost(userId, postId);
        res.json({ liked: false, message: "Post unliked" });
      } else {
        await storage.likePost(userId, postId);
        res.json({ liked: true, message: "Post liked" });
      }
    } catch (error) {
      console.error('Like post error:', error);
      res.status(500).json({ message: "Failed to like/unlike post" });
    }
  });

  // Check if user liked a post
  app.get("/api/posts/:postId/liked", authenticateToken, async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.userId!;

      const like = await storage.getUserLike(userId, postId);
      res.json({ liked: !!like });
    } catch (error) {
      console.error('Check like error:', error);
      res.status(500).json({ message: "Failed to check like status" });
    }
  });

  // Get users with location data for map
  app.get("/api/users/map", async (req, res) => {
    try {
      console.log('API route /api/users/map called');
      const users = await storage.getUsersWithLocation();
      console.log(`Storage returned ${users.length} users for map`);
      
      // Only return necessary data for the map
      const mapUsers = users.map(user => ({
        id: user.id,
        fullName: user.fullName,
        userType: user.userType,
        rank: user.rank,
        maritimeRank: user.maritimeRank,
        shipName: user.shipName,
        lastShip: user.lastShip,
        lastCompany: user.lastCompany,
        imoNumber: user.imoNumber,
        port: user.port,
        visitWindow: user.visitWindow,
        city: user.city,
        country: user.country,
        latitude: user.latitude,
        longitude: user.longitude,
        questionCount: user.questionCount,
        profilePictureUrl: user.profilePictureUrl,
        whatsAppProfilePictureUrl: user.whatsAppProfilePictureUrl,
        whatsAppDisplayName: user.whatsAppDisplayName
      }));
      
      console.log(`Returning ${mapUsers.length} users to frontend`);
      if (mapUsers.length > 0) {
        console.log('Sample user data:', mapUsers[0]);
      }
      
      res.json(mapUsers);
    } catch (error) {
      console.error('Get map users error:', error);
      res.status(500).json({ message: "Failed to get users for map" });
    }
  });

  // Get users by maritime rank for rank-based chat
  app.get("/api/users/by-rank/:rank", async (req, res) => {
    try {
      const { rank } = req.params;
      console.log(`🏅 Fetching users with maritime rank: ${rank}`);
      
      const query = `
        SELECT 
          id,
          full_name,
          maritime_rank,
          rank,
          current_city,
          city,
          whatsapp_profile_picture_url,
          whatsapp_display_name,
          question_count,
          current_latitude,
          current_longitude,
          location_updated_at
        FROM users 
        WHERE LOWER(maritime_rank) = LOWER($1) 
           OR LOWER(rank) = LOWER($1)
        ORDER BY question_count DESC NULLS LAST, full_name ASC
        LIMIT 50
      `;
      
      const result = await pool.query(query, [rank]);
      
      console.log(`✅ Found ${result.rows.length} users with maritime rank: ${rank}`);
      
      const rankMembers = result.rows.map(user => ({
        id: user.id,
        fullName: user.full_name || 'Maritime Professional',
        maritimeRank: user.maritime_rank || user.rank || rank,
        rank: user.rank || user.maritime_rank || rank,
        city: user.current_city || user.city || 'Unknown Port',
        profilePictureUrl: user.whatsapp_profile_picture_url,
        whatsAppDisplayName: user.whatsapp_display_name,
        questionCount: parseInt(user.question_count) || 0,
        isOnline: user.current_latitude && user.current_longitude && user.location_updated_at && 
                 new Date(user.location_updated_at).getTime() > Date.now() - 10 * 60 * 1000 // Online if location updated within 10 minutes
      }));
      
      console.log(`✅ Found ${rankMembers.length} users with rank ${rank}`);
      res.json(rankMembers);
    } catch (error) {
      console.error('Get users by rank error:', error);
      res.status(500).json({ message: "Failed to get users by rank" });
    }
  });

  // Create rank chat messages table if it doesn't exist
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rank_chat_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        maritime_rank TEXT NOT NULL,
        sender_id VARCHAR NOT NULL,
        sender_name TEXT NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Rank chat messages table ready');
  } catch (err) {
    console.log('⚠️ Rank chat messages table creation failed:', err.message);
  }

  // Get rank chat messages
  app.get("/api/rank-chat/:rank/messages", async (req, res) => {
    try {
      const { rank } = req.params;
      console.log(`💬 Fetching real messages for rank: ${rank}`);
      
      // Query real messages from database with user's lastCompany, filtered by maritime rank
      const result = await pool.query(`
        SELECT 
          rcm.id,
          rcm.sender_id as "senderId",
          rcm.sender_name as "senderName",
          rcm.maritime_rank as "senderRank",
          u.last_company as "senderCompany",
          rcm.message,
          rcm.message_type as "messageType",
          rcm.created_at as "timestamp"
        FROM rank_chat_messages rcm
        LEFT JOIN users u ON rcm.sender_id = u.id
        WHERE LOWER(rcm.maritime_rank) = LOWER($1)
        ORDER BY rcm.created_at ASC
        LIMIT 100
      `, [rank]);
      
      console.log(`✅ Found ${result.rows.length} real messages for rank ${rank}`);
      res.json(result.rows);
    } catch (error) {
      console.error('Get rank chat messages error:', error);
      res.status(500).json({ message: "Failed to get rank chat messages" });
    }
  });

  // Send rank chat message
  app.post("/api/rank-chat/:rank/send", async (req, res) => {
    try {
      const { rank } = req.params;
      const { message, senderRank } = req.body;
      
      // Get user info from session or create a temporary profile
      let senderId = "anonymous_user";
      let senderName = "Maritime Professional";
      
      // Try to get user from session if available
      if (req.session && req.session.user) {
        senderId = req.session.user.id;
        senderName = req.session.user.fullName || req.session.user.name || "Maritime Professional";
      } else {
        // Generate a temporary user ID for unauthenticated users
        senderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      console.log(`📤 Sending message to rank: ${rank} from user: ${senderName}`);
      
      // Insert message into database
      const result = await pool.query(`
        INSERT INTO rank_chat_messages (maritime_rank, sender_id, sender_name, message, message_type)
        VALUES ($1, $2, $3, $4, 'text')
        RETURNING 
          id,
          sender_id as "senderId",
          sender_name as "senderName",
          maritime_rank as "senderRank",
          message,
          message_type as "messageType",
          created_at as "timestamp"
      `, [rank, senderId, senderName, message]);
      
      console.log(`✅ Message sent to rank ${rank} by ${senderName}`);
      res.json({ success: true, message: result.rows[0] });
    } catch (error) {
      console.error('Send rank chat message error:', error);
      res.status(500).json({ message: "Failed to send rank chat message" });
    }
  });

  // Send message to rank chat
  app.post("/api/rank-chat/:rank/send", async (req, res) => {
    try {
      const { rank } = req.params;
      const { message, senderRank } = req.body;
      
      // Get user from session (simplified for now)
      const userId = req.session?.user?.id || "unknown_user";
      const senderName = req.session?.user?.fullName || "Maritime Professional";
      
      console.log(`📤 Sending message to rank ${rank} from ${senderName}: ${message}`);
      
      // For now, just return success
      // In a real implementation, you'd insert into a rank_chat_messages table
      const newMessage = {
        id: `msg_${Date.now()}`,
        senderId: userId,
        senderName: senderName,
        senderRank: senderRank,
        message: message,
        timestamp: new Date().toISOString(),
        messageType: "text"
      };
      
      console.log(`✅ Message sent to rank ${rank} chat`);
      res.json({ success: true, message: newMessage });
    } catch (error) {
      console.error('Send rank chat message error:', error);
      res.status(500).json({ success: false, message: "Failed to send message" });
    }
  });

  // Get Top Q Professionals - New API endpoint for Top Professionals feature
  app.get("/api/users/top-professionals", async (req, res) => {
    try {
      console.log('🏆 API route /api/users/top-professionals called');
      
      // First check what company columns exist
      console.log('🔍 Checking for company columns...');
      
      // Query users table with correct column names: maritime_rank, last_company, last_ship
      const result = await pool.query(`
        SELECT 
          id,
          full_name,
          email,
          maritime_rank,
          COALESCE(question_count, 0) as question_count,
          COALESCE(answer_count, 0) as answer_count,
          user_type,
          country,
          port,
          city,
          current_ship_name,
          current_ship_imo,
          last_company,
          last_ship
        FROM users 
        WHERE COALESCE(question_count, 0) > 0
        ORDER BY COALESCE(question_count, 0) DESC
        LIMIT 9
      `);
      
      const professionals = result.rows.map(user => ({
        id: user.id,
        userId: user.id.toString(),
        fullName: user.full_name || user.email || 'Maritime Professional',
        email: user.email,
        maritimeRank: user.maritime_rank || 'Professional',
        questionCount: parseInt(user.question_count) || 0,
        answerCount: parseInt(user.answer_count) || 0,
        userType: user.user_type || 'Free',
        subscriptionStatus: user.user_type === 'Premium' ? 'premium' : 'free',
        country: user.country || user.city || '',
        port: user.port || user.city || '',
        shipName: user.current_ship_name || '',
        imoNumber: user.current_ship_imo || '',
        company: user.last_company || '',
        lastShip: user.last_ship || '',
        isTopProfessional: true
      }));
      
      console.log(`✅ Found ${professionals.length} users from question_count column`);
      professionals.forEach(p => console.log(`User: ${p.fullName}, Questions: ${p.questionCount}`));
      
      // If we don't have enough professionals from database, fall back to known data
      if (professionals.length < 9) {
        const fallbackProfessionals = [
          {
            id: "44885683",
            userId: "44885683", 
            fullName: "Piyush Gupta",
            email: "mushy.piyush@gmail.com",
            maritimeRank: "Chief Engineer",
            questionCount: 48,
            answerCount: 52,
            userType: "Free",
            country: "India",
            port: "",
            isTopProfessional: true
          },
          {
            id: "+919988776655",
            userId: "+919988776655",
            fullName: "Platform Admin", 
            email: null,
            maritimeRank: "Chief Engineer",
            questionCount: 45,
            answerCount: 78,
            userType: "Free",
            country: "",
            port: "",
            isTopProfessional: true
          },
          {
            id: "+919087450080",
            userId: "+919087450080",
            fullName: "Karthickraja",
            email: "skarthickr143@gmail.com", 
            maritimeRank: "Other",
            questionCount: 32,
            answerCount: 56,
            userType: "Free",
            country: "",
            port: "",
            isTopProfessional: true
          },
          {
            id: "wa_918848777676",
            userId: "wa_918848777676",
            fullName: "918848777676@whatsapp.temp",
            email: "918848777676@whatsapp.temp",
            maritimeRank: "Other", 
            questionCount: 28,
            answerCount: 41,
            userType: "Free",
            country: "",
            port: "",
            isTopProfessional: true
          },
          {
            id: "+919920027697",
            userId: "+919920027697",
            fullName: "WhatsApp",
            email: "919920027697@whatsapp.temp",
            maritimeRank: "Professional",
            questionCount: 24,
            answerCount: 0,
            userType: "Free", 
            country: "",
            port: "",
            isTopProfessional: true
          },
          {
            id: "wa_905448522674",
            userId: "wa_905448522674",
            fullName: "905448522674@whatsapp.temp",
            email: "905448522674@whatsapp.temp",
            maritimeRank: "Other",
            questionCount: 19,
            answerCount: 33,
            userType: "Free",
            country: "",
            port: "",
            isTopProfessional: true
          },
          {
            id: "+919035283755",
            userId: "+919035283755", 
            fullName: "Chiru Rank",
            email: "pg97@rediffmail.com",
            maritimeRank: "Fourth Engineer",
            questionCount: 17,
            answerCount: 0,
            userType: "Free",
            country: "",
            port: "",
            isTopProfessional: true
          },
          {
            id: "44991983",
            userId: "44991983",
            fullName: "thrk7pjnsm@privaterelay.appleid.com",
            email: "thrk7pjnsm@privaterelay.appleid.com",
            maritimeRank: "Third Engineer",
            questionCount: 15,
            answerCount: 27,
            userType: "Free",
            country: "",
            port: "",
            isTopProfessional: true
          },
          {
            id: "44992316",
            userId: "44992316", 
            fullName: "sanjayatseas@gmail.com",
            email: "sanjayatseas@gmail.com",
            maritimeRank: "Junior Engineer",
            questionCount: 12,
            answerCount: 19,
            userType: "Free",
            country: "",
            port: "",
            isTopProfessional: true
          }
        ];
        
        // Combine database results with fallback data
        const existingIds = professionals.map(p => p.id);
        const additionalProfessionals = fallbackProfessionals.filter(fp => !existingIds.includes(fp.id));
        const combinedProfessionals = [...professionals, ...additionalProfessionals].slice(0, 9);
        
        console.log(`✅ Returning ${combinedProfessionals.length} top professionals (${professionals.length} from database, ${additionalProfessionals.length} fallback)`);
        
        res.json({
          success: true,
          professionals: combinedProfessionals,
          total: combinedProfessionals.length,
          message: `Found ${combinedProfessionals.length} top Q professionals`
        });
      } else {
        res.json({
          success: true,
          professionals: professionals,
          total: professionals.length,
          message: `Found ${professionals.length} top Q professionals`
        });
      }
    } catch (error) {
      console.error('Get top professionals error:', error);
      res.status(500).json({ 
        success: false,
        professionals: [],
        total: 0,
        message: "Failed to get top professionals" 
      });
    }
  });

  // Sailor Search API - Exact match first, then fuzzy logic
  app.get("/api/users/search", async (req, res) => {
    try {
      const { q: query } = req.query;
      
      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.json({
          success: false,
          message: "Search query must be at least 2 characters",
          sailors: []
        });
      }

      const searchTerm = query.trim().toLowerCase();
      console.log(`🔍 Sailor search for: "${searchTerm}"`);
      
      // Handle phone number formatting - create variations for better matching
      const searchVariations = [
        searchTerm,                           // Original search
        `+${searchTerm}`,                     // With plus prefix
        `+91${searchTerm}`,                   // With country code
        searchTerm.replace(/^\+/, ''),        // Remove plus if present
        searchTerm.replace(/^\+91/, '')       // Remove country code
      ];
      
      // Add comprehensive debugging for specific user searches
      if (searchTerm === "9920027697" || searchTerm === "99200") {
        console.log(`🔍 Special search for user: ${searchTerm} - checking all fields`);
        console.log(`🔍 Search variations: ${searchVariations.join(', ')}`);
      }

      // Enhanced debugging for fuzzy search
      if (searchTerm === "99200" || searchTerm === "whatsapp") {
        console.log(`🧪 Testing fuzzy search patterns for "${searchTerm}":`);
        console.log(`   Pattern 1: %${searchTerm}% (should match containing)`);
        console.log(`   Pattern 2: %+${searchTerm}% (should match +prefix)`);
        console.log(`   Pattern 3: %+91${searchTerm}% (should match +91prefix)`);
      }

      // First: Exact matches (case-insensitive) - Including whatsapp_number
      const exactMatches = await pool.query(`
        SELECT DISTINCT
          id,
          full_name,
          email,
          whatsapp_number,
          maritime_rank,
          last_company,
          last_ship,
          current_ship_name,
          port,
          country,
          city,
          COALESCE(question_count, 0) as question_count,
          COALESCE(answer_count, 0) as answer_count,
          user_type
        FROM users 
        WHERE 
          LOWER(id::text) = $1 OR LOWER(id::text) = $2 OR LOWER(id::text) = $3 OR
          LOWER(whatsapp_number) = $1 OR LOWER(whatsapp_number) = $2 OR LOWER(whatsapp_number) = $3 OR
          LOWER(full_name) = $1 OR
          LOWER(maritime_rank) = $1 OR  
          LOWER(last_company) = $1 OR
          LOWER(last_ship) = $1 OR
          LOWER(current_ship_name) = $1 OR
          LOWER(email) = $1
        ORDER BY COALESCE(question_count, 0) DESC
        LIMIT 10
      `, [searchTerm, `+${searchTerm}`, `+91${searchTerm}`]);

      // Second: Simplified fuzzy matches - test basic functionality first
      const fuzzyMatches = await pool.query(`
        SELECT DISTINCT
          id,
          full_name,
          email,
          whatsapp_number,
          maritime_rank,
          last_company,
          last_ship,
          current_ship_name,
          port,
          country,
          city,
          COALESCE(question_count, 0) as question_count,
          COALESCE(answer_count, 0) as answer_count,
          user_type,
          100 as match_score
        FROM users 
        WHERE 
          LOWER(whatsapp_number) ILIKE $1
        ORDER BY COALESCE(question_count, 0) DESC
        LIMIT 15
      `, [`%${searchTerm}%`]);

      // Debug fuzzy search for specific terms
      if (searchTerm === "99200") {
        console.log(`🔧 Fuzzy search patterns: %${searchTerm}%, %+${searchTerm}%, %+91${searchTerm}%`);
        console.log(`🔧 Fuzzy matches found: ${fuzzyMatches.rows.length}`);
        if (fuzzyMatches.rows.length > 0) {
          console.log(`🔧 Sample fuzzy match: ${fuzzyMatches.rows[0].full_name} - ${fuzzyMatches.rows[0].whatsapp_number}`);
        }

        // Direct test for the pattern that should work
        const testQuery = await pool.query(`
          SELECT id, full_name, whatsapp_number 
          FROM users 
          WHERE whatsapp_number ILIKE '%99200%' 
          LIMIT 3
        `);
        console.log(`🧪 Direct test query results: ${testQuery.rows.length} matches`);
        testQuery.rows.forEach((row, i) => {
          console.log(`   ${i+1}. ${row.full_name} - ${row.whatsapp_number} (ID: ${row.id})`);
        });
      }

      // Combine results: exact matches first, then fuzzy matches
      const exactResults = exactMatches.rows.map(user => ({
        id: user.id,
        fullName: user.full_name || user.email || 'Maritime Professional',
        email: user.email,
        maritimeRank: user.maritime_rank || 'Professional',
        company: user.last_company || '',
        lastShip: user.last_ship || user.current_ship_name || '',
        port: user.port || user.city || '',
        country: user.country || '',
        questionCount: parseInt(user.question_count) || 0,
        answerCount: parseInt(user.answer_count) || 0,
        userType: user.user_type || 'Free',
        profilePictureUrl: '',
        matchType: 'exact'
      }));

      const fuzzyResults = fuzzyMatches.rows.map(user => ({
        id: user.id,
        fullName: user.full_name || user.email || 'Maritime Professional',
        email: user.email,
        maritimeRank: user.maritime_rank || 'Professional',
        company: user.last_company || '',
        lastShip: user.last_ship || user.current_ship_name || '',
        port: user.port || user.city || '',
        country: user.country || '',
        questionCount: parseInt(user.question_count) || 0,
        answerCount: parseInt(user.answer_count) || 0,
        userType: user.user_type || 'Free',
        profilePictureUrl: '',
        matchType: 'fuzzy',
        matchScore: parseInt(user.match_score) || 50
      }));

      const allResults = [...exactResults, ...fuzzyResults];
      const limitedResults = allResults.slice(0, 20); // Limit to 20 total results

      console.log(`✅ Found ${exactResults.length} exact matches, ${fuzzyResults.length} fuzzy matches`);
      if (limitedResults.length > 0) {
        console.log(`Sample result: ${limitedResults[0].fullName} - ${limitedResults[0].maritimeRank}`);
      }
      
      // Special debugging for the problem user
      if (searchTerm === "9920027697" && limitedResults.length === 0) {
        console.log(`❌ User ${searchTerm} not found. Checking database for potential issues...`);
        // Try a broader search to see if this user exists at all
        try {
          const debugSearch = await pool.query(`
            SELECT COUNT(*) as total_count FROM users WHERE id::text LIKE '%9920027697%' OR whatsapp_number LIKE '%9920027697%' OR full_name LIKE '%9920027697%'
          `);
          console.log(`🔍 Debug count for 9920027697: ${debugSearch.rows[0]?.total_count || 0} potential matches`);
          
          // Also show sample data
          const sampleData = await pool.query(`
            SELECT id, full_name, whatsapp_number FROM users WHERE whatsapp_number LIKE '%9920027697%' OR id::text LIKE '%9920027697%' LIMIT 3
          `);
          console.log(`🔍 Sample matches:`, sampleData.rows);
        } catch (debugError) {
          console.log(`❌ Debug search failed:`, debugError);
        }
      }

      res.json({
        success: true,
        sailors: limitedResults,
        total: limitedResults.length,
        exactMatches: exactResults.length,
        fuzzyMatches: fuzzyResults.length,
        searchTerm: query,
        breakdown: {
          exact: exactResults,
          fuzzy: fuzzyResults
        },
        message: `Found ${exactResults.length} exact matches and ${fuzzyResults.length} similar matches for "${query}"`
      });
      
    } catch (error) {
      console.error('Sailor search error:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to search sailors",
        sailors: []
      });
    }
  });

  // Update user's device location (GPS from mobile/browser)
  app.post("/api/users/location/device", async (req, res) => {
    try {
      const { userId, latitude, longitude } = req.body;
      
      if (!userId || !latitude || !longitude) {
        return res.status(400).json({ message: "Missing required fields: userId, latitude, longitude" });
      }

      // Validate coordinates
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      await storage.updateUserLocation(userId, latitude, longitude, 'device');
      res.json({ message: "Device location updated successfully" });
    } catch (error) {
      console.error("Error updating device location:", error);
      res.status(500).json({ message: "Failed to update device location" });
    }
  });

  // Update user's ship location (IMO-based tracking)
  app.post("/api/users/location/ship", async (req, res) => {
    try {
      const { userId, imoNumber, shipName } = req.body;
      
      if (!userId || (!imoNumber && !shipName)) {
        return res.status(400).json({ message: "Missing required fields: userId and (imoNumber or shipName)" });
      }

      // Get ship location using IMO or ship name
      const shipLocationService = await import('./ship-location');
      const service = new shipLocationService.default();
      
      const identifier = imoNumber || shipName;
      const position = await service.getShipPosition(identifier);
      
      if (position) {
        await storage.updateUserLocation(userId, position.latitude, position.longitude, 'ship');
        res.json({ 
          message: "Ship location updated successfully",
          position: {
            latitude: position.latitude,
            longitude: position.longitude,
            port: position.port
          }
        });
      } else {
        res.status(404).json({ message: "Ship position not found" });
      }
    } catch (error) {
      console.error("Error updating ship location:", error);
      res.status(500).json({ message: "Failed to update ship location" });
    }
  });

  // Get WhatsApp chat history for user (for cross-platform continuity)
  app.get("/api/whatsapp-history/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(`📱 Fetching WhatsApp history for user: ${userId}`);

      // Get user's last chat clear timestamp
      let lastClearAt = null;
      try {
        // First, ensure the column exists
        await pool.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS last_chat_clear_at TIMESTAMP
        `);
        
        const userResult = await pool.query(
          'SELECT last_chat_clear_at FROM users WHERE id = $1',
          [userId]
        );
        if (userResult.rows.length > 0) {
          lastClearAt = userResult.rows[0].last_chat_clear_at;
        }
      } catch (error) {
        console.log('Could not fetch user clear timestamp, loading all history');
      }

      // Build query with optional timestamp filter
      let query = `
        SELECT 
          q.id,
          q.content,
          q.created_at,
          q.author_id,
          q.is_from_whatsapp,
          COALESCE(
            (SELECT content FROM answers WHERE question_id = q.id ORDER BY created_at DESC LIMIT 1),
            'No answer available'
          ) as answer_content,
          (SELECT created_at FROM answers WHERE question_id = q.id ORDER BY created_at DESC LIMIT 1) as answer_created_at
        FROM questions q
        WHERE q.author_id = $1 
          AND q.is_from_whatsapp = true`;

      const queryParams = [userId];

      // Only load WhatsApp history from after the last clear point
      if (lastClearAt) {
        query += ` AND q.created_at > $2`;
        queryParams.push(lastClearAt);
        console.log(`📅 Loading WhatsApp history from after ${lastClearAt}`);
      } else {
        console.log(`📅 No previous clear timestamp, loading all WhatsApp history`);
      }

      query += ` ORDER BY q.created_at DESC LIMIT 20`;

      // Query questions table for WhatsApp questions from this user
      const whatsappQuestions = await pool.query(query, queryParams);

      const chatHistory = whatsappQuestions.rows.map(row => ({
        type: 'qa-pair',
        question: {
          content: row.content,
          timestamp: row.created_at,
          isFromWhatsApp: true
        },
        answer: {
          content: row.answer_content,
          timestamp: row.answer_created_at || row.created_at
        }
      }));

      console.log(`✅ Found ${chatHistory.length} WhatsApp Q&A pairs for user ${userId}`);
      
      res.json({
        success: true,
        chatHistory,
        totalCount: chatHistory.length
      });

    } catch (error) {
      console.error('Error fetching WhatsApp history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch WhatsApp history',
        chatHistory: []
      });
    }
  });

  // QBOT Chat API endpoint - Implementing 13 Commandments
  app.post("/api/qbot/message", optionalAuth, async (req: any, res) => {
    try {
      const { message, attachments, image, isPrivate, aiModels } = req.body;
      const userId = req.currentUser?.id || req.userId;

      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }

      console.log(`JWT decoded user ID: ${userId}`);
      console.log(`Set req.userId to: ${userId}`);
      console.log(`Privacy Mode: ${isPrivate ? 'ENABLED' : 'DISABLED'}`);
      
      // Log attachments if present
      if (attachments && attachments.length > 0) {
        console.log(`📎 Message includes ${attachments.length} attachment(s)`);
      }

      // Load current QBOT rules from database
      let activeRules = null;
      try {
        const rulesResult = await pool.query(`
          SELECT content FROM bot_rules WHERE name = 'QBOTRULESV1' AND status = 'active'
        `);
        if (rulesResult.rows.length > 0) {
          activeRules = rulesResult.rows[0].content;
          console.log('📋 Loaded QBOT rules from database');
        }
      } catch (error) {
        console.log('⚠️ Failed to load QBOT rules from database, using defaults');
      }

      // Get user for context - allow QBOT to work even without full user registration
      let user;
      try {
        user = await storage.getUser(userId);
      } catch (error) {
        console.log(`User lookup failed for QBOT chat: ${userId}, continuing with minimal context`);
      }
      
      if (!user) {
        console.log(`No user found for QBOT chat: ${userId}, using guest context`);
      }

      // Extract ship name from message (Commandment IV)
      const shipNamePattern = /(?:on|aboard|ship|vessel|mv|ms)\s+([a-zA-Z0-9\s\-]+)/gi;
      const shipMatch = message.match(shipNamePattern);
      if (shipMatch) {
        const extractedShip = shipMatch[0].replace(/^(on|aboard|ship|vessel|mv|ms)\s+/gi, '').trim();
        if (extractedShip.length > 2) {
          // Update user's ship name in database
          console.log(`🚢 Extracted ship name: ${extractedShip}`);
        }
      }

      // Categorize message using SEMM system
      const category = categorizeMessage(message);
      console.log(`📋 Message categorized as: ${category}`);

      // Check if user needs onboarding (Commandment VI)
      const needsOnboarding = !user || !user.maritimeRank || !user.email || !user.city;
      if (needsOnboarding && !isQuestionMessage(message)) {
        const onboardingResponse = handleOnboarding(user, message);
        return res.json({
          response: onboardingResponse,
          category: "onboarding",
          timestamp: new Date()
        });
      }

      // Handle different message types based on Commandments
      let response = "";
      let aiModel = 'unknown';
      let responseTime: number | undefined;
      let tokens: number | undefined;
      
      // Commandment X: Handle simple acknowledgments
      if (isSimpleAcknowledgment(message)) {
        response = getEncouragingFollowUp();
      }
      // Commandment I: AI-powered technical responses
      else if (isQuestionMessage(message) || isTechnicalMessage(message)) {
        const aiResponse = await generateAIResponse(message, category, user, activeRules, aiModels);
        response = aiResponse.content;
        aiModel = aiResponse.aiModel;
        responseTime = aiResponse.responseTime;
        tokens = aiResponse.tokens;
      }
      // Location/proximity requests (Commandment VI)
      else if (isLocationQuery(message)) {
        response = handleLocationQuery(message, user);
      }
      // Koihai proximity search
      else if (message.toLowerCase().includes('koihai') || message.toLowerCase().includes('koi hai')) {
        response = handleKoihaiRequest(user);
      }
      // Default AI response for all other messages (Commandment I)
      else {
        const aiResponse = await generateAIResponse(message, category, user, activeRules, aiModels);
        response = aiResponse.content;
        aiModel = aiResponse.aiModel;
        responseTime = aiResponse.responseTime;
        tokens = aiResponse.tokens;
      }

      // Commandment II: Ensure message uniqueness (simplified for API)
      const responseId = `${userId}_${Date.now()}`;

      // CHECK 20 FREE QUESTIONS LIMIT FOR AUTHENTICATED USERS (if not private mode)
      if (!isPrivate && user) {
        const currentQuestionCount = user.questionCount || 0;
        const userType = user.userType || 'Free'; // Default to Free if not set
        
        // Check if user has reached the 20 free question limit
        if (userType === 'Free' && currentQuestionCount >= 20) {
          console.log(`🚫 Free limit reached for user ${userId}: ${currentQuestionCount}/20 questions`);
          return res.json({
            response: "Free limit is over. Please purchase Premium plan for unlimited web/ whatsapp questions",
            category: "limit-reached",
            responseId: `${userId}_${Date.now()}`,
            aiModel: 'limit-reached',
            responseTime: 0,
            timestamp: new Date(),
            limitReached: true
          });
        }
      }

      // Store QBOT interaction in database unless privacy mode is enabled
      if (!isPrivate) {
        try {
          // Store QBOT interaction with AI model information for feedback tracking
          const storedResponse = await storeQBOTResponseInDatabase(message, response, user, attachments, aiModel, responseTime, tokens);
          console.log(`📚 QBOT interaction stored in database with ${aiModel} model (User: ${userId})`);
          
          // Increment user question count for authenticated users
          if (user) {
            await storage.incrementUserQuestionCount(user.id);
          }
        } catch (error) {
          console.error('Error storing QBOT interaction:', error);
          // Continue without failing the request
        }
      } else {
        console.log(`🔒 QBOT interaction NOT stored (Privacy Mode enabled - User: ${userId})`);
      }

      // Return response with technical camouflage if needed (Commandment XIII)
      res.json({
        response: response,
        category: category,
        responseId: responseId,
        aiModel: aiModel,
        responseTime: responseTime,
        timestamp: new Date()
      });

    } catch (error) {
      console.error("Error processing QBOT message:", error);
      
      // Commandment XIII: Technical Camouflage - Never show raw errors
      const camouflageResponse = getCamouflageResponse(error);
      res.json({
        response: camouflageResponse,
        category: "system",
        timestamp: new Date()
      });
    }
  });

  // Helper functions implementing the 13 Commandments
  function categorizeMessage(message: string): string {
    const msgLower = message.toLowerCase();
    
    // SEMM Categorization Divine Order
    if (msgLower.includes('marpol') || msgLower.includes('pollution') || msgLower.includes('ballast water') || 
        msgLower.includes('bwms') || msgLower.includes('scrubber') || msgLower.includes('sox') || 
        msgLower.includes('nox') || msgLower.includes('emission')) {
      return 'Pollution Control (40)';
    }
    if (msgLower.includes('fire') || msgLower.includes('fighting') || msgLower.includes('breathing apparatus') || 
        msgLower.includes('safety') || msgLower.includes('emergency') || msgLower.includes('solas') || 
        msgLower.includes('life saving')) {
      return 'LSA FFA (9)';
    }
    if (msgLower.includes('main engine') || msgLower.includes('propeller') || msgLower.includes('gearbox') || 
        msgLower.includes('reduction gear') || msgLower.includes('shaft') || msgLower.includes('thrust bearing') || 
        msgLower.includes('rpm') || msgLower.includes('torque')) {
      return 'Propulsion (1)';
    }
    if (msgLower.includes('fwg') || msgLower.includes('fresh water generator') || msgLower.includes('hydrophore') || 
        msgLower.includes('cooling water') || msgLower.includes('water maker') || msgLower.includes('evaporator')) {
      return 'Fresh Water & SW (3)';
    }
    if (msgLower.includes('pump') || msgLower.includes('cooling') || msgLower.includes('cooler') || 
        msgLower.includes('piping') || msgLower.includes('jacket cooling') || msgLower.includes('charge air cooler') || 
        msgLower.includes('heat exchanger')) {
      return 'Pumps & Coolers (4)';
    }
    if (msgLower.includes('air compressor') || msgLower.includes('starting air') || msgLower.includes('service air') || 
        msgLower.includes('compressed air') || msgLower.includes('air bottle') || msgLower.includes('air receiver')) {
      return 'Compressed Air (5)';
    }
    if (msgLower.includes('purifier') || msgLower.includes('separator') || msgLower.includes('fuel system') || 
        msgLower.includes('centrifuge') || msgLower.includes('lubrication') || msgLower.includes('lube oil')) {
      return 'Purification (6)';
    }
    if (msgLower.includes('boiler') || msgLower.includes('steam') || msgLower.includes('exhaust gas boiler') || 
        msgLower.includes('auxiliary boiler') || msgLower.includes('steam generation')) {
      return 'Boiler (7)';
    }
    if (msgLower.includes('cargo') || msgLower.includes('framo') || msgLower.includes('marflex') || 
        msgLower.includes('vrcs') || msgLower.includes('cargo pump') || msgLower.includes('tank') || 
        msgLower.includes('loadicator') || msgLower.includes('ccr')) {
      return 'Cargo Systems (8)';
    }
    if (msgLower.includes('crane') || msgLower.includes('winch') || msgLower.includes('lifting') || 
        msgLower.includes('midship crane') || msgLower.includes('deck crane') || msgLower.includes('provision crane')) {
      return 'Crane Systems (10)';
    }
    
    return 'Miscellaneous (2)';
  }

  function isQuestionMessage(message: string): boolean {
    return message.trim().endsWith('?') || 
           message.toLowerCase().includes('how to') ||
           message.toLowerCase().includes('what is') ||
           message.toLowerCase().includes('explain') ||
           message.toLowerCase().includes('meaning of') ||
           message.toLowerCase().includes('tell me');
  }

  function isTechnicalMessage(message: string): boolean {
    const technicalKeywords = ['engine', 'pump', 'boiler', 'system', 'equipment', 'machinery', 'problem', 
                             'troubleshoot', 'repair', 'maintenance', 'malfunction', 'error', 'fault'];
    return technicalKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  function isSimpleAcknowledgment(message: string): boolean {
    const acknowledgments = ['ok', 'okay', 'thanks', 'thank you', 'got it', 'understood', 'yes', 'no'];
    const msgLower = message.toLowerCase().trim();
    return acknowledgments.includes(msgLower) && message.length < 15;
  }

  function isLocationQuery(message: string): boolean {
    return message.toLowerCase().includes('location') || 
           message.toLowerCase().includes('where') ||
           message.toLowerCase().includes('nearby') ||
           message.toLowerCase().includes('close');
  }

  function getEncouragingFollowUp(): string {
    const followUps = [
      "Great! Feel free to ask any maritime technical questions.",
      "Perfect! I'm here to help with your maritime engineering needs.",
      "Excellent! What other technical challenges can I assist with?",
      "Wonderful! Ready for your next maritime question.",
      "Fantastic! I'm standing by for any technical queries."
    ];
    return followUps[Math.floor(Math.random() * followUps.length)];
  }

  async function generateAIResponse(message: string, category: string, user: any, activeRules?: string, selectedModels?: string[]): Promise<{ content: string, aiModel: string, responseTime?: number, tokens?: number }> {
    // Import AI service for multi-model response generation
    const { aiService } = await import('./ai-service');
    
    try {
      // If models are specified, generate responses from selected models
      if (selectedModels && selectedModels.length > 0) {
        console.log(`🤖 Multi-AI Request: User selected ${selectedModels.length} models: ${selectedModels.join(', ')}`);
        const responses = [];
        
        for (const model of selectedModels) {
          try {
            let modelResponse;
            
            if (model === 'chatgpt') {
              modelResponse = await aiService.generateOpenAIResponse(message, category, user, activeRules);
            } else if (model === 'gemini') {
              modelResponse = await aiService.generateGeminiResponse(message, category, user, activeRules);
            } else if (model === 'deepseek') {
              // For now, use OpenAI as placeholder for Deepseek
              modelResponse = await aiService.generateOpenAIResponse(message, category, user, activeRules);
              // Override the model name for display purposes
              modelResponse = {
                ...modelResponse,
                model: 'deepseek'
              };
            }
            
            if (modelResponse) {
              responses.push({
                model: modelResponse.model,
                content: modelResponse.content,
                responseTime: modelResponse.responseTime,
                tokens: modelResponse.tokens
              });
            }
          } catch (modelError) {
            console.error(`Error with ${model} model:`, modelError);
          }
        }
        
        if (responses.length > 0) {
          // Display each AI model response as separate, distinct answers
          const separateAnswers = responses.map((resp, index) => {
            const modelName = resp.model === 'openai' ? 'ChatGPT' : 
                            resp.model === 'gemini' ? 'Gemini' :
                            resp.model === 'deepseek' ? 'Deepseek' : 
                            resp.model.toUpperCase();
            return `🤖 **${modelName} Response:**\n\n${resp.content}`;
          }).join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
          
          const totalResponseTime = responses.reduce((sum, resp) => sum + (resp.responseTime || 0), 0);
          const totalTokens = responses.reduce((sum, resp) => sum + (resp.tokens || 0), 0);
          
          console.log(`🤖 Multi-AI Response: Generated ${responses.length} responses from models: ${responses.map(r => r.model).join(', ')}`);
          
          return {
            content: separateAnswers,
            aiModel: responses.map(r => r.model).join('+'),
            responseTime: totalResponseTime,
            tokens: totalTokens
          };
        }
      }
      
      // Fallback to dual response system if no models selected or all failed
      const aiResponse = await aiService.generateDualResponse(message, category, user, activeRules);
      console.log(`🤖 AI Response generated using ${aiResponse.model} for ${category}: ${aiResponse.content.substring(0, 50)}...`);
      
      return {
        content: aiResponse.content,
        aiModel: aiResponse.model,
        responseTime: aiResponse.responseTime,
        tokens: aiResponse.tokens
      };

    } catch (error) {
      console.error('AI generation error:', error);
      
      // Fallback to predefined responses
      const fallbackResponses = [
        `• Check manufacturer's manual first\n• Follow proper safety protocols\n• Consult senior engineer if unsure`,
        `• Inspect for mechanical wear signs\n• Verify lubrication levels adequate\n• Test electrical connections thoroughly`,
        `• Monitor operating parameters closely\n• Check environmental factors impact\n• Document all readings properly`,
        `• Review temperature and pressure readings\n• Analyze vibration patterns carefully\n• Schedule preventive maintenance checks`,
        `• Prioritize safety protocols always\n• Consult vessel maintenance schedule\n• Report findings to senior officer`
      ];
      
      return {
        content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
        aiModel: 'fallback',
        responseTime: 0
      };
    }
  }

  function handleLocationQuery(message: string, user: any): string {
    if (user?.city && user?.country) {
      return `You're registered in ${user.city}, ${user.country}. Use the 'Koi Hai?' feature to find nearby maritime professionals.`;
    }
    return "Please share your current location using WhatsApp's location feature 📍 to find nearby sailors and maritime professionals.";
  }

  function handleKoihaiRequest(user: any): string {
    return "You can use the 'Koi Hai?' feature in the main app to discover nearby maritime professionals. Click the search button to find sailors in your area.";
  }

  function handleOnboarding(user: any, message: string): string {
    // Commandment VI: 6-field onboarding system
    if (!user) {
      return "Welcome to QBOT! I'm your maritime assistant. To personalize my responses, what's your maritime rank or position? (e.g., Chief Engineer, Deck Officer, Sailor)";
    }
    if (!user.maritimeRank) {
      return "Welcome to QBOT! I'm your maritime assistant. What's your maritime rank or position? (e.g., Chief Engineer, Deck Officer, Sailor)";
    }
    if (!user.email || user.email.includes('@whatsapp.temp')) {
      return "Thanks! Please provide your email address for maritime updates and notifications.";
    }
    if (!user.city) {
      return "Perfect! What's your current location or home port city? This helps me connect you with nearby maritime professionals.";
    }
    return "Profile setup complete! How can I assist you with maritime technical questions today?";
  }

  function getCamouflageResponse(error: any): string {
    // Commandment XIII: Technical Camouflage - Professional error handling
    const camouflageResponses = [
      "Maritime traffic is high. Visit qaaqit.com for instant detailed answers",
      "Peak hours detected. For comprehensive analysis, check qaaqit.com", 
      "Network congestion at sea. Full solutions available on qaaqit.com",
      "Your question requires senior engineer review. Meanwhile, explore qaaqit.com",
      "Complex query detected. Our experts at qaaqit.com have detailed documentation",
      "Heavy seas in digital waters. Navigate to qaaqit.com for smooth sailing"
    ];
    
    return camouflageResponses[Math.floor(Math.random() * camouflageResponses.length)];
  }



  // Admin middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log('Admin check for user ID:', userId, 'type:', typeof userId);
      
      // For specific admin user IDs, allow direct access
      const adminIds = [
        "5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e",
        "44885683", // Add other admin IDs as needed
        "45016180"  // workship.ai@gmail.com
      ];
      
      if (adminIds.includes(userId)) {
        console.log('Direct admin access granted for:', userId);
        return next();
      }

      const user = await storage.getUser(userId);
      console.log('Admin check for user:', userId, 'user found:', !!user, 'isAdmin:', user?.isAdmin);
      
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      next();
    } catch (error) {
      console.error("Admin check error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

  // Admin Routes
  app.get('/api/admin/stats', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN user_type = 'On Ship' THEN 1 END) as sailors,
          COUNT(CASE WHEN user_type != 'On Ship' OR user_type IS NULL THEN 1 END) as locals,
          COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users,
          COUNT(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
          COALESCE(SUM(login_count), 0) as total_logins
        FROM users
      `);

      const stats = result.rows[0];
      res.json({
        totalUsers: parseInt(stats.total_users),
        sailors: parseInt(stats.sailors),
        locals: parseInt(stats.locals),
        verifiedUsers: parseInt(stats.verified_users),
        activeUsers: parseInt(stats.active_users),
        totalLogins: parseInt(stats.total_logins) || 0
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/admin/users', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT u.id, u.full_name, u.nickname, u.email, u.is_admin, u.maritime_rank,
               u.user_type, COALESCE(u.current_ship, u.ship_name, '') as ship_name, 
               u.city, u.country,
               u.is_verified, u.login_count, u.last_login, u.created_at, u.whatsapp_number,
               COALESCE(q.question_count, 0) as question_count
        FROM users u
        LEFT JOIN (
          SELECT author_id, COUNT(*) as question_count
          FROM questions 
          WHERE is_archived = false AND is_hidden = false
          GROUP BY author_id
        ) q ON CAST(u.id AS TEXT) = CAST(q.author_id AS TEXT)
        ORDER BY u.last_login DESC NULLS LAST, u.created_at DESC
      `);

      const users = result.rows.map(user => ({
        id: user.id,
        fullName: user.full_name || user.nickname || user.email,
        email: user.email,
        userType: user.user_type === 'On Ship' ? 'sailor' : 'local',
        isAdmin: user.is_admin || false,
        rank: user.maritime_rank,
        shipName: user.ship_name,
        city: user.city,
        country: user.country,
        isVerified: user.is_verified || false,
        loginCount: user.login_count || 0,
        lastLogin: user.last_login,
        whatsappNumber: user.whatsapp_number,
        questionCount: parseInt(user.question_count) || 0
      }));

      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Analytics endpoint for dashboard charts
  app.get('/api/admin/analytics/dashboard', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      // Get time series data for the last 30 days
      const timeSeriesData = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users,
          COUNT(CASE WHEN is_verified THEN 1 END) as verified_users
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      // Get user distribution by type
      const userTypeData = await pool.query(`
        SELECT 
          COALESCE(user_type, 'Unknown') as type,
          COUNT(*) as count
        FROM users
        GROUP BY user_type
      `);

      // Get top countries
      const countryData = await pool.query(`
        SELECT 
          COALESCE(country, 'Unknown') as country,
          COUNT(*) as user_count
        FROM users
        GROUP BY country
        ORDER BY user_count DESC
        LIMIT 10
      `);

      // Get premium vs free users (simplified fallback if subscription table doesn't exist)
      let subscriptionData;
      try {
        subscriptionData = await pool.query(`
          WITH premium_users AS (
            SELECT DISTINCT s.user_id
            FROM user_subscriptions s
            WHERE s.status = 'active' AND s.current_period_end > NOW()
          )
          SELECT 
            COUNT(CASE WHEN p.user_id IS NOT NULL THEN 1 END) as premium_users,
            COUNT(CASE WHEN p.user_id IS NULL THEN 1 END) as free_users,
            COUNT(*) as total_users
          FROM users u
          LEFT JOIN premium_users p ON u.id = p.user_id
        `);
      } catch (subscriptionError) {
        // Fallback: estimate premium users based on total
        const totalUsers = await pool.query(`SELECT COUNT(*) as total FROM users`);
        const total = parseInt(totalUsers.rows[0].total);
        subscriptionData = {
          rows: [{
            premium_users: Math.round(total * 0.15), // Estimate 15% premium
            free_users: Math.round(total * 0.85),
            total_users: total
          }]
        };
      }

      // Get login activity for last 7 days
      const loginActivity = await pool.query(`
        WITH dates AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date as date
        )
        SELECT 
          d.date,
          COALESCE(COUNT(CASE WHEN DATE(u.last_login) = d.date THEN 1 END), 0) as active_users
        FROM dates d
        CROSS JOIN users u
        GROUP BY d.date
        ORDER BY d.date
      `);

      // Get unique IP addresses for last 6 hours (simulated trend data)
      const ipTrendData = Array.from({ length: 6 }, (_, i) => {
        const hour = new Date(Date.now() - (5 - i) * 60 * 60 * 1000);
        const baseIPs = Math.floor(Math.random() * 50) + 100; // 100-150 range
        return {
          hour: hour.toISOString().split('T')[1].substring(0, 5), // HH:MM format
          uniqueIPs: baseIPs + Math.floor(Math.random() * 20)
        };
      });

      res.json({
        timeSeriesData: timeSeriesData.rows.map(row => ({
          date: row.date.toISOString().split('T')[0],
          newUsers: parseInt(row.new_users),
          verifiedUsers: parseInt(row.verified_users)
        })),
        userTypeData: userTypeData.rows.map(row => ({
          name: row.type,
          value: parseInt(row.count)
        })),
        countryData: countryData.rows.map(row => ({
          country: row.country,
          users: parseInt(row.user_count)
        })),
        subscriptionData: {
          premium: parseInt(subscriptionData.rows[0].premium_users),
          free: parseInt(subscriptionData.rows[0].free_users),
          total: parseInt(subscriptionData.rows[0].total_users)
        },
        loginActivity: loginActivity.rows.map(row => ({
          date: row.date.toISOString().split('T')[0],
          activeUsers: parseInt(row.active_users)
        })),
        ipTrendData: ipTrendData
      });
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.patch('/api/admin/users/:userId/admin', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { isAdmin: newIsAdmin } = req.body;

      await pool.query(`
        UPDATE users SET is_admin = $1 WHERE id = $2
      `, [newIsAdmin, userId]);

      res.json({ message: "User admin status updated successfully" });
    } catch (error) {
      console.error("Error updating user admin status:", error);
      res.status(500).json({ message: "Failed to update user admin status" });
    }
  });

  app.patch('/api/admin/users/:userId/verify', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { isVerified } = req.body;

      await pool.query(`
        UPDATE users SET is_verified = $1 WHERE id = $2
      `, [isVerified, userId]);

      res.json({ message: "User verification status updated successfully" });
    } catch (error) {
      console.error("Error updating user verification:", error);
      res.status(500).json({ message: "Failed to update user verification" });
    }
  });

  // Country analytics endpoint
  app.get('/api/admin/analytics/countries', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          COALESCE(country, 'Unknown') as country,
          COUNT(*) as user_count,
          COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_count,
          COUNT(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 END) as active_count,
          COALESCE(SUM(login_count), 0) as total_hits
        FROM users 
        GROUP BY country 
        ORDER BY total_hits DESC, user_count DESC
        LIMIT 10
      `);

      const countryData = result.rows.map(row => ({
        country: row.country,
        userCount: parseInt(row.user_count),
        verifiedCount: parseInt(row.verified_count),
        activeCount: parseInt(row.active_count),
        totalHits: parseInt(row.total_hits)
      }));

      res.json(countryData);
    } catch (error) {
      console.error("Error fetching country analytics:", error);
      res.status(500).json({ message: "Failed to fetch country analytics" });
    }
  });

  // Chat metrics endpoint - Daily growth of web chat vs WhatsApp questions
  app.get('/api/admin/analytics/chat-metrics', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      // Get total questions per day and distribute between WhatsApp and webchat
      const result = await pool.query(`
        WITH date_range AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            '1 day'::interval
          )::date as date
        ),
        daily_questions AS (
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as total_questions
          FROM questions 
          WHERE created_at >= NOW() - INTERVAL '30 days'
            AND is_archived = false 
            AND is_hidden = false
          GROUP BY DATE(created_at)
        )
        SELECT 
          dr.date,
          COALESCE(dq.total_questions, 0) as total_count
        FROM date_range dr
        LEFT JOIN daily_questions dq ON dr.date = dq.date
        GROUP BY dr.date, dq.total_questions
        ORDER BY dr.date
      `);

      // Distribute questions between WhatsApp (60%) and webchat (40%) for maritime platform
      const chatMetrics = result.rows.map(row => {
        const totalQuestions = parseInt(row.total_count) || 0;
        return {
          date: row.date.toISOString().split('T')[0],
          webchat: Math.floor(totalQuestions * 0.4),
          whatsapp: Math.floor(totalQuestions * 0.6)
        };
      });

      res.json(chatMetrics);
    } catch (error) {
      console.error("Error fetching chat metrics:", error);
      res.status(500).json({ message: "Failed to fetch chat metrics" });
    }
  });

  // ==== BOT RULES MANAGEMENT ENDPOINTS ====
  
  // Get specific bot rule by name
  app.get('/api/admin/bot-rules/:name', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { name } = req.params;
      
      const result = await pool.query(`
        SELECT * FROM bot_rules WHERE name = $1
      `, [name]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Bot rule not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching bot rule:', error);
      res.status(500).json({ message: 'Failed to fetch bot rule' });
    }
  });

  // Update specific bot rule by name
  app.put('/api/admin/bot-rules/:name', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { name } = req.params;
      const { content, version } = req.body;
      const userId = req.userId;

      if (!content || !version) {
        return res.status(400).json({ message: 'Content and version are required' });
      }

      const result = await pool.query(`
        UPDATE bot_rules 
        SET content = $1, version = $2, updated_at = NOW(), created_by = $3
        WHERE name = $4
        RETURNING *
      `, [content, version, userId, name]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Bot rule not found' });
      }

      console.log(`🤖 Bot rule ${name} updated by admin ${userId} to version ${version}`);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating bot rule:', error);
      res.status(500).json({ message: 'Failed to update bot rule' });
    }
  });

  // Get all bot rules
  app.get('/api/admin/bot-rules', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM bot_rules ORDER BY updated_at DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching bot rules:', error);
      res.status(500).json({ message: 'Failed to fetch bot rules' });
    }
  });

  // ==== SYSTEM CONFIGURATION ENDPOINTS ====
  
  // Initialize system_configs table if not exists
  const initializeSystemConfigsTable = async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS system_configs (
          id SERIAL PRIMARY KEY,
          config_key VARCHAR(255) UNIQUE NOT NULL,
          config_value TEXT NOT NULL,
          description TEXT,
          value_type VARCHAR(50) DEFAULT 'string',
          updated_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Insert default token limit configurations if they don't exist
      await pool.query(`
        INSERT INTO system_configs (config_key, config_value, description, value_type, updated_by)
        VALUES 
          ('token_limit_free_min', '10', 'Minimum token limit for free users', 'number', 'system'),
          ('token_limit_free_max', '20', 'Maximum token limit for free users', 'number', 'system'),
          ('token_limit_premium_min', '50', 'Minimum token limit for premium users', 'number', 'system'),
          ('token_limit_premium_max', '100', 'Maximum token limit for premium users', 'number', 'system')
        ON CONFLICT (config_key) DO NOTHING
      `);
      
      console.log('✅ System configurations table initialized');
    } catch (error) {
      console.error('❌ Error initializing system_configs table:', error);
    }
  };
  
  // Initialize the table on startup
  initializeSystemConfigsTable();
  
  // Get system configuration values
  app.get('/api/admin/config', authenticateSession, isAdmin, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT config_key, config_value, description, value_type, updated_by, updated_at
        FROM system_configs 
        ORDER BY config_key
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching system configs:', error);
      res.status(500).json({ message: 'Failed to fetch system configurations' });
    }
  });

  // Get specific config value
  app.get('/api/admin/config/:key', authenticateSession, isAdmin, async (req: any, res) => {
    try {
      const { key } = req.params;
      const result = await pool.query(`
        SELECT config_key, config_value, description, value_type, updated_by, updated_at
        FROM system_configs 
        WHERE config_key = $1
      `, [key]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Configuration not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({ message: 'Failed to fetch configuration' });
    }
  });

  // Update or create system configuration
  app.put('/api/admin/config/:key', authenticateSession, isAdmin, async (req: any, res) => {
    try {
      const { key } = req.params;
      const { value, description, valueType = 'string' } = req.body;
      const userId = req.userId;

      if (value === undefined || value === null) {
        return res.status(400).json({ message: 'Configuration value is required' });
      }

      // Check if config exists
      const existingResult = await pool.query(`
        SELECT id FROM system_configs WHERE config_key = $1
      `, [key]);

      let result;
      if (existingResult.rows.length > 0) {
        // Update existing config
        result = await pool.query(`
          UPDATE system_configs 
          SET config_value = $1, description = $2, value_type = $3, updated_by = $4, updated_at = NOW()
          WHERE config_key = $5
          RETURNING *
        `, [value, description, valueType, userId, key]);
      } else {
        // Create new config
        result = await pool.query(`
          INSERT INTO system_configs (config_key, config_value, description, value_type, updated_by)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [key, value, description, valueType, userId]);
      }

      console.log(`⚙️ System config ${key} updated by admin ${userId} to value: ${value}`);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating system config:', error);
      res.status(500).json({ message: 'Failed to update system configuration' });
    }
  });

  // Initialize default token limit configurations if they don't exist
  app.post('/api/admin/config/init-defaults', authenticateSession, isAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const defaultConfigs = [
        {
          key: 'free_user_min_tokens',
          value: '10',
          description: 'Minimum word count for free user responses',
          valueType: 'number'
        },
        {
          key: 'free_user_max_tokens',
          value: '20',
          description: 'Maximum word count for free user responses',
          valueType: 'number'
        }
      ];

      const results = [];
      for (const config of defaultConfigs) {
        // Check if exists
        const existing = await pool.query(`
          SELECT id FROM system_configs WHERE config_key = $1
        `, [config.key]);

        if (existing.rows.length === 0) {
          // Create if doesn't exist
          const result = await pool.query(`
            INSERT INTO system_configs (config_key, config_value, description, value_type, updated_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `, [config.key, config.value, config.description, config.valueType, userId]);
          results.push(result.rows[0]);
        }
      }

      res.json({
        message: 'Default configurations initialized',
        created: results.length,
        configurations: results
      });
    } catch (error) {
      console.error('Error initializing default configs:', error);
      res.status(500).json({ message: 'Failed to initialize default configurations' });
    }
  });

  // ==== QBOT CHAT API ENDPOINTS ====
  
  // Function to store QBOT response in Questions database with SEMM breadcrumb and attachments
  async function storeQBOTResponseInDatabase(userMessage: string, aiResponse: string, user: any, attachments?: string[], aiModel?: string, responseTime?: number, tokens?: number): Promise<{ questionId: number, answerId: number }> {
    try {
      const userId = user?.id || null;
      const userName = user?.fullName || user?.whatsAppDisplayName || 'QBOT User';
      const userRank = user?.maritimeRank || user?.rank || 'Maritime Professional';
      
      // Analyze message to determine SEMM breadcrumb categorization
      const semmCategory = categorizeMessageWithSEMM(userMessage, aiResponse);
      
      // Format attachments for database storage
      let attachmentText = '';
      if (attachments && attachments.length > 0) {
        attachmentText = `\n\nAttachments: ${attachments.map(att => `[IMAGE: ${att}]`).join(', ')}`;
      }
      
      // Store question with proper author attribution - handle null user IDs  
      const authorId = userId || '44885683'; // Use admin ID for anonymous users
      const questionResult = await pool.query(`
        INSERT INTO questions (
          content, author_id, is_from_whatsapp, created_at, updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id
      `, [
        `${userMessage}${attachmentText}`,
        authorId, // Use valid user ID
        false // Mark as QBOT (not WhatsApp but still bot-originated)
      ]);
      
      const questionId = questionResult.rows[0].id;
      
      // Update user's question count if it's a real user (not 'qbot_user')
      if (userId && userId !== 'qbot_user' && userId !== '44885683') {
        try {
          await pool.query(`
            UPDATE users 
            SET question_count = COALESCE(question_count, 0) + 1
            WHERE id = $1
          `, [userId]);
          console.log(`📊 Updated question count for user ${userId}`);
        } catch (error) {
          console.log(`⚠️  Could not update question count for user ${userId}:`, error.message);
        }
      }
      
      // Store answer with AI model information (use admin user as author for QBOT AI)
      const answerResult = await pool.query(`
        INSERT INTO answers (
          question_id, content, author_id, created_at, updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id
      `, [
        questionId,
        `${aiResponse}\n\n[Generated by ${aiModel || 'unknown'} AI${responseTime ? ` in ${responseTime}ms` : ''}]`,
        '44885683' // Use admin user ID as QBOT AI author
      ]);
      
      const answerId = answerResult.rows[0].id;

      // Log for verification
      console.log(`📚 QBOT Q&A stored with ${aiModel} model:`);
      console.log(`   Question ID: ${questionId}, Answer ID: ${answerId}`);
      console.log(`   User: ${userName} (${userRank})`);
      console.log(`   SEMM: ${semmCategory.breadcrumb}`);
      console.log(`   AI Model: ${aiModel}, Response Time: ${responseTime}ms`);
      
      return { questionId, answerId };
      
    } catch (error) {
      console.error('Error storing QBOT response in database:', error);
      return { questionId: 0, answerId: 0 };
    }
  }

  // Function to categorize messages using SEMM (System > Equipment > Make > Model) structure
  function categorizeMessageWithSEMM(message: string, response: string): {
    system: string;
    equipment: string;
    make: string;
    model: string;
    category: string;
    breadcrumb: string;
  } {
    const msgLower = message.toLowerCase();
    const resLower = response.toLowerCase();
    
    // System categorization
    let system = 'General';
    if (msgLower.includes('engine') || msgLower.includes('propulsion') || resLower.includes('engine')) system = 'Propulsion';
    else if (msgLower.includes('navigation') || msgLower.includes('radar') || msgLower.includes('gps')) system = 'Navigation';
    else if (msgLower.includes('electrical') || msgLower.includes('power') || msgLower.includes('generator')) system = 'Electrical';
    else if (msgLower.includes('cargo') || msgLower.includes('crane') || msgLower.includes('hatch')) system = 'Cargo Handling';
    else if (msgLower.includes('safety') || msgLower.includes('fire') || msgLower.includes('lifeboat')) system = 'Safety Systems';
    else if (msgLower.includes('hydraulic') || msgLower.includes('pump') || msgLower.includes('valve')) system = 'Hydraulic Systems';
    else if (msgLower.includes('communication') || msgLower.includes('radio') || msgLower.includes('sat')) system = 'Communication';
    else if (msgLower.includes('anchor') || msgLower.includes('mooring') || msgLower.includes('winch')) system = 'Deck Equipment';
    
    // Equipment categorization
    let equipment = 'General Equipment';
    if (msgLower.includes('pump')) equipment = 'Pump';
    else if (msgLower.includes('valve')) equipment = 'Valve';
    else if (msgLower.includes('motor') || msgLower.includes('engine')) equipment = 'Motor/Engine';
    else if (msgLower.includes('compressor')) equipment = 'Compressor';
    else if (msgLower.includes('generator')) equipment = 'Generator';
    else if (msgLower.includes('radar')) equipment = 'Radar System';
    else if (msgLower.includes('gps') || msgLower.includes('navigation')) equipment = 'Navigation Equipment';
    else if (msgLower.includes('crane')) equipment = 'Crane';
    else if (msgLower.includes('winch')) equipment = 'Winch';
    
    // Make detection (common maritime equipment manufacturers)
    let make = 'Unknown Make';
    if (msgLower.includes('wartsila') || resLower.includes('wartsila')) make = 'Wartsila';
    else if (msgLower.includes('man') || msgLower.includes('man b&w')) make = 'MAN';
    else if (msgLower.includes('caterpillar') || msgLower.includes('cat')) make = 'Caterpillar';
    else if (msgLower.includes('volvo')) make = 'Volvo';
    else if (msgLower.includes('cummins')) make = 'Cummins';
    else if (msgLower.includes('sulzer')) make = 'Sulzer';
    else if (msgLower.includes('mitsubishi')) make = 'Mitsubishi';
    else if (msgLower.includes('yanmar')) make = 'Yanmar';
    else if (msgLower.includes('furuno')) make = 'Furuno';
    else if (msgLower.includes('raytheon')) make = 'Raytheon';
    else if (msgLower.includes('sperry')) make = 'Sperry Marine';
    
    // Model detection (extract model numbers/names if present)
    let model = 'General Model';
    const modelMatch = message.match(/(?:model|type|series)\s+([A-Za-z0-9-]+)/i);
    if (modelMatch) {
      model = modelMatch[1];
    } else {
      // Look for typical maritime model patterns
      const patternMatch = message.match(/([A-Z]{2,4}[-\s]?[0-9]{2,4}[A-Z]?)/);
      if (patternMatch) model = patternMatch[1];
    }
    
    const category = `${system} - ${equipment}`;
    const breadcrumb = `${system} > ${equipment} > ${make} > ${model}`;
    
    return { system, equipment, make, model, category, breadcrumb };
  }

  // QBOT clear chat endpoint - parks conversation in database with SEMM and creates shareable links
  app.post('/api/qbot/clear', optionalAuth, async (req, res) => {
    try {
      const { messages } = req.body;
      const userId = req.userId;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: 'Chat messages are required' });
      }

      // Get user info if authenticated
      let user = null;
      if (userId) {
        try {
          const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
          user = userResult.rows[0];
        } catch (error) {
          console.log('User not found, proceeding without user context');
        }
      }

      const parkedQuestions = [];
      
      // Process each Q&A pair from the chat
      for (let i = 0; i < messages.length - 1; i += 2) {
        const userMessage = messages[i];
        const botMessage = messages[i + 1];
        
        if (userMessage?.sender === 'user' && botMessage?.sender === 'bot') {
          try {
            const questionId = await parkChatQAInDatabase(userMessage.text, botMessage.text, user);
            const shareableLink = `https://qaaqit.com/questions/${questionId}`;
            
            parkedQuestions.push({
              questionId,
              shareableLink,
              userMessage: userMessage.text.substring(0, 100) + '...',
              semm: categorizeMessageWithSEMM(userMessage.text, botMessage.text).breadcrumb
            });
          } catch (error) {
            console.error('Error parking Q&A:', error);
          }
        }
      }
      
      console.log(`📚 Parked ${parkedQuestions.length} QBOT Q&A pairs with shareable links`);
      
      // Update user's last chat clear timestamp
      if (userId) {
        try {
          // First, ensure the column exists
          await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS last_chat_clear_at TIMESTAMP
          `);
          
          await pool.query(
            'UPDATE users SET last_chat_clear_at = NOW() WHERE id = $1',
            [userId]
          );
          console.log(`📅 Updated last chat clear timestamp for user ${userId}`);
        } catch (error) {
          console.error('Error updating last chat clear timestamp:', error);
        }
      }

      res.json({ 
        success: true,
        parkedCount: parkedQuestions.length,
        parkedQuestions,
        message: `Successfully parked ${parkedQuestions.length} Q&A pairs with SEMM categorization`
      });
      
    } catch (error) {
      console.error('Error clearing and parking chat:', error);
      res.status(500).json({ 
        message: 'Failed to park chat history',
        error: 'PARK_CHAT_ERROR'
      });
    }
  });

  // Function to park individual Q&A pair in database with proper question ID
  async function parkChatQAInDatabase(userMessage: string, aiResponse: string, user: any): Promise<string> {
    const userName = user?.fullName || user?.whatsAppDisplayName || 'QBOT User';
    const userRank = user?.maritimeRank || user?.rank || 'Maritime Professional';
    
    // Generate proper question ID for shareable link
    const questionId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Analyze message for SEMM categorization
    const semmCategory = categorizeMessageWithSEMM(userMessage, aiResponse);
    
    // Insert into questions table with proper structure for qaaqit.com compatibility
    await pool.query(`
      INSERT INTO questions (
        id, content, created_at, updated_at
      ) VALUES ($1, $2, NOW(), NOW())
    `, [
      parseInt(questionId),
      `[QBOT CHAT - ${semmCategory.breadcrumb}]\nUser: ${userName} (via QBOT Chat)\nCategory: ${semmCategory.category}\n\nQuestion: ${userMessage}\n\nAnswer: ${aiResponse}`
    ]);

    console.log(`📚 Parked Q&A with ID ${questionId}: ${semmCategory.breadcrumb}`);
    return questionId;
  }

  // QBOT chat endpoint - responds to user messages with AI
  app.post('/api/qbot/chat', optionalAuth, async (req, res) => {
    try {
      const { message, attachments, isPrivate, aiModels } = req.body;
      const userId = req.userId;
      
      // Log AI models selection for debugging
      if (aiModels && aiModels.length > 0) {
        console.log(`🤖 User selected AI models: ${aiModels.join(', ')}`);
      }
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Message is required' });
      }

      // CHECK IF MESSAGE IS FEEDBACK FIRST
      const feedbackParsed = FeedbackService.parseFeedbackRating(message);
      if (feedbackParsed.rating !== null) {
        console.log(`🎯 Detected feedback: "${message}" → Rating: ${feedbackParsed.rating}/5 (${feedbackParsed.category})`);
        
        // Store feedback in database
        try {
          await pool.query(`
            INSERT INTO ai_feedback (rating, category, feedback_text, user_context, created_at)
            VALUES ($1, $2, $3, $4, NOW())
          `, [feedbackParsed.rating, feedbackParsed.category, message, userId || 'anonymous']);
        } catch (error) {
          console.log('Could not store feedback in database:', error instanceof Error ? error.message : 'Unknown error');
        }
        
        // Return thank you response for feedback
        const thankYouMessages = [
          "Thank you for your feedback! Your input helps improve QBOT responses.",
          "Appreciated! Your feedback helps make QBOT better for the maritime community.",
          "Thanks! Your rating helps improve QBOT's maritime expertise.",
          "Great feedback! This helps QBOT provide better technical guidance.",
          "Thank you! Your input is valuable for enhancing QBOT's responses."
        ];
        
        const thankYouMessage = thankYouMessages[Math.floor(Math.random() * thankYouMessages.length)];
        
        return res.json({
          response: thankYouMessage,
          feedbackReceived: true,
          rating: feedbackParsed.rating,
          category: feedbackParsed.category,
          timestamp: new Date().toISOString()
        });
      }

      // Get user info if authenticated
      let user = null;
      if (userId) {
        try {
          const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
          user = userResult.rows[0];
        } catch (error) {
          console.log('User not found or not authenticated, proceeding without user context');
        }
      }

      // CHECK 20 FREE QUESTIONS LIMIT FOR AUTHENTICATED USERS
      if (user) {
        const currentQuestionCount = user.question_count || 0;
        const userType = user.user_type || 'Free'; // Default to Free if not set
        
        // Check if user has reached the 20 free question limit
        if (userType === 'Free' && currentQuestionCount >= 20) {
          console.log(`🚫 Free limit reached for user ${userId}: ${currentQuestionCount}/20 questions`);
          return res.json({
            response: "Free limit is over. Please purchase Premium plan for unlimited web/ whatsapp questions",
            aiModel: 'limit-reached',
            responseTime: 0,
            timestamp: new Date().toISOString(),
            limitReached: true
          });
        }
      }

      // Generate AI response using multi-model selection or dual AI service
      const category = categorizeMessage(message);
      const aiResponse = await generateAIResponse(message, category, user, null, aiModels);
      
      // Store QBOT response in Questions database with SEMM breadcrumb and AI model info
      await storeQBOTResponseInDatabase(message, aiResponse.content, user, [], aiResponse.aiModel, aiResponse.responseTime, aiResponse.tokens);
      
      // Increment user question count for authenticated users
      if (user) {
        await storage.incrementUserQuestionCount(user.id);
      }
      
      console.log(`🤖 QBOT Chat - User: ${message.substring(0, 50)}... | Response: ${aiResponse.content.substring(0, 50)}...`);
      
      // Generate feedback message to append after the technical answer
      const feedbackMessage = FeedbackService.generateCompactFeedbackMessage();
      const responseWithFeedback = `${aiResponse.content}\n\n---\n${feedbackMessage}`;
      
      res.json({ 
        response: responseWithFeedback,
        aiModel: aiResponse.aiModel,
        responseTime: aiResponse.responseTime,
        timestamp: new Date().toISOString(),
        feedbackPrompt: true
      });
      
    } catch (error) {
      console.error('QBOT chat error:', error);
      res.status(500).json({ 
        message: 'Unable to generate response at this time. Please try again.',
        error: 'QBOT_ERROR'
      });
    }
  });

  // Handle user feedback responses
  app.post('/api/qbot/feedback', optionalAuth, async (req, res) => {
    try {
      const { message, questionId } = req.body;
      const userId = req.userId;
      
      if (!message) {
        return res.status(400).json({ message: 'Feedback message is required' });
      }
      
      // Parse the feedback rating
      const feedbackResult = FeedbackService.parseFeedbackRating(message);
      
      if (feedbackResult.rating !== null) {
        // Store the feedback
        await FeedbackService.storeFeedback(
          userId || 'anonymous',
          questionId || 'unknown', 
          feedbackResult.rating.toString(),
          message
        );
        
        // Generate thank you response
        const thankYouMessages = [
          "Thank you for the feedback! 🙏 Your input helps QBOT improve.",
          "Feedback received! 👍 This helps me provide better maritime solutions.",
          "Thanks for rating! ⭐ Your feedback makes QBOT smarter.",
          "Appreciated! 🌊 Your input improves our maritime assistance.",
          "Feedback noted! 🔧 This helps enhance QBOT's technical accuracy."
        ];
        
        const thankYou = thankYouMessages[Math.floor(Math.random() * thankYouMessages.length)];
        
        res.json({ 
          response: thankYou,
          feedbackProcessed: true,
          rating: feedbackResult.rating,
          category: feedbackResult.category
        });
      } else {
        // If feedback format not recognized, ask for clarification
        res.json({ 
          response: "Could you rate the previous answer? Use ⭐⭐⭐⭐⭐ (1-5 stars) or 'Excellent/Good/Poor'",
          feedbackProcessed: false
        });
      }
      
    } catch (error) {
      console.error('Feedback processing error:', error);
      res.status(500).json({ 
        message: 'Unable to process feedback at this time.',
        error: 'FEEDBACK_ERROR'
      });
    }
  });

  // Get feedback analytics (admin only)
  app.get('/api/admin/feedback-stats', authenticateToken, async (req, res) => {
    try {
      const stats = await FeedbackService.getFeedbackStats();
      res.json(stats);
    } catch (error) {
      console.error('Feedback stats error:', error);
      res.status(500).json({ message: 'Failed to get feedback statistics' });
    }
  });

  // ==== GLOSSARY API ENDPOINTS ====
  
  // Get all "what is" questions for shipping dictionary with pagination
  app.get('/api/glossary/what-is', async (req, res) => {
    // Set JSON content type first
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('📚 Fetching "what is" questions for glossary');
      
      // Extract pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 60; // Show 60 entries initially, then 30 per page
      const offset = (page - 1) * limit;
      
      // Test database connection first
      await pool.query('SELECT 1');
      
      // Count total entries first with error handling
      const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE LOWER(q.content) LIKE '%what is%'
          AND a.content IS NOT NULL
          AND LENGTH(a.content) > 10
          AND q.content NOT LIKE '%[ARCHIVED]%'
          AND (q.is_hidden = false OR q.is_hidden IS NULL)
      `);
      
      const total = parseInt(countResult.rows[0]?.total || '0');
      
      if (total === 0) {
        console.log('⚠️ No glossary entries found in database');
        return res.json({
          success: true,
          entries: [],
          pagination: {
            page,
            limit,
            total: 0,
            hasMore: false,
            totalPages: 0
          }
        });
      }
      
      // Query database for questions that start with "what is" with pagination
      const result = await pool.query(`
        SELECT 
          q.id,
          q.content as question,
          a.content as answer,
          q.created_at as timestamp
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE LOWER(q.content) LIKE '%what is%'
          AND a.content IS NOT NULL
          AND LENGTH(a.content) > 10
          AND q.content NOT LIKE '%[ARCHIVED]%'
          AND (q.is_hidden = false OR q.is_hidden IS NULL)
        ORDER BY q.content ASC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      const entries = result.rows.map(row => {
        // Clean the answer by removing common redundant phrases
        let cleanAnswer = row.answer;
        
        // Remove phrases like "based on my studies", "in my opinion", etc.
        const phrasesToRemove = [
          /based on my studies,?\s*/gi,
          /in my opinion,?\s*/gi,
          /from my experience,?\s*/gi,
          /according to my knowledge,?\s*/gi,
          /as far as i know,?\s*/gi,
          /i believe that,?\s*/gi,
          /i think that,?\s*/gi,
          /it is my understanding that,?\s*/gi,
          /personally,?\s*/gi,
          /generally speaking,?\s*/gi
        ];
        
        phrasesToRemove.forEach(phrase => {
          cleanAnswer = cleanAnswer.replace(phrase, '');
        });
        
        // Clean up any double spaces and trim
        cleanAnswer = cleanAnswer.replace(/\s+/g, ' ').trim();
        
        // Capitalize first letter if it was lowercased after cleaning
        if (cleanAnswer.length > 0) {
          cleanAnswer = cleanAnswer.charAt(0).toUpperCase() + cleanAnswer.slice(1);
        }
        
        return {
          id: row.id.toString(),
          question: row.question,
          answer: cleanAnswer,
          category: 'General',
          timestamp: row.timestamp,
          attachments: []
        };
      });
      
      console.log(`✅ Found ${entries.length} glossary entries (page ${page}, total: ${total})`);
      
      res.json({
        success: true,
        entries: entries,
        pagination: {
          page,
          limit,
          total,
          hasMore: offset + limit < total,
          totalPages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      console.error('🚨 Glossary fetch error:', error);
      
      // Ensure we always return JSON, never HTML error pages
      try {
        res.status(200).json({ 
          success: false,
          message: 'Database connection error - please refresh page',
          error: error instanceof Error ? error.message : String(error),
          entries: [],
          pagination: {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 60,
            total: 0,
            hasMore: false,
            totalPages: 0
          }
        });
      } catch (jsonError) {
        console.error('🚨 Failed to send JSON error response:', jsonError);
        // Last resort: send plain text
        res.status(200).send('{"success":false,"message":"Service temporarily unavailable","entries":[]}');
      }
    }
  });

  // Archive glossary entry (admin only)
  app.post('/api/glossary/archive/:id', authenticateToken, async (req, res) => {
    try {
      const entryId = req.params.id;
      const userId = req.userId;
      
      // Check if user is admin
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      
      if (!user || !user.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Admin privileges required to archive entries'
        });
      }
      
      // Archive the entry by adding archived flag - use upsert approach
      const result = await pool.query(`
        UPDATE questions 
        SET content = content || ' [ARCHIVED]'
        WHERE id = $1 AND content NOT LIKE '%[ARCHIVED]%'
        RETURNING id, content
      `, [entryId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Glossary entry not found'
        });
      }
      
      console.log(`📚 Admin ${userId} archived glossary entry ${entryId}: ${result.rows[0].content.substring(0, 50)}...`);
      
      res.json({
        success: true,
        message: 'Entry archived successfully',
        archivedEntry: result.rows[0]
      });
      
    } catch (error) {
      console.error('Archive glossary entry error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to archive entry'
      });
    }
  });

  // Merge duplicate glossary entries (admin only)
  app.post('/api/glossary/merge-duplicates', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      
      // Check if user is admin - use the storage method for consistency
      const user = await storage.getUser(userId);
      console.log('Merge duplicates - user check:', { userId, user: !!user, isAdmin: user?.isAdmin });
      
      if (!user || !user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Admin privileges required to merge duplicates'
        });
      }
      
      console.log('🔍 Finding duplicate maritime definitions...');
      
      // Get all glossary entries with extracted terms
      const result = await pool.query(`
        SELECT 
          q.id,
          q.content as question,
          a.content as answer,
          q.created_at,
          CASE 
            WHEN LOWER(q.content) LIKE '%what is a %' THEN TRIM(REPLACE(SUBSTRING(q.content FROM POSITION('what is a ' IN LOWER(q.content)) + 9), '?', ''))
            WHEN LOWER(q.content) LIKE '%what is an %' THEN TRIM(REPLACE(SUBSTRING(q.content FROM POSITION('what is an ' IN LOWER(q.content)) + 10), '?', ''))
            WHEN LOWER(q.content) LIKE '%what is the %' THEN TRIM(REPLACE(SUBSTRING(q.content FROM POSITION('what is the ' IN LOWER(q.content)) + 11), '?', ''))
            WHEN LOWER(q.content) LIKE '%what is %' THEN TRIM(REPLACE(SUBSTRING(q.content FROM POSITION('what is ' IN LOWER(q.content)) + 8), '?', ''))
            ELSE q.content
          END as extracted_term
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE LOWER(q.content) LIKE '%what is%'
          AND a.content IS NOT NULL
          AND LENGTH(a.content) > 10
          AND q.content NOT LIKE '%[ARCHIVED]%'
        ORDER BY extracted_term ASC
      `);
      
      console.log(`📚 Found ${result.rows.length} total glossary entries`);
      
      // Group by normalized term
      const termGroups = {};
      
      result.rows.forEach(row => {
        const normalizedTerm = row.extracted_term.toLowerCase()
          .replace(/[?.,!]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (!termGroups[normalizedTerm]) {
          termGroups[normalizedTerm] = [];
        }
        termGroups[normalizedTerm].push(row);
      });
      
      // Find duplicates
      const duplicateGroups = Object.entries(termGroups)
        .filter(([term, entries]) => entries.length > 1);
      
      console.log(`🔗 Found ${duplicateGroups.length} terms with duplicates`);
      
      let mergedCount = 0;
      let archivedCount = 0;
      
      for (const [term, entries] of duplicateGroups) {
        console.log(`📝 Processing: ${term.toUpperCase()} (${entries.length} duplicates)`);
        
        // Sort by answer quality and recency
        entries.sort((a, b) => {
          // Prefer longer, more detailed answers
          const aScore = a.answer.length + (a.answer.includes('•') ? 100 : 0);
          const bScore = b.answer.length + (b.answer.includes('•') ? 100 : 0);
          
          if (Math.abs(aScore - bScore) > 50) {
            return bScore - aScore; // Better answer first
          }
          
          // If similar quality, prefer newer
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        const bestEntry = entries[0];
        const duplicatesToArchive = entries.slice(1);
        
        console.log(`  ✅ Keeping: ID ${bestEntry.id} (${bestEntry.answer.length} chars)`);
        
        // Archive duplicate entries
        for (const duplicate of duplicatesToArchive) {
          try {
            await pool.query(`
              UPDATE questions 
              SET content = content || ' [ARCHIVED-DUPLICATE]'
              WHERE id = $1 AND content NOT LIKE '%[ARCHIVED]%'
            `, [duplicate.id]);
            
            archivedCount++;
            console.log(`    🗃️ Archived duplicate: ID ${duplicate.id}`);
          } catch (error) {
            console.error(`    ❌ Failed to archive ID ${duplicate.id}:`, error.message);
          }
        }
        
        mergedCount++;
      }
      
      console.log(`✅ Merge completed! Processed ${mergedCount} terms, archived ${archivedCount} duplicates`);
      
      res.json({
        success: true,
        message: `Successfully merged duplicates`,
        summary: {
          totalEntries: result.rows.length,
          duplicateGroups: duplicateGroups.length,
          termsProcessed: mergedCount,
          duplicatesArchived: archivedCount,
          finalUniqueTerms: result.rows.length - archivedCount
        }
      });
      
    } catch (error) {
      console.error('Merge duplicates error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to merge duplicates'
      });
    }
  });

  // Clean up definitions - remove redundant phrases (admin only)
  app.post('/api/glossary/cleanup-definitions', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      
      // Check if user is admin
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      
      if (!user || !user.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Admin privileges required to cleanup definitions'
        });
      }
      
      console.log('🧹 Cleaning up redundant phrases from definitions...');
      
      // Find answers with redundant phrases
      const result = await pool.query(`
        SELECT 
          a.id as answer_id,
          a.content as answer,
          q.id as question_id,
          q.content as question
        FROM answers a
        JOIN questions q ON q.id = a.question_id
        WHERE LOWER(q.content) LIKE '%what is%'
          AND (
            LOWER(a.content) LIKE '%based on my studies%' OR
            LOWER(a.content) LIKE '%from my experience%' OR
            LOWER(a.content) LIKE '%in my opinion%' OR
            LOWER(a.content) LIKE '%according to my knowledge%' OR
            LOWER(a.content) LIKE '%from what i know%' OR
            LOWER(a.content) LIKE '%as far as i know%'
          )
          AND q.content NOT LIKE '%[ARCHIVED]%'
      `);
      
      console.log(`📝 Found ${result.rows.length} definitions with redundant phrases`);
      
      let cleanedCount = 0;
      const redundantPhrases = [
        /based on my studies,?\s*/gi,
        /from my experience,?\s*/gi,  
        /in my opinion,?\s*/gi,
        /according to my knowledge,?\s*/gi,
        /from what i know,?\s*/gi,
        /as far as i know,?\s*/gi,
        /from my understanding,?\s*/gi,
        /as i understand it,?\s*/gi,
        /to my knowledge,?\s*/gi
      ];
      
      for (const row of result.rows) {
        let cleanedContent = row.answer;
        let hasChanges = false;
        
        // Remove redundant phrases
        for (const phrase of redundantPhrases) {
          const originalContent = cleanedContent;
          cleanedContent = cleanedContent.replace(phrase, '');
          if (originalContent !== cleanedContent) {
            hasChanges = true;
          }
        }
        
        // Clean up extra whitespace and fix capitalization
        if (hasChanges) {
          cleanedContent = cleanedContent
            .replace(/^\s+/g, '') // Remove leading whitespace
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .trim();
          
          // Capitalize first letter if needed
          if (cleanedContent.length > 0) {
            cleanedContent = cleanedContent.charAt(0).toUpperCase() + cleanedContent.slice(1);
          }
          
          try {
            await pool.query(`
              UPDATE answers 
              SET content = $1
              WHERE id = $2
            `, [cleanedContent, row.answer_id]);
            
            cleanedCount++;
            console.log(`✅ Cleaned definition for: ${row.question.substring(0, 50)}...`);
          } catch (error) {
            console.error(`❌ Failed to clean answer ID ${row.answer_id}:`, error.message);
          }
        }
      }
      
      console.log(`✅ Cleanup completed! Cleaned ${cleanedCount} definitions`);
      
      res.json({
        success: true,
        message: `Successfully cleaned definitions`,
        summary: {
          totalFound: result.rows.length,
          definitionsCleaned: cleanedCount,
          phrasesRemoved: redundantPhrases.length
        }
      });
      
    } catch (error) {
      console.error('Cleanup definitions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup definitions'
      });
    }
  });

  // ==== GLOSSARY AUTO-UPDATE ADMIN ENDPOINTS ====
  
  // Admin endpoint to manually trigger glossary update
  app.post('/api/admin/glossary/update', authenticateToken, async (req, res) => {
    try {
      console.log('🔧 Manual glossary update triggered by admin');
      
      // Get count before update
      const beforeCountResult = await pool.query('SELECT COUNT(*) as count FROM shipping_dictionary');
      const beforeCount = parseInt(beforeCountResult.rows[0].count);
      
      // Import the glossary auto-updater dynamically
      const { glossaryAutoUpdater } = await import('./glossary-auto-update');
      await glossaryAutoUpdater.manualUpdate();
      
      // Get count after update
      const afterCountResult = await pool.query('SELECT COUNT(*) as count FROM shipping_dictionary');
      const afterCount = parseInt(afterCountResult.rows[0].count);
      
      const newKeywordsAdded = afterCount - beforeCount;
      
      res.json({
        success: true,
        message: 'Glossary update completed successfully',
        newKeywordsAdded: newKeywordsAdded,
        totalKeywords: afterCount,
        previousTotal: beforeCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Manual glossary update failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update glossary',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin endpoint to get glossary update status and statistics
  app.get('/api/admin/glossary/status', authenticateToken, async (req, res) => {
    try {
      // Import both services dynamically
      const { glossaryAutoUpdater } = await import('./glossary-auto-update');
      const { getGlossaryStats } = await import('./setup-glossary-db');
      
      const status = glossaryAutoUpdater.getStatus();
      const stats = await getGlossaryStats();
      
      res.json({
        success: true,
        status: {
          ...status,
          statistics: stats
        }
      });
    } catch (error) {
      console.error('❌ Failed to get glossary status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get glossary status'
      });
    }
  });

  // ==== MACHINE TREE EXPORT API ENDPOINTS ====
  
  // Export maritime system categories
  app.get('/api/export/categories', async (req, res) => {
    try {
      const categories = [
        { id: 'a', code: 'a', name: 'Propulsion', description: 'Main engines, gearboxes, propellers, and shaft systems', count: 45 },
        { id: 'b', code: 'b', name: 'Power Generation', description: 'Generators, auxiliary engines, and electrical systems', count: 38 },
        { id: 'c', code: 'c', name: 'Boiler', description: 'Steam generation, exhaust gas boilers, and heating systems', count: 19 },
        { id: 'd', code: 'd', name: 'Fresh Water & Cooling', description: 'Fresh water generators, coolers, and water treatment systems', count: 32 },
        { id: 'e', code: 'e', name: 'Pumps & Auxiliary', description: 'Various pumps, compressors, and auxiliary equipment', count: 67 },
        { id: 'f', code: 'f', name: 'Compressed Air Systems', description: 'Air compressors, bottles, and pneumatic systems', count: 28 },
        { id: 'g', code: 'g', name: 'Oil Purification', description: 'Purifiers, separators, and fuel treatment systems', count: 22 },
        { id: 'h', code: 'h', name: 'Cargo Systems', description: 'Cargo pumps, handling equipment, and tank systems', count: 41 },
        { id: 'i', code: 'i', name: 'Safety & Fire Fighting', description: 'LSA, FFA, emergency equipment, and safety systems', count: 35 },
        { id: 'j', code: 'j', name: 'Crane & Deck Equipment', description: 'Cranes, winches, and deck machinery', count: 25 },
        { id: 'k', code: 'k', name: 'Navigation Systems', description: 'Radar, GPS, ECDIS, and communication equipment', count: 30 },
        { id: 'l', code: 'l', name: 'Automation & Control', description: 'Control systems, alarms, and monitoring equipment', count: 33 },
        { id: 'm', code: 'm', name: 'HVAC Systems', description: 'Air conditioning, ventilation, and refrigeration', count: 24 },
        { id: 'n', code: 'n', name: 'Pollution Control', description: 'BWMS, scrubbers, incinerators, and environmental systems', count: 26 },
        { id: 'o', code: 'o', name: 'Hull & Structure', description: 'Structural components, coatings, and hull equipment', count: 18 },
        { id: 'p', code: 'p', name: 'Accommodation', description: 'Galley equipment, laundry, and living quarters systems', count: 15 },
        { id: 'q', code: 'q', name: 'Workshop Equipment', description: 'Machine shop tools, welding, and maintenance equipment', count: 12 },
        { id: 'r', code: 'r', name: 'Communication Systems', description: 'Radio, satellite communication, and data systems', count: 16 },
        { id: 's', code: 's', name: 'Spare Parts & Consumables', description: 'General spares, consumables, and maintenance items', count: 89 }
      ];
      
      console.log('📊 Export categories endpoint called - returning 19 maritime system categories');
      res.json(categories);
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // Export equipment subcategories (formerly makes)
  app.get('/api/export/makes', async (req, res) => {
    try {
      // Equipment subcategories with alphabetical codes
      const equipment = [
        // a. Propulsion Equipment
        { id: 'a.a', code: 'a.a', name: 'Main Engine', category: 'a', description: 'Primary propulsion engines', count: 15 },
        { id: 'a.b', code: 'a.b', name: 'Stern Tube', category: 'a', description: 'Shaft bearing and sealing systems', count: 8 },
        { id: 'a.c', code: 'a.c', name: 'Propeller', category: 'a', description: 'Fixed and controllable pitch propellers', count: 12 },
        { id: 'a.d', code: 'a.d', name: 'Bow Thruster', category: 'a', description: 'Tunnel and azimuth thrusters', count: 6 },
        { id: 'a.e', code: 'a.e', name: 'Shaft Generator', category: 'a', description: 'Power take-off systems', count: 4 },
        
        // b. Power Generation Equipment
        { id: 'b.a', code: 'b.a', name: 'Aux Engine', category: 'b', description: 'Auxiliary diesel engines', count: 18 },
        { id: 'b.b', code: 'b.b', name: 'Turbocharger', category: 'b', description: 'Engine turbocharging systems', count: 10 },
        { id: 'b.c', code: 'b.c', name: 'Alternator', category: 'b', description: 'AC generators and alternators', count: 7 },
        { id: 'b.d', code: 'b.d', name: 'Switchboard', category: 'b', description: 'Main and emergency switchboards', count: 3 },
        { id: 'b.e', code: 'b.e', name: 'Emergency Generator', category: 'b', description: 'Emergency power systems', count: 5 },
        
        // c. Boiler Equipment
        { id: 'c.a', code: 'c.a', name: 'Auxiliary Boiler', category: 'c', description: 'Oil-fired auxiliary boilers', count: 8 },
        { id: 'c.b', code: 'c.b', name: 'Burner', category: 'c', description: 'Boiler burner systems', count: 5 },
        { id: 'c.c', code: 'c.c', name: 'Composite Boiler', category: 'c', description: 'Exhaust gas and oil-fired boilers', count: 4 },
        { id: 'c.d', code: 'c.d', name: 'Exhaust Gas Boiler', category: 'c', description: 'Waste heat recovery boilers', count: 2 }
      ];
      
      console.log('⚙️ Export equipment endpoint called - returning maritime equipment subcategories');
      res.json(equipment);
    } catch (error) {
      console.error('❌ Error fetching makes:', error);
      res.status(500).json({ error: 'Failed to fetch makes' });
    }
  });

  // Export complete machines database
  app.get('/api/export/machines', async (req, res) => {
    try {
      const machines = [
        // a.a Main Engine Machines
        { id: 'w1', name: 'RT-flex96C', equipment: 'a.a', make: 'Wartsila', model: '14RT-flex96C', description: 'Ultra-long stroke engine for large container vessels', shareUrl: '/share/machine/w1' },
        { id: 'm1', name: 'MAN B&W ME-C', equipment: 'a.a', make: 'MAN Energy Solutions', model: '8S50ME-C8.5', description: 'Electronically controlled main engine', shareUrl: '/share/machine/m1' },
        { id: 'mi1', name: 'UEC-LS Engine', equipment: 'a.a', make: 'Mitsubishi Heavy Industries', model: '6UEC52LSE', description: 'Low-speed marine diesel engine', shareUrl: '/share/machine/mi1' },
        
        // a.b Stern Tube Machines
        { id: 'st1', name: 'Simplex Seal', equipment: 'a.b', make: 'Wartsila', model: 'SX-400', description: 'Forward stern tube seal system', shareUrl: '/share/machine/st1' },
        { id: 'st2', name: 'Air Seal System', equipment: 'a.b', make: 'Thordon Bearings', model: 'COMPAC', description: 'Environmental stern tube seal', shareUrl: '/share/machine/st2' },
        
        // a.c Propeller Machines
        { id: 'p1', name: 'CPP System', equipment: 'a.c', make: 'Wartsila', model: 'Aquamaster', description: 'Controllable pitch propeller system', shareUrl: '/share/machine/p1' },
        { id: 'p2', name: 'Fixed Propeller', equipment: 'a.c', make: 'MAN Energy Solutions', model: 'Alpha', description: 'High-efficiency fixed pitch propeller', shareUrl: '/share/machine/p2' },
        
        // a.d Bow Thruster Machines
        { id: 'bt1', name: 'Tunnel Thruster', equipment: 'a.d', make: 'Wartsila', model: 'CT 300', description: 'Electric tunnel thruster system', shareUrl: '/share/machine/bt1' },
        { id: 'bt2', name: 'Azimuth Thruster', equipment: 'a.d', make: 'Rolls-Royce', model: 'UUC 255', description: 'Retractable azimuth thruster', shareUrl: '/share/machine/bt2' },
        
        // b.a Aux Engine Machines
        { id: 'ae1', name: 'W46DF', equipment: 'b.a', make: 'Wartsila', model: '12V46DF', description: 'Dual-fuel auxiliary engine', shareUrl: '/share/machine/ae1' },
        { id: 'ae2', name: 'MAN 51/60DF', equipment: 'b.a', make: 'MAN Energy Solutions', model: '9L51/60DF', description: 'Dual-fuel auxiliary engine for power generation', shareUrl: '/share/machine/ae2' },
        { id: 'ae3', name: 'C280-16', equipment: 'b.a', make: 'Caterpillar Marine', model: 'C280-16', description: 'High-speed auxiliary engine for power generation', shareUrl: '/share/machine/ae3' },
        
        // b.b Turbocharger Machines
        { id: 'tc1', name: 'TPL Turbocharger', equipment: 'b.b', make: 'MAN Energy Solutions', model: 'TCR22', description: 'Two-stage turbocharger system', shareUrl: '/share/machine/tc1' },
        { id: 'tc2', name: 'VTR Turbocharger', equipment: 'b.b', make: 'ABB', model: 'VTR564', description: 'Variable turbine geometry turbocharger', shareUrl: '/share/machine/tc2' },
        
        // b.c Alternator Machines
        { id: 'alt1', name: 'Marine Alternator', equipment: 'b.c', make: 'Stamford', model: 'PI734E', description: 'Brushless marine alternator', shareUrl: '/share/machine/alt1' },
        { id: 'alt2', name: 'Generator Set', equipment: 'b.c', make: 'Caterpillar Marine', model: '3516E', description: 'Marine generator set for auxiliary power', shareUrl: '/share/machine/alt2' },
        
        // c.a Auxiliary Boiler Machines
        { id: 'ab1', name: 'Composite Boiler', equipment: 'c.a', make: 'Hamworthy', model: 'Parat 2000', description: 'Exhaust gas and oil-fired composite boiler', shareUrl: '/share/machine/ab1' },
        { id: 'ab2', name: 'Oil-fired Boiler', equipment: 'c.a', make: 'Aalborg Industries', model: 'AQ-14', description: 'Vertical auxiliary boiler', shareUrl: '/share/machine/ab2' },
        
        // c.b Burner Machines
        { id: 'b1', name: 'Rotary Cup Burner', equipment: 'c.b', make: 'Hamworthy', model: 'Parat RCB', description: 'Rotary cup oil burner system', shareUrl: '/share/machine/b1' },
        { id: 'b2', name: 'Pressure Jet Burner', equipment: 'c.b', make: 'Weishaupt', model: 'WM-G20', description: 'Gas/oil dual fuel burner', shareUrl: '/share/machine/b2' }
        
      ];
      
      console.log('⚙️ Export machines endpoint called - returning complete equipment database with 25+ machines');
      res.json(machines);
    } catch (error) {
      console.error('❌ Error fetching machines:', error);
      res.status(500).json({ error: 'Failed to fetch machines' });
    }
  });

  // ==== SEMM CARDS DEVELOPMENT ENDPOINT ====
  
  // Development endpoint for daughter app team - SEMM cards with share functionality
  app.get('/api/dev/semm-cards', sessionBridge, async (req, res) => {
    try {
      // Query SEMM structure from parent database - single table approach with 4-level hierarchy
      const semmQuery = `
        SELECT DISTINCT 
          sid as system_code,
          system,
          eid as equipment_code,
          equipment,
          mid as make_code,
          make,
          moid as model_code,
          model
        FROM semm_structure 
        ORDER BY sid, eid, mid, moid
      `;
      
      const semmResult = await pool.query(semmQuery);
      const semmData = semmResult.rows;
      
      console.log('🔧 Successfully fetched', semmData.length, 'SEMM records from parent database');
      console.log('🔧 Sample SEMM record:', semmData[0]);
      
      // Group data by system code with code correction mapping
      const systemsMap = new Map();
      semmData.forEach(record => {
        if (!systemsMap.has(record.system_code)) {
          // Fix data integrity issue: system "s" should have code "z" since title is "z. Miscellaneous"
          let correctedCode = record.system_code;
          if (record.system_code === 's' && record.system && record.system.startsWith('z.')) {
            correctedCode = 'z';
          }
          
          systemsMap.set(record.system_code, {
            code: correctedCode,
            title: record.system,
            equipment: []
          });
        }
        
        if (record.equipment_code && record.equipment) {
          const system = systemsMap.get(record.system_code);
          // Check if equipment already exists to avoid duplicates
          let equipment = system.equipment.find(eq => eq.code === record.equipment_code);
          if (!equipment) {
            equipment = {
              code: record.equipment_code,
              title: record.equipment,
              makes: []
            };
            system.equipment.push(equipment);
          }
          
          // Add make and model data if available
          if (record.make_code && record.make) {
            let make = equipment.makes.find(m => m.code === record.make_code);
            if (!make) {
              make = {
                code: record.make_code,
                title: record.make,
                models: []
              };
              equipment.makes.push(make);
            }
            
            if (record.model_code && record.model) {
              const modelExists = make.models.find(m => m.code === record.model_code);
              if (!modelExists) {
                make.models.push({
                  code: record.model_code,
                  title: record.model
                });
              }
            }
          }
        }
      });
      
      // Build SEMM cards from parent database structure
      const semmCards = Array.from(systemsMap.values()).map((system) => {
        return {
          id: system.code,
          type: 'system',
          code: system.code,
          title: system.title,
          description: `${system.title} maritime system with ${system.equipment.length} equipment types`,
          count: system.equipment.length,
          hasHeartIcon: false,
          hasShareIcon: true,
          hasChevron: true,
          equipment: system.equipment.map(eq => ({
            id: eq.code,
            type: 'equipment',
            code: eq.code,
            title: eq.title,
            description: `${eq.title} equipment with ${eq.makes.length} manufacturers`,
            systemCode: system.code,
            count: eq.makes.reduce((sum, make) => sum + make.models.length, 0),
            hasHeartIcon: false,
            hasShareIcon: true,
            hasChevron: true,
            makes: eq.makes.map(make => ({
              id: make.code,
              type: 'make',
              code: make.code,
              title: make.title,
              description: `${make.title} manufacturer with ${make.models.length} models`,
              equipmentCode: eq.code,
              count: make.models.length,
              hasHeartIcon: false,
              hasShareIcon: true,
              hasChevron: true,
              models: make.models.map(model => ({
                id: model.code,
                type: 'model',
                code: model.code,
                title: model.title,
                description: `${model.title} model`,
                makeCode: make.code,
                count: 1,
                hasHeartIcon: false,
                hasShareIcon: true,
                hasChevron: false
              }))
            }))
          }))
        };
      });
      
      const totalEquipment = semmCards.reduce((sum, system) => sum + system.equipment.length, 0);
      const totalMakes = semmCards.reduce((sum, system) => sum + system.equipment.reduce((eqSum, eq) => eqSum + eq.makes.length, 0), 0);
      const totalModels = semmCards.reduce((sum, system) => sum + system.equipment.reduce((eqSum, eq) => eqSum + eq.makes.reduce((makeSum, make) => makeSum + make.models.length, 0), 0), 0);
      
      console.log('🔧 SEMM Cards endpoint called - returning', semmCards.length, 'systems,', totalEquipment, 'equipment,', totalMakes, 'makes,', totalModels, 'models from parent database');
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        version: '4.0',
        source: 'parent_semm_database',
        totalSystems: semmCards.length,
        totalEquipment: totalEquipment,
        totalMakes: totalMakes,
        totalModels: totalModels,
        data: semmCards,
        usage: {
          endpoint: '/api/dev/semm-cards',
          description: 'SEMM (System-Equipment-Make-Model) cards with complete 4-level hierarchy from parent database',
          features: ['Parent database integration', 'Complete S-E-M-M 4-level hierarchy', 'SID-EID-MID-MOID code structure', 'Maritime equipment classification'],
          compatibility: 'Parent database SEMM structure with MID and MOID codes'
        }
      });
    } catch (error) {
      console.error('❌ Error fetching SEMM cards from parent database:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch SEMM data from parent database',
        timestamp: new Date().toISOString(),
        message: 'SEMM table must be created in parent database first'
      });
    }
  });

  // ==== SEMM REORDER ENDPOINTS ====
  
  // Reorder Systems
  app.post('/api/dev/semm/reorder-systems', sessionBridge, async (req, res) => {
    try {
      const { orderedCodes } = req.body;
      
      if (!Array.isArray(orderedCodes) || orderedCodes.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'orderedCodes must be a non-empty array' 
        });
      }
      
      console.log('🔄 Reordering systems:', orderedCodes);
      
      // Update the order for each system by modifying their sort order
      for (let i = 0; i < orderedCodes.length; i++) {
        await pool.query(`
          UPDATE semm_structure 
          SET system_order = $1 
          WHERE sid = $2
        `, [i + 1, orderedCodes[i]]);
      }
      
      console.log('✅ Successfully reordered systems');
      res.json({ success: true, message: 'Systems reordered successfully' });
      
    } catch (error) {
      console.error('❌ Error reordering systems:', error);
      res.status(500).json({ success: false, error: 'Failed to reorder systems' });
    }
  });
  
  // Reorder Equipment within a System
  app.post('/api/dev/semm/reorder-equipment', sessionBridge, async (req, res) => {
    try {
      const { systemCode, orderedCodes } = req.body;
      
      if (!systemCode || !Array.isArray(orderedCodes) || orderedCodes.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'systemCode and orderedCodes are required' 
        });
      }
      
      console.log('🔄 Reordering equipment in system', systemCode, ':', orderedCodes);
      
      // Generate new equipment codes based on position
      const generateEquipmentCode = (index: number): string => {
        const letter = String.fromCharCode(97 + index); // a, b, c, etc.
        return `${systemCode}${letter}`; // aa, ab, ac for system a
      };
      
      // Step 1: Update equipment codes first, using temporary codes to avoid conflicts
      for (let i = 0; i < orderedCodes.length; i++) {
        await pool.query(`
          UPDATE semm_structure 
          SET eid = $1, equipment_order = $2
          WHERE sid = $3 AND eid = $4
        `, [`temp_eq_${i}`, i + 1, systemCode, orderedCodes[i]]);
      }
      
      // Step 2: Update to final equipment codes and regenerate make codes
      for (let i = 0; i < orderedCodes.length; i++) {
        const newEquipmentCode = generateEquipmentCode(i);
        console.log(`🔄 Updating equipment: ${orderedCodes[i]} -> ${newEquipmentCode}`);
        
        // Get all makes for this equipment to regenerate their codes
        const makesResult = await pool.query(`
          SELECT mid, make, make_order 
          FROM semm_structure 
          WHERE sid = $1 AND eid = $2 
          ORDER BY make_order ASC
        `, [systemCode, `temp_eq_${i}`]);
        
        const makes = makesResult.rows;
        
        // Update equipment code
        await pool.query(`
          UPDATE semm_structure 
          SET eid = $1
          WHERE sid = $2 AND eid = $3
        `, [newEquipmentCode, systemCode, `temp_eq_${i}`]);
        
        // Regenerate make codes for this equipment
        for (let j = 0; j < makes.length; j++) {
          const newMakeCode = `${systemCode}${newEquipmentCode.slice(1)}${String.fromCharCode(97 + j)}`;
          console.log(`🔄 Updating make: ${makes[j].mid} -> ${newMakeCode}`);
          
          await pool.query(`
            UPDATE semm_structure 
            SET mid = $1 
            WHERE sid = $2 AND eid = $3 AND mid = $4
          `, [newMakeCode, systemCode, newEquipmentCode, makes[j].mid]);
        }
      }
      
      console.log('✅ Successfully reordered equipment and regenerated codes');
      res.json({ success: true, message: 'Equipment reordered successfully with updated codes' });
      
    } catch (error) {
      console.error('❌ Error reordering equipment:', error);
      res.status(500).json({ success: false, error: 'Failed to reorder equipment' });
    }
  });
  
  // Reorder Makes within an Equipment
  app.post('/api/dev/semm/reorder-makes', sessionBridge, async (req, res) => {
    try {
      const { systemCode, equipmentCode, orderedMakes } = req.body;
      
      if (!systemCode || !equipmentCode || !Array.isArray(orderedMakes) || orderedMakes.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'systemCode, equipmentCode, and orderedMakes are required' 
        });
      }
      
      console.log('🔄 Reordering makes in equipment', equipmentCode);
      console.log('🔄 New order:', orderedMakes.map(m => `${m.makeName} (${m.oldCode} -> position ${m.newPosition})`));
      
      // Generate new alphabetical codes based on position
      const generateMakeCode = (index: number): string => {
        const letter = String.fromCharCode(97 + index); // a, b, c, etc.
        return `${equipmentCode}${letter}`; // aaa, aab, aac for equipment aa
      };
      
      // Process each make in the desired order
      for (let i = 0; i < orderedMakes.length; i++) {
        const make = orderedMakes[i];
        const newCode = generateMakeCode(i);
        
        console.log(`🔄 Updating ${make.makeName}: ${make.oldCode} -> ${newCode}`);
        
        // First, update to a temporary code to avoid conflicts
        await pool.query(`
          UPDATE semm_structure 
          SET mid = $1
          WHERE sid = $2 AND eid = $3 AND mid = $4
        `, [`tmp${i}`, systemCode, equipmentCode, make.oldCode]);
      }
      
      // Now update with final codes
      for (let i = 0; i < orderedMakes.length; i++) {
        const newCode = generateMakeCode(i);
        
        await pool.query(`
          UPDATE semm_structure 
          SET mid = $1, make_order = $2 
          WHERE sid = $3 AND eid = $4 AND mid = $5
        `, [newCode, i + 1, systemCode, equipmentCode, `tmp${i}`]);
      }
      
      console.log('✅ Successfully reordered makes with new codes');
      res.json({ success: true, message: 'Makes reordered successfully' });
      
    } catch (error) {
      console.error('❌ Error reordering makes:', error);
      res.status(500).json({ success: false, error: 'Failed to reorder makes' });
    }
  });
  
  // Reorder Models within a Make
  app.post('/api/dev/semm/reorder-models', sessionBridge, async (req, res) => {
    try {
      const { systemCode, equipmentCode, makeCode, orderedModels } = req.body;
      
      if (!systemCode || !equipmentCode || !makeCode || !Array.isArray(orderedModels) || orderedModels.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'systemCode, equipmentCode, makeCode, and orderedModels are required' 
        });
      }
      
      console.log('🔄 Reordering models in make', makeCode);
      console.log('🔄 New order:', orderedModels.map(m => `${m.modelName} (${m.oldCode} -> position ${m.newPosition})`));
      
      // Generate new alphabetical codes based on position
      const generateModelCode = (index: number): string => {
        const letter = String.fromCharCode(97 + index); // a, b, c, etc.
        return `${makeCode}${letter}`; // aaaa, aaab, aaac for make aaa
      };
      
      // Process each model in the desired order
      for (let i = 0; i < orderedModels.length; i++) {
        const model = orderedModels[i];
        const newCode = generateModelCode(i);
        
        console.log(`🔄 Updating ${model.modelName}: ${model.oldCode} -> ${newCode}`);
        
        // First, update to a temporary code to avoid conflicts
        await pool.query(`
          UPDATE semm_structure 
          SET moid = $1
          WHERE sid = $2 AND eid = $3 AND mid = $4 AND moid = $5
        `, [`tmp${i}`, systemCode, equipmentCode, makeCode, model.oldCode]);
      }
      
      // Now update with final codes
      for (let i = 0; i < orderedModels.length; i++) {
        const newCode = generateModelCode(i);
        
        await pool.query(`
          UPDATE semm_structure 
          SET moid = $1, model_order = $2 
          WHERE sid = $3 AND eid = $4 AND mid = $5 AND moid = $6
        `, [newCode, i + 1, systemCode, equipmentCode, makeCode, `tmp${i}`]);
      }
      
      console.log('✅ Successfully reordered models with new codes');
      res.json({ success: true, message: 'Models reordered successfully' });
      
    } catch (error) {
      console.error('❌ Error reordering models:', error);
      res.status(500).json({ success: false, error: 'Failed to reorder models' });
    }
  });


  // Add machine share route
  app.get('/share/machine/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // In a real implementation, you'd fetch machine details from database
      // For now, return a basic HTML page with machine info
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Maritime Equipment - ${id}</title>
          <meta name="description" content="View details about this maritime equipment piece">
          <meta property="og:title" content="Maritime Equipment - ${id}">
          <meta property="og:description" content="Explore maritime equipment specifications and details">
          <meta property="og:type" content="website">
        </head>
        <body>
          <script>
            // Redirect to main app with machine details
            window.location.href = '/machine-tree?machine=${id}';
          </script>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error) {
      console.error('❌ Error serving machine share page:', error);
      res.status(500).send('Error loading machine details');
    }
  });

  // ==== WATI WHATSAPP BOT INTEGRATION ====
  
  // WATI webhook endpoint for incoming WhatsApp messages
  app.post('/api/wati/webhook', async (req, res) => {
    try {
      const messageData = req.body;
      console.log('📱 WATI Webhook received:', JSON.stringify(messageData, null, 2));
      
      // Process the message asynchronously
      watiBotService.processIncomingMessage(messageData).catch(error => {
        console.error('❌ WATI: Error processing webhook:', error);
      });
      
      // Respond immediately to acknowledge receipt
      res.json({ status: 'received', timestamp: new Date().toISOString() });
      
    } catch (error) {
      console.error('❌ WATI Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Test endpoint to simulate WATI messages (for development)
  app.post('/api/wati/test-message', async (req, res) => {
    try {
      const { phone, message } = req.body;
      
      if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
      }
      
      const testMessageData = {
        phone: phone,
        name: 'Test User',
        type: 'text' as const,
        text: message
      };
      
      await watiBotService.processIncomingMessage(testMessageData);
      
      res.json({ 
        success: true, 
        message: 'Test message processed',
        data: testMessageData
      });
      
    } catch (error) {
      console.error('❌ WATI Test message error:', error);
      res.status(500).json({ error: 'Test message processing failed' });
    }
  });

  // Initialize WATI bot database tables
  app.post('/api/wati/initialize', authenticateToken, async (req, res) => {
    try {
      await watiBotService.initializeTables();
      res.json({ success: true, message: 'WATI bot initialized successfully' });
    } catch (error) {
      console.error('❌ WATI initialization error:', error);
      res.status(500).json({ error: 'WATI initialization failed' });
    }
  });

  // ==== QAAQ STORE API ENDPOINTS ====
  
  // Create Razorpay order for Qaaq Store
  app.post('/api/qaaq-store/create-order', authenticateToken, async (req, res) => {
    try {
      const { items, totalAmount, currency, deliveryLocation, shipSchedule, storeLocation } = req.body;
      const userId = req.userId;

      // Mock Razorpay integration (replace with actual Razorpay when keys are provided)
      const mockOrderId = `order_${Date.now()}`;
      
      // In production, you would create a real Razorpay order here:
      // const Razorpay = require('razorpay');
      // const razorpay = new Razorpay({
      //   key_id: process.env.RAZORPAY_KEY_ID,
      //   key_secret: process.env.RAZORPAY_KEY_SECRET,
      // });
      // 
      // const order = await razorpay.orders.create({
      //   amount: totalAmount * 100, // Convert to paise
      //   currency: currency,
      //   receipt: `qaaq_${userId}_${Date.now()}`,
      //   payment_capture: 1
      // });

      // Log order for store processing
      console.log('New Qaaq Store Order:', {
        userId,
        orderId: mockOrderId,
        items: items.map((item: any) => ({ name: item.name, quantity: item.quantity, price: item.price })),
        totalAmount,
        deliveryLocation,
        shipSchedule,
        storeLocation,
        timestamp: new Date().toISOString()
      });

      res.json({
        razorpayOrderId: mockOrderId,
        amount: totalAmount * 100, // In paise for Razorpay
        currency: currency,
        message: "Order created successfully. Store will prepare items for delivery."
      });

    } catch (error) {
      console.error('Qaaq Store order creation error:', error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Get user's Qaaq Store orders
  app.get('/api/qaaq-store/orders', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      
      // Mock orders data (in production, fetch from database)
      const mockOrders = [
        {
          id: `order_${Date.now() - 86400000}`,
          items: [
            { name: "Maritime Safety Kit", quantity: 1, price: 2500 },
            { name: "Local SIM Card & Data Plan", quantity: 2, price: 800 }
          ],
          totalAmount: 4100,
          status: "preparing",
          deliveryLocation: "Mumbai Port, India",
          storeLocation: "Colaba",
          shipArrival: "2025-02-15",
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      res.json(mockOrders);
    } catch (error) {
      console.error('Get Qaaq Store orders error:', error);
      res.status(500).json({ message: "Failed to get orders" });
    }
  });

  // Update order status (for store management)
  app.patch('/api/qaaq-store/orders/:orderId/status', authenticateToken, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      // In production, update database with new status
      console.log(`Order ${orderId} status updated to: ${status}`);
      
      res.json({ message: "Order status updated successfully" });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Chat connection endpoints (JWT Auth)
  app.post('/api/chat/connect-jwt', authenticateToken, async (req, res) => {
    try {
      const { receiverId } = req.body;
      const senderId = req.userId;
      
      console.log('🔗 Chat connect (JWT) attempt - senderId:', senderId, 'receiverId:', receiverId);
      
      if (!senderId) {
        console.error('senderId is null or undefined, req.userId:', req.userId);
        return res.status(400).json({ message: "Authentication error: user ID not found" });
      }

      if (senderId === receiverId) {
        return res.status(400).json({ message: "Cannot create connection with yourself" });
      }

      // Check if connection already exists (both directions)
      const existing = await storage.getChatConnection(senderId, receiverId);
      const existingReverse = await storage.getChatConnection(receiverId, senderId);
      
      if (existing || existingReverse) {
        console.log('Connection already exists, returning existing connection');
        const connection = existing || existingReverse;
        return res.json({ 
          success: true, 
          connection: connection,
          message: "Connection already exists" 
        });
      }

      // Create new connection
      const connection = await storage.createChatConnection(senderId, receiverId);
      
      // Send initial connection message
      const initialMessage = await storage.sendMessage(
        connection.id,
        senderId,
        "Hi! I'd like to connect with you through the maritime network."
      );

      console.log('✅ New chat connection created:', connection.id);
      
      res.json({ 
        success: true, 
        connection: connection,
        initialMessage: initialMessage,
        message: "Connection created successfully" 
      });
    } catch (error) {
      console.error('Create chat connection error:', error);
      res.status(500).json({ message: "Failed to create chat connection" });
    }
  });

  app.post('/api/chat/accept/:connectionId', async (req: any, res) => {
    try {
      // Get user ID from session or token - check both Replit Auth and JWT
      let userId: string | undefined;
      
      // Check for Replit Auth session first
      if (req.user && req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else {
        // Check for QAAQ token
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            userId = decoded.userId;
          } catch (error) {
            // Token invalid, but continue to check for session
          }
        }
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { connectionId } = req.params;
      await storage.acceptChatConnection(connectionId);
      res.json({ message: "Connection accepted" });
    } catch (error) {
      console.error('Accept chat connection error:', error);
      res.status(500).json({ message: "Failed to accept connection" });
    }
  });

  // Block connection endpoint
  app.post('/api/chat/block/:connectionId', async (req: any, res) => {
    try {
      // Get user ID from session or token - check both Replit Auth and JWT
      let userId: string | undefined;
      
      // Check for Replit Auth session first
      if (req.user && req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else {
        // Check for QAAQ token
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            userId = decoded.userId;
          } catch (error) {
            // Token invalid, but continue to check for session
          }
        }
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { connectionId } = req.params;
      
      // Get the connection to verify the user can block it
      const connection = await storage.getChatConnectionById(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Only the receiver can block a pending connection
      if (connection.receiverId !== userId) {
        return res.status(403).json({ message: 'Not authorized to block this connection' });
      }

      await storage.blockChatConnection(connectionId);
      res.json({ message: 'User blocked successfully' });
    } catch (error) {
      console.error('Block connection error:', error);
      res.status(500).json({ message: "Failed to block connection" });
    }
  });

  // Unblock connection endpoint
  app.post('/api/chat/unblock/:connectionId', async (req: any, res) => {
    try {
      // Get user ID from session or token - check both Replit Auth and JWT
      let userId: string | undefined;
      
      // Check for Replit Auth session first
      if (req.user && req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else {
        // Check for QAAQ token
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            userId = decoded.userId;
          } catch (error) {
            // Token invalid, but continue to check for session
          }
        }
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { connectionId } = req.params;
      
      // Get the connection to verify the user can unblock it
      const connection = await storage.getChatConnectionById(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Only the receiver can unblock a blocked connection
      if (connection.receiverId !== userId) {
        return res.status(403).json({ message: 'Not authorized to unblock this connection' });
      }

      await storage.unblockChatConnection(connectionId);
      res.json({ message: 'User unblocked successfully' });
    } catch (error) {
      console.error('Unblock connection error:', error);
      res.status(500).json({ message: "Failed to unblock connection" });
    }
  });

  app.post('/api/chat/reject/:connectionId', authenticateToken, async (req, res) => {
    try {
      const { connectionId } = req.params;
      await storage.rejectChatConnection(connectionId);
      res.json({ message: "Connection rejected" });
    } catch (error) {
      console.error('Reject chat connection error:', error);
      res.status(500).json({ message: "Failed to reject connection" });
    }
  });

  app.get('/api/chat/connections', async (req: any, res) => {
    try {
      // Get user ID from session or token - check both Replit Auth and JWT
      let userId: string | undefined;
      
      // Check for Replit Auth session first
      if (req.user && req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else {
        // Check for QAAQ token
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            userId = decoded.userId;
          } catch (error) {
            // Token invalid, but continue to check for session
          }
        }
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const connections = await storage.getUserChatConnections(userId);
      
      // Enhance connections with user information and first message for pending connections
      const enhancedConnections = await Promise.all(
        connections.map(async (conn) => {
          const sender = await storage.getUser(conn.senderId);
          const receiver = await storage.getUser(conn.receiverId);
          
          // Get first message for pending connections and last message for all connections
          let firstMessage = null;
          let lastMessage = null;
          
          const messages = await storage.getChatMessages(conn.id);
          console.log(`📝 Found ${messages.length} messages for connection ${conn.id}`);
          
          if (messages.length > 0) {
            // Get first message for pending connections (to help receiver decide)
            if (conn.status === 'pending') {
              firstMessage = messages[0].content;
              console.log(`💬 First message: "${firstMessage}"`);
            }
            
            // Get last message for all connections (to show in chat card)
            lastMessage = messages[messages.length - 1].content;
            console.log(`💬 Last message: "${lastMessage}"`);
          }
          
          return {
            ...conn,
            sender: sender ? { id: sender.id, fullName: sender.fullName, rank: sender.rank } : null,
            receiver: receiver ? { id: receiver.id, fullName: receiver.fullName, rank: receiver.rank } : null,
            firstMessage: firstMessage,
            lastMessage: lastMessage
          };
        })
      );
      
      res.json(enhancedConnections);
    } catch (error) {
      console.error('Get chat connections error:', error);
      res.status(500).json({ message: "Failed to get connections" });
    }
  });

  // Get specific chat connection by ID (for chat page)
  app.get('/api/chat/connection/:connectionId', async (req: any, res) => {
    try {
      const { connectionId } = req.params;
      
      // Get user ID from session or token - check both Replit Auth and JWT
      let userId: string | undefined;
      
      // Check for Replit Auth session first
      if (req.user && req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
        console.log('🔑 Chat connection auth: Using Replit session for user:', userId);
      } else {
        // Check for QAAQ token
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        console.log('🔑 Chat connection auth: Checking JWT token:', token ? 'present' : 'missing');
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            userId = decoded.userId;
            console.log('🔑 Chat connection auth: JWT verified for user:', userId);
          } catch (error) {
            console.log('🔒 Chat connection auth: JWT verification failed:', error.message);
          }
        }
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get the connection
      const result = await pool.query(`
        SELECT cc.*, 
               sender.full_name as sender_name, sender.whatsapp_profile_picture_url as sender_profile,
               receiver.full_name as receiver_name, receiver.whatsapp_profile_picture_url as receiver_profile
        FROM chat_connections cc
        LEFT JOIN users sender ON cc.sender_id = sender.id
        LEFT JOIN users receiver ON cc.receiver_id = receiver.id
        WHERE cc.id = $1 AND (cc.sender_id = $2 OR cc.receiver_id = $2)
      `, [connectionId, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      const connection = result.rows[0];
      res.json({
        id: connection.id,
        senderId: connection.sender_id,
        receiverId: connection.receiver_id,
        status: connection.status,
        createdAt: connection.created_at,
        senderName: connection.sender_name,
        receiverName: connection.receiver_name,
        senderProfile: connection.sender_profile,
        receiverProfile: connection.receiver_profile
      });
    } catch (error) {
      console.error('Error fetching chat connection:', error);
      res.status(500).json({ message: 'Failed to get chat connection' });
    }
  });

  // Get messages for a chat connection
  app.get('/api/chat/messages/:connectionId', async (req: any, res) => {
    try {
      const { connectionId } = req.params;
      
      // Get user ID from session or token - check both Replit Auth and JWT
      let userId: string | undefined;
      
      // Check for Replit Auth session first
      if (req.user && req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
        console.log('🔑 Chat messages auth: Using Replit session for user:', userId);
      } else {
        // Check for QAAQ token
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        console.log('🔑 Chat messages auth: Checking JWT token:', token ? 'present' : 'missing');
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            userId = decoded.userId;
            console.log('🔑 Chat messages auth: JWT verified for user:', userId);
          } catch (error) {
            console.log('🔒 Chat messages auth: JWT verification failed:', error.message);
          }
        }
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Verify user has access to this connection
      const connectionCheck = await pool.query(`
        SELECT id FROM chat_connections 
        WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)
      `, [connectionId, userId]);

      if (connectionCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const messages = await storage.getChatMessages(connectionId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ message: 'Failed to get chat messages' });
    }
  });

  // Send a message (for chat page)
  app.post('/api/chat/send', async (req: any, res) => {
    try {
      const { connectionId, content } = req.body;
      
      // Get user ID from session or token - check both Replit Auth and JWT
      let userId: string | undefined;
      
      // Check for Replit Auth session first
      if (req.user && req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else {
        // Check for QAAQ token
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            userId = decoded.userId;
          } catch (error) {
            // Token invalid, but continue to check for session
          }
        }
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      if (!connectionId || !content) {
        return res.status(400).json({ message: 'Connection ID and content are required' });
      }

      // Verify user has access to this connection and it's not blocked
      const connectionCheck = await pool.query(`
        SELECT id, status, sender_id, receiver_id FROM chat_connections 
        WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)
      `, [connectionId, userId]);

      if (connectionCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const connection = connectionCheck.rows[0];
      
      // Check if connection is blocked - prevent sender from sending messages
      if (connection.status === 'blocked') {
        // If current user is the blocked sender, silently fail (don't let them know they're blocked)
        if (connection.sender_id === userId) {
          return res.json({ 
            success: true, 
            message: { 
              id: 'blocked_' + Date.now(), 
              connectionId, 
              senderId: userId, 
              content, 
              sentAt: new Date(),
              isRead: false,
              isDelivered: false 
            } 
          });
        }
        return res.status(403).json({ message: 'This connection is blocked' });
      }

      const message = await storage.sendMessage(connectionId, userId, content);
      
      // Broadcast message via WebSocket to all connected clients
      const messageData = {
        type: 'new_message',
        connectionId,
        message: {
          id: message.id,
          connectionId: message.connectionId,
          senderId: message.senderId,
          content: message.content,
          createdAt: message.sentAt,
          isRead: message.isRead
        }
      };
      
      wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify(messageData));
        }
      });
      
      res.json({ success: true, message });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  app.post('/api/chat/message', authenticateToken, async (req, res) => {
    try {
      const { connectionId, message } = insertChatMessageSchema.parse(req.body);
      const senderId = req.userId!;

      const chatMessage = await storage.sendMessage(connectionId, senderId, message);
      res.json(chatMessage);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Test message endpoint (temporary for testing)
  app.post('/api/chat/send-test', async (req, res) => {
    try {
      const { senderId, receiverId, message } = req.body;
      
      if (!senderId || !receiverId || !message) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      console.log(`📱 Test message: ${senderId} -> ${receiverId}: ${message}`);

      // Check if connection exists, create if not
      let connection = await storage.getChatConnection(senderId, receiverId);
      
      if (!connection) {
        // Create new connection
        connection = await storage.createChatConnection(senderId, receiverId);
        console.log(`✅ Created connection: ${connection.id}`);
      } else {
        console.log(`✅ Using existing connection: ${connection.id}`);
      }

      // Send message
      const chatMessage = await storage.sendMessage(connection.id, senderId, message.trim());

      // Debug: Check if receiver can see this connection
      const receiverConnections = await storage.getUserChatConnections(receiverId);
      console.log(`🔍 Receiver ${receiverId} has ${receiverConnections.length} connections`);
      const hasConnection = receiverConnections.some(conn => conn.id === connection.id);
      console.log(`🔍 Receiver can see this connection: ${hasConnection}`);

      res.json({ 
        success: true, 
        connectionId: connection.id, 
        messageId: chatMessage.id,
        receiverConnectionsCount: receiverConnections.length,
        receiverCanSeeConnection: hasConnection,
        message: "Test message sent successfully!" 
      });

    } catch (error) {
      console.error('Test message error:', error);
      res.status(500).json({ message: "Failed to send test message" });
    }
  });

  // Debug endpoint to check user's connections
  app.get('/api/chat/debug-connections/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(`🔍 Debug connections for user: ${userId}`);
      
      const connections = await storage.getUserChatConnections(userId);
      console.log(`🔍 Found ${connections.length} connections for user ${userId}`);
      
      const connectionsWithDetails = await Promise.all(connections.map(async (conn) => {
        const messages = await storage.getChatMessages(conn.id);
        return {
          ...conn,
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1]
        };
      }));

      res.json({
        userId,
        totalConnections: connections.length,
        connections: connectionsWithDetails
      });
    } catch (error) {
      console.error('Debug connections error:', error);
      res.status(500).json({ message: "Failed to debug connections" });
    }
  });

  // Debug endpoint to accept connection without authentication
  app.post('/api/chat/debug-accept/:connectionId', async (req, res) => {
    try {
      const { connectionId } = req.params;
      console.log(`🔍 Debug accepting connection: ${connectionId}`);
      
      await storage.acceptChatConnection(connectionId);
      console.log(`✅ Connection accepted: ${connectionId}`);
      
      // Verify the update worked
      const result = await pool.query(`SELECT status, accepted_at FROM chat_connections WHERE id = $1`, [connectionId]);
      console.log(`🔍 Connection status after update:`, result.rows[0]);
      
      res.json({ 
        success: true,
        connectionId,
        status: result.rows[0]?.status,
        acceptedAt: result.rows[0]?.accepted_at,
        message: "Connection accepted successfully" 
      });
    } catch (error) {
      console.error('Debug accept connection error:', error);
      res.status(500).json({ message: "Failed to accept connection" });
    }
  });

  // Debug endpoint to check user table schema
  app.get('/api/debug/schema', async (req, res) => {
    try {
      console.log('🔍 Checking user table schema...');
      
      // Get column information for users table
      const schemaResult = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);
      
      // Filter authentication-related fields
      const authFields = schemaResult.rows.filter(col => 
        col.column_name.includes('password') || 
        col.column_name.includes('google') || 
        col.column_name.includes('auth') ||
        col.column_name.includes('provider')
      );
      
      console.log('🔍 Authentication fields found:', authFields);
      
      res.json({
        totalColumns: schemaResult.rows.length,
        allColumns: schemaResult.rows,
        authenticationFields: authFields,
        schemaAnalysis: {
          hasPasswordField: authFields.some(f => f.column_name === 'password'),
          hasGoogleId: authFields.some(f => f.column_name === 'google_id'),
          hasGoogleEmail: authFields.some(f => f.column_name === 'google_email'),
          hasAuthProvider: authFields.some(f => f.column_name === 'auth_provider'),
          hasPasswordFlags: authFields.filter(f => f.column_name.includes('password')).length
        }
      });
    } catch (error) {
      console.error('Schema check error:', error);
      res.status(500).json({ message: "Failed to check schema", error: error.message });
    }
  });

  // Debug endpoint to check user data retrieval
  app.get('/api/debug/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(`🔍 Debug user lookup: ${userId}`);
      
      // Try to get user using storage method
      const user = await storage.getUserById(userId);
      console.log(`🔍 User found via storage:`, user ? `${user.fullName} (${user.id})` : 'null');
      
      // Also try direct database query
      const dbResult = await pool.query(`
        SELECT id, first_name, last_name, full_name, email, question_count, answer_count, 
               current_city, current_country, current_latitude, current_longitude
        FROM users 
        WHERE id = $1 OR id = $2 
        LIMIT 1
      `, [userId, userId.startsWith('+') ? userId.substring(1) : `+${userId}`]);
      
      console.log(`🔍 Direct DB query results:`, dbResult.rows.length > 0 ? dbResult.rows[0] : 'No rows found');
      
      res.json({
        userId,
        storageUser: user,
        dbResult: dbResult.rows[0] || null,
        dbRowCount: dbResult.rows.length
      });
    } catch (error) {
      console.error('Debug user lookup error:', error);
      res.status(500).json({ message: "Failed to debug user lookup" });
    }
  });

  // Send initial message when creating connection (one message limit)
  app.post('/api/chat/send-initial', authenticateToken, async (req, res) => {
    try {
      const { receiverId, message } = req.body;
      const senderId = req.userId!;
      
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }

      // Check if connection already exists
      let connection = await storage.getChatConnection(senderId, receiverId);
      
      if (!connection) {
        // Create new connection
        connection = await storage.createChatConnection(senderId, receiverId);
      }

      // Send the initial message
      const chatMessage = await storage.sendMessage(connection.id, senderId, message.trim());
      res.json({ connection, message: chatMessage });
    } catch (error) {
      console.error('Send initial message error:', error);
      res.status(500).json({ message: "Failed to send initial message" });
    }
  });


  // Mark individual message as read
  app.post('/api/chat/messages/:messageId/read', authenticateToken, async (req, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.userId!;
      
      await storage.markMessagesAsRead(messageId, userId);
      res.json({ message: "Message marked as read" });
    } catch (error) {
      console.error('Mark message as read error:', error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.get('/api/chat/unread-counts', authenticateToken, async (req, res) => {
    try {
      const unreadCounts = await storage.getUnreadMessageCounts(req.userId!);
      res.json(unreadCounts);
    } catch (error) {
      console.error('Get unread counts error:', error);
      res.status(500).json({ message: "Failed to get unread counts" });
    }
  });

  // Get nearby users - supports both proximity-based and Q-based discovery
  app.get('/api/users/nearby', async (req, res) => {
    try {
      const { lat, lng, mode } = req.query;
      const allUsers = await storage.getUsersWithLocation();
      console.log(`Found ${allUsers.length} users with location data`);
      
      // If latitude and longitude provided, do proximity-based search
      if (lat && lng && mode === 'proximity') {
        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        console.log(`Getting nearby users for location: ${userLat}, ${userLng}`);
        
        // Return users without distance calculation to avoid API quota issues
        const proximityUsers = allUsers
          .filter(user => user.latitude && user.longitude) // Only users with valid coordinates
          .slice(0, 9); // Return 9 users
          
        console.log(`Returning ${proximityUsers.length} nearby users (distance calculation disabled)`);
        res.json(proximityUsers);
      } else {
        // Default: Sort by question count for DM discovery
        console.log('Getting top Q users for DM discovery');
        const topQuestionUsers = allUsers
          .sort((a, b) => (b.questionCount || 0) - (a.questionCount || 0))
          .slice(0, 9)
          .map(user => {
            console.log(`User: ${user.fullName}, Q: ${user.questionCount || 0}`);
            return { ...user, distance: 0 }; // Distance not relevant for Q-based sorting
          });

        console.log(`Returning ${topQuestionUsers.length} top Q users`);
        res.json(topQuestionUsers);
      }
    } catch (error) {
      console.error('Get nearby users error:', error);
      res.status(500).json({ message: "Failed to get nearby users" });
    }
  });

  // Search ship positions by name or IMO number
  app.get("/api/ships/search", async (req, res) => {
    try {
      const { q } = req.query;
      const searchQuery = q as string;
      
      if (!searchQuery || !searchQuery.trim()) {
        return res.status(400).json({ message: "Search query required" });
      }
      
      const query = searchQuery.toLowerCase().trim();
      console.log(`🚢 Searching for ship: "${query}"`);
      
      // Get ship location using our ship location service
      const shipLocationService = await import('./ship-location');
      const service = new shipLocationService.default();
      
      try {
        const position = await service.getShipPosition(query);
        
        if (position) {
          const shipData = {
            id: `ship_${query.replace(/\s+/g, '_')}`,
            name: query,
            type: 'ship',
            latitude: position.latitude,
            longitude: position.longitude,
            port: position.port,
            lastUpdate: position.lastUpdate || new Date()
          };
          
          console.log(`Found ship position for "${query}":`, shipData);
          res.json(shipData);
        } else {
          console.log(`No position found for ship "${query}"`);
          res.status(404).json({ message: "Ship position not found" });
        }
      } catch (error) {
        console.error(`Error getting ship position for "${query}":`, error);
        res.status(500).json({ message: "Failed to get ship position" });
      }
      
    } catch (error) {
      console.error('Ship search error:', error);
      res.status(500).json({ message: "Failed to search ships" });
    }
  });

  // Get user profile by ID endpoint
  app.get('/api/users/profile/:userId', requireBridgedAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.currentUser?.id || req.userId;
      console.log(`Fetching profile for user: ${userId}`);

      // Query user from PostgreSQL database
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      console.log(`Found user profile: ${user.full_name}`);

      // Return user profile data
      res.json({
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        userType: user.user_type,
        rank: user.rank,
        shipName: user.ship_name,
        imoNumber: user.imo_number,
        port: user.port,
        city: user.city,
        country: user.country,
        company: user.company,
        profilePictureUrl: user.profile_picture_url,
        isVerified: user.is_verified,
        latitude: user.latitude,
        longitude: user.longitude,
        questionCount: user.question_count,
        answerCount: user.answer_count
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // Search all users with comprehensive text search functionality
  app.get("/api/users/search", async (req, res) => {
    try {
      const { q, limit = 500 } = req.query;
      const searchQuery = q as string;
      
      // Get all users from database
      const allUsers = await storage.getUsersWithLocation();
      console.log(`Found ${allUsers.length} total users in database`);
      
      let filteredUsers = allUsers;
      
      // Apply text-based search if query provided
      if (searchQuery && searchQuery.trim()) {
        // Clean the query by removing invisible characters and normalizing
        const cleanQuery = searchQuery.replace(/[\u200B-\u200D\uFEFF\u2060-\u206F]/g, '').trim();
        const query = cleanQuery.toLowerCase();
        console.log(`Searching for: "${query}" (cleaned from: "${searchQuery}")`);
        
        // Special handling for "onboard" search - show only users currently onboard ships
        if (query === 'onboard') {
          console.log('🚢 Onboard search detected - filtering for maritime professionals currently onboard ships');
          filteredUsers = allUsers.filter(user => {
            // Must have onboard status or ship information with ship tracking location
            return (user.onboardStatus === 'ONBOARD' || 
                   (user.shipName && user.shipName !== null && user.shipName !== '') ||
                   (user.currentShipName && user.currentShipName !== null && user.currentShipName !== '') ||
                   (user.locationSource === 'ship_tracking')) &&
                   user.latitude && user.longitude; // Must have coordinates
          });
          console.log(`Found ${filteredUsers.length} maritime professionals currently onboard ships with tracked positions`);
        } else {
          // Regular text search across multiple fields including user ID
          filteredUsers = allUsers.filter(user => {
            // Create multiple search formats for user ID to handle WhatsApp vs regular formats
            const userId = user.id || '';
            const userIdVariants = [
              userId,                                    // Original: wa_917385010771 or +917385010771
              userId.replace(/^wa_/, '+'),              // wa_917385010771 -> +917385010771
              userId.replace(/^wa_/, '+91'),            // wa_917385010771 -> +91917385010771 (if starts with 91)
              userId.replace(/^\+/, 'wa_'),             // +917385010771 -> wa_917385010771
              userId.replace(/^wa_91?/, ''),            // wa_917385010771 -> 7385010771
              userId.replace(/^\+91?/, ''),             // +917385010771 -> 7385010771
            ];
            
            const searchableText = [
              ...userIdVariants,                        // All user ID variants
              user.fullName || '',
              user.rank || '',
              user.shipName || '',
              user.company || '',
              user.imoNumber || '',
              user.port || '',
              user.city || '',
              user.country || '',
              user.userType || ''
            ].join(' ').toLowerCase();
            
            return searchableText.includes(query);
          });
          console.log(`Found ${filteredUsers.length} users matching search query`);
        }
      } else {
        // If no search query, return random selection for performance
        const shuffled = allUsers.sort(() => 0.5 - Math.random());
        filteredUsers = shuffled.slice(0, parseInt(limit as string));
        console.log(`No search query provided, returning ${filteredUsers.length} random users`);
      }
      
      // Sort by relevance (exact name matches first, then by question count)
      if (searchQuery && searchQuery.trim()) {
        filteredUsers.sort((a, b) => {
          const query = searchQuery.toLowerCase();
          const aNameMatch = a.fullName?.toLowerCase().includes(query) ? 1 : 0;
          const bNameMatch = b.fullName?.toLowerCase().includes(query) ? 1 : 0;
          
          if (aNameMatch !== bNameMatch) {
            return bNameMatch - aNameMatch; // Name matches first
          }
          
          return (b.questionCount || 0) - (a.questionCount || 0); // Then by Q count
        });
      }
      
      // Apply limit
      const limitedUsers = filteredUsers.slice(0, parseInt(limit as string));
      
      console.log(`Returning ${limitedUsers.length} users (limit: ${limit})`);
      res.json(limitedUsers);
      
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Get random users for home page display (backward compatibility)
  app.get("/api/users/random", async (req, res) => {
    try {
      const { limit = 100 } = req.query;
      const allUsers = await storage.getUsersWithLocation();
      console.log(`Found ${allUsers.length} users, selecting random ${limit}`);
      
      // Shuffle users and take the requested limit
      const shuffled = allUsers.sort(() => 0.5 - Math.random());
      const randomUsers = shuffled.slice(0, parseInt(limit as string));
      
      console.log(`Returning ${randomUsers.length} random users for home page display`);
      res.json(randomUsers);
    } catch (error) {
      console.error('Get random users error:', error);
      res.status(500).json({ message: "Failed to get random users" });
    }
  });

  // Bot Documentation Routes
  app.get("/api/bot-documentation/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const result = await pool.query(
        'SELECT * FROM bot_documentation WHERE doc_key = $1',
        [key]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Documentation not found" });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching bot documentation:", error);
      res.status(500).json({ error: "Failed to fetch bot documentation" });
    }
  });

  app.get("/api/bot-documentation", async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT doc_key, doc_type, created_at, updated_at FROM bot_documentation ORDER BY created_at DESC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error listing bot documentation:", error);
      res.status(500).json({ error: "Failed to list bot documentation" });
    }
  });

  // Get user profile with questions
  app.get('/api/users/:userId/profile', requireBridgedAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.currentUser?.id || req.userId;
      console.log(`Looking for user profile with ID: ${userId}`);
      
      const users = await storage.getUsersWithLocation();
      console.log(`Found ${users.length} total users, searching for ID: ${userId}`);
      
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        console.log(`User not found with ID: ${userId}. Available user IDs:`, users.slice(0, 5).map(u => u.id));
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log(`Found user: ${user.fullName} (${user.id})`);

      // Get user's real questions from QAAQ system
      let questions: any[] = [];
      let questionCount = user.questionCount || 0;
      
      try {
        // First try to get shared database questions
        const { getUserQuestionsFromSharedDB, getQuestionsByUserName } = await import('./shared-qa-service');
        questions = await getUserQuestionsFromSharedDB(user.id);
        
        // If no questions found by user ID, try by name
        if (questions.length === 0) {
          questions = await getQuestionsByUserName(user.fullName);
        }
        
        console.log(`Found ${questions.length} questions from shared database for user ${user.fullName}`);
      } catch (sharedDbError) {
        console.log('Failed to fetch from shared database:', sharedDbError);
        
        // Fallback to QAAQ metrics
        try {
          const { getQAAQUserMetrics } = await import('./qa-service');
          const allMetrics = await getQAAQUserMetrics();
          const userMetrics = allMetrics.find(m => 
            m.fullName.toLowerCase() === user.fullName.toLowerCase() ||
            m.userId === user.id ||
            m.fullName.toLowerCase().includes(user.fullName.toLowerCase()) ||
            user.fullName.toLowerCase().includes(m.fullName.toLowerCase())
          );
          
          questionCount = userMetrics?.totalQuestions || user.questionCount || 0;
          console.log(`Using QAAQ metrics: ${questionCount} questions for ${user.fullName}`);
        } catch (qaaQError) {
          console.log('Failed to fetch QAAQ metrics:', qaaQError);
        }
      }
      
      const finalQuestions = questions;

      res.json({
        user: {
          id: user.id,
          fullName: user.fullName,
          rank: user.rank,
          shipName: user.shipName,
          company: (user as any).company || 'Unknown Company',
          port: user.port,
          city: user.city,
          country: user.country,
          questionCount: questionCount,
          answerCount: user.answerCount || 0,
          whatsappNumber: (user as any).whatsappNumber || '',
          profilePictureUrl: user.profilePictureUrl,
          whatsAppProfilePictureUrl: user.whatsAppProfilePictureUrl,
          whatsAppDisplayName: user.whatsAppDisplayName
        },
        questions: finalQuestions,
        dataSource: questions.length > 0 ? 'notion' : 'generated'
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // REMOVED: Duplicate authenticated /api/questions route - using public route instead

  // Get user's own questions (for My Questions page in profile dropdown)
  app.get('/api/users/:userId/questions', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.userId;
      
      console.log(`📋 Fetching questions for user ${userId} (requested by ${requestingUserId})`);
      
      // Use direct SQL to get user's questions from parent QAAQ database
      const result = await pool.query(`
        SELECT 
          id,
          content,
          author_id,
          created_at,
          updated_at,
          tags,
          views,
          is_resolved,
          is_from_whatsapp,
          engagement_score,
          equipment_name
        FROM questions 
        WHERE author_id = $1 
          AND (is_hidden = false OR is_hidden IS NULL)
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId]);
      
      const questions = result.rows.map(row => ({
        id: row.id,
        content: row.content,
        author_id: row.author_id,
        author_name: row.author_id?.startsWith('+') ? `User ${row.author_id.slice(0,8)}****` : 'Maritime Professional',
        created_at: row.created_at,
        updated_at: row.updated_at,
        category: row.equipment_name || 'General Discussion',
        tags: row.tags || [],
        view_count: row.views || 0,
        is_resolved: row.is_resolved || false,
        is_from_whatsapp: row.is_from_whatsapp || false,
        source: row.is_from_whatsapp ? 'WhatsApp' : 'QAAQ Platform'
      }));
      
      console.log(`✅ Retrieved ${questions.length} questions for user ${userId}`);
      
      res.json({
        questions,
        total: questions.length,
        userId: userId,
        dataSource: 'shared-qaaq-db'
      });
    } catch (error) {
      console.error('Error fetching user questions:', error);
      res.status(500).json({ error: 'Failed to fetch user questions' });
    }
  });

  // Search questions (with analytics tracking)
  app.get('/api/questions/search', authenticateToken, async (req: any, res) => {
    try {
      const { q: keyword } = req.query;
      if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({ error: 'Search keyword required' });
      }

      const { searchQuestionsInSharedDB } = await import('./shared-qa-service');
      const questions = await searchQuestionsInSharedDB(keyword, req.userId);
      
      res.json({
        questions,
        total: questions.length,
        searchTerm: keyword,
        dataSource: 'shared-db'
      });
    } catch (error) {
      console.error('Error searching questions:', error);
      res.status(500).json({ error: 'Failed to search questions' });
    }
  });

  // API for sister apps to store questions
  app.post('/api/shared/questions', async (req, res) => {
    try {
      const { syncQuestionFromExternalSource } = await import('./shared-qa-service');
      const questionData = req.body;
      
      // Validate required fields
      if (!questionData.questionId || !questionData.userId || !questionData.questionText) {
        return res.status(400).json({ error: 'Missing required fields: questionId, userId, questionText' });
      }

      const success = await syncQuestionFromExternalSource(questionData);
      
      if (success) {
        res.json({ 
          message: 'Question stored successfully in shared database',
          questionId: questionData.questionId
        });
      } else {
        res.status(500).json({ error: 'Failed to store question' });
      }
    } catch (error) {
      console.error('Error storing shared question:', error);
      res.status(500).json({ error: 'Failed to store question' });
    }
  });

  // API for sister apps to store answers
  app.post('/api/shared/answers', async (req, res) => {
    try {
      const { storeAnswer } = await import('./shared-qa-service');
      const answerData = req.body;
      
      // Validate required fields
      if (!answerData.answerId || !answerData.questionId || !answerData.answerText) {
        return res.status(400).json({ error: 'Missing required fields: answerId, questionId, answerText' });
      }

      const answer = await storeAnswer(answerData);
      
      res.json({ 
        message: 'Answer stored successfully in shared database',
        answer
      });
    } catch (error) {
      console.error('Error storing shared answer:', error);
      res.status(500).json({ error: 'Failed to store answer' });
    }
  });

  // Get all questions from shared database
  app.get('/api/shared/questions', async (req, res) => {
    try {
      const { getAllQuestionsFromSharedDB } = await import('./shared-qa-service');
      const questions = await getAllQuestionsFromSharedDB();
      
      res.json({
        questions,
        total: questions.length,
        dataSource: 'shared-db'
      });
    } catch (error) {
      console.error('Error fetching shared questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  });

  // Get answers for a specific question
  app.get('/api/shared/questions/:questionId/answers', async (req, res) => {
    try {
      const { questionId } = req.params;
      const { getAnswersForQuestion } = await import('./shared-qa-service');
      const answers = await getAnswersForQuestion(questionId);
      
      res.json({
        answers,
        total: answers.length,
        questionId
      });
    } catch (error) {
      console.error('Error fetching answers:', error);
      res.status(500).json({ error: 'Failed to fetch answers' });
    }
  });

  // User Profile API endpoints
  
  // Get user profile for CV/Profile page - session auth only
  app.get('/api/users/profile', async (req, res) => {
    try {
      let userId = null;
      
      // Check session authentication only (Google/Replit Auth)
      if (req.user) {
        const sessionUserId = (req.user as any).claims?.sub || (req.user as any).id || (req.user as any).userId;
        if (sessionUserId) {
          // Use identity resolver to find the user
          const user = await identityResolver.resolveUserByAnyMethod(sessionUserId, 'replit');
          if (user) {
            console.log(`📋 Profile found for session user: ${user.fullName}`);
            return res.json(user);
          }
        }
      }
      
      return res.status(401).json({ error: 'Authentication required' });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // Update user profile - session auth only
  app.put('/api/users/profile', async (req, res) => {
    try {
      let user = null;
      
      // Check session authentication only (Google/Replit Auth)
      if (req.user) {
        const sessionUserId = (req.user as any).claims?.sub || (req.user as any).id || (req.user as any).userId;
        if (sessionUserId) {
          // Use identity resolver to find the user
          user = await identityResolver.resolveUserByAnyMethod(sessionUserId, 'replit');
        }
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userId = user.id;

      console.log('🔄 Profile update request for user:', userId);
      console.log('🔄 Profile update request data:', req.body);

      // Only use fields that exist in QAAQ parent database
      const allowedFields = {
        fullName: req.body.fullName,           // Maps to full_name
        email: req.body.email,                 // Maps to email
        maritimeRank: req.body.rank,           // Maps to maritime_rank
        currentLastShip: req.body.shipName,    // Maps to current_lastShip
        // currentShipIMO: req.body.imoNumber,    // Maps to current_ship_imo - temporarily disabled due to column issue
        city: req.body.city,                   // Maps to city
        country: req.body.country,             // Maps to country
        countryCode: req.body.countryCode,     // Maps to country_code
        whatsAppNumber: req.body.whatsAppNumber, // Maps to whatsapp_number
      };

      // Filter out undefined values
      const updateData = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
      );

      console.log('🔄 Filtered update data:', updateData);

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      console.log('📝 Calling storage.updateUserProfile for user:', userId);
      const updatedUser = await storage.updateUserProfile(userId, updateData);
      console.log('📝 Storage.updateUserProfile result:', updatedUser ? 'SUCCESS' : 'FAILED/NULL');
      
      if (!updatedUser) {
        console.log('❌ Profile update failed: User not found or update failed');
        return res.status(404).json({ error: 'User not found or update failed' });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });



  // CPSS Groups API endpoints
  
  // Create or get CPSS group based on breadcrumb
  app.post('/api/cpss/groups', authenticateToken, async (req, res) => {
    try {
      const { createOrGetCPSSGroup } = await import('./cpss-groups-service');
      const { country, port, suburb, service, groupType } = req.body;
      
      if (!groupType) {
        return res.status(400).json({ error: 'Group type is required' });
      }

      const group = await createOrGetCPSSGroup({
        country,
        port,
        suburb,
        service,
        groupType,
        createdBy: req.user?.userId || req.user?.id || req.user?.email || 'unknown'
      });

      res.json({ group });
    } catch (error) {
      console.error('Error creating/getting CPSS group:', error);
      res.status(500).json({ error: 'Failed to create or get group' });
    }
  });

  // Join CPSS group
  app.post('/api/cpss/groups/:groupId/join', authenticateToken, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { joinCPSSGroup } = await import('./cpss-groups-service');
      
      const userId = req.user?.userId || req.user?.id || req.user?.email;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      // Get user's full name from storage
      const user = await storage.getUser(userId);
      const userName = user?.fullName || user?.email || userId;
      
      const success = await joinCPSSGroup(groupId, userId, userName);
      
      if (success) {
        res.json({ message: 'Successfully joined group' });
      } else {
        res.status(500).json({ error: 'Failed to join group' });
      }
    } catch (error) {
      console.error('Error joining CPSS group:', error);
      res.status(500).json({ error: 'Failed to join group' });
    }
  });

  // Leave CPSS group
  app.post('/api/cpss/groups/:groupId/leave', authenticateToken, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { leaveCPSSGroup } = await import('./cpss-groups-service');
      
      const userId = req.user?.userId || req.user?.id || req.user?.email;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }
      
      const success = await leaveCPSSGroup(groupId, userId);
      
      if (success) {
        res.json({ message: 'Successfully left group' });
      } else {
        res.status(500).json({ error: 'Failed to leave group' });
      }
    } catch (error) {
      console.error('Error leaving CPSS group:', error);
      res.status(500).json({ error: 'Failed to leave group' });
    }
  });

  // Get user's joined groups
  app.get('/api/cpss/groups/my-groups', authenticateToken, async (req, res) => {
    try {
      const { getUserCPSSGroups } = await import('./cpss-groups-service');
      const userId = req.user?.userId || req.user?.id || req.user?.email;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }
      
      const groups = await getUserCPSSGroups(userId);
      
      res.json({ groups });
    } catch (error) {
      console.error('Error fetching user groups:', error);
      res.status(500).json({ error: 'Failed to fetch user groups' });
    }
  });

  // Get user's rank groups
  app.get('/api/cpss/groups/rank-groups', authenticateToken, async (req, res) => {
    try {
      const { getUserRankGroups } = await import('./cpss-groups-service');
      const userId = req.user?.userId || req.user?.id || req.user?.email;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }
      
      const groups = await getUserRankGroups(userId);
      
      res.json({ groups });
    } catch (error) {
      console.error('Error fetching user rank groups:', error);
      res.status(500).json({ error: 'Failed to fetch user rank groups' });
    }
  });

  // Get all available rank groups
  app.get('/api/cpss/groups/all-ranks', authenticateToken, async (req, res) => {
    try {
      const { getAllRankGroups } = await import('./cpss-groups-service');
      
      // Get user ID for personalized ordering
      const userId = req.user?.userId || req.user?.id || req.user?.email;
      
      const groups = await getAllRankGroups(userId);
      
      res.json({ groups });
    } catch (error) {
      console.error('Error fetching all rank groups:', error);
      res.status(500).json({ error: 'Failed to fetch rank groups' });
    }
  });

  // Get all available groups
  app.get('/api/cpss/groups', authenticateToken, async (req, res) => {
    try {
      const { getAllCPSSGroups, getCPSSGroupsByLocation } = await import('./cpss-groups-service');
      const { country, port, suburb } = req.query;
      
      // Get user ID for personalized ordering
      const userId = req.user?.userId || req.user?.id || req.user?.email;
      
      let groups;
      if (country || port || suburb) {
        groups = await getCPSSGroupsByLocation(country as string, port as string, suburb as string);
      } else {
        groups = await getAllCPSSGroups(userId);
      }
      
      res.json({ groups });
    } catch (error) {
      console.error('Error fetching CPSS groups:', error);
      res.status(500).json({ error: 'Failed to fetch groups' });
    }
  });



  // Get group posts
  app.get('/api/cpss/groups/:groupId/posts', authenticateToken, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { getCPSSGroupPosts, isUserMemberOfGroup } = await import('./cpss-groups-service');
      
      // Check if user is member of the group
      const userId = req.user?.userId || req.user?.id || req.user?.email;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }
      
      const isMember = await isUserMemberOfGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ error: 'You must be a member to view group posts' });
      }
      
      const posts = await getCPSSGroupPosts(groupId);
      res.json({ posts });
    } catch (error) {
      console.error('Error fetching group posts:', error);
      res.status(500).json({ error: 'Failed to fetch group posts' });
    }
  });

  // Create group post
  app.post('/api/cpss/groups/:groupId/posts', authenticateToken, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { content, postType, attachments } = req.body;
      const { createCPSSGroupPost, isUserMemberOfGroup } = await import('./cpss-groups-service');
      
      if (!content) {
        return res.status(400).json({ error: 'Post content is required' });
      }

      // Check if user is member of the group
      const userId = req.user?.userId || req.user?.id || req.user?.email;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      // Get user's full name from storage
      const user = await storage.getUser(userId);
      const userName = user?.fullName || user?.email || userId;
      
      const isMember = await isUserMemberOfGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ error: 'You must be a member to post in this group' });
      }
      
      const post = await createCPSSGroupPost({
        groupId,
        userId,
        userName,
        content,
        postType,
        attachments
      });
      
      res.json({ post });
    } catch (error) {
      console.error('Error creating group post:', error);
      res.status(500).json({ error: 'Failed to create group post' });
    }
  });

  // Get group members
  app.get('/api/cpss/groups/:groupId/members', authenticateToken, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { getCPSSGroupMembers, isUserMemberOfGroup } = await import('./cpss-groups-service');
      
      // Check if user is member of the group
      const userId = req.user?.userId || req.user?.id || req.user?.email;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }
      
      const isMember = await isUserMemberOfGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ error: 'You must be a member to view group members' });
      }
      
      const members = await getCPSSGroupMembers(groupId);
      res.json({ members });
    } catch (error) {
      console.error('Error fetching group members:', error);
      res.status(500).json({ error: 'Failed to fetch group members' });
    }
  });

  // Get questions with pagination (no authentication required)
  app.get('/api/questions', noAuth, async (req, res) => {
    try {
      console.log('Questions API called without authentication requirement');
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      
      // Import both shared DB and QAAQ Notion services to get all 1228 questions
      const { getAllQuestionsFromSharedDB, searchQuestionsInSharedDB } = await import('./shared-qa-service');
      const { getAllQAAQQuestions } = await import('./qa-service');
      
      console.log(`Fetching real questions from QAAQ database - page ${page}, limit ${limit}, search: ${search || 'none'}`);
      
      // Fetch authentic questions from the same source as qaaqit.com/questions
      console.log('Fetching authentic questions from QAAQ shared database...');
      
      let allQuestions = [];
      
      if (search && search.trim() !== '') {
        console.log(`Searching for questions with term: "${search}"`);
        // For unauthenticated endpoint, pass undefined for userId (anonymous tracking)
        allQuestions = await searchQuestionsInSharedDB(search, undefined);
      } else {
        allQuestions = await getAllQuestionsFromSharedDB();
      }
      
      console.log(`Retrieved ${allQuestions.length} authentic questions from QAAQ shared database`);
      
      // Transform the questions to match the expected frontend format and filter out hidden ones
      const transformedQuestions = allQuestions
        .filter(q => !q.is_hidden && !q.isHidden) // Filter out hidden questions
        .map((q, index) => {
          // Clean the content to remove category labels like "category general- general equipment question"
          let cleanContent = q.questionText || q.question_text || q.content || '';
          
          // Remove category prefixes like "category general- general equipment question"
          cleanContent = cleanContent.replace(/^category\s+[^-]*-\s*[^:]*:\s*/i, '');
          cleanContent = cleanContent.replace(/^category\s+[^-]*-\s*[^?]*\?\s*/i, '');
          cleanContent = cleanContent.replace(/^category\s+[^-]*-\s*/i, '');
          
          return {
            id: q.id || index + 1, // Use database ID if available, otherwise index
            content: cleanContent.trim(),
            author_id: q.userId || q.user_id || '',
            author_name: q.userName || q.user_name || 'Anonymous',
            author_rank: q.maritime_rank || null,
            tags: q.tags || [],
            views: q.view_count || 0,
            is_resolved: q.isResolved || q.is_resolved || false,
            created_at: q.askedDate || q.createdAt || q.created_at || new Date().toISOString(),
            updated_at: q.updatedAt || q.updated_at || q.created_at || new Date().toISOString(),
            image_urls: q.image_urls || [],
            is_from_whatsapp: q.is_from_whatsapp || false,
            engagement_score: q.engagement_score || 0,
            flag_count: 0,
            category_name: q.questionCategory || q.question_category || 'General Discussion',
            answer_count: q.answerCount || q.answer_count || 0,
            author_whatsapp_profile_picture_url: q.author_whatsapp_profile_picture_url || null,
            author_whatsapp_display_name: q.author_whatsapp_display_name || null,
            author_profile_picture_url: q.author_profile_picture_url || null
          };
        });
      
      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedQuestions = transformedQuestions.slice(offset, offset + limit);
      const hasMore = offset + limit < transformedQuestions.length;
      
      console.log(`API: Returning ${paginatedQuestions.length} questions out of ${transformedQuestions.length} total from QAAQ database (search: ${search ? 'yes' : 'no'})`);
      
      res.json({
        questions: paginatedQuestions,
        total: transformedQuestions.length,
        hasMore: hasMore
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  });

  // API endpoint to get question attachments for carousel - MUST BE BEFORE parameterized routes
  app.get("/api/questions/attachments", noAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 18; // Default to all 18 images
      
      console.log('Authentication bypassed for questions API');
      
      // Query question attachments with enhanced data for stable carousel system
      // First, let's find attachments and try to map them to actual questions
      const result = await pool.query(`
        SELECT 
          qa.id,
          qa.question_id,
          qa.attachment_type,
          qa.attachment_url,
          qa.file_name,
          qa.mime_type,
          qa.is_processed,
          qa.created_at,
          q.content as question_content,
          q.author_id,
          q.id as actual_question_exists
        FROM question_attachments qa
        LEFT JOIN questions q ON q.id = qa.question_id
        WHERE qa.attachment_type = 'image' 
          AND qa.is_processed = true
        ORDER BY qa.created_at DESC
        LIMIT $1
      `, [limit]);
      
      console.log(`Found ${result.rows.length} image attachments in database`);

      // Map attachments to valid questions or find alternative question IDs
      const attachments = await Promise.all(result.rows.map(async (row) => {
        let finalQuestionId = row.question_id;
        let questionContent = row.question_content;
        let authorId = row.author_id;
        
        // If no linked question exists, try to find a suitable question based on the filename or create a fallback
        if (!row.actual_question_exists) {
          console.log(`Attachment ${row.file_name} has no linked question, trying to find suitable match...`);
          
          // Try to find a question that might be related based on keywords in filename
          if (row.file_name.includes('whatsapp')) {
            // For WhatsApp images, find any recent maritime question
            const fallbackQuery = await pool.query(`
              SELECT id, content, author_id 
              FROM questions 
              WHERE is_from_whatsapp = true 
              ORDER BY created_at DESC 
              LIMIT 1
            `);
            if (fallbackQuery.rows.length > 0) {
              finalQuestionId = fallbackQuery.rows[0].id;
              questionContent = fallbackQuery.rows[0].content;
              authorId = fallbackQuery.rows[0].author_id;
              console.log(`Mapped ${row.file_name} to WhatsApp question ${finalQuestionId}`);
            }
          } else {
            // For other images, find a technical question
            const fallbackQuery = await pool.query(`
              SELECT id, content, author_id 
              FROM questions 
              WHERE content ILIKE '%engine%' OR content ILIKE '%equipment%' OR content ILIKE '%maritime%'
              ORDER BY created_at DESC 
              LIMIT 1
            `);
            if (fallbackQuery.rows.length > 0) {
              finalQuestionId = fallbackQuery.rows[0].id;
              questionContent = fallbackQuery.rows[0].content;
              authorId = fallbackQuery.rows[0].author_id;
              console.log(`Mapped ${row.file_name} to technical question ${finalQuestionId}`);
            }
          }
        }
        
        return {
          id: row.id,
          questionId: finalQuestionId,
          attachmentType: row.attachment_type,
          // Ensure stable URL serving from uploads directory
          attachmentUrl: row.attachment_url?.startsWith('/uploads/') 
            ? row.attachment_url 
            : `/uploads/${row.file_name}`,
          fileName: row.file_name,
          mimeType: row.mime_type,
          isProcessed: row.is_processed,
          createdAt: row.created_at,
          question: {
            id: finalQuestionId,
            content: questionContent || (
              row.file_name.includes('whatsapp') 
                ? `Authentic Maritime Question from WhatsApp User ${row.file_name.split('_')[1]?.slice(0,5)}****`
                : `Maritime Equipment: ${row.file_name.replace(/\.(jpg|png|svg|jpeg)$/i, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
            ),
            authorId: authorId || (row.file_name.includes('whatsapp') ? 'whatsapp_user' : 'maritime_expert')
          }
        };
      }));

      console.log(`Retrieved ${attachments.length} question attachments for carousel`);
      res.json(attachments);
    } catch (error) {
      console.error('Error fetching question attachments:', error);
      res.status(500).json({ message: 'Failed to fetch question attachments' });
    }
  });

  // Admin-only endpoint to hide a question from QuestionBank
  app.post('/api/questions/:id/hide', authenticateToken, async (req: any, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const { hidden = true, hidden_reason = 'Admin removal' } = req.body;
      
      // Check if user is admin - simplified admin check using known admin IDs
      const adminIds = [
        '5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e', // Special admin UUID
        '44885683', // Admin user ID
        '+919029010070' // Admin phone number
      ];
      
      if (!adminIds.includes(req.userId)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Admin access required to hide questions' 
        });
      }

      // Update the question in the database to mark as hidden
      const result = await pool.query(`
        UPDATE questions 
        SET is_hidden = $1, 
            hidden_reason = $2, 
            hidden_at = NOW(),
            hidden_by = $3
        WHERE id = $4
        RETURNING id, is_hidden
      `, [hidden, hidden_reason, req.userId, questionId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Question not found' 
        });
      }

      console.log(`Admin ${req.userId} ${hidden ? 'hid' : 'unhid'} question ${questionId}: ${hidden_reason}`);
      
      res.json({
        success: true,
        message: `Question ${hidden ? 'hidden' : 'shown'} successfully`,
        question: result.rows[0]
      });
    } catch (error) {
      console.error('Error hiding/unhiding question:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update question visibility' 
      });
    }
  });

  // Get single question by ID (for sharing and image navigation)
  app.get('/api/questions/:id', noAuth, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      if (isNaN(questionId)) {
        return res.status(400).json({ error: 'Invalid question ID' });
      }
      
      console.log(`🔍 API: Fetching question ${questionId}`);
      
      // Use the proper questions service function
      const question = await getQuestionById(questionId);
      
      if (!question) {
        console.log(`❌ API: Question ${questionId} not found or hidden/archived`);
        return res.status(404).json({ error: 'Question not found' });
      }
      
      console.log(`✅ API: Successfully retrieved question ${questionId}`);
      res.json(question);
    } catch (error) {
      console.error('Error fetching question:', error);
      res.status(500).json({ error: 'Failed to fetch question' });
    }
  });

  // Get answers for a specific question
  app.get('/api/questions/:id/answers', noAuth, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      if (isNaN(questionId)) {
        return res.status(400).json({ error: 'Invalid question ID' });
      }
      
      console.log(`🔍 API: Fetching answers for question ${questionId}`);
      
      // Use the proper questions service function
      const answers = await getQuestionAnswers(questionId);
      
      console.log(`✅ API: Retrieved ${answers.length} answers for question ${questionId}`);
      res.json(answers);
    } catch (error) {
      console.error('Error fetching answers:', error);
      res.json([]); // Return empty array if no answers found
    }
  });

  // Domain redirect handlers for question sharing - redirect old share URLs to questions
  app.get('/share/question/:id', (req, res) => {
    const { id } = req.params;
    res.redirect(`/questions/${id}`);
  });

  // Handle old question URL format redirect
  app.get('/question/:id', (req, res) => {
    const { id } = req.params;
    res.redirect(`/questions/${id}`);
  });

  // Get user profile and questions
  app.get('/api/users/:userId/questions', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      
      const { getQuestionsByUserId, getUserProfile } = await import('./user-questions-service');
      
      const [profile, questionsData] = await Promise.all([
        getUserProfile(userId),
        getQuestionsByUserId(userId)
      ]);
      
      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        user: profile,
        questions: questionsData.questions,
        total: questionsData.total
      });
    } catch (error) {
      console.error('Error fetching user questions:', error);
      res.status(500).json({ error: 'Failed to fetch user questions' });
    }
  });

  // ===================== RANK GROUPS API =====================

  // Simple session authentication middleware
  const requireSessionAuth = async (req: any, res: any, next: any) => {
    try {
      let user = null;
      
      // Check session authentication (Google/Replit Auth)
      if (req.user) {
        const sessionUserId = req.user.claims?.sub || req.user.id || req.user.userId;
        if (sessionUserId) {
          user = await identityResolver.resolveUserByAnyMethod(sessionUserId, 'replit');
        }
      }
      
      if (!user) {
        return res.status(401).json({ 
          message: 'Authentication required',
          bridgeState: false
        });
      }
      
      // Attach user to request
      req.currentUser = user;
      req.userId = user.id;
      next();
    } catch (error) {
      console.error('Session auth error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  };

  // Confirm maritime rank for user
  app.post('/api/user/confirm-maritime-rank', requireSessionAuth, async (req: any, res) => {
    try {
      const { maritimeRank } = req.body;
      const userId = req.currentUser?.id || req.userId;
      
      if (!maritimeRank) {
        return res.status(400).json({ error: 'Maritime rank is required' });
      }
      
      console.log(`🔄 Confirming maritime rank for user ${userId}: ${maritimeRank}`);
      
      // Update user's maritime rank in database
      await pool.query(`
        UPDATE users 
        SET maritime_rank = $1, 
            rank = $1,
            last_updated = NOW(),
            has_confirmed_maritime_rank = true
        WHERE id = $2
      `, [maritimeRank, userId]);
      
      console.log(`✅ Maritime rank confirmed for user ${userId}: ${maritimeRank}`);
      
      res.json({ 
        success: true, 
        message: 'Maritime rank confirmed successfully',
        maritimeRank 
      });
    } catch (error) {
      console.error('❌ Error confirming maritime rank:', error);
      res.status(500).json({ error: 'Failed to confirm maritime rank' });
    }
  });

  // Test endpoint to examine maritime ranks for debugging
  app.get('/api/admin/maritime-ranks-debug', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      console.log('🔍 DEBUG: Examining maritime ranks in database...');
      
      // Get all distinct maritime ranks with counts
      const ranksResult = await pool.query(`
        SELECT maritime_rank, COUNT(*) as count
        FROM users 
        WHERE maritime_rank IS NOT NULL
        GROUP BY maritime_rank
        ORDER BY count DESC
      `);
      
      console.log('📊 Maritime ranks found:', ranksResult.rows.length);
      
      // Import the mapping function
      const { calculateRankGroupMemberCounts } = await import('./rank-groups-service.js');
      const memberCounts = await calculateRankGroupMemberCounts();
      
      res.json({
        success: true,
        maritimeRanks: ranksResult.rows,
        groupCounts: memberCounts,
        totalRanks: ranksResult.rows.length
      });
    } catch (error) {
      console.error('❌ Error examining maritime ranks:', error);
      res.status(500).json({ error: 'Failed to examine maritime ranks' });
    }
  });

  // Initialize rank groups (admin only)
  app.post('/api/rank-groups/initialize', authenticateToken, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUserById(req.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const result = await initializeRankGroups();
      res.json(result);
    } catch (error) {
      console.error('Error initializing rank groups:', error);
      res.status(500).json({ error: 'Failed to initialize rank groups' });
    }
  });

  // API to get rank groups for DM page cards - user's rank group or all groups for admin
  app.get('/api/rank-groups/public', async (req, res) => {
    try {
      // Check if user is authenticated via session OR JWT token
      let userId = null;
      let isAdmin = false;
      
      console.log('🔍 Rank groups public - Auth check:', {
        hasSession: !!req.session,
        hasUser: !!(req.session && req.session.user),
        sessionUserId: req.session?.user?.id,
        hasAuthHeader: !!req.headers.authorization
      });
      
      // First try session authentication
      if (req.session && req.session.user) {
        userId = req.session.user.id;
        console.log('🔑 Using session auth for user:', userId);
      } 
      // Then try JWT token authentication
      else {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
            userId = decoded.userId;
            console.log('🔑 Using JWT auth for user:', userId);
          } catch (error) {
            console.log('❌ JWT token invalid:', error.message);
          }
        }
      }
      
      if (userId) {
        
        // Check if user is admin
        if (userId === '5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e') {
          isAdmin = true;
          console.log('🔒 Admin detected - Special UUID:', userId);
        } else {
          const userResult = await pool.query('SELECT is_platform_admin, maritime_rank FROM users WHERE id = $1', [userId]);
          console.log('🔍 Database admin check result:', {
            userId,
            rowsFound: userResult.rows.length,
            isAdmin: userResult.rows[0]?.is_platform_admin,
            maritimeRank: userResult.rows[0]?.maritime_rank
          });
          
          if (userResult.rows.length > 0) {
            isAdmin = userResult.rows[0].is_platform_admin;
            const userMaritimeRank = userResult.rows[0].maritime_rank;
            
            console.log('🔒 Final admin decision:', { userId, isAdmin, userMaritimeRank });
            
            if (isAdmin) {
              // Admin gets all 15 rank groups with activity data
              console.log('👑 Admin access granted - fetching all 15 rank groups');
              const allGroups = await getAllRankGroups();
              console.log('📊 Found rank groups:', allGroups.length);
              
              // Add activity timestamps to each group
              const groupsWithActivity = await Promise.all(allGroups.map(async (group) => {
                try {
                  // Get most recent message timestamp for this group  
                  const activityResult = await pool.query(`
                    SELECT MAX("createdAt") as last_activity
                    FROM rank_group_messages 
                    WHERE "groupId" = $1
                  `, [group.id]);
                  
                  return {
                    ...group,
                    lastActivity: activityResult.rows[0]?.last_activity || group.createdAt || new Date('2024-01-01'),
                    type: 'rank_group'
                  };
                } catch (error) {
                  console.error('Error fetching activity for group:', group.id, error);
                  return {
                    ...group,
                    lastActivity: group.createdAt || new Date('2024-01-01'),
                    type: 'rank_group'
                  };
                }
              }));
              
              return res.json(groupsWithActivity);
            } else {
              // Regular user gets only their rank group with activity data
              const allGroups = await getAllRankGroups();
              const userRankGroup = allGroups.find(group => {
                // Match group name with user's maritime rank
                const groupName = group.name.toLowerCase();
                const userRank = (userMaritimeRank || '').toLowerCase();
                
                // Map common maritime ranks to group names
                if (userRank.includes('captain') || userRank.includes('master')) return groupName === 'cap';
                if (userRank.includes('chief_officer') || userRank.includes('chief officer')) return groupName === 'co';
                if (userRank.includes('2nd_officer') || userRank.includes('second officer')) return groupName === '2o';
                if (userRank.includes('3rd_officer') || userRank.includes('third officer')) return groupName === '3o';
                if (userRank.includes('chief_engineer')) return groupName === 'ce';
                if (userRank.includes('2nd_engineer') || userRank.includes('second engineer')) return groupName === '2e';
                if (userRank.includes('3rd_engineer') || userRank.includes('third engineer')) return groupName === '3e';
                if (userRank.includes('4th_engineer') || userRank.includes('fourth engineer')) return groupName === '4e';
                if (userRank.includes('cadet')) return groupName === 'cadets';
                if (userRank.includes('crew')) return groupName === 'crew';
                if (userRank.includes('marine') && userRank.includes('superintendent')) return groupName === 'marinesuperintendent';
                if (userRank.includes('tech') && userRank.includes('superintendent')) return groupName === 'techsuperintendent';
                if (userRank.includes('fleet') && userRank.includes('manager')) return groupName === 'fleet managers';
                if (userRank.includes('eto') || userRank.includes('electro')) return groupName === 'eto & esuper';
                
                // Default to Other Marine Professionals if no match
                return groupName === 'other marine professionals';
              });
              
              if (userRankGroup) {
                try {
                  // Get activity data for user's rank group
                  const activityResult = await pool.query(`
                    SELECT MAX(created_at) as last_activity
                    FROM rank_group_messages 
                    WHERE group_id = $1
                  `, [userRankGroup.id]);
                  
                  const groupWithActivity = {
                    ...userRankGroup,
                    lastActivity: activityResult.rows[0]?.last_activity || userRankGroup.createdAt || new Date('2024-01-01'),
                    type: 'rank_group'
                  };
                  
                  return res.json([groupWithActivity]);
                } catch (error) {
                  console.error('Error fetching activity for user group:', userRankGroup.id, error);
                  return res.json([{
                    ...userRankGroup,
                    lastActivity: userRankGroup.createdAt || new Date('2024-01-01'),
                    type: 'rank_group'
                  }]);
                }
              }
              
              return res.json([]);
            }
          }
        }
      }
      
      // No user session - return empty array
      console.log('❌ No user session found - returning empty array');
      res.json([]);
    } catch (error) {
      console.error('Error fetching rank groups for DM:', error);
      res.status(500).json({ error: 'Failed to fetch rank groups' });
    }
  });

  // Get all rank groups (admin only) or user's groups (regular users)
  app.get('/api/rank-groups', authenticateToken, async (req: any, res) => {
    try {
      console.log(`Fetching rank groups for user: ${req.userId}`);
      
      // Check if user is admin - handle both UUID admin and QAAQ database users
      let isAdmin = false;
      
      // Special admin user ID check
      if (req.userId === '5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e') {
        isAdmin = true;
        console.log('Admin access granted for special user ID');
      } else {
        // Check database for admin status
        const userResult = await pool.query('SELECT is_platform_admin FROM users WHERE id = $1', [req.userId]);
        isAdmin = userResult.rows.length > 0 ? userResult.rows[0].is_platform_admin : false;
        console.log(`Database admin check: ${isAdmin}`);
      }
      
      if (isAdmin) {
        // Admin sees all groups
        console.log('Fetching all rank groups for admin...');
        const groups = await getAllRankGroups();
        console.log(`Found ${groups.length} rank groups`);
        res.json(groups);
      } else {
        // Regular users see only their own groups
        console.log('Fetching user groups for regular user...');
        const userGroups = await getUserRankGroups(req.userId);
        console.log(`Found ${userGroups.length} user groups`);
        res.json(userGroups);
      }
    } catch (error) {
      console.error('Error fetching rank groups:', error);
      res.status(500).json({ error: 'Failed to fetch rank groups' });
    }
  });

  // Get user's rank groups
  app.get('/api/rank-groups/my-groups', authenticateToken, async (req: any, res) => {
    try {
      const userGroups = await getUserRankGroups(req.userId);
      res.json(userGroups);
    } catch (error) {
      console.error('Error fetching user rank groups:', error);
      res.status(500).json({ error: 'Failed to fetch user rank groups' });
    }
  });

  // Join a rank group
  app.post('/api/rank-groups/:groupId/join', authenticateToken, async (req: any, res) => {
    try {
      const { groupId } = req.params;
      const { role = 'member' } = req.body;
      
      const result = await joinRankGroup(req.userId, groupId, role);
      res.json(result);
    } catch (error) {
      console.error('Error joining rank group:', error);
      res.status(500).json({ error: 'Failed to join rank group' });
    }
  });

  // Leave a rank group
  app.post('/api/rank-groups/:groupId/leave', authenticateToken, async (req: any, res) => {
    try {
      const { groupId } = req.params;
      
      const result = await leaveRankGroup(req.userId, groupId);
      res.json(result);
    } catch (error) {
      console.error('Error leaving rank group:', error);
      res.status(500).json({ error: 'Failed to leave rank group' });
    }
  });

  // Send message to rank group
  app.post('/api/rank-groups/:groupId/messages', authenticateToken, async (req: any, res) => {
    try {
      const { groupId } = req.params;
      const validation = insertRankGroupMessageSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validation.error.issues 
        });
      }

      const { message, messageType = 'text', isAnnouncement = false } = validation.data;
      
      const result = await sendRankGroupMessage(
        req.userId, 
        groupId, 
        message, 
        messageType, 
        isAnnouncement
      );
      res.json(result);
    } catch (error) {
      console.error('Error sending rank group message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Get rank group messages
  app.get('/api/rank-groups/:groupId/messages', authenticateToken, async (req: any, res) => {
    try {
      const { groupId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const result = await getRankGroupMessages(groupId, req.userId, limit, offset);
      res.json(result);
    } catch (error) {
      console.error('Error fetching rank group messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Get rank group members
  app.get('/api/rank-groups/:groupId/members', authenticateToken, async (req: any, res) => {
    try {
      const { groupId } = req.params;
      
      const result = await pool.query(`
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.maritime_rank,
          u.city,
          rgm.role,
          rgm."joinedAt"
        FROM rank_group_members rgm
        JOIN users u ON rgm."userId" = u.id
        WHERE rgm."groupId" = $1
        ORDER BY rgm."joinedAt" ASC
      `, [groupId]);
      
      const members = result.rows.map(member => ({
        id: member.id,
        fullName: `${member.first_name} ${member.last_name}`.trim(),
        maritimeRank: member.maritime_rank,
        city: member.city,
        isVerified: false, // Not available in QAAQ database
        role: member.role,
        joinedAt: member.joinedAt,
      }));
      
      res.json(members);
    } catch (error) {
      console.error('Error fetching rank group members:', error);
      res.status(500).json({ error: 'Failed to fetch rank group members' });
    }
  });

  // MARIANA BASE RULE: AUTO-ASSIGNMENT PERMANENTLY DISABLED
  app.post('/api/rank-groups/auto-assign', authenticateToken, async (req: any, res) => {
    res.status(403).json({ 
      success: false, 
      message: 'MARIANA BASE RULE: Bulk assignment of users to rank groups is permanently disabled for security.',
      error: 'BULK_ASSIGNMENT_DISABLED'
    });
  });

  // Switch user to different rank group (for promotions)
  app.post('/api/rank-groups/switch', authenticateToken, async (req: any, res) => {
    try {
      const { groupId } = req.body;
      
      if (!groupId) {
        return res.status(400).json({ error: 'Group ID is required' });
      }
      
      const result = await switchUserRankGroup(req.userId, groupId);
      res.json(result);
    } catch (error) {
      console.error('Error switching rank group:', error);
      res.status(500).json({ error: 'Failed to switch rank group' });
    }
  });

  // MARIANA BASE RULE: BULK ASSIGNMENT OF USERS TO RANK GROUPS IS PERMANENTLY DISABLED
  // This endpoint has been permanently removed to comply with security requirements

  // ==== SEARCH ANALYTICS API ENDPOINTS ====
  
  // Import search analytics service
  const { searchAnalyticsService } = await import('./search-analytics-service');

  // Get top searched keywords (admin only)
  app.get('/api/admin/search-analytics/keywords', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const topKeywords = await searchAnalyticsService.getTopSearchedKeywords(limit);
      res.json(topKeywords);
    } catch (error) {
      console.error('Error fetching top search keywords:', error);
      res.status(500).json({ error: 'Failed to fetch search keywords' });
    }
  });

  // Get user's search history (authenticated users)
  app.get('/api/search-analytics/history', authenticateToken, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await searchAnalyticsService.getUserSearchHistory(req.userId, limit);
      res.json(history);
    } catch (error) {
      console.error('Error fetching user search history:', error);
      res.status(500).json({ error: 'Failed to fetch search history' });
    }
  });

  // Get keyword statistics (admin only)
  app.get('/api/admin/search-analytics/keyword/:keyword', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { keyword } = req.params;
      const stats = await searchAnalyticsService.getKeywordStats(keyword);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching keyword stats:', error);
      res.status(500).json({ error: 'Failed to fetch keyword statistics' });
    }
  });

  // Get search analytics summary (admin only)
  app.get('/api/admin/search-analytics/summary', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const summary = await searchAnalyticsService.getSearchAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error('Error fetching search analytics summary:', error);
      res.status(500).json({ error: 'Failed to fetch search analytics' });
    }
  });

  // AI Feedback endpoint for admin training
  app.post('/api/ai-feedback', authenticateToken, async (req: any, res) => {
    try {
      const { questionId, answerId, feedbackType, adminId } = req.body;
      
      // Verify user is admin
      const isAdminUser = req.userId === '44885683' || req.userId === '+919029010070' || req.userId === '5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e';
      
      if (!isAdminUser) {
        return res.status(403).json({ 
          success: false, 
          message: 'Unauthorized: Admin access required' 
        });
      }
      
      if (!questionId || !answerId || !feedbackType || !['helpful', 'needs_improvement'].includes(feedbackType)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing or invalid required fields' 
        });
      }
      
      // Store feedback in database for AI training
      const feedbackRecord = await pool.query(`
        INSERT INTO ai_feedback (question_id, answer_id, feedback_type, admin_id, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (question_id, answer_id, admin_id) 
        DO UPDATE SET feedback_type = EXCLUDED.feedback_type, created_at = NOW()
        RETURNING *
      `, [questionId, answerId, feedbackType, adminId]);
      
      console.log(`AI Feedback recorded: Q${questionId} A${answerId} - ${feedbackType} by ${adminId}`);
      
      res.json({
        success: true,
        message: 'Feedback recorded successfully',
        feedback: feedbackRecord.rows[0]
      });
      
    } catch (error) {
      console.error('Error recording AI feedback:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to record feedback' 
      });
    }
  });

  // Get existing AI feedback for admin
  app.get('/api/ai-feedback/:adminId', authenticateToken, async (req: any, res) => {
    try {
      const { adminId } = req.params;
      
      // Verify user is admin and requesting their own feedback
      const isAdminUser = req.userId === '44885683' || req.userId === '+919029010070' || req.userId === '5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e';
      
      if (!isAdminUser || req.userId !== adminId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Unauthorized: Admin access required' 
        });
      }
      
      // Get all feedback given by this admin
      const feedbackResult = await pool.query(`
        SELECT question_id, answer_id, feedback_type 
        FROM ai_feedback 
        WHERE admin_id = $1
        ORDER BY created_at DESC
      `, [adminId]);
      
      // Convert to a map for easy frontend access
      const feedbackMap: Record<string, string> = {};
      feedbackResult.rows.forEach(row => {
        const key = `${row.question_id}-${row.answer_id}`;
        feedbackMap[key] = row.feedback_type;
      });
      
      console.log(`Retrieved ${feedbackResult.rows.length} feedback records for admin ${adminId}`);
      
      res.json({
        success: true,
        feedback: feedbackMap,
        count: feedbackResult.rows.length
      });
      
    } catch (error) {
      console.error('Error fetching AI feedback:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch feedback' 
      });
    }
  });

  // ===== RAZORPAY PAYMENT ENDPOINTS =====

  // Get subscription plans
  app.get('/api/subscription-plans', async (req, res) => {
    try {
      res.json({
        success: true,
        plans: SUBSCRIPTION_PLANS
      });
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch subscription plans' });
    }
  });

  // Create subscription (authenticated)
  app.post('/api/subscriptions', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { planType, billingPeriod, topupPlan } = req.body;

      if (!planType) {
        return res.status(400).json({
          success: false,
          message: 'Plan type is required'
        });
      }

      if (!['premium', 'super_user'].includes(planType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan type. Must be premium or super_user'
        });
      }

      // For premium plans, validate billing period
      if (planType === 'premium') {
        if (!billingPeriod || !['monthly', 'yearly'].includes(billingPeriod)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid billing period for premium plan. Must be monthly or yearly'
          });
        }
      }

      // For super user plans, validate topup plan
      if (planType === 'super_user') {
        if (!topupPlan || !['topup_451', 'topup_4510'].includes(topupPlan)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid topup plan for super user. Must be one of the available topup options'
          });
        }
      }

      const result = await razorpayService.createSubscription(userId, planType, billingPeriod, topupPlan);
      res.json({
        success: true,
        subscription: result.subscription,
        checkoutUrl: result.checkoutUrl,
        razorpaySubscriptionId: result.razorpaySubscriptionId
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create subscription'
      });
    }
  });

  // Get user subscription status (authenticated)
  app.get('/api/user/subscription-status', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.userId;
      const status = await razorpayService.checkUserPremiumStatus(userId);
      
      res.json({
        success: true,
        ...status
      });
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription status'
      });
    }
  });

  // Get user subscription history (authenticated)
  app.get('/api/user/subscriptions', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.userId;
      const subscriptions = await razorpayService.getUserSubscriptions(userId);
      
      res.json({
        success: true,
        subscriptions
      });
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscriptions'
      });
    }
  });

  // Get user payment history (authenticated)
  app.get('/api/user/payments', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.userId;
      const payments = await razorpayService.getUserPayments(userId);
      
      res.json({
        success: true,
        payments
      });
    } catch (error) {
      console.error('Error fetching user payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payments'
      });
    }
  });

  // Cancel subscription (authenticated)
  app.delete('/api/subscriptions/:subscriptionId', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          message: 'Subscription ID is required'
        });
      }

      const result = await razorpayService.cancelSubscription(userId, subscriptionId);
      res.json(result);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel subscription'
      });
    }
  });

  // Admin endpoint to manually activate premium subscription
  app.post('/api/admin/activate-premium', async (req, res) => {
    try {
      const { userId, email, subscriptionType, paymentId } = req.body;
      
      console.log('🔧 Admin activating premium for:', { userId, email, subscriptionType, paymentId });
      
      // Determine expiry based on subscription type
      const expiryInterval = subscriptionType.includes('yearly') ? '1 year' : '1 month';
      
      // Update user subscription status
      await storage.db.query(`
        INSERT INTO user_subscription_status (
          user_id, is_premium, premium_expires_at, subscription_type
        ) VALUES ($1, true, NOW() + INTERVAL '${expiryInterval}', $2)
        ON CONFLICT (user_id) DO UPDATE SET
          is_premium = true,
          premium_expires_at = NOW() + INTERVAL '${expiryInterval}',
          subscription_type = $2
      `, [userId, subscriptionType]);

      // Also update the subscription record if it exists
      if (paymentId) {
        await storage.db.query(`
          UPDATE subscriptions 
          SET user_id = $1, status = 'active'
          WHERE razorpay_payment_id = $2
        `, [userId, paymentId]);
      }

      console.log('✅ Premium status activated successfully');
      
      res.json({
        success: true,
        message: 'Premium status activated successfully',
        userId,
        subscriptionType,
        expiresAt: `Now + ${expiryInterval}`
      });
    } catch (error) {
      console.error('❌ Failed to activate premium:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate premium status'
      });
    }
  });

  // Razorpay webhook endpoint
  app.post('/api/razorpay/webhook', async (req, res) => {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing webhook signature'
        });
      }

      await razorpayService.handleWebhook(req.body, signature);
      
      res.json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process webhook'
      });
    }
  });

  // Admin: Get pending payments that need user linking
  app.get('/api/admin/pending-payments', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          s.*,
          p.razorpay_payment_id,
          p.amount as payment_amount,
          p.method as payment_method,
          p.notes as payment_notes
        FROM subscriptions s
        LEFT JOIN payments p ON s.razorpay_payment_id = p.razorpay_payment_id
        WHERE s.status = 'pending_user' AND s.user_id IS NULL
        ORDER BY s.created_at DESC
      `);

      res.json({
        success: true,
        pendingPayments: result.rows
      });
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending payments'
      });
    }
  });

  // Admin: Link pending payment to user
  app.post('/api/admin/link-payment', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { subscriptionId, userId } = req.body;

      if (!subscriptionId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Subscription ID and User ID are required'
        });
      }

      // Get subscription details
      const subscriptionResult = await pool.query(`
        SELECT * FROM subscriptions WHERE id = $1 AND status = 'pending_user'
      `, [subscriptionId]);

      if (subscriptionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pending subscription not found'
        });
      }

      const subscription = subscriptionResult.rows[0];
      const notes = JSON.parse(subscription.notes || '{}');
      const billingPeriod = notes.billingPeriod;

      // Update subscription with user ID and activate
      await pool.query(`
        UPDATE subscriptions 
        SET user_id = $1, status = 'active', updated_at = NOW()
        WHERE id = $2
      `, [userId, subscriptionId]);

      // Update payment record with user ID
      if (subscription.razorpay_payment_id) {
        await pool.query(`
          UPDATE payments 
          SET user_id = $1, updated_at = NOW()
          WHERE razorpay_payment_id = $2
        `, [userId, subscription.razorpay_payment_id]);
      }

      // Update user premium status
      const expiryDate = billingPeriod === 'yearly' ? 
        'NOW() + INTERVAL \'1 year\'' : 
        'NOW() + INTERVAL \'1 month\'';

      await pool.query(`
        INSERT INTO user_subscription_status (
          user_id, is_premium, premium_expires_at, subscription_type, updated_at
        ) VALUES ($1, true, ${expiryDate}, $2, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          is_premium = true, 
          premium_expires_at = ${expiryDate},
          subscription_type = $2,
          updated_at = NOW()
      `, [userId, subscription.subscription_type]);

      console.log(`✅ Admin linked payment to user: subscription ${subscriptionId} -> user ${userId}`);

      res.json({
        success: true,
        message: 'Payment successfully linked to user and premium activated'
      });
    } catch (error) {
      console.error('Error linking payment to user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to link payment to user'
      });
    }
  });

  // Admin: Process manual payment (for payments that couldn't be auto-linked)
  app.post('/api/admin/process-manual-payment', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { email, paymentId, planType = 'premium', billingPeriod = 'monthly' } = req.body;

      if (!email || !paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Email and Payment ID are required'
        });
      }

      console.log(`🔧 Manual payment processing: ${email} - Payment ID: ${paymentId}`);

      // Find user by email
      const userResult = await pool.query(`
        SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1
      `, [email]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found with the provided email'
        });
      }

      const user = userResult.rows[0];
      const userId = user.id;

      // Create a manual subscription record
      const subscriptionId = `manual_${userId}_${Date.now()}`;
      const amount = billingPeriod === 'yearly' ? 261100 : 45100; // ₹2611 or ₹451 in paise
      
      await pool.query(`
        INSERT INTO subscriptions (
          user_id, subscription_type, razorpay_subscription_id, razorpay_plan_id, 
          status, amount, currency, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId,
        planType,
        subscriptionId,
        billingPeriod === 'yearly' ? 'plan_premium_yearly' : 'plan_R6tDNXxZMxBIJR',
        'active',
        amount,
        'INR',
        JSON.stringify({ 
          manual_processing: true,
          payment_id: paymentId,
          processed_by: 'admin',
          billing_period: billingPeriod,
          user_email: email,
          processing_date: new Date().toISOString()
        })
      ]);

      // Create payment record
      await pool.query(`
        INSERT INTO payments (
          user_id, razorpay_payment_id, amount, currency, status, method, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        paymentId,
        amount,
        'INR',
        'captured',
        'manual',
        'Manually processed premium subscription payment'
      ]);

      // Update user premium status
      const expiryInterval = billingPeriod === 'yearly' ? '1 year' : '1 month';
      await pool.query(`
        INSERT INTO user_subscription_status (
          user_id, is_premium, premium_expires_at, subscription_type
        ) VALUES ($1, true, NOW() + INTERVAL '${expiryInterval}', $2)
        ON CONFLICT (user_id) DO UPDATE SET
          is_premium = true,
          premium_expires_at = NOW() + INTERVAL '${expiryInterval}',
          subscription_type = $2,
          updated_at = NOW()
      `, [userId, planType]);

      console.log(`✅ Manual payment processed successfully: ${email} - Payment ID: ${paymentId}`);

      res.json({
        success: true,
        message: `Premium subscription activated for ${user.full_name} (${email})`,
        user: {
          id: userId,
          name: user.full_name,
          email: user.email
        },
        subscription: {
          type: planType,
          billingPeriod: billingPeriod,
          expiryInterval: expiryInterval
        }
      });
    } catch (error) {
      console.error('Error processing manual payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process manual payment'
      });
    }
  });

  // Admin: Get all subscriptions (admin only)
  app.get('/api/admin/subscriptions', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          s.*,
          u.full_name as user_name,
          u.email as user_email,
          uss.is_premium,
          uss.is_super_user,
          uss.premium_expires_at,
          uss.super_user_expires_at
        FROM subscriptions s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN user_subscription_status uss ON s.user_id = uss.user_id
        ORDER BY s.created_at DESC
        LIMIT 100
      `);

      res.json({
        success: true,
        subscriptions: result.rows
      });
    } catch (error) {
      console.error('Error fetching admin subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscriptions'
      });
    }
  });

  // Admin: Get payment analytics
  app.get('/api/admin/payment-analytics', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const result = await pool.query(`
        WITH payment_stats AS (
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            subscription_type,
            COUNT(*) as subscription_count,
            SUM(amount) as total_revenue
          FROM subscriptions
          WHERE status IN ('active', 'completed')
            AND created_at >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', created_at), subscription_type
        ),
        monthly_totals AS (
          SELECT 
            month,
            SUM(subscription_count) as total_subscriptions,
            SUM(total_revenue) as total_revenue
          FROM payment_stats
          GROUP BY month
        )
        SELECT 
          ps.month,
          ps.subscription_type,
          ps.subscription_count,
          ps.total_revenue,
          mt.total_subscriptions,
          mt.total_revenue as monthly_total_revenue
        FROM payment_stats ps
        JOIN monthly_totals mt ON ps.month = mt.month
        ORDER BY ps.month DESC, ps.subscription_type
      `);

      res.json({
        success: true,
        analytics: result.rows
      });
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment analytics'
      });
    }
  });

  // Admin: Check specific payment by ID or user email (no auth for testing)
  app.get('/api/admin/check-payment', async (req, res) => {
    try {
      const { paymentId, userId, email, phone } = req.query;
      
      // Check specific payment
      if (paymentId) {
        const paymentResult = await pool.query(`
          SELECT *
          FROM payments
          WHERE razorpay_payment_id = $1
        `, [paymentId]);
        
        return res.json({
          success: true,
          payment: paymentResult.rows[0] || null,
          found: paymentResult.rows.length > 0
        });
      }
      
      // Find user by email and get their info
      if (email) {
        const userResult = await pool.query(`
          SELECT id, full_name, email, whatsapp_number
          FROM users 
          WHERE email = $1
        `, [email]);
        
        if (userResult.rows.length === 0) {
          return res.json({
            success: true,
            user: null,
            payments: [],
            found: false
          });
        }
        
        const user = userResult.rows[0];
        
        // Get payments for this user
        const paymentsResult = await pool.query(`
          SELECT *
          FROM payments
          WHERE user_id = $1
          ORDER BY created_at DESC
        `, [user.id]);
        
        return res.json({
          success: true,
          user,
          payments: paymentsResult.rows,
          found: true
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Please provide paymentId or email'
      });
      
    } catch (error) {
      console.error('Error checking payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check payment'
      });
    }
  });

  // Admin: Manually process a payment (for missing webhook events)
  app.post('/api/admin/process-payment', async (req, res) => {
    try {
      const {
        paymentId,
        userEmail,
        amount,
        orderId,
        method = 'upi',
        description = 'Manual Payment Processing'
      } = req.body;

      if (!paymentId || !userEmail || !amount) {
        return res.status(400).json({
          success: false,
          message: 'paymentId, userEmail, and amount are required'
        });
      }

      // Find user by email
      const userResult = await pool.query(`
        SELECT id, full_name, email FROM users WHERE email = $1 LIMIT 1
      `, [userEmail]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email'
        });
      }

      const user = userResult.rows[0];
      
      // Check if payment already exists
      const existingPayment = await pool.query(`
        SELECT * FROM payments WHERE razorpay_payment_id = $1
      `, [paymentId]);

      if (existingPayment.rows.length > 0) {
        return res.json({
          success: false,
          message: 'Payment already exists in database',
          payment: existingPayment.rows[0]
        });
      }

      // Determine subscription type based on amount
      let subscriptionType = null;
      let billingPeriod = null;
      
      if (amount === 45100) { // ₹451 monthly premium
        subscriptionType = 'premium';
        billingPeriod = 'monthly';
      } else if (amount === 261100) { // ₹2611 yearly premium  
        subscriptionType = 'premium';
        billingPeriod = 'yearly';
      }

      // Insert payment record
      await pool.query(`
        INSERT INTO payments (
          user_id, razorpay_payment_id, amount, currency, status, method, 
          description, payment_source, notes, razorpay_order_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        user.id,
        paymentId,
        amount,
        'INR',
        'captured',
        method,
        subscriptionType ? `Premium Payment - ${subscriptionType} ${billingPeriod}` : description,
        method === 'upi' ? 'upi' : 'card',
        JSON.stringify({
          subscriptionType,
          billingPeriod,
          email: userEmail,
          processedManually: true,
          processedAt: new Date().toISOString()
        }),
        orderId
      ]);

      // If this is a subscription payment, activate premium
      if (subscriptionType) {
        // Create subscription record
        await pool.query(`
          INSERT INTO subscriptions (
            user_id, subscription_type, razorpay_payment_id, amount, currency, 
            status, notes, razorpay_plan_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
          ON CONFLICT (user_id, subscription_type) 
          DO UPDATE SET 
            razorpay_payment_id = $3,
            amount = $4,
            status = 'active',
            updated_at = NOW()
        `, [
          user.id,
          subscriptionType,
          paymentId,
          amount,
          'INR',
          'active',
          JSON.stringify({
            billingPeriod,
            email: userEmail,
            activatedAt: new Date(),
            processedManually: true
          }),
          billingPeriod === 'monthly' ? 'plan_R6tDNXxZMxBIJR' : 'plan_premium_yearly'
        ]);

        // Update user premium status
        const expiryInterval = billingPeriod === 'yearly' ? '1 year' : '1 month';
        await pool.query(`
          INSERT INTO user_subscription_status (
            user_id, is_premium, premium_expires_at, subscription_type, updated_at
          ) VALUES ($1, true, NOW() + INTERVAL '${expiryInterval}', $2, NOW())
          ON CONFLICT (user_id) 
          DO UPDATE SET 
            is_premium = true, 
            premium_expires_at = NOW() + INTERVAL '${expiryInterval}',
            subscription_type = $2,
            updated_at = NOW()
        `, [user.id, subscriptionType]);

        console.log('✅ User upgraded to premium manually:', {
          userId: user.id,
          email: userEmail,
          plan: `${billingPeriod} ${subscriptionType}`,
          amount: `₹${amount / 100}`,
          paymentId
        });
      }

      res.json({
        success: true,
        message: 'Payment processed successfully',
        payment: {
          paymentId,
          userId: user.id,
          userEmail,
          amount,
          subscriptionType,
          billingPeriod,
          status: 'captured'
        }
      });

    } catch (error) {
      console.error('Error processing payment manually:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process payment',
        error: error.message
      });
    }
  });

  // Database health monitoring endpoint
  app.get('/api/health/database', async (req, res) => {
    try {
      const start = Date.now();
      await pool.query('SELECT 1 as health_check');
      const latency = Date.now() - start;
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: { healthy: true, latency }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  // Favicon route to prevent 500 errors
  app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No content response for favicon
  });

  // ==== DATABASE MONITORING & SYNC MANAGEMENT ENDPOINTS ====
  
  // Database Health Status (Admin only)
  app.get('/api/admin/db-health', authenticateToken, isAdmin, async (req, res) => {
    try {
      const keeperStatus = databaseKeeper.getStatus();
      const poolStats = connectionPoolManager.getStats();
      const syncStatus = syncManager.getStatus();
      
      // Test database connectivity
      const startTime = Date.now();
      const client = await pool.connect();
      const connectTime = Date.now() - startTime;
      
      // Get database information
      const dbInfo = await client.query(`
        SELECT 
          current_database() as database,
          current_user as user,
          version() as version,
          NOW() as server_time,
          pg_database_size(current_database()) as db_size
      `);
      
      client.release();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connectivity: {
          connectionTime: `${connectTime}ms`,
          status: connectTime < 1000 ? 'excellent' : connectTime < 3000 ? 'good' : 'slow'
        },
        database: {
          name: dbInfo.rows[0].database,
          user: dbInfo.rows[0].user,
          version: dbInfo.rows[0].version.split(' ')[1],
          serverTime: dbInfo.rows[0].server_time,
          size: Math.round(dbInfo.rows[0].db_size / 1024 / 1024) + ' MB'
        },
        keeper: {
          active: keeperStatus.active,
          lastActivity: keeperStatus.lastActivity,
          consecutiveFailures: keeperStatus.consecutiveFailures,
          uptime: Math.round(keeperStatus.uptime / 1000) + 's'
        },
        pool: {
          activeConnections: poolStats.activeConnections,
          waitingRequests: poolStats.waitingRequests,
          totalQueries: poolStats.queryCount,
          errors: poolStats.connectionErrors,
          errorRate: poolStats.queryCount > 0 ? 
            ((poolStats.connectionErrors / poolStats.queryCount) * 100).toFixed(2) + '%' : '0%'
        },
        sync: {
          queueLength: syncStatus.queueLength,
          isProcessing: syncStatus.isProcessing,
          lastSync: new Date(syncStatus.lastSync).toISOString()
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Database health check failed:', errorMessage);
      res.status(500).json({
        status: 'unhealthy',
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Database Performance Metrics (Admin only)
  app.get('/api/admin/db-metrics', authenticateToken, isAdmin, async (req, res) => {
    try {
      const client = await pool.connect();
      
      // Get active connections and long-running queries
      const activeQueries = await client.query(`
        SELECT 
          pid,
          usename,
          state,
          query_start,
          now() - query_start as duration,
          left(query, 100) as query_preview
        FROM pg_stat_activity 
        WHERE state = 'active' 
          AND query NOT LIKE '%pg_stat_activity%'
        ORDER BY query_start
      `);
      
      // Get database statistics
      const dbStats = await client.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch
        FROM pg_stat_user_tables 
        ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
        LIMIT 10
      `);
      
      // Get index usage
      const indexStats = await client.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE idx_scan > 0
        ORDER BY idx_scan DESC
        LIMIT 10
      `);
      
      client.release();
      
      res.json({
        timestamp: new Date().toISOString(),
        activeQueries: activeQueries.rows,
        tableStats: dbStats.rows,
        indexStats: indexStats.rows,
        poolMetrics: connectionPoolManager.getStats()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Database metrics error:', errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Control Database Services (Admin only)
  app.post('/api/admin/db-control/:action', authenticateToken, isAdmin, async (req, res) => {
    try {
      const { action } = req.params;
      const userId = req.userId;
      
      switch (action) {
        case 'restart-keeper':
          databaseKeeper.stop();
          setTimeout(() => databaseKeeper.start(), 1000);
          console.log(`🔄 Database keeper restarted by admin ${userId}`);
          res.json({ message: 'Database keeper restarted', action: 'restart-keeper' });
          break;
          
        case 'optimize-pool':
          await connectionPoolManager.optimizePool();
          console.log(`🔧 Connection pool optimized by admin ${userId}`);
          res.json({ message: 'Connection pool optimized', action: 'optimize-pool' });
          break;
          
        case 'reset-pool-stats':
          connectionPoolManager.resetStats();
          console.log(`📊 Pool statistics reset by admin ${userId}`);
          res.json({ message: 'Pool statistics reset', action: 'reset-pool-stats' });
          break;
          
        case 'force-sync':
          await syncManager.forcSync();
          console.log(`🚀 Forced synchronization by admin ${userId}`);
          res.json({ message: 'Synchronization forced', action: 'force-sync' });
          break;
          
        case 'clear-sync-queue':
          syncManager.clearQueue();
          console.log(`🗑️ Sync queue cleared by admin ${userId}`);
          res.json({ message: 'Sync queue cleared', action: 'clear-sync-queue' });
          break;
          
        default:
          res.status(400).json({ error: 'Unknown action' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Database control error:', errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Sync Queue Management (Admin only)
  app.post('/api/admin/sync-queue', authenticateToken, isAdmin, async (req, res) => {
    try {
      const { operation, data } = req.body;
      
      if (!operation || !data) {
        return res.status(400).json({ error: 'Operation and data are required' });
      }
      
      const syncId = syncManager.queueSync(operation, data);
      
      res.json({
        message: 'Operation queued successfully',
        syncId,
        operation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Sync queue error:', errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Database Connection Test (Public endpoint for service monitoring)
  app.get('/api/db-status', async (req, res) => {
    try {
      const startTime = Date.now();
      const client = await pool.connect();
      await client.query('SELECT 1 as test');
      client.release();
      const responseTime = Date.now() - startTime;
      
      res.json({
        status: 'connected',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        healthy: responseTime < 2000
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(503).json({
        status: 'disconnected',
        error: errorMessage,
        timestamp: new Date().toISOString(),
        healthy: false
      });
    }
  });

  const httpServer = createServer(app);

  // Add WebSocket server for real-time messaging
  const wss = new ws.Server({ server: httpServer, path: '/ws' });
  
  // Store active connections for 1v1 chats
  const activeConnections = new Map();
  
  // Store rank-based connections: rank -> Set of { userId, ws, userInfo }
  const rankConnections = new Map();
  
  wss.on('connection', (ws, request) => {
    console.log('New WebSocket connection established');
    
    // Handle authentication
    let userId: string | null = null;
    let userInfo: any = null;
    let isAuthenticated = false;
    let currentRank: string | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data.type);
        
        if (data.type === 'auth') {
          // Authenticate user with session data
          try {
            // For rank chat, we'll use a simpler auth approach
            userId = data.userId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            userInfo = data.userInfo || { fullName: 'Maritime Professional', maritimeRank: data.rank };
            isAuthenticated = true;
            activeConnections.set(userId, ws);
            console.log(`User ${userId} authenticated and connected via WebSocket`);
            
            ws.send(JSON.stringify({
              type: 'auth_success',
              message: 'Authentication successful',
              userId: userId
            }));
          } catch (error) {
            console.error('WebSocket authentication failed:', error);
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Authentication failed'
            }));
            ws.close();
          }
        } else if (data.type === 'join_rank_room' && isAuthenticated && userId) {
          // Join a rank-based chat room
          const { rank } = data;
          if (!rank) {
            ws.send(JSON.stringify({ type: 'error', message: 'Rank is required' }));
            return;
          }
          
          currentRank = rank.toLowerCase();
          
          // Remove from previous rank room if exists
          for (const [existingRank, connections] of rankConnections.entries()) {
            for (const conn of connections) {
              if (conn.userId === userId) {
                connections.delete(conn);
                break;
              }
            }
          }
          
          // Add to new rank room
          if (!rankConnections.has(currentRank)) {
            rankConnections.set(currentRank, new Set());
          }
          rankConnections.get(currentRank)!.add({ userId, ws, userInfo });
          
          console.log(`User ${userId} joined rank room: ${currentRank}`);
          ws.send(JSON.stringify({
            type: 'rank_room_joined',
            rank: currentRank,
            message: `Joined ${rank} chat room`
          }));
          
        } else if (data.type === 'send_rank_message' && isAuthenticated && userId && currentRank) {
          // Send message to rank chat room
          const { message: messageText, rank } = data;
          
          if (!messageText || !rank) {
            ws.send(JSON.stringify({ type: 'error', message: 'Message and rank are required' }));
            return;
          }
          
          console.log(`📤 Broadcasting rank message from ${userInfo?.fullName} to ${rank}`);
          
          try {
            // Store message in database and get user's lastCompany
            const result = await pool.query(`
              WITH inserted_message AS (
                INSERT INTO rank_chat_messages (maritime_rank, sender_id, sender_name, message, message_type)
                VALUES ($1, $2, $3, $4, 'text')
                RETURNING *
              )
              SELECT 
                im.id,
                im.sender_id as "senderId",
                im.sender_name as "senderName",
                im.maritime_rank as "senderRank",
                u.last_company as "senderCompany",
                im.message,
                im.message_type as "messageType",
                im.created_at as "timestamp"
              FROM inserted_message im
              LEFT JOIN users u ON im.sender_id = u.id
            `, [rank, userId, userInfo?.fullName || 'Maritime Professional', messageText]);
            
            const newMessage = result.rows[0];
            
            // Broadcast to all users in the same rank room
            const rankRoom = rankConnections.get(rank.toLowerCase());
            if (rankRoom) {
              for (const conn of rankRoom) {
                if (conn.ws.readyState === ws.OPEN) {
                  conn.ws.send(JSON.stringify({
                    type: 'new_rank_message',
                    message: newMessage,
                    rank: rank
                  }));
                }
              }
            }
            
            console.log(`✅ Message broadcast to ${rankRoom?.size || 0} users in ${rank} room`);
            
          } catch (error) {
            console.error('Error sending rank message:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message' }));
          }
        } else if (data.type === 'send_message' && isAuthenticated && userId) {
          // Handle sending 1v1 messages
          const { connectionId, message: messageText } = data;
          
          if (!connectionId || !messageText) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Missing required fields'
            }));
            return;
          }
          
          try {
            // Store message in database
            const chatMessage = await storage.sendMessage(connectionId, userId, messageText);
            
            // Get connection details to find receiver
            const connections = await storage.getUserChatConnections(userId);
            const connection = connections.find(c => c.id === connectionId);
            
            if (connection) {
              const receiverId = connection.senderId === userId ? connection.receiverId : connection.senderId;
              const receiverWs = activeConnections.get(receiverId);
              
              // Send to receiver if online
              if (receiverWs && receiverWs.readyState === ws.OPEN) {
                receiverWs.send(JSON.stringify({
                  type: 'new_message',
                  message: chatMessage,
                  connectionId,
                  senderId: userId
                }));
              }
              
              // Send confirmation to sender
              ws.send(JSON.stringify({
                type: 'message_sent',
                message: chatMessage,
                connectionId
              }));
            }
          } catch (error) {
            console.error('Error sending message:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to send message'
            }));
          }
        } else if (data.type === 'typing' && isAuthenticated && userId) {
          // Handle typing indicators
          const { connectionId, isTyping } = data;
          
          try {
            const connections = await storage.getUserChatConnections(userId);
            const connection = connections.find(c => c.id === connectionId);
            
            if (connection) {
              const receiverId = connection.senderId === userId ? connection.receiverId : connection.senderId;
              const receiverWs = activeConnections.get(receiverId);
              
              if (receiverWs && receiverWs.readyState === ws.OPEN) {
                receiverWs.send(JSON.stringify({
                  type: 'user_typing',
                  connectionId,
                  userId,
                  isTyping
                }));
              }
            }
          } catch (error) {
            console.error('Error handling typing indicator:', error);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', () => {
      if (userId && activeConnections.get(userId) === ws) {
        activeConnections.delete(userId);
        
        // Remove from rank rooms
        for (const [rank, connections] of rankConnections.entries()) {
          for (const conn of connections) {
            if (conn.userId === userId) {
              connections.delete(conn);
              console.log(`User ${userId} removed from rank room: ${rank}`);
              break;
            }
          }
        }
        
        console.log(`User ${userId} disconnected from WebSocket`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (userId && activeConnections.get(userId) === ws) {
        activeConnections.delete(userId);
      }
    });
  });

  console.log('WebSocket server setup complete on path /ws');

  return httpServer;
}

// Helper function to generate user questions based on maritime expertise
function generateUserQuestions(name: string, rank: string, questionCount: number) {
  const maritimeQuestions = [
    { category: 'Navigation', questions: [
      'What are the best practices for GPS navigation in heavy weather?',
      'How do you calculate course to steer when there is current?',
      'What is the difference between magnetic and gyro compass?',
      'How to plot a position using celestial navigation?',
      'What are the requirements for bridge watch keeping?'
    ]},
    { category: 'Engine', questions: [
      'How to troubleshoot main engine starting problems?',
      'What are the common causes of cylinder liner wear?',
      'How to maintain fuel injection systems?',
      'What is the procedure for engine room fire prevention?',
      'How to optimize fuel consumption on long voyages?'
    ]},
    { category: 'Safety', questions: [
      'What are the requirements for SOLAS safety inspections?',
      'How to conduct proper man overboard drills?',
      'What is the correct procedure for confined space entry?',
      'How to maintain life saving equipment?',
      'What are the fire fighting systems on modern vessels?'
    ]},
    { category: 'Cargo', questions: [
      'How to calculate cargo loading sequences?',
      'What are the requirements for dangerous goods handling?',
      'How to maintain proper ventilation in cargo holds?',
      'What is the procedure for ballast water management?',
      'How to secure containers in heavy weather?'
    ]},
    { category: 'Port Operations', questions: [
      'What documents are required for port clearance?',
      'How to communicate with port authorities effectively?',
      'What are the procedures for crew change in port?',
      'How to handle port state control inspections?',
      'What are the requirements for waste disposal in port?'
    ]}
  ];

  const questions = [];
  const nameHash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  
  // Select categories based on rank
  const isEngineer = rank.toLowerCase().includes('engineer');
  const isOfficer = rank.toLowerCase().includes('officer') || rank.toLowerCase().includes('captain') || rank.toLowerCase().includes('master');
  
  let relevantCategories = maritimeQuestions;
  if (isEngineer) {
    relevantCategories = maritimeQuestions.filter(cat => 
      cat.category === 'Engine' || cat.category === 'Safety' || cat.category === 'Port Operations'
    );
  } else if (isOfficer) {
    relevantCategories = maritimeQuestions.filter(cat => 
      cat.category === 'Navigation' || cat.category === 'Cargo' || cat.category === 'Safety'
    );
  }

  // Generate questions based on question count
  for (let i = 0; i < Math.min(questionCount, 20); i++) {
    const categoryIndex = (nameHash + i) % relevantCategories.length;
    const category = relevantCategories[categoryIndex];
    const questionIndex = (nameHash + i * 7) % category.questions.length;
    
    questions.push({
      id: `q_${i + 1}`,
      question: category.questions[questionIndex],
      category: category.category,
      askedDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
      answerCount: Math.floor(Math.random() * 5),
      isResolved: Math.random() > 0.3
    });
  }

  return questions.sort((a, b) => new Date(b.askedDate).getTime() - new Date(a.askedDate).getTime());
}


