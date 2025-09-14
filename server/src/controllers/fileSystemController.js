import Room from '../models/Room.model.js';
import { v4 as uuidv4 } from 'uuid';
import virtualFileSystemService from '../services/virtualFileSystem.service.js';

const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

const getLanguageFromExtension = (extension) => {
  const extensionMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'javascript',
    'tsx': 'javascript',
    'py': 'python',
    'cpp': 'cpp',
    'cxx': 'cpp',
    'cc': 'cpp',
    'c': 'cpp',
    'h': 'cpp',
    'hpp': 'cpp',
    'cs': 'csharp',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'json': 'json',
    'txt': 'text',
    'md': 'text',
    'README': 'text'
  };
  return extensionMap[extension] || 'text';
};

export const getFileTree = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Build hierarchical tree structure
    const buildTree = (files, parentId = null) => {
      return files
        .filter(file => file.parentId === parentId)
        .map(file => ({
          ...file.toObject(),
          children: file.type === 'folder' ? buildTree(files, file.id) : []
        }))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    };

    const fileTree = buildTree(room.fileSystem.files);

    res.json({ 
      fileTree,
      activeFile: room.fileSystem.activeFile
    });
  } catch (error) {
    console.error('Get file tree error:', error);
    res.status(500).json({ error: 'Failed to fetch file tree' });
  }
};

