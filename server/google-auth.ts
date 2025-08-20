import type { Express, Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import { storage } from "./storage";
import { pool } from './db';
import { identityConsolidation } from './identity-consolidation';

const JWT_SECRET = process.env.JWT_SECRET || 'qaaq_jwt_secret_key_2024_secure';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Use current deployment domain for Google OAuth callback
const getRedirectUri = () => {
  // Use the current Replit deployment domain
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(',')[0];
    return `https://${domain}/api/auth/google/callback`;
  }
  // Fallback to custom domain
  return 'https://qaaq.app/api/auth/google/callback';
};

const GOOGLE_REDIRECT_URI = getRedirectUri();

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

  const currentRedirectUri = getRedirectUri();
  const scope = encodeURIComponent('openid email profile');
  const redirectUri = encodeURIComponent(currentRedirectUri);
  
  console.log(`🔗 Google OAuth redirect URI: ${currentRedirectUri}`);
  console.log(`🔗 Make sure this EXACT URL is in Google Console: ${currentRedirectUri}`);
  
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
      redirect_uri: getRedirectUri(),
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
    console.log('🔍 GOOGLE AUTH: Processing Google user with ID:', googleUser.id);
    
    // Use identity consolidation service for Google auth
    const result = await identityConsolidation.consolidateOnLogin(
      googleUser.id, 
      'google', 
      {
        email: googleUser.email,
        name: googleUser.name,
        displayName: googleUser.name,
        profileImageUrl: googleUser.picture,
        firstName: googleUser.given_name,
        lastName: googleUser.family_name
      }
    );
    
    console.log('✅ GOOGLE AUTH: User processed via consolidation:', result.fullName);
    return result;
  } catch (error) {
    console.error('🚨 GOOGLE AUTH: Consolidation failed, using fallback:', error);
    
    // Fallback to legacy method if consolidation fails
    try {
      // First try to find user by Google ID
      let user = await storage.getUserByGoogleId(googleUser.id);
      
      if (user) {
        // Update last login time for existing Google user
        await pool.query(`
          UPDATE users SET last_login = NOW() WHERE google_id = $1
        `, [googleUser.id]);
        console.log('✅ GOOGLE AUTH: Found existing Google user:', user.fullName);
        return user;
      }

      // Try to find user by email
      user = await storage.getUserByEmail(googleUser.email);
      
      if (user) {
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
        console.log('✅ GOOGLE AUTH: Linked existing user to Google:', user.fullName);
        return user;
      }

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
      });

      console.log('✅ GOOGLE AUTH: Created new Google user:', newUser.fullName);
      return newUser;
    } catch (fallbackError) {
      console.error('🚨 GOOGLE AUTH: Fallback also failed:', fallbackError);
      throw fallbackError;
    }
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
      const { code, error } = req.query;

      if (error) {
        console.error('Google OAuth error:', error);
        return res.redirect('/login?error=google_auth_failed');
      }

      if (!code || typeof code !== 'string') {
        return res.redirect('/login?error=no_auth_code');
      }

      // Exchange code for tokens
      const tokenResponse = await exchangeCodeForToken(code);
      
      // Get user info
      const googleUser = await getGoogleUserInfo(tokenResponse.access_token);
      
      // Find or create user
      const user = await findOrCreateGoogleUser(googleUser);
      
      // Manually set up session data for the user
      if (req.session) {
        console.log('🔧 GOOGLE AUTH: Setting up session for user:', user.fullName);
        console.log('🔧 GOOGLE AUTH: Session before:', {
          sessionId: req.sessionID,
          sessionKeys: Object.keys(req.session),
          hasPassport: !!(req.session as any).passport
        });
        
        // Cast to any to avoid TypeScript issues with passport property
        (req.session as any).passport = { user: user };
        (req.session as any).userId = user.id;
        
        console.log('🔧 GOOGLE AUTH: Session after setting passport:', {
          sessionId: req.sessionID,
          sessionKeys: Object.keys(req.session),
          hasPassport: !!(req.session as any).passport,
          userInPassport: !!(req.session as any).passport?.user
        });
        
        req.session.save((err) => {
          if (err) {
            console.error('❌ GOOGLE AUTH: Failed to save session:', err);
            return res.redirect('/login?error=session_failed');
          }
          
          console.log('✅ GOOGLE AUTH: Session saved successfully for user:', user.fullName);
          console.log('✅ GOOGLE AUTH: Final session state:', {
            sessionId: req.sessionID,
            hasPassport: !!(req.session as any).passport,
            userFullName: (req.session as any).passport?.user?.fullName
          });
          
          // Redirect to QBOT Chat as per user preference (home page after login)
          res.redirect('/qbot');
        });
      } else {
        console.error('❌ GOOGLE AUTH: No session available');
        res.redirect('/login?error=no_session');
      }
      
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
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