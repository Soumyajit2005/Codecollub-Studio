import Room from '../models/Room.model.js';
import { v4 as uuidv4 } from 'uuid';
import { getDefaultPermissions } from '../middleware/permissions.middleware.js';

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
    const { name, description, language, isPublic, tags, capacity } = req.body;
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
      description,
      roomId,
      roomCode,
      owner: req.user._id,
      language,
      isPublic,
      tags: tags || [],
      settings: {
        maxParticipants: capacity || 10,
        allowGuests: false,
        autoSave: true,
        autoSaveInterval: 30,
        codeExecution: true,
        videoChat: true,
        screenShare: true,
        whiteboard: true
      },
      participants: [{
        user: req.user._id,
        role: 'owner',
        permissions: getDefaultPermissions('owner'),
        status: 'approved'
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
    
    // Try to find by roomId (UUID) first, then by MongoDB _id
    let room = await Room.findOne({ roomId })
      .populate('owner participants.user', 'username avatar');
    
    if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
      // If not found and roomId looks like MongoDB ObjectId, try finding by _id
      room = await Room.findById(roomId)
        .populate('owner participants.user', 'username avatar');
    }

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
    
    // Try to find by roomId (UUID) first, then by MongoDB _id
    let room = await Room.findOne({ roomId });
    if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
      // If not found and roomId looks like MongoDB ObjectId, try finding by _id
      room = await Room.findById(roomId);
    }
    
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
      const role = isOwner ? 'owner' : 'editor';
      const needsApproval = room.settings.requireApproval && !isOwner;
      
      if (needsApproval) {
        // Add to join requests instead of participants
        const existingRequest = room.joinRequests.find(
          r => r.user.toString() === req.user._id.toString() && r.status === 'pending'
        );
        
        if (!existingRequest) {
          room.joinRequests.push({
            user: req.user._id,
            status: 'pending',
            message: req.body.message || ''
          });
          await room.save();
          
          return res.json({ 
            message: 'Join request submitted. Waiting for approval.',
            requiresApproval: true 
          });
        } else {
          return res.json({ 
            message: 'Join request already pending approval.',
            requiresApproval: true 
          });
        }
      } else {
        // Direct join for public rooms or when approval not required
        room.participants.push({
          user: req.user._id,
          role: role,
          permissions: getDefaultPermissions(role),
          status: 'approved'
        });
        await room.save();
      }
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
      const needsApproval = room.settings.requireApproval;
      
      if (needsApproval) {
        // Add to join requests instead of participants
        const existingRequest = room.joinRequests.find(
          r => r.user.toString() === req.user._id.toString() && r.status === 'pending'
        );
        
        if (!existingRequest) {
          room.joinRequests.push({
            user: req.user._id,
            status: 'pending',
            message: req.body.message || ''
          });
          await room.save();
          
          return res.json({ 
            message: 'Join request submitted. Waiting for approval.',
            requiresApproval: true 
          });
        } else {
          return res.json({ 
            message: 'Join request already pending approval.',
            requiresApproval: true 
          });
        }
      } else {
        room.participants.push({
          user: req.user._id,
          role: 'editor',
          permissions: getDefaultPermissions('editor'),
          status: 'approved'
        });
        await room.save();
      }
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

export const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Try to find by roomId (UUID) first, then by MongoDB _id
    let room = await Room.findOne({ roomId });
    if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
      // If not found and roomId looks like MongoDB ObjectId, try finding by _id
      room = await Room.findById(roomId);
    }
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Remove user from participants
    room.participants = room.participants.filter(
      p => p.user.toString() !== req.user._id.toString()
    );
    
    await room.save();
    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Try to find by roomId (UUID) first, then by MongoDB _id
    let room = await Room.findOne({ roomId });
    if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
      // If not found and roomId looks like MongoDB ObjectId, try finding by _id
      room = await Room.findById(roomId);
    }
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only owner can delete the room
    if (room.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only room owner can delete the room' });
    }

    // Delete using the same method we found it
    if (roomId.match(/^[0-9a-fA-F]{24}$/)) {
      await Room.findByIdAndDelete(roomId);
    } else {
      await Room.findOneAndDelete({ roomId });
    }
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
};

export const updateCode = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { code, language } = req.body;

    let room;
    // Try to find by roomId (UUID) first, then by MongoDB _id
    room = await Room.findOneAndUpdate(
      { roomId },
      { code, language, lastModified: Date.now() },
      { new: true }
    );
    
    if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
      // If not found and roomId looks like MongoDB ObjectId, try finding by _id
      room = await Room.findByIdAndUpdate(
        roomId,
        { code, language, lastModified: Date.now() },
        { new: true }
      );
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ message: 'Code updated', room });
  } catch (error) {
    console.error('Update code error:', error);
    res.status(500).json({ error: 'Failed to update code' });
  }
};