export const createFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, type = 'file', parentId = null, content = '' } = req.body;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if file already exists in the same directory
    const existingFile = room.fileSystem.files.find(f => 
      f.name === name && f.parentId === parentId
    );

    if (existingFile) {
      return res.status(400).json({ error: 'File with this name already exists' });
    }

    const fileId = uuidv4();
    const path = parentId ? 
      `${room.fileSystem.files.find(f => f.id === parentId)?.path || ''}/${name}` : 
      name;

    const newFile = {
      id: fileId,
      name,
      path,
      type,
      content: type === 'file' ? content : '',
      language: type === 'file' ? getLanguageFromExtension(getFileExtension(name)) : 'text',
      size: content.length,
      parentId,
      createdBy: req.user._id,
      createdAt: new Date(),
      modifiedBy: req.user._id,
      modifiedAt: new Date(),
      isActive: false
    };

    room.fileSystem.files.push(newFile);
    room.fileSystem.lastSync = new Date();
    await room.save();

    res.json({ 
      message: `${type} created successfully`,
      file: newFile
    });
  } catch (error) {
    console.error('Create file error:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
};

export const updateFile = async (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    const { content, name } = req.body;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const fileIndex = room.fileSystem.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = room.fileSystem.files[fileIndex];
    
    if (content !== undefined) {
      file.content = content;
      file.size = content.length;
    }
    
    if (name !== undefined && name !== file.name) {
      // Check if new name already exists in the same directory
      const existingFile = room.fileSystem.files.find(f => 
        f.name === name && f.parentId === file.parentId && f.id !== fileId
      );

      if (existingFile) {
        return res.status(400).json({ error: 'File with this name already exists' });
      }

      file.name = name;
      file.language = getLanguageFromExtension(getFileExtension(name));
      
      // Update path
      const parentPath = file.parentId ? 
        room.fileSystem.files.find(f => f.id === file.parentId)?.path || '' : 
        '';
      file.path = parentPath ? `${parentPath}/${name}` : name;
    }

    file.modifiedBy = req.user._id;
    file.modifiedAt = new Date();
    room.fileSystem.lastSync = new Date();
    
    await room.save();

    res.json({ 
      message: 'File updated successfully',
      file: room.fileSystem.files[fileIndex]
    });
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const fileIndex = room.fileSystem.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = room.fileSystem.files[fileIndex];

    // If deleting a folder, recursively delete all children
    const deleteRecursively = (id) => {
      const children = room.fileSystem.files.filter(f => f.parentId === id);
      children.forEach(child => {
        if (child.type === 'folder') {
          deleteRecursively(child.id);
        }
      });
      room.fileSystem.files = room.fileSystem.files.filter(f => f.parentId !== id);
    };

    if (file.type === 'folder') {
      deleteRecursively(fileId);
    }

    // Remove the file itself
    room.fileSystem.files.splice(fileIndex, 1);

    // If this was the active file, clear it
    if (room.fileSystem.activeFile === fileId) {
      room.fileSystem.activeFile = null;
    }

    room.fileSystem.lastSync = new Date();
    await room.save();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

export const setActiveFile = async (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const file = room.fileSystem.files.find(f => f.id === fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.type !== 'file') {
      return res.status(400).json({ error: 'Only files can be set as active' });
    }

    // Mark all files as inactive
    room.fileSystem.files.forEach(f => {
      f.isActive = false;
    });

    // Mark the selected file as active
    file.isActive = true;
    room.fileSystem.activeFile = fileId;
    room.fileSystem.lastSync = new Date();

    await room.save();

    res.json({ 
      message: 'Active file set successfully',
      activeFile: file
    });
  } catch (error) {
    console.error('Set active file error:', error);
    res.status(500).json({ error: 'Failed to set active file' });
  }
};

export const moveFile = async (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    const { newParentId } = req.body;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const fileIndex = room.fileSystem.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = room.fileSystem.files[fileIndex];

    // Check if new parent exists and is a folder
    if (newParentId) {
      const newParent = room.fileSystem.files.find(f => f.id === newParentId);
      if (!newParent || newParent.type !== 'folder') {
        return res.status(400).json({ error: 'Invalid parent folder' });
      }
    }

    // Check if file with same name exists in destination
    const existingFile = room.fileSystem.files.find(f => 
      f.name === file.name && f.parentId === newParentId && f.id !== fileId
    );

    if (existingFile) {
      return res.status(400).json({ error: 'File with this name already exists in destination' });
    }

    // Update file path
    const newParentPath = newParentId ? 
      room.fileSystem.files.find(f => f.id === newParentId)?.path || '' : 
      '';
    
    file.parentId = newParentId;
    file.path = newParentPath ? `${newParentPath}/${file.name}` : file.name;
    file.modifiedBy = req.user._id;
    file.modifiedAt = new Date();

    // Update paths of all children recursively
    const updateChildPaths = (parentId, parentPath) => {
      const children = room.fileSystem.files.filter(f => f.parentId === parentId);
      children.forEach(child => {
        child.path = `${parentPath}/${child.name}`;
        if (child.type === 'folder') {
          updateChildPaths(child.id, child.path);
        }
      });
    };

    if (file.type === 'folder') {
      updateChildPaths(fileId, file.path);
    }

    room.fileSystem.lastSync = new Date();
    await room.save();

    res.json({ 
      message: 'File moved successfully',
      file: room.fileSystem.files[fileIndex]
    });
  } catch (error) {
    console.error('Move file error:', error);
    res.status(500).json({ error: 'Failed to move file' });
  }
};

