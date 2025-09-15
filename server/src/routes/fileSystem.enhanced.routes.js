import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { body, param, query } from 'express-validator';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import Room from '../models/Room.model.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Helper functions
const generateFileId = () => uuidv4();

const createFileStructure = (files, parentPath = '') => {
  return files.map(file => ({
    id: file.id || generateFileId(),
    name: file.name,
    type: file.type || (file.children ? 'folder' : 'file'),
    content: file.content || '',
    language: file.language || detectLanguage(file.name),
    size: file.content ? file.content.length : 0,
    createdAt: file.createdAt || new Date(),
    modifiedAt: file.modifiedAt || new Date(),
    path: parentPath ? `${parentPath}/${file.name}` : file.name,
    children: file.children ? createFileStructure(file.children, parentPath ? `${parentPath}/${file.name}` : file.name) : undefined
  }));
};

const detectLanguage = (fileName) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const langMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'javascript',
    'tsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'txt': 'text'
  };
  return langMap[extension] || 'text';
};

const findFileById = (files, id) => {
  for (const file of files) {
    if (file.id === id) {
      return file;
    }
    if (file.children) {
      const found = findFileById(file.children, id);
      if (found) return found;
    }
  }
  return null;
};

const removeFileById = (files, id) => {
  return files.filter(file => {
    if (file.id === id) {
      return false;
    }
    if (file.children) {
      file.children = removeFileById(file.children, id);
    }
    return true;
  });
};

const addFileToParent = (files, parentId, newFile) => {
  if (!parentId) {
    // Add to root
    files.push(newFile);
    return files;
  }

  for (const file of files) {
    if (file.id === parentId) {
      if (!file.children) file.children = [];
      file.children.push(newFile);
      return files;
    }
    if (file.children) {
      addFileToParent(file.children, parentId, newFile);
    }
  }
  return files;
};

/**
 * Get file system tree for a room
 */
router.get('/:roomId/tree', [
  authenticate,
  param('roomId').isUUID().withMessage('Invalid room ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if user has access to the room
    const hasAccess = room.participants.some(p =>
      p.user.toString() === req.user.id && p.status === 'approved'
    ) || room.createdBy.toString() === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this room'
      });
    }

    const fileTree = room.fileSystem?.files || [];

    res.json({
      success: true,
      fileTree,
      lastModified: room.fileSystem?.lastSync || room.updatedAt
    });

  } catch (error) {
    console.error('Get file tree error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file tree',
      message: error.message
    });
  }
});

/**
 * Initialize default file system for a room
 */
router.post('/:roomId/init', [
  authenticate,
  param('roomId').isUUID().withMessage('Invalid room ID'),
  body('structure').optional().isArray().withMessage('Structure must be an array'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { roomId } = req.params;
    const { structure } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if user is admin or room creator
    const isAdmin = room.createdBy.toString() === req.user.id;
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only room admin can initialize file system'
      });
    }

    const defaultStructure = structure || [
      {
        name: 'src',
        type: 'folder',
        children: [
          {
            name: 'main.cpp',
            type: 'file',
            content: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
            language: 'cpp'
          },
          {
            name: 'hello.py',
            type: 'file',
            content: `print("Hello, Python!")`,
            language: 'python'
          }
        ]
      },
      {
        name: 'README.md',
        type: 'file',
        content: '# Project Documentation\n\nWelcome to your collaborative coding project!',
        language: 'markdown'
      }
    ];

    const fileTree = createFileStructure(defaultStructure);

    room.fileSystem = {
      files: fileTree,
      lastSync: new Date(),
      version: 1
    };

    await room.save();

    res.json({
      success: true,
      fileTree,
      message: 'File system initialized successfully'
    });

  } catch (error) {
    console.error('Initialize file system error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize file system',
      message: error.message
    });
  }
});

/**
 * Create new file or folder
 */
router.post('/:roomId/create', [
  authenticate,
  param('roomId').isUUID().withMessage('Invalid room ID'),
  body('name').isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('type').isIn(['file', 'folder']).withMessage('Type must be file or folder'),
  body('parentId').optional().isString().withMessage('Parent ID must be a string'),
  body('content').optional().isString().withMessage('Content must be a string'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, type, parentId, content = '' } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if user has write access
    const hasWriteAccess = room.participants.some(p =>
      p.user.toString() === req.user.id &&
      p.status === 'approved' &&
      (p.permissions?.canEdit !== false)
    ) || room.createdBy.toString() === req.user.id;

    if (!hasWriteAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have write access to this room'
      });
    }

    const newItem = {
      id: generateFileId(),
      name,
      type,
      content: type === 'file' ? content : undefined,
      language: type === 'file' ? detectLanguage(name) : undefined,
      size: type === 'file' ? content.length : 0,
      createdAt: new Date(),
      modifiedAt: new Date(),
      createdBy: req.user.id,
      children: type === 'folder' ? [] : undefined
    };

    let fileTree = room.fileSystem?.files || [];
    fileTree = addFileToParent([...fileTree], parentId, newItem);

    room.fileSystem = {
      ...room.fileSystem,
      files: fileTree,
      lastSync: new Date(),
      version: (room.fileSystem?.version || 0) + 1
    };

    await room.save();

    res.json({
      success: true,
      fileTree,
      createdItem: newItem,
      message: `${type === 'file' ? 'File' : 'Folder'} created successfully`
    });

  } catch (error) {
    console.error('Create file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create item',
      message: error.message
    });
  }
});

