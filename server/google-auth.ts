import type { Express, Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import { storage } from "./storage";
import { pool } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'qaaq_jwt_secret_key_2024_secure';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/api/auth/google/callback`;

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
}

// Generate Google OAuth URL
export function getGoogleAuthUrl(): string {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is required');
  }

  const scope = encodeURIComponent('openid email profile');
  const redirectUri = encodeURIComponent(GOOGLE_REDIRECT_URI);
  
  return `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${redirectUri}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `access_type=offline&` +
    `prompt=consent`;
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth environment variables not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

// Get user info from Google
async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  return response.json();
}

// Find or create user from Google profile
async function findOrCreateGoogleUser(googleUser: GoogleUserInfo): Promise<any> {
  try {
    console.log('🔍 Searching for existing Google user:', googleUser.id);
    // First try to find user by Google ID
    let user = await storage.getUserByGoogleId(googleUser.id);
    
    if (user) {
      console.log('✅ Found existing Google user, updating last login');
      // Update last login time for existing Google user
      await pool.query(`
        UPDATE users SET last_login = NOW() WHERE google_id = $1
      `, [googleUser.id]);
      return user;
    }

    console.log('🔍 No Google user found, searching by email:', googleUser.email);
    // Try to find user by email
    user = await storage.getUserByEmail(googleUser.email);
    
    if (user) {
      console.log('✅ Found existing user by email, linking to Google account');
      // Link existing account to Google
      await pool.query(`
        UPDATE users SET 
          google_id = $1,
          google_email = $2,
          google_profile_picture_url = $3,
          google_display_name = $4,
          auth_provider = 'google',
          last_login = NOW()
        WHERE id = $5
      `, [googleUser.id, googleUser.email, googleUser.picture, googleUser.name, user.id]);
      
      // Re-fetch the updated user
      user = await storage.getUserByGoogleId(googleUser.id);
      return user;
    }

    console.log('➕ Creating new Google user');
    // Create new user
    const newUser = await storage.createGoogleUser({
      googleId: googleUser.id,
      fullName: googleUser.name,
      email: googleUser.email,
      googleEmail: googleUser.email,
      googleProfilePictureUrl: googleUser.picture,
      googleDisplayName: googleUser.name,
      authProvider: 'google',
      userType: 'sailor', // Default to sailor, can be changed later
      isVerified: true, // Google accounts are pre-verified
      isAdmin: false, // Default to non-admin
    });

    return newUser;
  } catch (error) {
    console.error('💥 Error finding/creating Google user:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

// Setup Google OAuth routes
export function setupGoogleAuth(app: Express) {
  // Initiate Google OAuth
  app.get('/api/auth/google', (req: Request, res: Response) => {
    try {
      const authUrl = getGoogleAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error initiating Google auth:', error);
      res.status(500).json({ error: 'Failed to initiate Google authentication' });
    }
  });

  // Handle Google OAuth callback
  app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
    try {
      console.log('🔐 Google OAuth callback received with query:', req.query);
      const { code, error, state } = req.query;

      if (error) {
        console.error('❌ Google OAuth error:', error);
        return res.redirect('/login?error=google_auth_failed');
      }

      if (!code || typeof code !== 'string') {
        console.error('❌ No authorization code received');
        return res.redirect('/login?error=no_auth_code');
      }

      console.log('🔄 Exchanging authorization code for tokens...');
      // Exchange code for tokens
      const tokenResponse = await exchangeCodeForToken(code);
      console.log('✅ Token exchange successful');
      
      // Get user info
      console.log('👤 Fetching Google user info...');
      const googleUser = await getGoogleUserInfo(tokenResponse.access_token);
      console.log('✅ Google user info retrieved:', { id: googleUser.id, email: googleUser.email, name: googleUser.name });
      
      // Find or create user
      console.log('🔍 Finding or creating user in database...');
      const user = await findOrCreateGoogleUser(googleUser);
      console.log('✅ User processed:', { id: user.id, email: user.email, isAdmin: user.isAdmin });
      
      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      console.log('🎫 JWT token generated for user:', user.id);
      
      // Redirect to frontend with token - redirect to QBOT Chat as per user preference
      const redirectUrl = `/oauth-callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        isAdmin: user.isAdmin
      }))}`;
      
      console.log('🔄 Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('💥 Error in Google OAuth callback:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.redirect('/login?error=auth_failed');
    }
  });

  // Get Google auth URL endpoint (for frontend to use)
  app.get('/api/auth/google/url', (req: Request, res: Response) => {
    try {
      const authUrl = getGoogleAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      res.status(500).json({ error: 'Failed to generate Google auth URL' });
    }
  });
}

export { findOrCreateGoogleUser, getGoogleUserInfo };