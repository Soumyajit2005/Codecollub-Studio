import { socketAuth } from '../middleware/auth.middleware.js';
import Room from '../models/Room.model.js';

export default (io) => {
  io.use(socketAuth);

  const activeUsers = new Map();
  const roomParticipants = new Map();

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected`);
    activeUsers.set(socket.userId, socket.id);

    // Join room
    socket.on('join-room', async (roomId) => {
      try {
        const room = await Room.findOne({ roomId })
          .populate('participants.user', 'username avatar');
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        socket.join(roomId);
        socket.currentRoom = roomId;

        // Track participants
        if (!roomParticipants.has(roomId)) {
          roomParticipants.set(roomId, new Set());
        }
        roomParticipants.get(roomId).add(socket.userId);

        // Notify others
        socket.to(roomId).emit('user-joined', {
          userId: socket.userId,
          username: socket.user.username,
          avatar: socket.user.avatar
        });

        // Send current participants
        const participants = Array.from(roomParticipants.get(roomId))
          .map(userId => {
            const user = room.participants.find(p => 
              p.user._id.toString() === userId
            );
            return user ? {
              userId,
              username: user.user.username,
              avatar: user.user.avatar
            } : null;
          }).filter(Boolean);

        socket.emit('room-participants', participants);
        socket.emit('code-sync', { code: room.code, language: room.language });
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Code changes
    socket.on('code-change', async (data) => {
      try {
        const { roomId, code, language, cursor } = data;
        
        // Update in database
        await Room.findOneAndUpdate(
          { roomId },
          { code, language, lastModified: Date.now() }
        );

        // Broadcast to others in room
        socket.to(roomId).emit('code-update', {
          code,
          language,
          cursor,
          userId: socket.userId,
          username: socket.user.username
        });
      } catch (error) {
        console.error('Code change error:', error);
      }
    });

    // Cursor position
    socket.on('cursor-position', (data) => {
      const { roomId, position, selection } = data;
      socket.to(roomId).emit('cursor-update', {
        userId: socket.userId,
        username: socket.user.username,
        position,
        selection
      });
    });

    // Chat message
    socket.on('chat-message', (data) => {
      const { roomId, message } = data;
      io.to(roomId).emit('new-message', {
        userId: socket.userId,
        username: socket.user.username,
        avatar: socket.user.avatar,
        message,
        timestamp: new Date()
      });
    });

    // Video call signaling
    socket.on('video-offer', (data) => {
      const { roomId, offer, to } = data;
      const targetSocketId = activeUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('video-offer', {
          offer,
          from: socket.userId,
          username: socket.user.username
        });
      }
    });

    socket.on('video-answer', (data) => {
      const { answer, to } = data;
      const targetSocketId = activeUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('video-answer', {
          answer,
          from: socket.userId
        });
      }
    });

    socket.on('ice-candidate', (data) => {
      const { candidate, to } = data;
      const targetSocketId = activeUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', {
          candidate,
          from: socket.userId
        });
      }
    });

    // Whiteboard events
    socket.on('whiteboard-draw', (data) => {
      const { roomId, drawData } = data;
      socket.to(roomId).emit('whiteboard-update', {
        drawData,
        userId: socket.userId
      });
    });

    socket.on('whiteboard-clear', (roomId) => {
      socket.to(roomId).emit('whiteboard-cleared');
    });

    // Screen sharing
    socket.on('screen-share-start', (roomId) => {
      socket.to(roomId).emit('user-screen-sharing', {
        userId: socket.userId,
        username: socket.user.username
      });
    });

    socket.on('screen-share-stop', (roomId) => {
      socket.to(roomId).emit('user-stopped-screen-sharing', {
        userId: socket.userId
      });
    });

    // Leave room
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      if (roomParticipants.has(roomId)) {
        roomParticipants.get(roomId).delete(socket.userId);
        if (roomParticipants.get(roomId).size === 0) {
          roomParticipants.delete(roomId);
        }
      }
      socket.to(roomId).emit('user-left', {
        userId: socket.userId,
        username: socket.user.username
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.username} disconnected`);
      activeUsers.delete(socket.userId);
      
      if (socket.currentRoom && roomParticipants.has(socket.currentRoom)) {
        roomParticipants.get(socket.currentRoom).delete(socket.userId);
        socket.to(socket.currentRoom).emit('user-disconnected', {
          userId: socket.userId,
          username: socket.user.username
        });
      }
    });
  });
};