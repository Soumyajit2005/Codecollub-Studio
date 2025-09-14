import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Button,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  TreeView,
  TreeItem
} from '@mui/material';
import {
  Folder,
  FolderOpen,
  InsertDriveFile,
  Add,
  CreateNewFolder,
  NoteAdd,
  Delete,
  Edit,
  FileCopy,
  Download,
  Upload,
  Refresh,
  Save,
  Close,
  ExpandMore,
  ChevronRight,
  Code,
  Image,
  PictureAsPdf,
  TextFields,
  DataObject,
  Html,
  Css,
  JavaScript
} from '@mui/icons-material';
import toast from 'react-hot-toast';

// File type icons mapping
const getFileIcon = (fileName, isDirectory) => {
  if (isDirectory) return <Folder sx={{ color: '#4285f4' }} />;

  const extension = fileName.split('.').pop()?.toLowerCase();

  const iconMap = {
    // Programming languages
    'js': <JavaScript sx={{ color: '#f7df1e' }} />,
    'jsx': <JavaScript sx={{ color: '#61dafb' }} />,
    'ts': <JavaScript sx={{ color: '#3178c6' }} />,
    'tsx': <JavaScript sx={{ color: '#3178c6' }} />,
    'py': <Code sx={{ color: '#3776ab' }} />,
    'java': <Code sx={{ color: '#ed8b00' }} />,
    'cpp': <Code sx={{ color: '#00599c' }} />,
    'c': <Code sx={{ color: '#a8b9cc' }} />,
    'cs': <Code sx={{ color: '#239120' }} />,
    'go': <Code sx={{ color: '#00add8' }} />,
    'rs': <Code sx={{ color: '#ce422b' }} />,
    'php': <Code sx={{ color: '#777bb4' }} />,
    'rb': <Code sx={{ color: '#cc342d' }} />,

    // Web files
    'html': <Html sx={{ color: '#e34f26' }} />,
    'htm': <Html sx={{ color: '#e34f26' }} />,
    'css': <Css sx={{ color: '#1572b6' }} />,
    'scss': <Css sx={{ color: '#cf649a' }} />,
    'sass': <Css sx={{ color: '#cf649a' }} />,

    // Data files
    'json': <DataObject sx={{ color: '#000000' }} />,
    'xml': <DataObject sx={{ color: '#0060ac' }} />,
    'yaml': <DataObject sx={{ color: '#cb171e' }} />,
    'yml': <DataObject sx={{ color: '#cb171e' }} />,

    // Documents
    'md': <TextFields sx={{ color: '#083fa1' }} />,
    'txt': <TextFields sx={{ color: '#666666' }} />,
    'pdf': <PictureAsPdf sx={{ color: '#f40f02' }} />,

    // Images
    'png': <Image sx={{ color: '#4caf50' }} />,
    'jpg': <Image sx={{ color: '#4caf50' }} />,
    'jpeg': <Image sx={{ color: '#4caf50' }} />,
    'gif': <Image sx={{ color: '#4caf50' }} />,
    'svg': <Image sx={{ color: '#4caf50' }} />
  };

  return iconMap[extension] || <InsertDriveFile sx={{ color: '#757575' }} />;
};

// Language detection from file extension
const getLanguageFromExtension = (fileName) => {
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
    'rb': 'ruby'
  };
  return langMap[extension] || 'text';
};

