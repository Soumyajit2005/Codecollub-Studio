import { Volume, createFsFromVolume } from 'memfs';
import { ufs } from 'unionfs';
import path from 'path';

/**
 * Virtual File System Service for CodeCollab Studio
 * Implements an in-memory file system with real-time synchronization
 */
class VirtualFileSystemService {
  constructor() {
    this.roomFileSystems = new Map(); // Map of roomId -> VirtualFileSystem instance
  }

  /**
   * Get or create a virtual file system for a room
   */
  getFileSystem(roomId) {
    if (!this.roomFileSystems.has(roomId)) {
      this.roomFileSystems.set(roomId, new RoomFileSystem(roomId));
    }
    return this.roomFileSystems.get(roomId);
  }

  /**
   * Remove file system for a room (cleanup)
   */
  removeFileSystem(roomId) {
    if (this.roomFileSystems.has(roomId)) {
      const fs = this.roomFileSystems.get(roomId);
      fs.destroy();
      this.roomFileSystems.delete(roomId);
    }
  }

  /**
   * Get all active file systems
   */
  getActiveRooms() {
    return Array.from(this.roomFileSystems.keys());
  }

  /**
   * Get file system statistics
   */
  getStats() {
    return {
      activeRooms: this.roomFileSystems.size,
      totalFiles: Array.from(this.roomFileSystems.values())
        .reduce((sum, fs) => sum + fs.getFileCount(), 0),
      memoryUsage: process.memoryUsage()
    };
  }
}

/**
 * Individual room file system
 */
class RoomFileSystem {
  constructor(roomId) {
    this.roomId = roomId;
    this.volume = new Volume();
    this.fs = createFsFromVolume(this.volume);
    this.watchers = new Set(); // File watchers
    this.subscribers = new Set(); // Real-time subscribers
    
    // Initialize with default project structure
    this.initializeDefaultStructure();
  }

  /**
   * Initialize default project structure
   */
  initializeDefaultStructure() {
    const defaultStructure = {
      '/project': null, // Directory
      '/project/main.js': `// Welcome to CodeCollab Studio!
console.log("Hello, World! 🚀");

// This is your main file
// You can create more files and organize your project`,
      '/project/README.md': `# CodeCollab Project

Welcome to your collaborative coding environment!

## Getting Started

1. Write your code in the editor
2. Use the file explorer to create new files
3. Run your code to see the output
4. Collaborate with others in real-time

## Available Features

- Multi-language support
- Real-time collaboration
- File management
- Code execution
- Terminal access

Happy coding! 🎉`,
      '/project/package.json': JSON.stringify({
        name: "codecollab-project",
        version: "1.0.0",
        description: "A CodeCollab Studio project",
        main: "main.js",
        scripts: {
          start: "node main.js"
        },
        keywords: ["codecollab", "collaboration"],
        author: "CodeCollab User"
      }, null, 2)
    };

    this.volume.fromJSON(defaultStructure);
  }

