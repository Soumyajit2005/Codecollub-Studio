import rateLimit from 'express-rate-limit';
import User from '../models/User.model.js';
import Room from '../models/Room.model.js';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const codeExecutionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: 'Too many code execution requests, please wait a minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const roomPermissionCheck = (requiredRole = 'viewer') => {
  return async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const userId = req.user._id;

      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const isOwner = room.owner.toString() === userId.toString();
      if (isOwner) {
        req.userRole = 'owner';
        return next();
      }

      const participant = room.participants.find(
        p => p.user.toString() === userId.toString()
      );

      if (!participant) {
        return res.status(403).json({ error: 'Access denied - not a participant' });
      }

      const roleHierarchy = { viewer: 1, editor: 2, owner: 3 };
      if (roleHierarchy[participant.role] < roleHierarchy[requiredRole]) {
        return res.status(403).json({ 
          error: `Access denied - requires ${requiredRole} role` 
        });
      }

      req.userRole = participant.role;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Server error checking permissions' });
    }
  };
};

export const subscriptionCheck = (requiredFeature) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user.subscription.features[requiredFeature]) {
        return res.status(403).json({ 
          error: `This feature requires a subscription upgrade`,
          feature: requiredFeature
        });
      }

      if (user.subscription.expiresAt && user.subscription.expiresAt < new Date()) {
        return res.status(403).json({ 
          error: 'Your subscription has expired',
          feature: requiredFeature
        });
      }

      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({ error: 'Server error checking subscription' });
    }
  };
};

export const roomLimitCheck = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('rooms');
    const activeRooms = user.rooms.filter(room => 
      room.expiresAt > new Date()
    );

    if (activeRooms.length >= user.subscription.features.maxRooms) {
      return res.status(403).json({
        error: 'Room limit reached for your subscription plan',
        currentRooms: activeRooms.length,
        maxRooms: user.subscription.features.maxRooms
      });
    }

    next();
  } catch (error) {
    console.error('Room limit check error:', error);
    res.status(500).json({ error: 'Server error checking room limits' });
  }
};

export const validateContentSecurity = (req, res, next) => {
  const dangerousPatterns = [
    /eval\s*\(/i,
    /Function\s*\(/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i,
    /<script[^>]*>/i,
    /javascript:/i,
    /vbscript:/i,
    /onload\s*=/i,
    /onerror\s*=/i
  ];

  const { code, content, message } = req.body;
  const textToValidate = code || content || message;

  if (textToValidate && typeof textToValidate === 'string') {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(textToValidate)) {
        return res.status(400).json({
          error: 'Content contains potentially dangerous code patterns'
        });
      }
    }
  }

  next();
};

export const csrfProtection = (req, res, next) => {
  const token = req.headers['x-csrf-token'];
  const referer = req.headers['referer'];
  const origin = req.headers['origin'];
  
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  
  if (req.method !== 'GET') {
    if (!token) {
      return res.status(403).json({ error: 'CSRF token missing' });
    }
    
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: 'Invalid origin' });
    }
  }
  
  next();
};