const AdvancedFileSystem = ({
  roomId,
  user,
  socketService,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  selectedFile,
  isAdmin = false
}) => {
  // File system state
  const [fileTree, setFileTree] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState([]);

  // UI state
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState('file'); // 'file' or 'folder'
  const [newItemName, setNewItemName] = useState('');
  const [newItemParent, setNewItemParent] = useState(null);

  // File upload
  const fileInputRef = useRef(null);

  // Initialize file system
  useEffect(() => {
    loadFileSystem();
  }, [roomId]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (socketService?.socket) {
      const socket = socketService.socket;

      socket.on('file-system-updated', handleFileSystemUpdate);
      socket.on('file-created', handleFileCreated);
      socket.on('file-deleted', handleFileDeleted);
      socket.on('file-renamed', handleFileRenamed);

      return () => {
        socket.off('file-system-updated');
        socket.off('file-created');
        socket.off('file-deleted');
        socket.off('file-renamed');
      };
    }
  }, [socketService]);

  // Filter files based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = flattenFileTree(fileTree).filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFiles(filtered);
    } else {
      setFilteredFiles([]);
    }
  }, [searchQuery, fileTree]);

  const flattenFileTree = (tree, path = '') => {
    let result = [];
    for (const node of tree) {
      const currentPath = path ? `${path}/${node.name}` : node.name;
      result.push({ ...node, fullPath: currentPath });
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenFileTree(node.children, currentPath));
      }
    }
    return result;
  };

  const loadFileSystem = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/files/${roomId}/tree`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFileTree(data.fileTree || []);
      } else if (response.status === 404) {
        // Initialize with default files
        await initializeDefaultFileSystem();
      } else {
        toast.error('Failed to load file system');
      }
    } catch (error) {
      console.error('File system load error:', error);
      toast.error('Error loading file system');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultFileSystem = async () => {
    const defaultFiles = [
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
          },
          {
            name: 'script.js',
            type: 'file',
            content: `console.log("Hello, JavaScript!");`,
            language: 'javascript'
          }
        ]
      },
      {
        name: 'docs',
        type: 'folder',
        children: [
          {
            name: 'README.md',
            type: 'file',
            content: '# Project Documentation\n\nWelcome to your project!',
            language: 'markdown'
          }
        ]
      }
    ];

    try {
      const response = await fetch(`/api/files/${roomId}/init`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ structure: defaultFiles })
      });

      if (response.ok) {
        const data = await response.json();
        setFileTree(data.fileTree);
        toast.success('File system initialized');
      }
    } catch (error) {
      console.error('File system initialization error:', error);
      toast.error('Failed to initialize file system');
    }
  };

  const handleFileSystemUpdate = useCallback((data) => {
    setFileTree(data.fileTree);
  }, []);

  const handleFileCreated = useCallback((data) => {
    toast.info(`File "${data.fileName}" created by ${data.username}`);
    loadFileSystem();
  }, []);

  const handleFileDeleted = useCallback((data) => {
    toast.info(`File "${data.fileName}" deleted by ${data.username}`);
    loadFileSystem();
  }, []);

  const handleFileRenamed = useCallback((data) => {
    toast.info(`File renamed from "${data.oldName}" to "${data.newName}" by ${data.username}`);
    loadFileSystem();
  }, []);

  const handleNodeClick = (node, event) => {
    if (node.type === 'file') {
      if (onFileSelect) {
        onFileSelect({
          ...node,
          language: getLanguageFromExtension(node.name)
        });
      }
    } else {
      // Toggle folder expansion
      const newExpanded = new Set(expandedNodes);
      if (newExpanded.has(node.id)) {
        newExpanded.delete(node.id);
      } else {
        newExpanded.add(node.id);
      }
      setExpandedNodes(newExpanded);
    }
  };

  const handleContextMenu = (event, node) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedNode(node);
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setSelectedNode(null);
  };

  const openCreateDialog = (type, parent = null) => {
    setCreateType(type);
    setNewItemParent(parent);
    setNewItemName('');
    setShowCreateDialog(true);
    closeContextMenu();
  };

  const createItem = async () => {
    if (!newItemName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const response = await fetch(`/api/files/${roomId}/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newItemName.trim(),
          type: createType,
          parentId: newItemParent?.id || null,
          content: createType === 'file' ? getDefaultContent(newItemName) : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFileTree(data.fileTree);
        toast.success(`${createType === 'file' ? 'File' : 'Folder'} created successfully`);

        // Notify other users
        if (socketService?.socket) {
          socketService.socket.emit('file-created', {
            roomId,
            fileName: newItemName,
            type: createType,
            userId: user.id,
            username: user.username
          });
        }

        if (onFileCreate) {
          onFileCreate(data.createdItem);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create item');
      }
    } catch (error) {
      console.error('Create item error:', error);
      toast.error('Error creating item');
    } finally {
      setShowCreateDialog(false);
    }
  };

  const getDefaultContent = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const templates = {
      'cpp': '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
      'c': '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
      'java': 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
      'py': 'print("Hello, World!")',
      'js': 'console.log("Hello, World!");',
      'ts': 'console.log("Hello, World!");',
      'html': '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>',
      'css': '/* CSS Styles */\nbody {\n    font-family: Arial, sans-serif;\n}',
      'json': '{\n    "name": "example",\n    "version": "1.0.0"\n}',
      'md': '# Document Title\n\nYour content here...'
    };

    return templates[extension] || '';
  };

  const deleteItem = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/files/${roomId}/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFileTree(data.fileTree);
        toast.success('Item deleted successfully');

        // Notify other users
        if (socketService?.socket) {
          socketService.socket.emit('file-deleted', {
            roomId,
            fileName: item.name,
            userId: user.id,
            username: user.username
          });
        }

        if (onFileDelete) {
          onFileDelete(item);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Delete item error:', error);
      toast.error('Error deleting item');
    } finally {
      closeContextMenu();
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const content = await readFileContent(file);

        const response = await fetch(`/api/files/${roomId}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: file.name,
            content,
            size: file.size,
            type: file.type
          })
        });

        if (response.ok) {
          toast.success(`File "${file.name}" uploaded successfully`);
        } else {
          toast.error(`Failed to upload "${file.name}"`);
        }
      } catch (error) {
        console.error('File upload error:', error);
        toast.error(`Error uploading "${file.name}"`);
      }
    }

    // Refresh file system
    await loadFileSystem();
    event.target.value = '';
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const renderTreeNode = (node, level = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedFile?.id === node.id;

    return (
      <Box key={node.id}>
        <ListItem
          button
          onClick={(e) => handleNodeClick(node, e)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          sx={{
            pl: level * 2 + 1,
            py: 0.5,
            borderRadius: 1,
            mx: 0.5,
            bgcolor: isSelected ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
            '&:hover': {
              bgcolor: isSelected ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.05)'
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            {node.type === 'folder' && (
              <IconButton
                size="small"
                sx={{ p: 0.5, mr: 0.5 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node, e);
                }}
              >
                {isExpanded ? <ExpandMore sx={{ fontSize: 16 }} /> : <ChevronRight sx={{ fontSize: 16 }} />}
              </IconButton>
            )}
            {getFileIcon(node.name, node.type === 'folder')}
          </ListItemIcon>

          <ListItemText
            primary={node.name}
            primaryTypographyProps={{
              variant: 'body2',
              sx: {
                color: isSelected ? '#4285f4' : 'rgba(255, 255, 255, 0.87)',
                fontWeight: isSelected ? 600 : 400,
                fontSize: '0.875rem'
              }
            }}
          />

          {node.type === 'file' && (
            <Chip
              size="small"
              label={getLanguageFromExtension(node.name)}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)'
              }}
            />
          )}
        </ListItem>

        {node.type === 'folder' && isExpanded && node.children && (
          <Box>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        bgcolor: '#252526',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0
      }}
    >
      {/* Header */}
      <Box sx={{
        p: 2,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.87)' }}>
          FILE EXPLORER
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="New File">
            <IconButton
              size="small"
              onClick={() => openCreateDialog('file')}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <NoteAdd sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="New Folder">
            <IconButton
              size="small"
              onClick={() => openCreateDialog('folder')}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <CreateNewFolder sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Upload File">
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <Upload sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={loadFileSystem}
              disabled={loading}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              {loading ? <CircularProgress size={16} color="inherit" /> : <Refresh sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ p: 1 }}>
        <TextField
          size="small"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: '100%',
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '0.875rem',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
              '&.Mui-focused fieldset': { borderColor: '#4285f4' }
            }
          }}
        />
      </Box>

      {/* File Tree */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {searchQuery && filteredFiles.length > 0 ? (
          <List dense>
            {filteredFiles.map(file => (
              <ListItem
                key={file.id}
                button
                onClick={() => handleNodeClick(file)}
                sx={{
                  bgcolor: selectedFile?.id === file.id ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {getFileIcon(file.name, file.type === 'folder')}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={file.fullPath}
                  primaryTypographyProps={{
                    variant: 'body2',
                    sx: { color: 'rgba(255, 255, 255, 0.87)' }
                  }}
                  secondaryTypographyProps={{
                    variant: 'caption',
                    sx: { color: 'rgba(255, 255, 255, 0.6)' }
                  }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <List dense sx={{ py: 0 }}>
            {fileTree.map(node => renderTreeNode(node))}
          </List>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={closeContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {selectedNode && [
          <MenuItem key="rename" onClick={() => {/* TODO: Implement rename */}}>
            <ListItemIcon><Edit sx={{ fontSize: 16 }} /></ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>,
          <MenuItem key="copy" onClick={() => {/* TODO: Implement copy */}}>
            <ListItemIcon><FileCopy sx={{ fontSize: 16 }} /></ListItemIcon>
            <ListItemText>Duplicate</ListItemText>
          </MenuItem>,
          <Divider key="divider1" />,
          selectedNode.type === 'folder' && [
            <MenuItem key="newfile" onClick={() => openCreateDialog('file', selectedNode)}>
              <ListItemIcon><NoteAdd sx={{ fontSize: 16 }} /></ListItemIcon>
              <ListItemText>New File</ListItemText>
            </MenuItem>,
            <MenuItem key="newfolder" onClick={() => openCreateDialog('folder', selectedNode)}>
              <ListItemIcon><CreateNewFolder sx={{ fontSize: 16 }} /></ListItemIcon>
              <ListItemText>New Folder</ListItemText>
            </MenuItem>,
            <Divider key="divider2" />
          ],
          <MenuItem key="delete" onClick={() => deleteItem(selectedNode)} sx={{ color: 'error.main' }}>
            <ListItemIcon><Delete sx={{ fontSize: 16, color: 'error.main' }} /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        ].flat().filter(Boolean)}
      </Menu>

      {/* Create Item Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)}>
        <DialogTitle>
          Create New {createType === 'file' ? 'File' : 'Folder'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={`${createType === 'file' ? 'File' : 'Folder'} Name`}
            fullWidth
            variant="outlined"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newItemName.trim()) {
                createItem();
              }
            }}
          />
          {newItemParent && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Creating in: {newItemParent.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button onClick={createItem} variant="contained" disabled={!newItemName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept=".txt,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.go,.rs,.php,.rb,.html,.css,.json,.md"
      />
    </Paper>
  );
};

export default AdvancedFileSystem;