  /**
   * Create a new file or directory
   */
  async createFile(filePath, content = '', isDirectory = false) {
    try {
      const normalizedPath = this.normalizePath(filePath);
      
      if (isDirectory) {
        await this.fs.promises.mkdir(normalizedPath, { recursive: true });
      } else {
        // Ensure parent directory exists
        const parentDir = path.dirname(normalizedPath);
        if (parentDir !== '/') {
          await this.fs.promises.mkdir(parentDir, { recursive: true });
        }
        await this.fs.promises.writeFile(normalizedPath, content, 'utf8');
      }

      this.notifySubscribers('file_created', {
        path: normalizedPath,
        isDirectory,
        content: isDirectory ? null : content,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        path: normalizedPath,
        isDirectory,
        content: isDirectory ? null : content
      };
    } catch (error) {
      throw new Error(`Failed to create ${isDirectory ? 'directory' : 'file'}: ${error.message}`);
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath) {
    try {
      const normalizedPath = this.normalizePath(filePath);
      const stats = await this.fs.promises.stat(normalizedPath);
      
      if (stats.isDirectory()) {
        throw new Error(`${filePath} is a directory, not a file`);
      }

      const content = await this.fs.promises.readFile(normalizedPath, 'utf8');
      
      return {
        success: true,
        path: normalizedPath,
        content,
        size: stats.size,
        modified: stats.mtime
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath, content) {
    try {
      const normalizedPath = this.normalizePath(filePath);
      
      // Ensure parent directory exists
      const parentDir = path.dirname(normalizedPath);
      if (parentDir !== '/') {
        await this.fs.promises.mkdir(parentDir, { recursive: true });
      }

      await this.fs.promises.writeFile(normalizedPath, content, 'utf8');

      this.notifySubscribers('file_updated', {
        path: normalizedPath,
        content,
        size: Buffer.byteLength(content, 'utf8'),
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        path: normalizedPath,
        size: Buffer.byteLength(content, 'utf8')
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  /**
   * Delete file or directory
   */
  async deleteFile(filePath, recursive = false) {
    try {
      const normalizedPath = this.normalizePath(filePath);
      const stats = await this.fs.promises.stat(normalizedPath);

      if (stats.isDirectory()) {
        await this.fs.promises.rmdir(normalizedPath, { recursive });
      } else {
        await this.fs.promises.unlink(normalizedPath);
      }

      this.notifySubscribers('file_deleted', {
        path: normalizedPath,
        isDirectory: stats.isDirectory(),
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        path: normalizedPath,
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      throw new Error(`Failed to delete: ${error.message}`);
    }
  }

  /**
   * Rename/move file or directory
   */
  async renameFile(oldPath, newPath) {
    try {
      const normalizedOldPath = this.normalizePath(oldPath);
      const normalizedNewPath = this.normalizePath(newPath);

      // Ensure target parent directory exists
      const parentDir = path.dirname(normalizedNewPath);
      if (parentDir !== '/') {
        await this.fs.promises.mkdir(parentDir, { recursive: true });
      }

      await this.fs.promises.rename(normalizedOldPath, normalizedNewPath);

      this.notifySubscribers('file_renamed', {
        oldPath: normalizedOldPath,
        newPath: normalizedNewPath,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        oldPath: normalizedOldPath,
        newPath: normalizedNewPath
      };
    } catch (error) {
      throw new Error(`Failed to rename: ${error.message}`);
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath = '/project') {
    try {
      const normalizedPath = this.normalizePath(dirPath);
      const files = await this.fs.promises.readdir(normalizedPath, { withFileTypes: true });

      const fileList = await Promise.all(
        files.map(async (dirent) => {
          const filePath = path.join(normalizedPath, dirent.name);
          const stats = await this.fs.promises.stat(filePath);

          return {
            name: dirent.name,
            path: filePath,
            isDirectory: dirent.isDirectory(),
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime
          };
        })
      );

      return {
        success: true,
        path: normalizedPath,
        files: fileList.sort((a, b) => {
          // Directories first, then files
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        })
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  /**
   * Get file tree structure
   */
  async getFileTree(rootPath = '/project') {
    try {
      const buildTree = async (dirPath) => {
        const normalizedPath = this.normalizePath(dirPath);
        const stats = await this.fs.promises.stat(normalizedPath);

        if (stats.isFile()) {
          return {
            name: path.basename(normalizedPath),
            path: normalizedPath,
            type: 'file',
            size: stats.size,
            modified: stats.mtime
          };
        }

        const files = await this.fs.promises.readdir(normalizedPath);
        const children = await Promise.all(
          files.map(file => buildTree(path.join(normalizedPath, file)))
        );

        return {
          name: path.basename(normalizedPath) || 'project',
          path: normalizedPath,
          type: 'directory',
          children: children.sort((a, b) => {
            if (a.type === 'directory' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
          }),
          modified: stats.mtime
        };
      };

      const tree = await buildTree(rootPath);
      return { success: true, tree };
    } catch (error) {
      throw new Error(`Failed to build file tree: ${error.message}`);
    }
  }

  /**
   * Search for files/content
   */
  async searchFiles(query, options = {}) {
    try {
      const {
        searchContent = false,
        caseSensitive = false,
        maxResults = 100,
        rootPath = '/project'
      } = options;

      const results = [];
      const searchRegex = new RegExp(query, caseSensitive ? 'g' : 'gi');

      const searchInDirectory = async (dirPath) => {
        if (results.length >= maxResults) return;

        const files = await this.fs.promises.readdir(dirPath, { withFileTypes: true });

        for (const dirent of files) {
          if (results.length >= maxResults) break;

          const filePath = path.join(dirPath, dirent.name);

          // Check filename match
          if (searchRegex.test(dirent.name)) {
            const stats = await this.fs.promises.stat(filePath);
            results.push({
              type: 'filename',
              path: filePath,
              name: dirent.name,
              isDirectory: dirent.isDirectory(),
              size: stats.size,
              modified: stats.mtime
            });
          }

          if (dirent.isDirectory()) {
            await searchInDirectory(filePath);
          } else if (searchContent && dirent.isFile()) {
            try {
              const content = await this.fs.promises.readFile(filePath, 'utf8');
              const matches = [...content.matchAll(searchRegex)];
              
              if (matches.length > 0) {
                const lines = content.split('\n');
                const matchLines = matches.map(match => {
                  const beforeMatch = content.substring(0, match.index);
                  const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
                  const lineContent = lines[lineNumber - 1];
                  
                  return {
                    lineNumber,
                    content: lineContent,
                    match: match[0],
                    index: match.index
                  };
                });

                results.push({
                  type: 'content',
                  path: filePath,
                  name: dirent.name,
                  matches: matchLines
                });
              }
            } catch (error) {
              // Skip files that can't be read as text
            }
          }
        }
      };

      await searchInDirectory(this.normalizePath(rootPath));

      return {
        success: true,
        query,
        results,
        totalFound: results.length
      };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Export file system as JSON
   */
  async exportFiles() {
    try {
      const json = this.volume.toJSON();
      return {
        success: true,
        roomId: this.roomId,
        files: json,
        exportTime: new Date().toISOString(),
        fileCount: Object.keys(json).length
      };
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Import files from JSON
   */
  async importFiles(filesData, options = {}) {
    try {
      const { overwrite = false, prefix = '' } = options;

      if (!overwrite) {
        // Create backup
        this.createBackup();
      }

      // Apply prefix if specified
      const processedFiles = {};
      for (const [filePath, content] of Object.entries(filesData)) {
        const newPath = prefix ? path.join('/', prefix, filePath) : filePath;
        processedFiles[newPath] = content;
      }

      this.volume.fromJSON(processedFiles, overwrite ? '/' : undefined);

      this.notifySubscribers('files_imported', {
        fileCount: Object.keys(processedFiles).length,
        overwrite,
        prefix,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        imported: Object.keys(processedFiles).length,
        overwrite,
        prefix
      };
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Create backup of current state
   */
  createBackup() {
    const backup = this.volume.toJSON();
    this.lastBackup = {
      data: backup,
      timestamp: new Date().toISOString()
    };
    return this.lastBackup;
  }

  /**
   * Restore from backup
   */
  async restoreBackup() {
    if (!this.lastBackup) {
      throw new Error('No backup available');
    }

    try {
      this.volume.reset();
      this.volume.fromJSON(this.lastBackup.data);

      this.notifySubscribers('backup_restored', {
        backupTime: this.lastBackup.timestamp,
        restoreTime: new Date().toISOString()
      });

      return {
        success: true,
        backupTime: this.lastBackup.timestamp,
        fileCount: Object.keys(this.lastBackup.data).length
      };
    } catch (error) {
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  /**
   * Add real-time subscriber
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of changes
   */
  notifySubscribers(event, data) {
    this.subscribers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Subscriber notification failed:', error);
      }
    });
  }

  /**
   * Normalize file paths
   */
  normalizePath(filePath) {
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath;
    }
    return path.posix.normalize(filePath);
  }

  /**
   * Get file count
   */
  getFileCount() {
    return Object.keys(this.volume.toJSON()).length;
  }

  /**
   * Get file system statistics
   */
  getStats() {
    const json = this.volume.toJSON();
    const files = Object.keys(json);
    
    return {
      roomId: this.roomId,
      fileCount: files.length,
      totalSize: Object.values(json)
        .filter(content => typeof content === 'string')
        .reduce((sum, content) => sum + Buffer.byteLength(content, 'utf8'), 0),
      subscribers: this.subscribers.size,
      hasBackup: !!this.lastBackup,
      lastBackupTime: this.lastBackup?.timestamp
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.subscribers.clear();
    this.watchers.clear();
    this.volume.reset();
    this.lastBackup = null;
  }
}

export default new VirtualFileSystemService();