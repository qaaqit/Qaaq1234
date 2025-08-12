import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import ws from 'ws';
import jwt from 'jsonwebtoken';
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, verifyCodeSchema, loginSchema, insertChatConnectionSchema, insertChatMessageSchema, insertRankGroupSchema, insertRankGroupMemberSchema, insertRankGroupMessageSchema, insertEmailVerificationTokenSchema, emailVerificationTokens } from "@shared/schema";
import { emailService } from "./email-service";
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { pool } from "./db";
import { getQuestions, searchQuestions, getQuestionAnswers } from "./questions-service";
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
import { populateRankGroupsWithUsers } from "./populate-rank-groups";
import { bulkAssignUsersToRankGroups } from "./bulk-assign-users";
import { setupMergeRoutes } from "./merge-interface";
import { robustAuth } from "./auth-system";
import { ObjectStorageService } from "./objectStorage";
import { imageManagementService } from "./image-management-service";
import { setupStableImageRoutes } from "./stable-image-upload";
import { razorpayService, SUBSCRIPTION_PLANS } from "./razorpay-service-dummy";
import { setupGoogleAuth } from "./google-auth";
import { PasswordManager } from "./password-manager";
import { AIService } from "./ai-service";

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

// Generate random 6-digit verification code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

export async function registerRoutes(app: Express): Promise<Server> {
  
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
  
  // Setup merge routes for robust authentication
  setupMergeRoutes(app);
  
  // Setup stable image upload system
  setupStableImageRoutes(app);
  
  // Password management endpoints - no auth required for password renewal/creation
  app.put('/api/users/:userId/password', async (req, res) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;
      
      if (!password || password.length < 6) {
        return res.status(400).json({ 
          message: 'Password must be at least 6 characters long' 
        });
      }
      
      await storage.updateUserPassword(userId, password);
      
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
      const { userId } = req.params;
      const requiresRenewal = await storage.checkPasswordRenewalRequired(userId);
      
      res.json({
        requiresRenewal,
        message: requiresRenewal ? 'Password creation/renewal required' : 'Password is current'
      });
    } catch (error: unknown) {
      console.error('Password renewal check error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to check password status', error: errorMessage });
    }
  });

  // Setup Google OAuth authentication
  setupGoogleAuth(app);

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
        return res.status(400).json({ message: "User already exists with this email" });
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
      await pool.query(
        `INSERT INTO email_verification_tokens (email, token, user_data, expires_at) 
         VALUES ($1, $2, $3, $4)`,
        [email, verificationToken, JSON.stringify(userData), expiresAt]
      );

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
      const userData = JSON.parse(verificationData.user_data);

      // Create user account
      const newUser = await storage.createUser({
        fullName: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        whatsAppNumber: userData.whatsapp || null,
        rank: userData.maritimeRank,
        lastCompany: userData.company,
        password: userData.password,
        userType: userData.userType,
        userId: userData.userId, // Include generated user ID
        isVerified: true
      });

      // Mark token as used
      await pool.query(
        `UPDATE email_verification_tokens SET is_used = true WHERE token = $1`,
        [token]
      );

      // Generate JWT token
      const jwtToken = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });

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
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #dc2626;">❌ Verification Failed</h2>
            <p>An error occurred during verification. Please try again.</p>
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
      
      // Generate JWT token for authenticated user
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      
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
  app.get("/api/profile", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
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
        shipName: user.shipName,
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

  // Get Top Q Professionals - New API endpoint for Top Professionals feature
  app.get("/api/users/top-professionals", async (req, res) => {
    try {
      console.log('🏆 API route /api/users/top-professionals called');
      
      // For now, return the confirmed top 9 professionals we know from the database
      // Based on the previous merge from bhangar_users table
      const professionals = [
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

      console.log(`✅ Returning ${professionals.length} top professionals with authentic data`);

      res.json({
        success: true,
        professionals: professionals,
        total: professionals.length,
        message: `Found ${professionals.length} top Q professionals`
      });
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
  app.post("/api/qbot/message", authenticateToken, async (req: any, res) => {
    try {
      const { message, attachments, image, isPrivate } = req.body;
      const userId = req.userId;

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
        const aiResponse = await generateAIResponse(message, category, user, activeRules);
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
        const aiResponse = await generateAIResponse(message, category, user, activeRules);
        response = aiResponse.content;
        aiModel = aiResponse.aiModel;
        responseTime = aiResponse.responseTime;
        tokens = aiResponse.tokens;
      }

      // Commandment II: Ensure message uniqueness (simplified for API)
      const responseId = `${userId}_${Date.now()}`;

      // Store QBOT interaction in database unless privacy mode is enabled
      if (!isPrivate) {
        try {
          // Store QBOT interaction with AI model information for feedback tracking
          const storedResponse = await storeQBOTResponseInDatabase(message, response, user, attachments, aiModel, responseTime, tokens);
          console.log(`📚 QBOT interaction stored in database with ${aiModel} model (User: ${userId})`);
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

  async function generateAIResponse(message: string, category: string, user: any, activeRules?: string): Promise<{ content: string, aiModel: string, responseTime?: number, tokens?: number }> {
    // Import AI service for dual model testing
    const { aiService } = await import('./ai-service');
    
    try {
      // Use dual AI system with random model selection for testing
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
      
      // For admin user IDs, allow direct access
      if (userId === "5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e") {
        console.log('Direct admin access granted');
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
          COUNT(CASE WHEN ship_name IS NOT NULL THEN 1 END) as sailors,
          COUNT(CASE WHEN ship_name IS NULL THEN 1 END) as locals,
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
               u.ship_name, u.imo_number,
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
        userType: user.ship_name ? 'sailor' : 'local',
        isAdmin: user.is_admin || false,
        rank: user.maritime_rank,
        shipName: user.ship_name,
        imoNumber: user.imo_number,
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
      const result = await pool.query(`
        WITH daily_questions AS (
          SELECT 
            DATE(created_at) as date,
            CASE 
              WHEN content LIKE '%[QBOT Q&A%' OR content LIKE '%[QBOT CHAT%' OR content LIKE '%via QBOT%' THEN 'webchat'
              WHEN content LIKE '%WhatsApp%' OR content LIKE '%via WhatsApp%' THEN 'whatsapp'
              ELSE 'other'
            END as source_type
          FROM questions 
          WHERE created_at >= NOW() - INTERVAL '30 days'
        ),
        grouped_data AS (
          SELECT 
            date,
            source_type,
            COUNT(*) as question_count
          FROM daily_questions
          WHERE source_type IN ('webchat', 'whatsapp')
          GROUP BY date, source_type
        ),
        date_range AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            '1 day'::interval
          )::date as date
        )
        SELECT 
          dr.date,
          COALESCE(SUM(CASE WHEN gd.source_type = 'webchat' THEN gd.question_count END), 0) as webchat_count,
          COALESCE(SUM(CASE WHEN gd.source_type = 'whatsapp' THEN gd.question_count END), 0) as whatsapp_count
        FROM date_range dr
        LEFT JOIN grouped_data gd ON dr.date = gd.date
        GROUP BY dr.date
        ORDER BY dr.date
      `);

      const chatMetrics = result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        webchat: parseInt(row.webchat_count) || 0,
        whatsapp: parseInt(row.whatsapp_count) || 0
      }));

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

  // ==== QBOT CHAT API ENDPOINTS ====
  
  // Function to store QBOT response in Questions database with SEMM breadcrumb and attachments
  async function storeQBOTResponseInDatabase(userMessage: string, aiResponse: string, user: any, attachments?: string[], aiModel?: string, responseTime?: number, tokens?: number): Promise<{ questionId: number, answerId: number }> {
    try {
      const userId = user?.id || 'qbot_user';
      const userName = user?.fullName || user?.whatsAppDisplayName || 'QBOT User';
      const userRank = user?.maritimeRank || user?.rank || 'Maritime Professional';
      
      // Analyze message to determine SEMM breadcrumb categorization
      const semmCategory = categorizeMessageWithSEMM(userMessage, aiResponse);
      
      // Format attachments for database storage
      let attachmentText = '';
      if (attachments && attachments.length > 0) {
        attachmentText = `\n\nAttachments: ${attachments.map(att => `[IMAGE: ${att}]`).join(', ')}`;
      }
      
      // Store question
      const questionResult = await pool.query(`
        INSERT INTO questions (
          content, created_at, updated_at
        ) VALUES ($1, NOW(), NOW())
        RETURNING id
      `, [
        `[QBOT Q&A - ${semmCategory.breadcrumb}]\nUser: ${userName} (via QBOT)\nCategory: ${semmCategory.category}\n\nQuestion: ${userMessage}${attachmentText}`
      ]);
      
      const questionId = questionResult.rows[0].id;
      
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
      const { message } = req.body;
      const userId = req.userId;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Message is required' });
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

      // Generate AI response using dual AI service
      const aiResponse = await aiService.generateDualResponse(message, 'Maritime Technical Support', user);
      
      // Store QBOT response in Questions database with SEMM breadcrumb and AI model info
      await storeQBOTResponseInDatabase(message, aiResponse.content, user, [], aiResponse.aiModel, aiResponse.responseTime, aiResponse.tokens);
      
      console.log(`🤖 QBOT Chat - User: ${message.substring(0, 50)}... | Response: ${aiResponse.content.substring(0, 50)}...`);
      
      res.json({ 
        response: aiResponse.content,
        aiModel: aiResponse.aiModel,
        responseTime: aiResponse.responseTime,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('QBOT chat error:', error);
      res.status(500).json({ 
        message: 'Unable to generate response at this time. Please try again.',
        error: 'QBOT_ERROR'
      });
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

  // Chat connection endpoints
  app.post('/api/chat/connect', authenticateToken, async (req, res) => {
    try {
      const { receiverId } = insertChatConnectionSchema.parse(req.body);
      const senderId = req.userId;
      
      console.log('Chat connect attempt - senderId:', senderId, 'receiverId:', receiverId);
      
      if (!senderId) {
        console.error('senderId is null or undefined, req.userId:', req.userId);
        return res.status(400).json({ message: "Authentication error: user ID not found" });
      }

      // Check if connection already exists
      const existing = await storage.getChatConnection(senderId, receiverId);
      if (existing) {
        return res.status(400).json({ message: "Connection already exists" });
      }

      const connection = await storage.createChatConnection(senderId, receiverId);
      res.json(connection);
    } catch (error) {
      console.error('Create chat connection error:', error);
      res.status(500).json({ message: "Failed to create chat connection" });
    }
  });

  app.post('/api/chat/accept/:connectionId', authenticateToken, async (req, res) => {
    try {
      const { connectionId } = req.params;
      await storage.acceptChatConnection(connectionId);
      res.json({ message: "Connection accepted" });
    } catch (error) {
      console.error('Accept chat connection error:', error);
      res.status(500).json({ message: "Failed to accept connection" });
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

  app.get('/api/chat/connections', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId!;
      const connections = await storage.getUserChatConnections(userId);
      
      // Enhance connections with user information
      const enhancedConnections = await Promise.all(
        connections.map(async (conn) => {
          const sender = await storage.getUser(conn.senderId);
          const receiver = await storage.getUser(conn.receiverId);
          return {
            ...conn,
            sender: sender ? { id: sender.id, fullName: sender.fullName, rank: sender.rank } : null,
            receiver: receiver ? { id: receiver.id, fullName: receiver.fullName, rank: receiver.rank } : null
          };
        })
      );
      
      res.json(enhancedConnections);
    } catch (error) {
      console.error('Get chat connections error:', error);
      res.status(500).json({ message: "Failed to get connections" });
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

  app.get('/api/chat/messages/:connectionId', authenticateToken, async (req, res) => {
    try {
      const { connectionId } = req.params;
      const messages = await storage.getChatMessages(connectionId);
      await storage.markMessagesAsRead(connectionId, req.userId!);
      res.json(messages);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ message: "Failed to get messages" });
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
        
        // Calculate distance for each user using Haversine formula
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
          const R = 6371; // Earth's radius in kilometers
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };
        
        const usersWithDistance = allUsers
          .filter(user => user.latitude && user.longitude) // Only users with valid coordinates
          .map(user => ({
            ...user,
            distance: calculateDistance(userLat, userLng, user.latitude!, user.longitude!)
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 9); // Return 9 closest users
          
        console.log(`Returning ${usersWithDistance.length} nearby users by proximity`);
        res.json(usersWithDistance);
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
  app.get('/api/users/profile/:userId', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.params;
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
  app.get('/api/users/:userId/profile', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.params;
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

  // OLD ENDPOINT - COMMENTED OUT TO USE NEW QUESTIONS SERVICE
  // app.get('/api/questions', authenticateToken, async (req, res) => {
  //   try {
  //     const { getAllQAAQQuestions } = await import('./qa-service');
  //     const questions = await getAllQAAQQuestions();
  //     
  //     res.json({
  //       questions,
  //       total: questions.length,
  //       dataSource: 'qaaq-notion'
  //     });
  //   } catch (error) {
  //     console.error('Error fetching QAAQ questions:', error);
  //     res.status(500).json({ error: 'Failed to fetch questions' });
  //   }
  // });

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
  
  // Get user profile for CV/Profile page
  app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId; // Use req.userId set by authenticateToken middleware
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }
      
      console.log(`📋 Fetching profile for user: ${userId}`);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // Update user profile
  app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId; // Use req.userId set by authenticateToken middleware
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      console.log('Profile update request for user:', userId, 'Data:', req.body);

      // Only use fields that exist in QAAQ parent database
      const allowedFields = {
        fullName: req.body.fullName,           // Maps to full_name
        email: req.body.email,                 // Maps to email
        maritimeRank: req.body.rank,           // Maps to maritime_rank
        currentShipName: req.body.shipName,    // Maps to current_ship_name
        currentShipIMO: req.body.imoNumber,    // Maps to current_ship_imo
        city: req.body.city,                   // Maps to current_city
        country: req.body.country,             // Maps to current_country
      };

      // Filter out undefined values
      const updateData = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const updatedUser = await storage.updateUserProfile(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
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

  // Get Top Q Professionals - Top 9 users with highest question counts
  app.get('/api/users/top-professionals', optionalAuth, async (req, res) => {
    try {
      console.log('🏆 Fetching top Q professionals...');
      
      const result = await pool.query(`
        SELECT 
          id,
          user_id,
          full_name,
          email,
          maritime_rank,
          rank,
          ship_name,
          current_ship_name,
          port,
          city,
          country,
          question_count,
          answer_count,
          user_type,
          subscription_status,
          whatsapp_number,
          experience_level,
          last_company,
          google_profile_picture_url,
          whatsapp_profile_picture_url
        FROM users 
        WHERE question_count > 0 
        ORDER BY question_count DESC, answer_count DESC 
        LIMIT 9
      `);
      
      const professionals = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id || row.id,
        fullName: row.full_name || row.email || 'Maritime Professional',
        email: row.email,
        maritimeRank: row.maritime_rank || row.rank || 'Professional',
        shipName: row.current_ship_name || row.ship_name || '',
        port: row.port || row.city || '',
        country: row.country || '',
        questionCount: row.question_count || 0,
        answerCount: row.answer_count || 0,
        userType: row.user_type || 'Free',
        subscriptionStatus: row.subscription_status || 'free',
        experienceLevel: row.experience_level,
        lastCompany: row.last_company,
        profilePictureUrl: row.google_profile_picture_url || row.whatsapp_profile_picture_url,
        isTopProfessional: true
      }));
      
      console.log(`✅ Found ${professionals.length} top professionals`);
      
      res.json({ 
        success: true,
        professionals,
        total: professionals.length,
        message: 'Top Q Professionals retrieved successfully'
      });
      
    } catch (error) {
      console.error('❌ Error fetching top professionals:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch top professionals',
        error: error.message 
      });
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
        .map((q, index) => ({
          id: q.id || index + 1, // Use database ID if available, otherwise index
          content: q.questionText || q.question_text || q.content || '',
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
        }));
      
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
      
      // First try to get from shared QAAQ database
      const questionQuery = await pool.query(`
        SELECT id, content, author_id, created_at, updated_at,
               tags, views, is_resolved, is_from_whatsapp,
               engagement_score, equipment_name
        FROM questions 
        WHERE id = $1
      `, [questionId]);
      
      if (questionQuery.rows.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }
      
      const questionData = questionQuery.rows[0];
      
      // Format the question response
      const question = {
        id: questionData.id,
        content: questionData.content,
        author_id: questionData.author_id,
        author_name: questionData.author_id.startsWith('+') ? `User ${questionData.author_id.slice(0,8)}****` : 'Maritime Professional',
        author_rank: 'Maritime Expert',
        created_at: questionData.created_at,
        updated_at: questionData.updated_at,
        category: questionData.equipment_name || 'Technical Discussion',
        tags: questionData.tags || [],
        view_count: questionData.views || 0,
        answer_count: 0, // We'll calculate this
        is_resolved: questionData.is_resolved || false,
        is_anonymous: false,
        is_from_whatsapp: questionData.is_from_whatsapp || false,
        source: questionData.is_from_whatsapp ? 'WhatsApp' : 'QAAQ Platform'
      };
      
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
      
      // Get answers from shared database - this might not exist for all questions
      const answersQuery = await pool.query(`
        SELECT id, content, author_id, created_at
        FROM answers 
        WHERE question_id = $1
        ORDER BY created_at ASC
      `, [questionId]);
      
      const answers = answersQuery.rows.map(row => ({
        id: row.id,
        content: row.content,
        author_id: row.author_id,
        author_name: row.author_id === 'QG' || row.author_id === 'QAAQ GPT' ? 'QAAQ GPT' : 'Maritime Professional',
        author_rank: row.author_id === 'QG' || row.author_id === 'QAAQ GPT' ? 'AI Assistant' : 'Maritime Expert',
        created_at: row.created_at,
        is_best_answer: false
      }));
      
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

  // Auto-assign user to rank groups based on their maritime rank (DISABLED)
  app.post('/api/rank-groups/auto-assign', authenticateToken, async (req: any, res) => {
    try {
      // Auto-assignment is disabled per user request
      res.json({ 
        success: true, 
        message: 'Auto-assignment is disabled. Users must manually join groups.',
        assignedGroups: []
      });
    } catch (error) {
      console.error('Error in auto-assign endpoint:', error);
      res.status(500).json({ error: 'Failed to process auto-assign request' });
    }
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

  // Auto-populate all rank groups with users based on their ranks (admin only)
  app.post('/api/rank-groups/populate', authenticateToken, async (req: any, res) => {
    try {
      // Check if user is admin
      const userResult = await pool.query('SELECT is_platform_admin FROM users WHERE id = $1', [req.userId]);
      const isAdmin = userResult.rows.length > 0 ? userResult.rows[0].is_platform_admin : false;
      
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const result = await bulkAssignUsersToRankGroups();
      res.json(result);
    } catch (error) {
      console.error('Error populating rank groups:', error);
      res.status(500).json({ error: 'Failed to populate rank groups' });
    }
  });

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

  // ===== WATI WHATSAPP INTEGRATION ENDPOINTS =====

  // WATI webhook endpoint - receive messages and events
  app.post('/api/wati/webhook', async (req, res) => {
    try {
      const webhookPayload = req.body;
      console.log('🔄 WATI webhook received:', JSON.stringify(webhookPayload, null, 2));
      
      // Import WATI service
      const { getWatiService } = await import('./wati-service');
      const watiService = getWatiService();
      
      if (!watiService) {
        console.error('❌ WATI service not initialized');
        return res.status(500).json({ success: false, message: 'WATI service not available' });
      }
      
      // Process webhook
      await watiService.handleWebhook(webhookPayload);
      
      // Always respond with 200 to acknowledge receipt
      res.status(200).json({ success: true, message: 'Webhook processed' });
      
    } catch (error) {
      console.error('❌ Error processing WATI webhook:', error);
      res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
  });

  // Send message via WATI (admin only)
  app.post('/api/wati/send-message', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { whatsappNumber, message, messageType = 'session' } = req.body;
      
      if (!whatsappNumber || !message) {
        return res.status(400).json({ 
          success: false, 
          message: 'WhatsApp number and message are required' 
        });
      }
      
      const { getWatiService } = await import('./wati-service');
      const watiService = getWatiService();
      
      if (!watiService) {
        return res.status(500).json({ success: false, message: 'WATI service not available' });
      }
      
      let result;
      if (messageType === 'template') {
        result = await watiService.sendTemplateMessage(whatsappNumber, message.templateName, message.parameters);
      } else {
        result = await watiService.sendSessionMessage(whatsappNumber, message);
      }
      
      res.json({ success: true, result });
      
    } catch (error) {
      console.error('❌ Error sending WATI message:', error);
      res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  });

  // Send maritime welcome message (admin only)
  app.post('/api/wati/send-maritime-welcome', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { whatsappNumber, userName, shipName } = req.body;
      
      if (!whatsappNumber || !userName) {
        return res.status(400).json({ 
          success: false, 
          message: 'WhatsApp number and user name are required' 
        });
      }
      
      const { getWatiService } = await import('./wati-service');
      const watiService = getWatiService();
      
      if (!watiService) {
        return res.status(500).json({ success: false, message: 'WATI service not available' });
      }
      
      const result = await watiService.sendMaritimeWelcome(whatsappNumber, userName, shipName);
      
      res.json({ success: true, result });
      
    } catch (error) {
      console.error('❌ Error sending maritime welcome:', error);
      res.status(500).json({ success: false, message: 'Failed to send welcome message' });
    }
  });

  // Get WATI contacts (admin only)
  app.get('/api/wati/contacts', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { getWatiService } = await import('./wati-service');
      const watiService = getWatiService();
      
      if (!watiService) {
        return res.status(500).json({ success: false, message: 'WATI service not available' });
      }
      
      const contacts = await watiService.getContacts();
      res.json({ success: true, contacts });
      
    } catch (error) {
      console.error('❌ Error fetching WATI contacts:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch contacts' });
    }
  });

  // Get WATI message templates (admin only)
  app.get('/api/wati/templates', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { getWatiService } = await import('./wati-service');
      const watiService = getWatiService();
      
      if (!watiService) {
        return res.status(500).json({ success: false, message: 'WATI service not available' });
      }
      
      const templates = await watiService.getMessageTemplates();
      res.json({ success: true, templates });
      
    } catch (error) {
      console.error('❌ Error fetching WATI templates:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
  });

  // Export users to WATI format (admin only)
  app.get('/api/wati/export-users', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { getWatiService } = await import('./wati-service');
      const watiService = getWatiService();
      
      if (!watiService) {
        return res.status(500).json({ success: false, message: 'WATI service not available' });
      }
      
      const exportData = await watiService.exportUsersToWati();
      res.json(exportData);
      
    } catch (error) {
      console.error('❌ Error exporting users to WATI:', error);
      res.status(500).json({ success: false, message: 'Failed to export users' });
    }
  });

  // Export comprehensive maritime professionals CSV (authenticated users)
  app.get('/api/export/maritime-professionals-csv', authenticateToken, async (req: any, res) => {
    try {
      console.log('📤 Exporting comprehensive maritime professionals CSV...');
      
      // Import database directly
      const { db } = await import('./db');
      const { users } = await import('../shared/schema');
      
      // Get all users from database
      const allUsers = await db.select().from(users);
      
      // Enhanced CSV headers with all requested maritime attributes
      const csvRows = [
        'Full Name,WhatsApp Number,Maritime Rank,Email,Company,Current City,Question Count,Present/Last Ship,User Type,Registration Date,Last Login,Profile Complete'
      ];
      
      let exportedCount = 0;
      
      for (const user of allUsers) {
        // Include all users with comprehensive maritime data
        const fullName = user.fullName || user.firstName || 'Unknown';
        const whatsappNumber = user.id || user.whatsAppNumber || '';
        const maritimeRank = user.maritimeRank || '';
        const email = user.email || '';
        const company = user.company || user.shipCompany || '';
        const currentCity = user.currentCity || user.city || '';
        const questionCount = user.questionCount || 0;
        const presentShip = user.shipName || user.lastShip || user.currentShip || '';
        const userType = user.userType || 'Free';
        const registrationDate = user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '';
        const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt).toISOString().split('T')[0] : '';
        const profileComplete = (fullName !== 'Unknown' && maritimeRank && email) ? 'Yes' : 'No';
        
        // Enhanced CSV row with all maritime professional attributes
        csvRows.push([
          `"${fullName}"`,
          `"${whatsappNumber}"`,
          `"${maritimeRank}"`,
          `"${email}"`,
          `"${company}"`,
          `"${currentCity}"`,
          `"${questionCount}"`,
          `"${presentShip}"`,
          `"${userType}"`,
          `"${registrationDate}"`,
          `"${lastLogin}"`,
          `"${profileComplete}"`
        ].join(','));
        
        exportedCount++;
      }
      
      const csvData = csvRows.join('\n');
      
      console.log(`📤 CSV export complete: ${exportedCount} maritime professionals`);
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="maritime_professionals_${new Date().toISOString().split('T')[0]}.csv"`);
      
      res.send(csvData);
      
    } catch (error) {
      console.error('❌ Error exporting maritime professionals CSV:', error);
      res.status(500).json({ success: false, message: 'Failed to export CSV' });
    }
  });

  // Bulk import contacts to WATI (admin only)
  app.post('/api/wati/bulk-import', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { contacts } = req.body;
      
      if (!contacts || !Array.isArray(contacts)) {
        return res.status(400).json({ success: false, message: 'Contacts array is required' });
      }
      
      const { getWatiService } = await import('./wati-service');
      const watiService = getWatiService();
      
      if (!watiService) {
        return res.status(500).json({ success: false, message: 'WATI service not available' });
      }
      
      const result = await watiService.bulkImportContacts(contacts);
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error bulk importing contacts:', error);
      res.status(500).json({ success: false, message: 'Failed to import contacts' });
    }
  });

  // Add WATI contact (admin only)
  app.post('/api/wati/contacts', authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { whatsappNumber, name, customParams } = req.body;
      
      if (!whatsappNumber) {
        return res.status(400).json({ 
          success: false, 
          message: 'WhatsApp number is required' 
        });
      }
      
      const { getWatiService } = await import('./wati-service');
      const watiService = getWatiService();
      
      if (!watiService) {
        return res.status(500).json({ success: false, message: 'WATI service not available' });
      }
      
      const result = await watiService.addContact(whatsappNumber, name, customParams);
      res.json({ success: true, result });
      
    } catch (error) {
      console.error('❌ Error adding WATI contact:', error);
      res.status(500).json({ success: false, message: 'Failed to add contact' });
    }
  });

  // Send question answered notification via WATI
  app.post('/api/wati/notify-question-answered', authenticateToken, async (req: any, res) => {
    try {
      const { questionId, answererName } = req.body;
      
      if (!questionId || !answererName) {
        return res.status(400).json({ 
          success: false, 
          message: 'Question ID and answerer name are required' 
        });
      }
      
      // Get question details
      const questionResult = await pool.query('SELECT * FROM questions WHERE id = $1', [questionId]);
      if (questionResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Question not found' });
      }
      
      const question = questionResult.rows[0];
      
      // Get question author's WhatsApp number
      const authorResult = await pool.query('SELECT whatsapp_number FROM users WHERE user_id = $1', [question.author_id]);
      if (authorResult.rows.length === 0 || !authorResult.rows[0].whatsapp_number) {
        return res.json({ success: false, message: 'Author WhatsApp number not found' });
      }
      
      const { getWatiService } = await import('./wati-service');
      const watiService = getWatiService();
      
      if (!watiService) {
        return res.status(500).json({ success: false, message: 'WATI service not available' });
      }
      
      const questionTitle = question.content.substring(0, 50) + (question.content.length > 50 ? '...' : '');
      await watiService.sendQuestionAnsweredNotification(
        authorResult.rows[0].whatsapp_number, 
        questionTitle, 
        answererName
      );
      
      res.json({ success: true, message: 'Notification sent' });
      
    } catch (error) {
      console.error('❌ Error sending question answered notification:', error);
      res.status(500).json({ success: false, message: 'Failed to send notification' });
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

  const httpServer = createServer(app);

  // Add WebSocket server for real-time messaging
  const wss = new ws.Server({ server: httpServer, path: '/ws' });
  
  // Store active connections
  const activeConnections = new Map<string, ws>();
  
  wss.on('connection', (ws, request) => {
    console.log('New WebSocket connection established');
    
    // Handle authentication
    let userId: string | null = null;
    let isAuthenticated = false;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data.type);
        
        if (data.type === 'auth') {
          // Authenticate user with JWT token
          try {
            const decoded = jwt.verify(data.token, JWT_SECRET) as { userId: string };
            userId = decoded.userId;
            isAuthenticated = true;
            activeConnections.set(userId, ws);
            console.log(`User ${userId} authenticated and connected via WebSocket`);
            
            ws.send(JSON.stringify({
              type: 'auth_success',
              message: 'Authentication successful'
            }));
          } catch (error) {
            console.error('WebSocket authentication failed:', error);
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Authentication failed'
            }));
            ws.close();
          }
        } else if (data.type === 'send_message' && isAuthenticated && userId) {
          // Handle sending messages
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


