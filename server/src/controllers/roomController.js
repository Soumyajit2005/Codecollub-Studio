import Room from '../models/Room.model.js';
import { v4 as uuidv4 } from 'uuid';

// Generate a 6-character room code
const generateRoomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const createRoom = async (req, res) => {
  try {
    const { name, language, isPublic } = req.body;
    const roomId = uuidv4();
    
    // Generate unique room code
    let roomCode;
    let existingRoom;
    do {
      roomCode = generateRoomCode();
      existingRoom = await Room.findOne({ roomCode });
    } while (existingRoom);

    const room = new Room({
      name,
      roomId,
      roomCode,
      owner: req.user._id,
      language,
      isPublic,
      participants: [{
        user: req.user._id,
        role: 'owner'
      }]
    });

    await room.save();
    await room.populate('owner participants.user', 'username avatar');

    res.status(201).json({
      message: 'Room created successfully',
      room
    });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

export const getRooms = async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      $or: [
        { owner: req.user._id },
        { 'participants.user': req.user._id }
      ]
    };

    // Filter by room type
    if (type === 'owned') {
      query = { owner: req.user._id };
    } else if (type === 'joined') {
      query = { 
        'participants.user': req.user._id,
        owner: { $ne: req.user._id }
      };
    }

    const rooms = await Room.find(query)
      .populate('owner participants.user', 'username avatar')
      .sort('-lastModified')
      .skip(skip)
      .limit(parseInt(limit));

    const totalRooms = await Room.countDocuments(query);

    // Add user role and activity status
    const enhancedRooms = rooms.map(room => {
      const isOwner = room.owner._id.toString() === req.user._id.toString();
      const participant = room.participants.find(p => 
        p.user._id.toString() === req.user._id.toString()
      );

      return {
        ...room.toObject(),
        userRole: isOwner ? 'owner' : participant?.role || 'viewer',
        isActive: room.lastModified && 
                  Date.now() - new Date(room.lastModified).getTime() < 10 * 60 * 1000,
        participantCount: room.participants?.length || 0
      };
    });

    res.json({
      rooms: enhancedRooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalRooms / limit),
        totalRooms,
        hasNext: skip + rooms.length < totalRooms,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({ roomId })
      .populate('owner participants.user', 'username avatar');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user has access
    const hasAccess = room.isPublic || 
      room.owner._id.toString() === req.user._id.toString() ||
      room.participants.some(p => p.user._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const isOwner = room.owner.toString() === req.user._id.toString();

    // Room owners can always access their own rooms
    // For public rooms, anyone can join directly  
    // For private rooms, non-owners need to use room code endpoint
    if (!room.isPublic && !isOwner) {
      return res.status(403).json({ error: 'This is a private room. Use room code to join.' });
    }

    const alreadyParticipant = room.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!alreadyParticipant) {
      room.participants.push({
        user: req.user._id,
        role: isOwner ? 'owner' : 'editor'
      });
      await room.save();
    }

    await room.populate('owner participants.user', 'username avatar');
    res.json({ message: 'Joined room successfully', room });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
};

export const joinRoomByCode = async (req, res) => {
  try {
    const { roomCode } = req.body;
    
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    if (!room) {
      return res.status(404).json({ error: 'Room not found with this code' });
    }

    const alreadyParticipant = room.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!alreadyParticipant) {
      room.participants.push({
        user: req.user._id,
        role: 'editor'
      });
      await room.save();
    }

    await room.populate('owner participants.user', 'username avatar');
    res.json({ message: 'Joined room successfully', room });
  } catch (error) {
    console.error('Join room by code error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
};

export const getPublicRooms = async (req, res) => {
  try {
    const {
      search = '',
      language = '',
      sortBy = 'recent', // recent, popular, name
      page = 1,
      limit = 12
    } = req.query;

    // Build search query
    let query = { isPublic: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (language) {
      query.language = language;
    }

    // Build sort criteria
    let sortCriteria = {};
    switch (sortBy) {
      case 'popular':
        sortCriteria = { 'participants': -1, 'stats.totalExecutions': -1 };
        break;
      case 'name':
        sortCriteria = { name: 1 };
        break;
      case 'recent':
      default:
        sortCriteria = { lastModified: -1, createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    const rooms = await Room.find(query)
      .populate('owner participants.user', 'username avatar')
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit));

    const totalRooms = await Room.countDocuments(query);

    // Add activity status (active users in last 10 minutes)
    const enhancedRooms = rooms.map(room => ({
      ...room.toObject(),
      isActive: room.lastModified && 
                Date.now() - new Date(room.lastModified).getTime() < 10 * 60 * 1000,
      participantCount: room.participants?.length || 0
    }));

    res.json({
      rooms: enhancedRooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalRooms / limit),
        totalRooms,
        hasNext: skip + rooms.length < totalRooms,
        hasPrev: page > 1
      },
      filters: {
        search,
        language,
        sortBy
      }
    });
  } catch (error) {
    console.error('Get public rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch public rooms' });
  }
};

export const updateCode = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { code, language } = req.body;

    const room = await Room.findOneAndUpdate(
      { roomId },
      { code, language, lastModified: Date.now() },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ message: 'Code updated', room });
  } catch (error) {
    console.error('Update code error:', error);
    res.status(500).json({ error: 'Failed to update code' });
  }
};