// Join Request Management
export const getJoinRequests = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    }).populate('joinRequests.user', 'username avatar email');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only owner and admins can view join requests
    const isOwner = room.owner.toString() === req.user._id.toString();
    const isAdmin = room.participants.some(p => 
      p.user.toString() === req.user._id.toString() && p.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pendingRequests = room.joinRequests.filter(r => r.status === 'pending');
    
    res.json({ joinRequests: pendingRequests });
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ error: 'Failed to fetch join requests' });
  }
};

export const approveJoinRequest = async (req, res) => {
  try {
    const { roomId, requestId } = req.params;
    const { role = 'editor', customPermissions } = req.body;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    }).populate('joinRequests.user', 'username avatar');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only owner and admins can approve requests
    const isOwner = room.owner.toString() === req.user._id.toString();
    const isAdmin = room.participants.some(p => 
      p.user.toString() === req.user._id.toString() && p.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const requestIndex = room.joinRequests.findIndex(r => r._id.toString() === requestId);
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    const request = room.joinRequests[requestIndex];
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Update request status
    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    // Add user as participant
    const permissions = customPermissions || getDefaultPermissions(role);
    room.participants.push({
      user: request.user._id,
      role: role,
      permissions: permissions,
      status: 'approved',
      approvedBy: req.user._id,
      approvedAt: new Date()
    });

    await room.save();
    await room.populate('participants.user', 'username avatar');

    res.json({ 
      message: 'Join request approved successfully',
      participant: room.participants[room.participants.length - 1]
    });
  } catch (error) {
    console.error('Approve join request error:', error);
    res.status(500).json({ error: 'Failed to approve join request' });
  }
};

export const rejectJoinRequest = async (req, res) => {
  try {
    const { roomId, requestId } = req.params;
    const { message } = req.body;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only owner and admins can reject requests
    const isOwner = room.owner.toString() === req.user._id.toString();
    const isAdmin = room.participants.some(p => 
      p.user.toString() === req.user._id.toString() && p.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const requestIndex = room.joinRequests.findIndex(r => r._id.toString() === requestId);
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    const request = room.joinRequests[requestIndex];
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Update request status
    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewMessage = message || '';

    await room.save();

    res.json({ message: 'Join request rejected successfully' });
  } catch (error) {
    console.error('Reject join request error:', error);
    res.status(500).json({ error: 'Failed to reject join request' });
  }
};

// Participant Management
export const updateParticipantPermissions = async (req, res) => {
  try {
    const { roomId, participantId } = req.params;
    const { permissions, role } = req.body;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only owner and admins can update permissions
    const isOwner = room.owner.toString() === req.user._id.toString();
    const isAdmin = room.participants.some(p => 
      p.user.toString() === req.user._id.toString() && p.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const participantIndex = room.participants.findIndex(p => p._id.toString() === participantId);
    if (participantIndex === -1) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const participant = room.participants[participantIndex];
    
    // Update permissions
    if (permissions) {
      participant.permissions = { ...participant.permissions, ...permissions };
    }
    
    // Update role
    if (role) {
      participant.role = role;
      // Apply default permissions for new role if not explicitly provided
      if (!permissions) {
        participant.permissions = getDefaultPermissions(role);
      }
    }

    await room.save();
    await room.populate('participants.user', 'username avatar');

    res.json({ 
      message: 'Participant permissions updated successfully',
      participant: room.participants[participantIndex]
    });
  } catch (error) {
    console.error('Update participant permissions error:', error);
    res.status(500).json({ error: 'Failed to update participant permissions' });
  }
};

export const removeParticipant = async (req, res) => {
  try {
    const { roomId, participantId } = req.params;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only owner and admins with kick permission can remove participants
    const isOwner = room.owner.toString() === req.user._id.toString();
    const userParticipant = room.participants.find(p => 
      p.user.toString() === req.user._id.toString()
    );
    const canKick = userParticipant?.permissions?.canKickUsers || false;

    if (!isOwner && !canKick) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const participantIndex = room.participants.findIndex(p => p._id.toString() === participantId);
    if (participantIndex === -1) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Can't remove the owner
    if (room.participants[participantIndex].role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove room owner' });
    }

    room.participants.splice(participantIndex, 1);
    await room.save();

    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
};

export const updateRoomSettings = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { settings } = req.body;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only owner can update room settings
    if (room.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only room owner can update settings' });
    }

    room.settings = { ...room.settings, ...settings };
    room.lastModified = new Date();
    
    await room.save();

    res.json({ 
      message: 'Room settings updated successfully',
      settings: room.settings
    });
  } catch (error) {
    console.error('Update room settings error:', error);
    res.status(500).json({ error: 'Failed to update room settings' });
  }
};