export const initializeDefaultFiles = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({
      $or: [{ roomId }, { roomCode: roomId }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only initialize if no files exist
    if (room.fileSystem.files.length > 0) {
      return res.status(400).json({ error: 'Files already exist in this room' });
    }

    const defaultFiles = [
      {
        id: uuidv4(),
        name: 'src',
        path: 'src',
        type: 'folder',
        content: '',
        language: 'text',
        size: 0,
        parentId: null,
        createdBy: req.user._id,
        createdAt: new Date(),
        modifiedBy: req.user._id,
        modifiedAt: new Date(),
        isActive: false
      },
      {
        id: uuidv4(),
        name: 'main.js',
        path: 'src/main.js',
        type: 'file',
        content: '// Welcome to CodeCollab Studio!\n// Start coding here...\n\nconsole.log("Hello, World!");\n',
        language: 'javascript',
        size: 0,
        parentId: null, // Will be updated below
        createdBy: req.user._id,
        createdAt: new Date(),
        modifiedBy: req.user._id,
        modifiedAt: new Date(),
        isActive: true
      },
      {
        id: uuidv4(),
        name: 'README.md',
        path: 'README.md',
        type: 'file',
        content: `# ${room.name}\n\n${room.description || 'Welcome to your collaborative coding room!'}\n\n## Getting Started\n\n1. Start coding in the editor\n2. Use the file explorer to manage your files\n3. Run your code using the execute button\n4. Collaborate with your team in real-time\n\nHappy coding! 🚀\n`,
        language: 'text',
        size: 0,
        parentId: null,
        createdBy: req.user._id,
        createdAt: new Date(),
        modifiedBy: req.user._id,
        modifiedAt: new Date(),
        isActive: false
      }
    ];

    // Set the main.js parent to src folder
    defaultFiles[1].parentId = defaultFiles[0].id;
    defaultFiles[1].size = defaultFiles[1].content.length;
    defaultFiles[2].size = defaultFiles[2].content.length;

    room.fileSystem.files = defaultFiles;
    room.fileSystem.activeFile = defaultFiles[1].id;
    room.fileSystem.lastSync = new Date();

    await room.save();

    res.json({ 
      message: 'Default files initialized successfully',
      files: defaultFiles
    });
  } catch (error) {
    console.error('Initialize default files error:', error);
    res.status(500).json({ error: 'Failed to initialize default files' });
  }
};

// Virtual File System Endpoints
export const getVirtualFileTree = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { path = '/project' } = req.query;
    
    const fs = virtualFileSystemService.getFileSystem(roomId);
    const result = await fs.getFileTree(path);
    
    res.json(result);
  } catch (error) {
    console.error('Get virtual file tree error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const readVirtualFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fs = virtualFileSystemService.getFileSystem(roomId);
    const result = await fs.readFile(path);
    
    res.json(result);
  } catch (error) {
    console.error('Read virtual file error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const writeVirtualFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { path, content } = req.body;
    
    if (!path || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }
    
    const fs = virtualFileSystemService.getFileSystem(roomId);
    const result = await fs.writeFile(path, content);
    
    res.json(result);
  } catch (error) {
    console.error('Write virtual file error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createVirtualFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { path, content = '', isDirectory = false } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fs = virtualFileSystemService.getFileSystem(roomId);
    const result = await fs.createFile(path, content, isDirectory);
    
    res.json(result);
  } catch (error) {
    console.error('Create virtual file error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteVirtualFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { path } = req.body;
    const { recursive = false } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fs = virtualFileSystemService.getFileSystem(roomId);
    const result = await fs.deleteFile(path, recursive === 'true');
    
    res.json(result);
  } catch (error) {
    console.error('Delete virtual file error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const renameVirtualFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { oldPath, newPath } = req.body;
    
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Old and new file paths are required' });
    }
    
    const fs = virtualFileSystemService.getFileSystem(roomId);
    const result = await fs.renameFile(oldPath, newPath);
    
    res.json(result);
  } catch (error) {
    console.error('Rename virtual file error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const searchVirtualFiles = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { query, searchContent = false, caseSensitive = false, maxResults = 100 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const fs = virtualFileSystemService.getFileSystem(roomId);
    const result = await fs.searchFiles(query, {
      searchContent: searchContent === 'true',
      caseSensitive: caseSensitive === 'true',
      maxResults: parseInt(maxResults)
    });
    
    res.json(result);
  } catch (error) {
    console.error('Search virtual files error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const exportVirtualFiles = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const fs = virtualFileSystemService.getFileSystem(roomId);
    const result = await fs.exportFiles();
    
    res.json(result);
  } catch (error) {
    console.error('Export virtual files error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const importVirtualFiles = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { files, overwrite = false, prefix = '' } = req.body;
    
    if (!files || typeof files !== 'object') {
      return res.status(400).json({ error: 'Files data is required' });
    }
    
    const fs = virtualFileSystemService.getFileSystem(roomId);
    const result = await fs.importFiles(files, { overwrite, prefix });
    
    res.json(result);
  } catch (error) {
    console.error('Import virtual files error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getVirtualFileSystemStats = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const fs = virtualFileSystemService.getFileSystem(roomId);
    const result = fs.getStats();
    
    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Get virtual file system stats error:', error);
    res.status(500).json({ error: error.message });
  }
};