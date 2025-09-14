import React, { useState, useRef } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  Folder,
  FolderOpen,
  FileText,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit2,
  Download,
  Upload,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const FileExplorer = ({ 
  files = [], 
  onFileSelect, 
  onCreateFile, 
  roomId, 
  user, 
  socketService 
}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set(['/project']));
  const [selectedFile, setSelectedFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [createType, setCreateType] = useState('file');
  const [fileName, setFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState([]);
  const fileInputRef = useRef(null);

  // File type icons
  const getFileIcon = (fileName, isDirectory) => {
    if (isDirectory) {
      return expandedFolders.has(fileName) ? <FolderOpen size={16} /> : <Folder size={16} />;
    }
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileText size={16} style={{ color: '#f7df1e' }} />;
      case 'py':
        return <FileText size={16} style={{ color: '#3776ab' }} />;
      case 'java':
        return <FileText size={16} style={{ color: '#ed8b00' }} />;
      case 'cpp':
      case 'c':
      case 'h':
        return <FileText size={16} style={{ color: '#00599c' }} />;
      case 'cs':
        return <FileText size={16} style={{ color: '#239120' }} />;
      case 'go':
        return <FileText size={16} style={{ color: '#00add8' }} />;
      case 'rs':
        return <FileText size={16} style={{ color: '#dea584' }} />;
      case 'rb':
        return <FileText size={16} style={{ color: '#cc342d' }} />;
      case 'php':
        return <FileText size={16} style={{ color: '#777bb4' }} />;
      case 'html':
      case 'htm':
        return <FileText size={16} style={{ color: '#e34f26' }} />;
      case 'css':
        return <FileText size={16} style={{ color: '#1572b6' }} />;
      case 'json':
        return <FileText size={16} style={{ color: '#000000' }} />;
      case 'md':
        return <FileText size={16} style={{ color: '#083fa1' }} />;
      default:
        return <FileText size={16} style={{ color: '#6b7280' }} />;
    }
  };

  // Toggle folder expansion
  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  // Handle file/folder selection
  const handleSelect = (file) => {
    setSelectedFile(file);
    if (file.type === 'file') {
      onFileSelect?.(file);
    } else {
      toggleFolder(file.path);
    }
  };

  // Context menu handlers
  const handleContextMenu = (event, file) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      file
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Create file/folder dialog
  const openCreateDialog = (type) => {
    setCreateType(type);
    setFileName('');
    setShowCreateDialog(true);
    closeContextMenu();
  };

  const handleCreate = async () => {
    if (!fileName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      await onCreateFile(fileName, '', createType === 'folder');
      setShowCreateDialog(false);
      setFileName('');
      
      // Notify other users
      if (socketService?.socket) {
        socketService.socket.emit('file-created', {
          roomId,
          name: fileName,
          type: createType,
          parentPath: contextMenu?.file?.path || '/project',
          userId: user.id,
          username: user.username
        });
      }
    } catch (error) {
      toast.error('Failed to create ' + createType);
    }
  };

  // Delete file/folder
  const handleDelete = async () => {
    if (!contextMenu?.file) return;
    
    const { file } = contextMenu;
    
    try {
      const response = await fetch(`/api/files/${roomId}/virtual/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          path: file.path,
          recursive: file.type === 'directory'
        })
      });
      
      if (response.ok) {
        toast.success('Deleted successfully');
        
        // Notify other users
        if (socketService?.socket) {
          socketService.socket.emit('file-deleted', {
            roomId,
            path: file.path,
            userId: user.id,
            username: user.username
          });
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
    
    closeContextMenu();
  };

  // Rename file/folder
  const openRenameDialog = () => {
    if (!contextMenu?.file) return;
    setFileName(contextMenu.file.name);
    setShowRenameDialog(true);
    closeContextMenu();
  };

  const handleRename = async () => {
    if (!fileName.trim() || !contextMenu?.file) {
      toast.error('Please enter a valid name');
      return;
    }

    const { file } = contextMenu;
    const newPath = file.path.replace(/\/[^/]+$/, `/${fileName}`);

    try {
      const response = await fetch(`/api/files/${roomId}/virtual/rename`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          oldPath: file.path,
          newPath
        })
      });
      
      if (response.ok) {
        toast.success('Renamed successfully');
        setShowRenameDialog(false);
        setFileName('');
        
        // Notify other users
        if (socketService?.socket) {
          socketService.socket.emit('file-renamed', {
            roomId,
            oldPath: file.path,
            newPath,
            userId: user.id,
            username: user.username
          });
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to rename');
      }
    } catch (error) {
      toast.error('Failed to rename');
    }
  };

  // Download file
  const handleDownload = async () => {
    if (!contextMenu?.file) return;
    
    const { file } = contextMenu;
    
    try {
      const response = await fetch(`/api/files/${roomId}/virtual/read?path=${encodeURIComponent(file.path)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([data.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success('File downloaded');
      } else {
        toast.error('Failed to download file');
      }
    } catch (error) {
      toast.error('Failed to download file');
    }
    
    closeContextMenu();
  };

  // Upload file
  const handleUpload = () => {
    fileInputRef.current?.click();
    closeContextMenu();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      await onCreateFile(file.name, content, false);
      toast.success('File uploaded successfully');
      
      // Notify other users
      if (socketService?.socket) {
        socketService.socket.emit('file-uploaded', {
          roomId,
          name: file.name,
          content,
          userId: user.id,
          username: user.username
        });
      }
    } catch (error) {
      toast.error('Failed to upload file');
    }
    
    event.target.value = '';
  };

  // Search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredFiles([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/files/${roomId}/virtual/search?query=${encodeURIComponent(searchQuery)}&searchContent=true`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setFilteredFiles(data.results || []);
      } else {
        setFilteredFiles([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setFilteredFiles([]);
    }
  };

  // Refresh file tree
  const handleRefresh = async () => {
    try {
      const response = await fetch(`/api/files/${roomId}/virtual/tree`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        // This would trigger a parent component re-render
        toast.success('File tree refreshed');
      }
    } catch (error) {
      toast.error('Failed to refresh');
    }
  };

  // Render file tree recursively
  const renderFileTree = (fileList, level = 0) => {
    if (!fileList) return null;

    return fileList.map((file) => (
      <Box key={file.path}>
        <ListItem
          button
          selected={selectedFile?.path === file.path}
          onClick={() => handleSelect(file)}
          onContextMenu={(e) => handleContextMenu(e, file)}
          sx={{
            pl: level * 2 + 1,
            py: 0.5,
            minHeight: 32,
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.04)'
            },
            '&.Mui-selected': {
              bgcolor: 'rgba(66, 133, 244, 0.12)'
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            {file.type === 'directory' && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(file.path);
                }}
                sx={{ p: 0.25, mr: 0.5 }}
              >
                {expandedFolders.has(file.path) ? 
                  <ChevronDown size={14} /> : 
                  <ChevronRight size={14} />
                }
              </IconButton>
            )}
            {getFileIcon(file.name, file.type === 'directory')}
          </ListItemIcon>
          <ListItemText
            primary={file.name}
            primaryTypographyProps={{
              variant: 'body2',
              sx: { 
                color: 'rgba(255, 255, 255, 0.87)',
                fontSize: '0.875rem',
                fontWeight: file.type === 'directory' ? 500 : 400
              }
            }}
          />
          {file.size !== undefined && file.type === 'file' && (
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', ml: 1 }}>
              {formatFileSize(file.size)}
            </Typography>
          )}
        </ListItem>
        
        {file.type === 'directory' && expandedFolders.has(file.path) && (
          <Collapse in={expandedFolders.has(file.path)}>
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderFileTree(file.children, level + 1)}
              </motion.div>
            </AnimatePresence>
          </Collapse>
        )}
      </Box>
    ));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ 
      height: '100%', 
      bgcolor: '#252526',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 1, 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.87)', fontWeight: 600 }}>
          FILE EXPLORER
        </Typography>
        <Box>
          <Tooltip title="New File">
            <IconButton 
              size="small" 
              onClick={() => openCreateDialog('file')}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <FilePlus size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="New Folder">
            <IconButton 
              size="small" 
              onClick={() => openCreateDialog('folder')}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <FolderPlus size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ p: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: <Search size={16} style={{ marginRight: 8, color: 'rgba(255, 255, 255, 0.5)' }} />,
            sx: {
              color: 'white',
              fontSize: '0.875rem',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.23)'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.4)'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4285f4'
              }
            }
          }}
        />
      </Box>

      {/* File Tree */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List dense sx={{ py: 0 }}>
          {searchQuery && filteredFiles.length > 0 ? (
            // Search results
            <>
              <ListItem sx={{ py: 1, bgcolor: 'rgba(66, 133, 244, 0.1)' }}>
                <ListItemText
                  primary={`Search Results (${filteredFiles.length})`}
                  primaryTypographyProps={{
                    variant: 'caption',
                    sx: { color: '#4285f4', fontWeight: 600, textTransform: 'uppercase' }
                  }}
                />
              </ListItem>
              {filteredFiles.map((result, index) => (
                <ListItem
                  key={`${result.path}-${index}`}
                  button
                  onClick={() => onFileSelect?.({ ...result, type: 'file' })}
                  sx={{
                    pl: 2,
                    py: 0.5,
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.04)' }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getFileIcon(result.name, false)}
                  </ListItemIcon>
                  <ListItemText
                    primary={result.name}
                    secondary={result.type === 'content' ? `${result.matches?.length} matches` : ''}
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: { color: 'rgba(255, 255, 255, 0.87)', fontSize: '0.875rem' }
                    }}
                    secondaryTypographyProps={{
                      sx: { color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }
                    }}
                  />
                </ListItem>
              ))}
            </>
          ) : (
            // Regular file tree
            renderFileTree(files)
          )}
        </List>
      </Box>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={closeContextMenu}
        anchorReference="mouse"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => openCreateDialog('file')}>
          <ListItemIcon><FilePlus size={16} /></ListItemIcon>
          <ListItemText>New File</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => openCreateDialog('folder')}>
          <ListItemIcon><FolderPlus size={16} /></ListItemIcon>
          <ListItemText>New Folder</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleUpload}>
          <ListItemIcon><Upload size={16} /></ListItemIcon>
          <ListItemText>Upload File</ListItemText>
        </MenuItem>
        {contextMenu?.file && (
          <>
            <MenuItem onClick={openRenameDialog}>
              <ListItemIcon><Edit2 size={16} /></ListItemIcon>
              <ListItemText>Rename</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDownload} disabled={contextMenu.file.type === 'directory'}>
              <ListItemIcon><Download size={16} /></ListItemIcon>
              <ListItemText>Download</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <ListItemIcon><Trash2 size={16} color="currentColor" /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)}>
        <DialogTitle>Create New {createType === 'file' ? 'File' : 'Folder'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={`${createType === 'file' ? 'File' : 'Folder'} Name`}
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onClose={() => setShowRenameDialog(false)}>
        <DialogTitle>Rename</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="New Name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRename()}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRenameDialog(false)}>Cancel</Button>
          <Button onClick={handleRename} variant="contained">Rename</Button>
        </DialogActions>
      </Dialog>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept=".txt,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.h,.cs,.go,.rs,.rb,.php,.html,.css,.json,.md"
      />
    </Box>
  );
};

export default FileExplorer;