/**
 * Delete file or folder
 */
router.delete('/:roomId/:fileId', [
  authenticate,
  param('roomId').isUUID().withMessage('Invalid room ID'),
  param('fileId').isString().withMessage('Invalid file ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { roomId, fileId } = req.params;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if user has write access
    const hasWriteAccess = room.participants.some(p =>
      p.user.toString() === req.user.id &&
      p.status === 'approved' &&
      (p.permissions?.canEdit !== false)
    ) || room.createdBy.toString() === req.user.id;

    if (!hasWriteAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have write access to this room'
      });
    }

    let fileTree = room.fileSystem?.files || [];
    const fileToDelete = findFileById(fileTree, fileId);

    if (!fileToDelete) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    fileTree = removeFileById(fileTree, fileId);

    room.fileSystem = {
      ...room.fileSystem,
      files: fileTree,
      lastSync: new Date(),
      version: (room.fileSystem?.version || 0) + 1
    };

    await room.save();

    res.json({
      success: true,
      fileTree,
      deletedItem: fileToDelete,
      message: `${fileToDelete.type === 'file' ? 'File' : 'Folder'} deleted successfully`
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete item',
      message: error.message
    });
  }
});

/**
 * Upload file
 */
router.post('/:roomId/upload', [
  authenticate,
  param('roomId').isUUID().withMessage('Invalid room ID'),
  body('name').isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('content').isString().withMessage('Content is required'),
  body('size').optional().isNumeric().withMessage('Size must be a number'),
  body('type').optional().isString().withMessage('Type must be a string'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, content, size, type } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if user has write access
    const hasWriteAccess = room.participants.some(p =>
      p.user.toString() === req.user.id &&
      p.status === 'approved' &&
      (p.permissions?.canEdit !== false)
    ) || room.createdBy.toString() === req.user.id;

    if (!hasWriteAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have write access to this room'
      });
    }

    const uploadedFile = {
      id: generateFileId(),
      name,
      type: 'file',
      content,
      language: detectLanguage(name),
      size: size || content.length,
      mimeType: type,
      createdAt: new Date(),
      modifiedAt: new Date(),
      uploadedBy: req.user.id
    };

    let fileTree = room.fileSystem?.files || [];
    fileTree.push(uploadedFile);

    room.fileSystem = {
      ...room.fileSystem,
      files: fileTree,
      lastSync: new Date(),
      version: (room.fileSystem?.version || 0) + 1
    };

    await room.save();

    res.json({
      success: true,
      fileTree,
      uploadedFile,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
      message: error.message
    });
  }
});

/**
 * Update file content
 */
router.put('/:roomId/files/:fileId', [
  authenticate,
  param('roomId').isUUID().withMessage('Invalid room ID'),
  param('fileId').isString().withMessage('Invalid file ID'),
  body('content').isString().withMessage('Content is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    const { content } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if user has write access
    const hasWriteAccess = room.participants.some(p =>
      p.user.toString() === req.user.id &&
      p.status === 'approved' &&
      (p.permissions?.canEdit !== false)
    ) || room.createdBy.toString() === req.user.id;

    if (!hasWriteAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have write access to this room'
      });
    }

    const updateFileContent = (files) => {
      return files.map(file => {
        if (file.id === fileId) {
          return {
            ...file,
            content,
            size: content.length,
            modifiedAt: new Date(),
            modifiedBy: req.user.id
          };
        }
        if (file.children) {
          return {
            ...file,
            children: updateFileContent(file.children)
          };
        }
        return file;
      });
    };

    let fileTree = room.fileSystem?.files || [];
    const updatedFileTree = updateFileContent(fileTree);

    room.fileSystem = {
      ...room.fileSystem,
      files: updatedFileTree,
      lastSync: new Date(),
      version: (room.fileSystem?.version || 0) + 1
    };

    await room.save();

    res.json({
      success: true,
      message: 'File updated successfully'
    });

  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update file',
      message: error.message
    });
  }
});

export default router;