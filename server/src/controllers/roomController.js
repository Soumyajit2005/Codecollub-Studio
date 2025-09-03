import Room from '../models/Room.model.js';
import { v4 as uuidv4 } from 'uuid';

export const createRoom = async (req, res) => {
  try {
    const { name, language, isPublic } = req.body;
    const roomId = uuidv4();

    const room = new Room({
      name,
      roomId,
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
    const rooms = await Room.find({
      $or: [
        { owner: req.user._id },
        { 'participants.user': req.user._id },
        { isPublic: true }
      ]
    }).populate('owner participants.user', 'username avatar')
      .sort('-createdAt');

    res.json({ rooms });
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
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Failed to join room' });
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