import type { Express, Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import { storage } from "./storage";
import { pool } from './db';
import { identityConsolidation } from './identity-consolidation';
import { getJWTSecret } from './secret-validation';

// Lazy load JWT_SECRET only when needed
const getJWT = () => getJWTSecret();

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

// Use current deployment domain for LinkedIn OAuth callback
const getLinkedInRedirectUri = () => {
  // Use the current Replit deployment domain
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(',')[0];
    return `https://${domain}/api/auth/linkedin/callback`;
  }
  // Fallback to custom domain
  return 'https://qaaq.app/api/auth/linkedin/callback';
};

const LINKEDIN_REDIRECT_URI = getLinkedInRedirectUri();

interface LinkedInTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface LinkedInUserInfo {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: {
    'displayImage~': {
      elements: Array<{
        identifiers: Array<{
          identifier: string;
        }>;
      }>;
    };
  };
}

interface LinkedInEmailInfo {
  elements: Array<{
    'handle~': {
      emailAddress: string;
    };
  }>;
}

// Generate LinkedIn OAuth URL
export function getLinkedInAuthUrl(): string {
  if (!LINKEDIN_CLIENT_ID) {
    console.warn('⚠️ LINKEDIN_CLIENT_ID not configured - LinkedIn auth disabled');
    throw new Error('LinkedIn authentication not configured');
  }

  const currentRedirectUri = getLinkedInRedirectUri();
  const scope = encodeURIComponent('r_liteprofile r_emailaddress');
  const redirectUri = encodeURIComponent(currentRedirectUri);
  const state = Math.random().toString(36).substring(2, 15); // CSRF protection
  
  console.log(`🔗 LinkedIn OAuth redirect URI: ${currentRedirectUri}`);
  console.log(`🔗 Make sure this EXACT URL is in LinkedIn Developer Console: ${currentRedirectUri}`);
  
  return `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${LINKEDIN_CLIENT_ID}&` +
    `redirect_uri=${redirectUri}&` +
    `state=${state}&` +
    `scope=${scope}`;
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code: string): Promise<LinkedInTokenResponse> {
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    throw new Error('LinkedIn OAuth environment variables not configured');
  }

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
      redirect_uri: getLinkedInRedirectUri(),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

// Get user profile from LinkedIn
async function getLinkedInUserProfile(accessToken: string): Promise<LinkedInUserInfo> {
  const response = await fetch('https://api.linkedin.com/v2/people/~:(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'cache-control': 'no-cache',
      'X-Restli-Protocol-Version': '2.0.0'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user profile: ${error}`);
  }

  return response.json();
}

// Get user email from LinkedIn
async function getLinkedInUserEmail(accessToken: string): Promise<string> {
  const response = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'cache-control': 'no-cache',
      'X-Restli-Protocol-Version': '2.0.0'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user email: ${error}`);
  }

  const emailData: LinkedInEmailInfo = await response.json();
  return emailData.elements[0]?.['handle~']?.emailAddress || '';
}

