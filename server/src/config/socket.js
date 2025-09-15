import { socketAuth } from '../middleware/auth.middleware.js';
import Room from '../models/Room.model.js';
import Session from '../models/Session.model.js';
import User from '../models/User.model.js';
import CodeExecutionService from '../services/codeExecution.service.js';
import EnhancedCodeExecutionService from '../services/enhancedCodeExecution.service.js';
import virtualFileSystemService from '../services/virtualFileSystem.service.js';
import * as Y from 'yjs';

export default (io) => {
  io.use(socketAuth);

  const activeUsers = new Map();
  const roomParticipants = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 User ${socket.user.username} (ID: ${socket.userId}) connected`);
    activeUsers.set(socket.userId, socket.id);

    // Join room
    socket.on('join-room', async (roomId) => {
      try {
        // Try to find by roomId (UUID) first, then by MongoDB _id
        let room = await Room.findOne({ roomId })
          .populate('participants.user', 'username avatar');
        
        if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
          // If not found and roomId looks like MongoDB ObjectId, try finding by _id
          room = await Room.findById(roomId)
            .populate('participants.user', 'username avatar');
        }
        
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

        // Get all currently connected users in this room
        const connectedUsers = Array.from(roomParticipants.get(roomId) || []);
        
        // Build participants list from active socket connections
        const activeParticipants = [];
        
        for (const userId of connectedUsers) {
          // Try to find in room participants first
          const roomParticipant = room.participants.find(p => 
            p.user._id.toString() === userId
          );
          
          if (roomParticipant) {
            activeParticipants.push({
              userId,
              username: roomParticipant.user.username,
              avatar: roomParticipant.user.avatar,
              role: roomParticipant.role,
              isActive: true
            });
          } else {
            // If current connecting user, add them
            if (userId === socket.userId) {
              activeParticipants.push({
                userId: socket.userId,
                username: socket.user.username,
                avatar: socket.user.avatar,
                role: 'participant',
                isActive: true
              });
            }
          }
        }
        
        console.log(`Room ${roomId}: ${activeParticipants.length} active participants`);
        
        // Send participants list to current user and broadcast to room
        socket.emit('room-participants', activeParticipants);
        socket.to(roomId).emit('room-participants-updated', activeParticipants);
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
        
        // Update in database - try both UUID and ObjectId formats
        let room = await Room.findOneAndUpdate(
          { roomId },
          { 
            code, 
            language, 
            lastModified: Date.now(),
            $inc: { 'stats.linesOfCode': 1 }
          }
        );
        
        if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
          room = await Room.findByIdAndUpdate(
            roomId,
            { 
              code, 
              language, 
              lastModified: Date.now(),
              $inc: { 'stats.linesOfCode': 1 }
            }
          );
        }

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
        
        // Check permissions - try both UUID and ObjectId formats
        let room = await Room.findOne({ roomId });
        if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
          room = await Room.findById(roomId);
        }
        
        if (!room || !room.settings.codeExecution) {
          socket.emit('execution-error', { message: 'Code execution not allowed in this room' });
          return;
        }

        socket.emit('execution-started', { status: 'running' });
        
        const result = await EnhancedCodeExecutionService.executeCode(
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
        
        // Save to session chat history - try both UUID and ObjectId formats
        let roomDoc = await Room.findOne({ roomId }).select('_id');
        if (!roomDoc && roomId.match(/^[0-9a-fA-F]{24}$/)) {
          roomDoc = await Room.findById(roomId).select('_id');
        }
        
        let session = await Session.findOne({ 
          roomId: roomDoc?._id,
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
        
        // Save whiteboard state - try both UUID and ObjectId formats
        let room = await Room.findOne({ roomId });
        if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
          room = await Room.findById(roomId);
        }
        
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
        // Try both UUID and ObjectId formats
        let room = await Room.findOne({ roomId });
        if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
          room = await Room.findById(roomId);
        }
        
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
        // Try both UUID and ObjectId formats
        let room = await Room.findOne({ roomId });
        if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
          room = await Room.findById(roomId);
        }
        
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

    // Interactive Code Execution Handlers
    const activeExecutions = new Map();

    socket.on('start-interactive-execution', async (data) => {
      try {
        const { executionId, roomId, language, code } = data;
        console.log(`📊 Interactive execution started: ${executionId} (${language})`);

        // Store execution context
        activeExecutions.set(executionId, {
          roomId,
          userId: socket.userId,
          language,
          code,
          socket: socket,
          startTime: Date.now()
        });

        // Start execution with streaming output
        socket.emit('execution-output', {
          executionId,
          output: `Starting ${language} execution...\n`
        });

        // Execute code directly with Judge0 API
        try {
          const languageMap = {
            'javascript': 63,
            'python': 71,
            'cpp': 76,
            'c': 75,
            'java': 62,
            'csharp': 51,
            'go': 60,
            'rust': 73,
            'typescript': 74
          };

          const languageId = languageMap[language.toLowerCase()];
          if (!languageId) {
            throw new Error(`Language ${language} not supported`);
          }

          const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            body: JSON.stringify({
              language_id: languageId,
              source_code: Buffer.from(code).toString('base64'),
              stdin: Buffer.from('').toString('base64')
            })
          });

          if (!response.ok) {
            // Fallback to free Judge0 API
            const fallbackResponse = await fetch('https://ce.judge0.com/submissions?base64_encoded=true&wait=true', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                language_id: languageId,
                source_code: Buffer.from(code).toString('base64'),
                stdin: Buffer.from('').toString('base64')
              })
            });

            if (!fallbackResponse.ok) {
              throw new Error('Both Judge0 APIs failed');
            }

            const result = await fallbackResponse.json();

            // Send output
            if (result.stdout) {
              socket.emit('execution-output', {
                executionId,
                output: Buffer.from(result.stdout, 'base64').toString()
              });
            }

            if (result.stderr) {
              socket.emit('execution-error', {
                executionId,
                error: Buffer.from(result.stderr, 'base64').toString()
              });
            }

            if (result.compile_output) {
              socket.emit('execution-error', {
                executionId,
                error: Buffer.from(result.compile_output, 'base64').toString()
              });
            }

            // Execution complete
            socket.emit('execution-complete', {
              executionId,
              exitCode: result.status?.id || 0,
              executionTime: (result.time ? parseFloat(result.time) * 1000 : 0) + 'ms',
              memoryUsed: result.memory ? result.memory + ' KB' : '0 KB'
            });

          } else {
            const result = await response.json();

            // Send output
            if (result.stdout) {
              socket.emit('execution-output', {
                executionId,
                output: Buffer.from(result.stdout, 'base64').toString()
              });
            }

            if (result.stderr) {
              socket.emit('execution-error', {
                executionId,
                error: Buffer.from(result.stderr, 'base64').toString()
              });
            }

            if (result.compile_output) {
              socket.emit('execution-error', {
                executionId,
                error: Buffer.from(result.compile_output, 'base64').toString()
              });
            }

            // Execution complete
            socket.emit('execution-complete', {
              executionId,
              exitCode: result.status?.id || 0,
              executionTime: (result.time ? parseFloat(result.time) * 1000 : 0) + 'ms',
              memoryUsed: result.memory ? result.memory + ' KB' : '0 KB'
            });
          }

          // Clean up
          activeExecutions.delete(executionId);

        } catch (error) {
          console.error('Judge0 execution error:', error);
          socket.emit('execution-error', {
            executionId,
            error: 'Execution failed: ' + error.message
          });
          activeExecutions.delete(executionId);
        }

      } catch (error) {
        console.error('Interactive execution start error:', error);
        socket.emit('execution-error', {
          executionId: data.executionId,
          error: 'Failed to start execution: ' + error.message
        });
      }
    });

    socket.on('send-execution-input', async (data) => {
      try {
        const { executionId, input } = data;
        const execution = activeExecutions.get(executionId);

        if (!execution) {
          socket.emit('execution-error', {
            executionId,
            error: 'Execution not found'
          });
          return;
        }

        // Send input acknowledgment
        socket.emit('execution-output', {
          executionId,
          output: `\nProcessing input: ${input}\n`,
          type: 'system'
        });

        // Simulate program continuing with the input
        setTimeout(() => {
          socket.emit('execution-output', {
            executionId,
            output: `Hello, ${input}! Welcome to CodeCollab Studio!\n`
          });

          // Simulate completion
          setTimeout(() => {
            socket.emit('execution-complete', {
              executionId,
              exitCode: 0,
              executionTime: Date.now() - execution.startTime,
              memoryUsed: '1.2 MB'
            });

            // Cleanup
            activeExecutions.delete(executionId);
          }, 500);
        }, 1000);

      } catch (error) {
        console.error('Interactive execution input error:', error);
        socket.emit('execution-error', {
          executionId: data.executionId,
          error: 'Failed to process input: ' + error.message
        });
      }
    });

    socket.on('stop-execution', (data) => {
      const { executionId } = data;
      const execution = activeExecutions.get(executionId);

      if (execution) {
        activeExecutions.delete(executionId);
        socket.emit('execution-complete', {
          executionId,
          exitCode: -1,
          executionTime: Date.now() - execution.startTime,
          memoryUsed: '0 MB',
          terminated: true
        });
      }
    });

    // Leave room with session tracking
    socket.on('leave-room', async (roomId) => {
      try {
        socket.leave(roomId);
        
        // Update session - try both UUID and ObjectId formats
        let room = await Room.findOne({ roomId });
        if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
          room = await Room.findById(roomId);
        }
        
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

    // File system events
    socket.on('file-content-changed', async (data) => {
      try {
        const { roomId, fileId, content } = data;
        
        // Try both UUID and ObjectId formats
        let room = await Room.findOne({ roomId });
        if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
          room = await Room.findById(roomId);
        }
        
        if (room) {
          const file = room.fileSystem.files.find(f => f.id === fileId);
          if (file) {
            file.content = content;
            file.modifiedBy = socket.userId;
            file.modifiedAt = new Date();
            file.size = content.length;
            room.fileSystem.lastSync = new Date();
            await room.save();
          }
        }
        
        socket.to(roomId).emit('file-content-changed', {
          fileId,
          content,
          userId: socket.userId,
          username: socket.user.username,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('File content change error:', error);
      }
    });

    socket.on('active-file-changed', (data) => {
      const { roomId, fileId, fileName } = data;
      socket.to(roomId).emit('active-file-changed', {
        fileId,
        fileName,
        userId: socket.userId,
        username: socket.user.username
      });
    });

    socket.on('file-tree-updated', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('file-tree-updated', {
        userId: socket.userId,
        username: socket.user.username,
        timestamp: new Date()
      });
    });

    // Join request events
    socket.on('join-request-submitted', (data) => {
      const { roomId, request } = data;
      socket.to(roomId).emit('join-request-received', {
        request,
        timestamp: new Date()
      });
    });

    socket.on('participant-permissions-updated', (data) => {
      const { roomId, participantId, permissions } = data;
      socket.to(roomId).emit('participant-updated', {
        participantId,
        permissions,
        updatedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Presence and activity tracking
    socket.on('user-activity', async (data) => {
      try {
        const { roomId, activity, data: activityData } = data;
        
        // Try both UUID and ObjectId formats
        let room = await Room.findOne({ roomId });
        if (!room && roomId.match(/^[0-9a-fA-F]{24}$/)) {
          room = await Room.findById(roomId);
        }
        
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

    // Virtual File System Events
    socket.on('file-created', (data) => {
      const { roomId, path, content, isDirectory } = data;
      socket.to(roomId).emit('file-created', {
        path,
        content,
        isDirectory,
        userId: socket.userId,
        username: socket.user.username,
        timestamp: new Date()
      });
    });

    socket.on('file-updated', (data) => {
      const { roomId, path, content } = data;
      socket.to(roomId).emit('file-updated', {
        path,
        content,
        userId: socket.userId,
        username: socket.user.username,
        timestamp: new Date()
      });
    });

    socket.on('file-deleted', (data) => {
      const { roomId, path } = data;
      socket.to(roomId).emit('file-deleted', {
        path,
        userId: socket.userId,
        username: socket.user.username,
        timestamp: new Date()
      });
    });

    socket.on('file-renamed', (data) => {
      const { roomId, oldPath, newPath } = data;
      socket.to(roomId).emit('file-renamed', {
        oldPath,
        newPath,
        userId: socket.userId,
        username: socket.user.username,
        timestamp: new Date()
      });
    });

    socket.on('language-changed', (data) => {
      const { roomId, language } = data;
      socket.to(roomId).emit('language-changed', {
        language,
        userId: socket.userId,
        username: socket.user.username,
        timestamp: new Date()
      });
    });

    socket.on('code-execution-result', (data) => {
      const { roomId, result } = data;
      socket.to(roomId).emit('code-execution-result', {
        result,
        userId: socket.userId,
        username: socket.user.username,
        timestamp: new Date()
      });
    });

    // Virtual File System subscription management
    socket.on('subscribe-to-file-system', async (roomId) => {
      try {
        const fs = virtualFileSystemService.getFileSystem(roomId);
        
        // Subscribe to real-time file system events
        const unsubscribe = fs.subscribe((event, data) => {
          socket.emit('virtual-fs-event', {
            event,
            data,
            timestamp: new Date()
          });
        });
        
        // Store unsubscribe function for cleanup
        socket.vfsUnsubscribe = unsubscribe;
        
      } catch (error) {
        console.error('VFS subscription error:', error);
      }
    });

    socket.on('unsubscribe-from-file-system', () => {
      if (socket.vfsUnsubscribe) {
        socket.vfsUnsubscribe();
        socket.vfsUnsubscribe = null;
      }
    });
    
    // Disconnect with cleanup
    socket.on('disconnect', async () => {
      try {
        console.log(`🔌❌ User ${socket.user.username} (ID: ${socket.userId}) disconnected`);
        activeUsers.delete(socket.userId);
        
        // Clean up virtual file system subscription
        if (socket.vfsUnsubscribe) {
          socket.vfsUnsubscribe();
          socket.vfsUnsubscribe = null;
        }
        
        // Update user status
        await User.findByIdAndUpdate(socket.userId, {
          status: 'offline',
          lastSeen: new Date()
        });
        
        if (socket.currentRoom && roomParticipants.has(socket.currentRoom)) {
          roomParticipants.get(socket.currentRoom).delete(socket.userId);
          
          // Get updated participants list and broadcast
          const remainingParticipants = Array.from(roomParticipants.get(socket.currentRoom) || []);
          
          // Update session - try both UUID and ObjectId formats
          let room = await Room.findOne({ roomId: socket.currentRoom });
          if (!room && socket.currentRoom.match(/^[0-9a-fA-F]{24}$/)) {
            room = await Room.findById(socket.currentRoom);
          }
          
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
            
            // Build updated participants list
            const updatedParticipants = remainingParticipants
              .map(userId => {
                const roomParticipant = room.participants.find(p => 
                  p.user._id.toString() === userId
                );
                
                return roomParticipant ? {
                  userId,
                  username: roomParticipant.user.username,
                  avatar: roomParticipant.user.avatar,
                  role: roomParticipant.role,
                  isActive: true
                } : null;
              }).filter(Boolean);
              
            // Broadcast updated participant list
            socket.to(socket.currentRoom).emit('room-participants-updated', updatedParticipants);
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