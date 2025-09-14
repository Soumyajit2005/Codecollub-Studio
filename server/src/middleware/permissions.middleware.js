import Room from '../models/Room.model.js';

export const checkRoomPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      const room = await Room.findOne({
        $or: [{ roomId }, { roomCode: roomId }]
      });

      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      // Check if user is owner
      if (room.owner.toString() === userId) {
        req.userRole = 'owner';
        req.hasPermission = true;
        return next();
      }

      // Find user in participants
      const participant = room.participants.find(p => p.user.toString() === userId);
      
      if (!participant) {
        return res.status(403).json({ message: 'Not a participant in this room' });
      }

      // Check if participant is approved
      if (participant.status !== 'approved') {
        return res.status(403).json({ message: 'Participant not approved' });
      }

      req.userRole = participant.role;
      req.userPermissions = participant.permissions;

      // Check specific permission
      if (requiredPermission) {
        const hasPermission = participant.permissions[requiredPermission] === true;
        if (!hasPermission) {
          return res.status(403).json({ 
            message: `Insufficient permissions: ${requiredPermission} required` 
          });
        }
      }

      req.hasPermission = true;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Permission check failed' });
    }
  };
};

export const checkAdminRole = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is owner
    if (room.owner.toString() === userId) {
      req.userRole = 'owner';
      return next();
    }

    // Check if user is admin
    const participant = room.participants.find(p => 
      p.user.toString() === userId && p.role === 'admin'
    );

    if (!participant) {
      return res.status(403).json({ message: 'Admin privileges required' });
    }

    req.userRole = 'admin';
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Admin check failed' });
  }
};

export const checkOwnerRole = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Owner privileges required' });
    }

    req.userRole = 'owner';
    next();
  } catch (error) {
    console.error('Owner check error:', error);
    res.status(500).json({ message: 'Owner check failed' });
  }
};

export const checkFilePermission = (action) => {
  return async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      const room = await Room.findOne({
        $or: [{ roomId }, { roomCode: roomId }]
      });

      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      // Check if file system is enabled
      if (!room.settings.fileSystem) {
        return res.status(403).json({ message: 'File system disabled for this room' });
      }

      // Owner has all permissions
      if (room.owner.toString() === userId) {
        return next();
      }

      const participant = room.participants.find(p => p.user.toString() === userId);
      
      if (!participant || participant.status !== 'approved') {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Check specific file permissions based on action
      switch (action) {
        case 'read':
          // All approved participants can read files
          break;
        case 'write':
          if (!participant.permissions.canCode) {
            return res.status(403).json({ message: 'Code editing permission required' });
          }
          break;
        case 'create':
        case 'delete':
        case 'rename':
          if (!participant.permissions.canManageFiles) {
            return res.status(403).json({ message: 'File management permission required' });
          }
          break;
        default:
          return res.status(400).json({ message: 'Invalid action' });
      }

      next();
    } catch (error) {
      console.error('File permission check error:', error);
      res.status(500).json({ message: 'File permission check failed' });
    }
  };
};

export const getDefaultPermissions = (role) => {
  const permissions = {
    owner: {
      canChat: true,
      canCode: true,
      canWhiteboard: true,
      canVideo: true,
      canScreenShare: true,
      canExecuteCode: true,
      canManageFiles: true,
      canInviteUsers: true,
      canKickUsers: true
    },
    admin: {
      canChat: true,
      canCode: true,
      canWhiteboard: true,
      canVideo: true,
      canScreenShare: true,
      canExecuteCode: true,
      canManageFiles: true,
      canInviteUsers: true,
      canKickUsers: true
    },
    editor: {
      canChat: true,
      canCode: true,
      canWhiteboard: true,
      canVideo: true,
      canScreenShare: false,
      canExecuteCode: true,
      canManageFiles: false,
      canInviteUsers: false,
      canKickUsers: false
    },
    viewer: {
      canChat: true,
      canCode: false,
      canWhiteboard: false,
      canVideo: true,
      canScreenShare: false,
      canExecuteCode: false,
      canManageFiles: false,
      canInviteUsers: false,
      canKickUsers: false
    }
  };

  return permissions[role] || permissions.viewer;
};