// Find or create user from LinkedIn profile
async function findOrCreateLinkedInUser(linkedInUser: LinkedInUserInfo, email: string, profilePictureUrl?: string): Promise<any> {
  try {
    console.log('🔍 LINKEDIN AUTH: Processing LinkedIn user with ID:', linkedInUser.id);
    
    const fullName = `${linkedInUser.localizedFirstName} ${linkedInUser.localizedLastName}`;
    
    // Use identity consolidation service for LinkedIn auth
    const result = await identityConsolidation.consolidateOnLogin(
      linkedInUser.id, 
      'linkedin', 
      {
        email: email,
        name: fullName,
        displayName: fullName,
        profileImageUrl: profilePictureUrl,
        firstName: linkedInUser.localizedFirstName,
        lastName: linkedInUser.localizedLastName
      }
    );
    
    console.log('✅ LINKEDIN AUTH: User processed via consolidation:', result.fullName);
    return result;
  } catch (error) {
    console.error('🚨 LINKEDIN AUTH: Consolidation failed, using fallback:', error);
    
    // Fallback to legacy method if consolidation fails
    try {
      // First try to find user by LinkedIn ID
      let user = await storage.getUserByLinkedInId(linkedInUser.id);
      
      if (user) {
        // Update last login time for existing LinkedIn user
        await pool.query(`
          UPDATE users SET last_login = NOW() WHERE linkedin_id = $1
        `, [linkedInUser.id]);
        console.log('✅ LINKEDIN AUTH: Found existing LinkedIn user:', user.fullName);
        return user;
      }

      // Try to find user by email
      if (email) {
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // Link existing account to LinkedIn
          const fullName = `${linkedInUser.localizedFirstName} ${linkedInUser.localizedLastName}`;
          await pool.query(`
            UPDATE users SET 
              linkedin_id = $1,
              linkedin_email = $2,
              linkedin_profile_picture_url = $3,
              linkedin_display_name = $4,
              auth_provider = 'linkedin',
              last_login = NOW()
            WHERE id = $5
          `, [linkedInUser.id, email, profilePictureUrl, fullName, user.id]);
          console.log('✅ LINKEDIN AUTH: Linked existing user to LinkedIn:', user.fullName);
          return user;
        }
      }

      // Create new user
      const fullName = `${linkedInUser.localizedFirstName} ${linkedInUser.localizedLastName}`;
      const newUser = await storage.createLinkedInUser({
        linkedInId: linkedInUser.id,
        fullName: fullName,
        email: email,
        linkedInEmail: email,
        linkedInProfilePictureUrl: profilePictureUrl,
        linkedInDisplayName: fullName,
        authProvider: 'linkedin',
        userType: 'sailor', // Default to sailor, can be changed later
        isVerified: true, // LinkedIn accounts are pre-verified
      });

      console.log('✅ LINKEDIN AUTH: Created new LinkedIn user:', newUser.fullName);
      return newUser;
    } catch (fallbackError) {
      console.error('🚨 LINKEDIN AUTH: Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
}

// Setup LinkedIn OAuth routes
export function setupLinkedInAuth(app: Express) {
  // Initiate LinkedIn OAuth
  app.get('/api/auth/linkedin', (req: Request, res: Response) => {
    try {
      if (!LINKEDIN_CLIENT_ID) {
        console.warn('⚠️ LinkedIn authentication not configured - redirecting to login');
        return res.redirect('/login?error=linkedin_not_configured');
      }
      
      const authUrl = getLinkedInAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error initiating LinkedIn auth:', error);
      res.redirect('/login?error=linkedin_auth_failed');
    }
  });

  // Handle LinkedIn OAuth callback
  app.get('/api/auth/linkedin/callback', async (req: Request, res: Response) => {
    try {
      const { code, error, state } = req.query;

      if (error) {
        console.error('LinkedIn OAuth error:', error);
        return res.redirect('/login?error=linkedin_auth_failed');
      }

      if (!code || typeof code !== 'string') {
        return res.redirect('/login?error=no_auth_code');
      }

      // Exchange code for tokens
      const tokenResponse = await exchangeCodeForToken(code);
      
      // Get user profile and email
      const [linkedInUser, email] = await Promise.all([
        getLinkedInUserProfile(tokenResponse.access_token),
        getLinkedInUserEmail(tokenResponse.access_token)
      ]);
      
      // Extract profile picture URL if available
      let profilePictureUrl: string | undefined;
      if (linkedInUser.profilePicture?.['displayImage~']?.elements?.length && linkedInUser.profilePicture['displayImage~'].elements.length > 0) {
        const elements = linkedInUser.profilePicture['displayImage~'].elements;
        profilePictureUrl = elements[0]?.identifiers?.[0]?.identifier;
      }
      
      // Find or create user
      const user = await findOrCreateLinkedInUser(linkedInUser, email, profilePictureUrl);
      
      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, getJWT(), { expiresIn: '7d' });
      
      // Redirect to frontend with token - redirect to QBOT Chat as per user preference
      res.redirect(`/oauth-callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        isAdmin: user.isAdmin
      }))}`);
      
    } catch (error) {
      console.error('Error in LinkedIn OAuth callback:', error);
      res.redirect('/login?error=auth_failed');
    }
  });

  // Get LinkedIn auth URL endpoint (for frontend to use)
  app.get('/api/auth/linkedin/url', (req: Request, res: Response) => {
    try {
      const authUrl = getLinkedInAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('Error getting LinkedIn auth URL:', error);
      res.status(500).json({ error: 'Failed to generate LinkedIn auth URL' });
    }
  });
}

export { findOrCreateLinkedInUser, getLinkedInUserProfile };