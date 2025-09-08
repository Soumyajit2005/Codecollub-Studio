import { socketAuth } from '../middleware/auth.middleware.js';
import Room from '../models/Room.model.js';
import Session from '../models/Session.model.js';
import User from '../models/User.model.js';
import CodeExecutionService from '../services/codeExecution.service.js';
import * as Y from 'yjs';

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

    // Code changes with operational transformation
    socket.on('code-change', async (data) => {
      try {
        const { roomId, code, language, cursor, operation } = data;
        
        // Update in database
        await Room.findOneAndUpdate(
          { roomId },
          { 
            code, 
            language, 
            lastModified: Date.now(),
            $inc: { 'stats.linesOfCode': 1 }
          }
        );

        // Broadcast to others in room with operation for conflict resolution
        socket.to(roomId).emit('code-update', {
          code,
          language,
          cursor,
          operation,
          userId: socket.userId,
          username: socket.user.username,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Code change error:', error);
      }
    });

    // Code execution
    socket.on('execute-code', async (data) => {
      try {
        const { roomId, code, language, input } = data;
        
        // Check permissions
        const room = await Room.findOne({ roomId });
        if (!room || !room.settings.codeExecution) {
          socket.emit('execution-error', { message: 'Code execution not allowed in this room' });
          return;
        }

        socket.emit('execution-started', { status: 'running' });
        
        const result = await CodeExecutionService.executeCode(
          room._id, socket.userId, language, code, input
        );
        
        // Broadcast execution result to all room participants
        io.to(roomId).emit('execution-result', {
          ...result,
          userId: socket.userId,
          username: socket.user.username,
          timestamp: new Date()
        });
        
        // Update room stats
        await Room.findByIdAndUpdate(room._id, {
          $inc: { 'stats.totalExecutions': 1 }
        });
        
      } catch (error) {
        console.error('Code execution error:', error);
        socket.emit('execution-error', { 
          message: error.message || 'Execution failed'
        });
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

    // Chat message with persistence
    socket.on('chat-message', async (data) => {
      try {
        const { roomId, message, type = 'text' } = data;
        
        // Save to session chat history
        let session = await Session.findOne({ 
          roomId: await Room.findOne({ roomId }).select('_id'),
          status: 'active'
        });
        
        if (session) {
          session.chat.push({
            user: socket.userId,
            message,
            type,
            timestamp: new Date()
          });
          await session.save();
        }
        
        // Generate unique message ID to prevent duplicates
        const messageId = `msg_${socket.userId}_${Date.now()}_${Math.random()}`;
        
        io.to(roomId).emit('new-message', {
          id: messageId,
          userId: socket.userId,
          username: socket.user.username,
          avatar: socket.user.avatar,
          message,
          type,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Chat message error:', error);
      }
    });
    
    // Typing indicator
    socket.on('typing-start', (roomId) => {
      socket.to(roomId).emit('user-typing', {
        userId: socket.userId,
        username: socket.user.username
      });
    });
    
    socket.on('typing-stop', (roomId) => {
      socket.to(roomId).emit('user-stopped-typing', {
        userId: socket.userId
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

    // Whiteboard events with persistence
    socket.on('whiteboard-draw', async (data) => {
      try {
        const { roomId, drawData } = data;
        
        // Save whiteboard state
        const room = await Room.findOne({ roomId });
        if (room) {
          room.whiteboard = {
            data: JSON.stringify(drawData),
            lastModified: new Date(),
            version: (room.whiteboard?.version || 0) + 1
          };
          await room.save();
        }
        
        socket.to(roomId).emit('whiteboard-update', {
          drawData,
          userId: socket.userId,
          username: socket.user.username
        });
      } catch (error) {
        console.error('Whiteboard draw error:', error);
      }
    });

    socket.on('whiteboard-clear', async (roomId) => {
      try {
        const room = await Room.findOne({ roomId });
        if (room) {
          room.whiteboard = {
            data: null,
            lastModified: new Date(),
            version: (room.whiteboard?.version || 0) + 1
          };
          await room.save();
        }
        
        socket.to(roomId).emit('whiteboard-cleared', {
          userId: socket.userId,
          username: socket.user.username
        });
      } catch (error) {
        console.error('Whiteboard clear error:', error);
      }
    });
    
    // Request whiteboard sync
    socket.on('whiteboard-sync-request', async (roomId) => {
      try {
        const room = await Room.findOne({ roomId });
        if (room && room.whiteboard?.data) {
          socket.emit('whiteboard-sync', {
            drawData: JSON.parse(room.whiteboard.data),
            version: room.whiteboard.version
          });
        }
      } catch (error) {
        console.error('Whiteboard sync error:', error);
      }
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

    // Leave room with session tracking
    socket.on('leave-room', async (roomId) => {
      try {
        socket.leave(roomId);
        
        // Update session
        const room = await Room.findOne({ roomId });
        if (room) {
          let session = await Session.findOne({ 
            roomId: room._id,
            status: 'active'
          });
          
          if (session) {
            const participantIndex = session.participants.findIndex(
              p => p.user.toString() === socket.userId
            );
            
            if (participantIndex !== -1) {
              session.participants[participantIndex].leftAt = new Date();
              session.participants[participantIndex].isActive = false;
              await session.save();
            }
          }
        }
        
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
        
        // Update user status
        await User.findByIdAndUpdate(socket.userId, {
          status: 'online',
          lastSeen: new Date()
        });
        
      } catch (error) {
        console.error('Leave room error:', error);
      }
    });

    // Presence and activity tracking
    socket.on('user-activity', async (data) => {
      try {
        const { roomId, activity, data: activityData } = data;
        const room = await Room.findOne({ roomId });
        
        if (room) {
          room.activity.push({
            user: socket.userId,
            action: activity,
            timestamp: new Date(),
            data: activityData
          });
          
          // Keep only last 100 activity records
          if (room.activity.length > 100) {
            room.activity = room.activity.slice(-100);
          }
          
          await room.save();
        }
        
        socket.to(roomId).emit('user-activity', {
          userId: socket.userId,
          username: socket.user.username,
          activity,
          data: activityData,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('User activity error:', error);
      }
    });
    
    // Disconnect with cleanup
    socket.on('disconnect', async () => {
      try {
        console.log(`User ${socket.user.username} disconnected`);
        activeUsers.delete(socket.userId);
        
        // Update user status
        await User.findByIdAndUpdate(socket.userId, {
          status: 'offline',
          lastSeen: new Date()
        });
        
        if (socket.currentRoom && roomParticipants.has(socket.currentRoom)) {
          roomParticipants.get(socket.currentRoom).delete(socket.userId);
          
          // Update session
          const room = await Room.findOne({ roomId: socket.currentRoom });
          if (room) {
            let session = await Session.findOne({ 
              roomId: room._id,
              status: 'active'
            });
            
            if (session) {
              const participantIndex = session.participants.findIndex(
                p => p.user.toString() === socket.userId
              );
              
              if (participantIndex !== -1) {
                session.participants[participantIndex].leftAt = new Date();
                session.participants[participantIndex].isActive = false;
                await session.save();
              }
            }
          }
          
          socket.to(socket.currentRoom).emit('user-disconnected', {
            userId: socket.userId,
            username: socket.user.username
          });
        }
      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
    });
  });
};