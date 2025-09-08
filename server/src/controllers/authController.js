import User from '../models/User.model.js';
import { validationResult } from 'express-validator';
import { v2 as cloudinary } from 'cloudinary';

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email or username already exists'
      });
    }

    const user = new User({ username, email, password });
    await user.save();

    const token = user.generateToken();

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = user.generateToken();

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const getMe = async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      avatar: req.user.avatar,
      profile: req.user.profile,
      preferences: req.user.preferences,
      subscription: req.user.subscription,
      status: req.user.status
    }
  });
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio, location, website, company } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'profile.firstName': firstName,
          'profile.lastName': lastName,
          'profile.bio': bio,
          'profile.location': location,
          'profile.website': website,
          'profile.company': company,
          updatedAt: new Date()
        }
      },
      { new: true, select: '-password' }
    );

    res.json({ user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const { theme, language, fontSize, notifications } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'preferences.theme': theme,
          'preferences.language': language,
          'preferences.fontSize': fontSize,
          'preferences.notifications': notifications,
          updatedAt: new Date()
        }
      },
      { new: true, select: '-password' }
    );

    res.json({ user });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Server error updating preferences' });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['online', 'offline', 'busy'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          status,
          lastSeen: new Date(),
          updatedAt: new Date()
        }
      },
      { new: true, select: '-password' }
    );

    res.json({ user });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Server error updating status' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const token = user.generateToken();
    
    res.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Server error refreshing token' });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Configure Cloudinary inline to ensure credentials are available
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    // Debug Cloudinary config
    console.log('Avatar Upload - Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
      file_size: req.file.size,
      file_mimetype: req.file.mimetype
    });

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'codecollab/avatars',
          transformation: [
            { width: 200, height: 200, crop: 'fill' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(req.file.buffer);
    });

    // Update user avatar
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          avatar: result.secure_url,
          updatedAt: new Date()
        }
      },
      { new: true, select: '-password' }
    );

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: result.secure_url,
      user
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
};

export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          status: 'offline',
          lastSeen: new Date()
        }
      }
    );
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
};