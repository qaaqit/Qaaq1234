import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import ws from 'ws';
import jwt from 'jsonwebtoken';
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, verifyCodeSchema, loginSchema, insertChatConnectionSchema, insertChatMessageSchema, insertRankGroupSchema, insertRankGroupMemberSchema, insertRankGroupMessageSchema } from "@shared/schema";
import { sendVerificationEmail } from "./services/email";
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

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'qaaq-connect-secret-key';

// Middleware to authenticate JWT token
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    console.log('JWT decoded user ID:', decoded.userId);
    req.user = { id: decoded.userId, userId: decoded.userId };
    req.userId = decoded.userId; // Ensure req.userId is set for backward compatibility
    console.log('Set req.userId to:', req.userId);
    next();
  } catch (error: unknown) {
    console.error('JWT verification failed:', error);
    res.status(403).json({ message: 'Invalid token' });
  }
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
  
  // Register new user
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Set password based on city name (QAAQ standard)
      const userWithPassword = {
        ...userData,
        password: userData.city ? userData.city.toLowerCase() : 'default'
      };

      // Create user
      const user = await storage.createUser(userWithPassword);
      
      // Generate JWT token for immediate access
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      
      res.json({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          isVerified: user.isVerified,
          loginCount: user.loginCount
        },
        token,
        needsVerification: false // First login doesn't need verification
      });
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ message: "Registration failed", error: errorMessage });
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

  // QBOT Chat API endpoint - Implementing 13 Commandments
  app.post("/api/qbot/message", authenticateToken, async (req: any, res) => {
    try {
      const { message, image } = req.body;
      const userId = req.userId;

      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }

      console.log(`JWT decoded user ID: ${userId}`);
      console.log(`Set req.userId to: ${userId}`);

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
      
      // Commandment X: Handle simple acknowledgments
      if (isSimpleAcknowledgment(message)) {
        response = getEncouragingFollowUp();
      }
      // Commandment I: AI-powered technical responses
      else if (isQuestionMessage(message) || isTechnicalMessage(message)) {
        response = await generateAIResponse(message, category, user, activeRules);
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
        response = await generateAIResponse(message, category, user, activeRules);
      }

      // Commandment II: Ensure message uniqueness (simplified for API)
      const responseId = `${userId}_${Date.now()}`;

      // Return response with technical camouflage if needed (Commandment XIII)
      res.json({
        response: response,
        category: category,
        responseId: responseId,
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

  async function generateAIResponse(message: string, category: string, user: any, activeRules?: string): Promise<string> {
    // Commandment I: AI-powered responses for all messages
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      const { OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const userRank = user?.maritimeRank || 'Maritime Professional';
      const userShip = user?.shipName ? `aboard ${user.shipName}` : 'shore-based';
      
      let systemPrompt = `You are QBOT, an expert maritime engineering assistant specializing in ${category}. 
      Provide technical, practical advice for maritime professionals. Keep responses concise and actionable.
      User context: ${userRank} ${userShip}.
      Always prioritize safety and follow maritime regulations.`;
      
      // Include active rules context if available
      if (activeRules) {
        systemPrompt += `\n\nCurrent bot rules: Follow these guidelines from the active bot documentation:\n${activeRules.substring(0, 1000)}...`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content || 'Unable to generate response at this time.';
      console.log(`🤖 AI Response generated for ${category}: ${aiResponse.substring(0, 50)}...`);
      return aiResponse;

    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // Fallback to technical responses if OpenAI fails
      const fallbackResponses = [
        `For ${category.toLowerCase()}: Check the manufacturer's manual for specific troubleshooting steps. Ensure proper safety protocols are followed.`,
        `Regarding ${category.toLowerCase()}: Common causes include mechanical wear, insufficient lubrication, or electrical faults. Inspect systematically.`,
        `${category.toLowerCase()} issue: Verify operating parameters are within normal range. Consider environmental factors affecting performance.`,
        `Technical analysis for ${category.toLowerCase()}: Monitor temperature, pressure, and vibration readings. Document any anomalies for further review.`,
        `Maritime solution: Consult with senior engineer and review vessel's maintenance schedule. Safety first in all operations.`
      ];
      
      return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
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
        SELECT id, full_name, nickname, email, is_admin, maritime_rank,
               ship_name, imo_number,
               city, country,
               is_verified, login_count, last_login, created_at, whatsapp_number
        FROM users 
        ORDER BY created_at DESC
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
        whatsappNumber: user.whatsapp_number
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
      
      await storage.markMessageAsRead(messageId, userId);
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
            distance: calculateDistance(userLat, userLng, user.latitude, user.longitude)
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
      const result = await neonClient.query(
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
        
        // Special handling for "onboard" search - show only sailing users with ship info
        if (query === 'onboard') {
          console.log('🚢 Onboard search detected - filtering for sailing users with ship information');
          filteredUsers = allUsers.filter(user => {
            // Must be a sailor with ship information
            return user.userType === 'sailor' && 
                   (user.shipName || user.imoNumber) && 
                   user.shipName !== null && 
                   user.shipName !== '';
          });
          console.log(`Found ${filteredUsers.length} sailors currently onboard ships`);
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

  // Search questions
  app.get('/api/questions/search', authenticateToken, async (req, res) => {
    try {
      const { q: keyword } = req.query;
      if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({ error: 'Search keyword required' });
      }

      const { searchQuestionsInSharedDB } = await import('./shared-qa-service');
      const questions = await searchQuestionsInSharedDB(keyword);
      
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
      const userId = req.user?.userId || req.user?.id || req.user?.email;
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }
      
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
      const userId = req.user?.userId || req.user?.id || req.user?.email;
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      console.log('Profile update request for user:', userId, 'Data:', req.body);

      // For now, just update the basic fields that exist in the current database structure
      const allowedFields = {
        fullName: req.body.fullName,
        email: req.body.email,
        nickname: req.body.nickname,
        userType: req.body.userType,
        rank: req.body.rank,
        shipName: req.body.shipName,
        city: req.body.city,
        country: req.body.country,
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

  // Get questions with pagination
  app.get('/api/questions', authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      
      console.log(`API: Fetching questions page ${page}, limit ${limit}, search: ${search || 'none'}`);
      
      let result;
      if (search && search.trim() !== '') {
        result = await searchQuestions(search, page, limit);
      } else {
        result = await getQuestions(page, limit);
      }
      
      console.log(`API: Returning ${result.questions.length} questions, total: ${result.total}`);
      res.json(result);
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  });

  // Get answers for a specific question
  app.get('/api/questions/:questionId/answers', authenticateToken, async (req, res) => {
    try {
      const questionId = parseInt(req.params.questionId);
      
      if (isNaN(questionId)) {
        return res.status(400).json({ error: 'Invalid question ID' });
      }
      
      console.log(`API: Fetching answers for question ${questionId}`);
      
      const answers = await getQuestionAnswers(questionId);
      
      console.log(`API: Returning ${answers.length} answers for question ${questionId}`);
      res.json(answers);
    } catch (error) {
      console.error('Error fetching question answers:', error);
      res.status(500).json({ error: 'Failed to fetch answers' });
    }
  });

  // Get single question by ID
  app.get('/api/questions/:id', authenticateToken, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      if (isNaN(questionId)) {
        return res.status(400).json({ error: 'Invalid question ID' });
      }
      
      const { getQuestionById } = await import('./questions-service');
      const question = await getQuestionById(questionId);
      
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }
      
      res.json(question);
    } catch (error) {
      console.error('Error fetching question:', error);
      res.status(500).json({ error: 'Failed to fetch question' });
    }
  });

  // Get answers for a question
  app.get('/api/questions/:id/answers', authenticateToken, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      if (isNaN(questionId)) {
        return res.status(400).json({ error: 'Invalid question ID' });
      }
      
      const { getQuestionAnswers } = await import('./questions-service');
      const answers = await getQuestionAnswers(questionId);
      
      res.json(answers);
    } catch (error) {
      console.error('Error fetching answers:', error);
      res.status(500).json({ error: 'Failed to fetch answers' });
    }
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

  // Auto-assign user to rank groups based on their maritime rank
  app.post('/api/rank-groups/auto-assign', authenticateToken, async (req: any, res) => {
    try {
      const result = await autoAssignUserToRankGroups(req.userId);
      res.json(result);
    } catch (error) {
      console.error('Error auto-assigning user to rank groups:', error);
      res.status(500).json({ error: 'Failed to auto-assign rank groups' });
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
