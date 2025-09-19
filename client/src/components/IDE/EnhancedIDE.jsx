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
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
  Slider,
  Badge,
  Alert
} from '@mui/material';
import {
  Folder,
  File,
  Plus,
  Play,
  Terminal,
  Settings,
  Users,
  Shield,
  UserPlus,
  UserMinus,
  Edit3,
  Trash2,
  FolderPlus,
  FilePlus,
  Download,
  Upload,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Code,
  Palette
} from 'lucide-react';
import AceEditor from 'react-ace';

// Import ACE Editor modes and themes
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-csharp';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/mode-rust';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-text';

// Import ACE Editor themes
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/theme-terminal';
import 'ace-builds/src-noconflict/theme-solarized_dark';
import 'ace-builds/src-noconflict/theme-solarized_light';
import 'ace-builds/src-noconflict/theme-textmate';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/theme-xcode';

// Import extensions
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';

import toast from 'react-hot-toast';

const EnhancedIDE = ({ 
  roomId, 
  user, 
  socketService, 
  room,
  isAdmin,
  onCodeChange,
  onExecuteCode,
  executionResult,
  isExecuting 
}) => {
  // File System State
  const [fileTree, setFileTree] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  // IDE Settings State
  const [ideSettings, setIdeSettings] = useState({
    theme: 'monokai',
    fontSize: 14,
    tabSize: 4,
    wordWrap: false,
    autoIndent: true,
    showGutter: true,
    highlightActiveLine: true,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true
  });

  // UI State
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // File Management State
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [newFileDialog, setNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('file');

  // Admin Management State
  const [joinRequests, setJoinRequests] = useState([]);
  const [participants, setParticipants] = useState([]);

  const editorRef = useRef(null);

  // Initialize file system
  useEffect(() => {
    if (roomId) {
      loadFileTree();
      if (isAdmin) {
        loadJoinRequests();
        loadParticipants();
      }
    }
  }, [roomId, isAdmin, loadFileTree, loadJoinRequests, loadParticipants]);

  // Socket event listeners for file system
  useEffect(() => {
    if (socketService?.socket) {
      const socket = socketService.socket;
      
      socket.on('file-tree-updated', handleFileTreeUpdate);
      socket.on('file-content-changed', handleFileContentChange);
      socket.on('active-file-changed', handleActiveFileChange);
      socket.on('join-request-received', handleJoinRequestReceived);
      socket.on('participant-updated', handleParticipantUpdate);

      return () => {
        socket.off('file-tree-updated');
        socket.off('file-content-changed');
        socket.off('active-file-changed');
        socket.off('join-request-received');
        socket.off('participant-updated');
      };
    }
  }, [socketService, handleFileTreeUpdate, handleFileContentChange, handleActiveFileChange, handleJoinRequestReceived, handleParticipantUpdate]);

  const loadFileTree = useCallback(async () => {
    try {
      const response = await fetch(`/api/filesystem/${roomId}/files`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFileTree(data.fileTree);
        if (data.activeFile) {
          loadFile(data.activeFile);
        }
      } else if (response.status === 404) {
        // Initialize default files
        await initializeDefaultFiles();
      }
    } catch (error) {
      console.error('Failed to load file tree:', error);
    }
  }, [roomId]);

  const initializeDefaultFiles = async () => {
    try {
      const response = await fetch(`/api/filesystem/${roomId}/files/init`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFileTree(data.files);
        // Set the main file as active
        const mainFile = data.files.find(f => f.name === 'main.js');
        if (mainFile) {
          setActiveFile(mainFile);
          setFileContent(mainFile.content);
        }
        toast.success('Project initialized with default files');
      }
    } catch (error) {
      console.error('Failed to initialize files:', error);
      toast.error('Failed to initialize project files');
    }
  };

  const loadFile = async (fileId) => {
    const file = findFileById(fileTree, fileId);
    if (file && file.type === 'file') {
      setActiveFile(file);
      setFileContent(file.content);
      
      // Set as active file on server
      try {
        await fetch(`/api/filesystem/${roomId}/files/${fileId}/active`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        // Notify other users
        if (socketService?.socket) {
          socketService.socket.emit('active-file-changed', {
            roomId,
            fileId,
            userId: user.id,
            fileName: file.name
          });
        }
      } catch (error) {
        console.error('Failed to set active file:', error);
      }
    }
  };

  const loadJoinRequests = async () => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/join-requests`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJoinRequests(data.joinRequests);
      }
    } catch (error) {
      console.error('Failed to load join requests:', error);
    }
  };

  const loadParticipants = async () => {
    setParticipants(room?.participants || []);
  };

  const findFileById = (tree, id) => {
    for (const node of tree) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFileById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleFileTreeUpdate = useCallback((data) => {
    setFileTree(data.fileTree);
  }, []);

  const handleFileContentChange = useCallback((data) => {
    if (data.fileId === activeFile?.id && data.userId !== user.id) {
      setFileContent(data.content);
    }
  }, [activeFile, user.id]);

  const handleActiveFileChange = useCallback((data) => {
    if (data.userId !== user.id) {
      const file = findFileById(fileTree, data.fileId);
      if (file) {
        setActiveFile(file);
        setFileContent(file.content);
        toast.info(`${data.fileName} opened by another user`);
      }
    }
  }, [fileTree, user.id]);

  const handleJoinRequestReceived = useCallback((data) => {
    if (isAdmin) {
      setJoinRequests(prev => [...prev, data]);
      toast.info(`${data.user.username} requested to join`);
    }
  }, [isAdmin]);

  const handleParticipantUpdate = useCallback((data) => {
    setParticipants(data.participants);
  }, []);

  const handleCodeChange = (value) => {
    setFileContent(value);
    
    if (activeFile && socketService?.socket) {
      // Update file content
      updateFileContent(activeFile.id, value);
      
      // Notify other users
      socketService.socket.emit('file-content-changed', {
        roomId,
        fileId: activeFile.id,
        content: value,
        userId: user.id
      });
    }
    
    // Call parent's onCodeChange for compatibility
    if (onCodeChange) {
      onCodeChange(value);
    }
  };

  const updateFileContent = async (fileId, content) => {
    try {
      await fetch(`/api/filesystem/${roomId}/files/${fileId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
    } catch (error) {
      console.error('Failed to update file content:', error);
    }
  };

  const createFile = async (name, type = 'file', parentId = null) => {
    try {
      const response = await fetch(`/api/filesystem/${roomId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, type, parentId })
      });
      
      if (response.ok) {
        await loadFileTree();
        toast.success(`${type === 'file' ? 'File' : 'Folder'} created successfully`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create file');
      }
    } catch (error) {
      console.error('Failed to create file:', error);
      toast.error('Failed to create file');
    }
  };

  const deleteFile = async (fileId) => {
    try {
      const response = await fetch(`/api/filesystem/${roomId}/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        await loadFileTree();
        if (activeFile?.id === fileId) {
          setActiveFile(null);
          setFileContent('');
        }
        toast.success('File deleted successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

  const approveJoinRequest = async (requestId) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/join-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'editor' })
      });
      
      if (response.ok) {
        await loadJoinRequests();
        await loadParticipants();
        toast.success('Join request approved');
      }
    } catch (error) {
      console.error('Failed to approve join request:', error);
      toast.error('Failed to approve join request');
    }
  };

  const rejectJoinRequest = async (requestId) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/join-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Request denied by admin' })
      });
      
      if (response.ok) {
        await loadJoinRequests();
        toast.success('Join request rejected');
      }
    } catch (error) {
      console.error('Failed to reject join request:', error);
      toast.error('Failed to reject join request');
    }
  };

  const _updateParticipantPermissions = async (participantId, permissions) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/participants/${participantId}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions })
      });
      
      if (response.ok) {
        await loadParticipants();
        toast.success('Permissions updated');
      }
    } catch (error) {
      console.error('Failed to update permissions:', error);
      toast.error('Failed to update permissions');
    }
  };

  const handleExecuteCode = () => {
    if (activeFile && onExecuteCode) {
      onExecuteCode(fileContent, activeFile.language);
    }
  };

  const renderFileTree = (nodes, level = 0) => {
    return nodes.map((node) => (
      <Box key={node.id} sx={{ pl: level * 2 }}>
        <ListItem
          button
          onClick={() => {
            if (node.type === 'folder') {
              setExpandedFolders(prev => {
                const newSet = new Set(prev);
                if (newSet.has(node.id)) {
                  newSet.delete(node.id);
                } else {
                  newSet.add(node.id);
                }
                return newSet;
              });
            } else {
              loadFile(node.id);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setSelectedNode(node);
            setContextMenu({ mouseX: e.clientX, mouseY: e.clientY });
          }}
          sx={{
            py: 0.5,
            px: 1,
            borderRadius: 1,
            bgcolor: activeFile?.id === node.id ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' }
          }}
        >
          <ListItemIcon sx={{ minWidth: 24 }}>
            {node.type === 'folder' ? (
              expandedFolders.has(node.id) ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )
            ) : null}
            {node.type === 'folder' ? (
              <Folder size={16} color="#4285f4" />
            ) : (
              <File size={16} color="#e8eaed" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={node.name}
            primaryTypographyProps={{
              variant: 'body2',
              sx: { 
                color: activeFile?.id === node.id ? '#4285f4' : 'rgba(255, 255, 255, 0.87)',
                fontWeight: activeFile?.id === node.id ? 600 : 400
              }
            }}
          />
        </ListItem>
        
        {node.type === 'folder' && expandedFolders.has(node.id) && node.children && (
          <Box>
            {renderFileTree(node.children, level + 1)}
          </Box>
        )}
      </Box>
    ));
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: '#1e1e1e' }}>
      {/* File Explorer Sidebar */}
      <AnimatePresence>
        {showFileExplorer && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            <Paper
              elevation={0}
              sx={{
                width: 300,
                height: '100%',
                bgcolor: '#252526',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* File Explorer Header */}
              <Box sx={{ 
                p: 2, 
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.87)', fontWeight: 600 }}>
                  EXPLORER
                </Typography>
                <Box>
                  <Tooltip title="New File">
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setNewFileType('file');
                        setNewFileDialog(true);
                      }}
                      sx={{ color: 'rgba(255, 255, 255, 0.7)', mr: 0.5 }}
                    >
                      <FilePlus size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="New Folder">
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setNewFileType('folder');
                        setNewFileDialog(true);
                      }}
                      sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      <FolderPlus size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* File Tree */}
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <List dense sx={{ py: 1 }}>
                  {renderFileTree(fileTree)}
                </List>
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Editor Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Editor Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          px: 2, 
          py: 1,
          bgcolor: '#2d2d30',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={showFileExplorer ? 'Hide Explorer' : 'Show Explorer'}>
              <IconButton 
                size="small" 
                onClick={() => setShowFileExplorer(!showFileExplorer)}
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                <Folder size={16} />
              </IconButton>
            </Tooltip>
            
            {activeFile && (
              <Chip
                label={activeFile.name}
                size="small"
                sx={{
                  bgcolor: 'rgba(66, 133, 244, 0.1)',
                  color: '#4285f4',
                  '& .MuiChip-label': { fontSize: '0.75rem' }
                }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Execute Code">
              <IconButton
                onClick={handleExecuteCode}
                disabled={!activeFile || isExecuting}
                sx={{ 
                  color: isExecuting ? 'rgba(255, 255, 255, 0.5)' : '#34a853',
                  '&:hover': { bgcolor: 'rgba(52, 168, 83, 0.1)' }
                }}
              >
                <Play size={18} />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Terminal">
              <IconButton
                onClick={() => setShowTerminal(!showTerminal)}
                sx={{ color: showTerminal ? '#4285f4' : 'rgba(255, 255, 255, 0.7)' }}
              >
                <Terminal size={18} />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Settings">
              <IconButton
                onClick={() => setShowSettings(true)}
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                <Settings size={18} />
              </IconButton>
            </Tooltip>
            
            {isAdmin && (
              <Tooltip title="Admin Panel">
                <IconButton
                  onClick={() => setShowAdminPanel(true)}
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <Badge badgeContent={joinRequests.length} color="error">
                    <Shield size={18} />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Code Editor */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeFile ? (
            <AceEditor
              ref={editorRef}
              mode={activeFile.language === 'javascript' ? 'javascript' : 
                    activeFile.language === 'python' ? 'python' :
                    activeFile.language === 'cpp' ? 'c_cpp' :
                    activeFile.language === 'csharp' ? 'csharp' :
                    activeFile.language === 'java' ? 'java' :
                    activeFile.language === 'go' ? 'golang' :
                    activeFile.language === 'rust' ? 'rust' :
                    activeFile.language === 'html' ? 'html' :
                    activeFile.language === 'css' ? 'css' :
                    activeFile.language === 'json' ? 'json' : 'text'}
              theme={ideSettings.theme}
              value={fileContent}
              onChange={handleCodeChange}
              width="100%"
              height="100%"
              fontSize={ideSettings.fontSize}
              tabSize={ideSettings.tabSize}
              wrapEnabled={ideSettings.wordWrap}
              showGutter={ideSettings.showGutter}
              highlightActiveLine={ideSettings.highlightActiveLine}
              setOptions={{
                enableBasicAutocompletion: ideSettings.enableBasicAutocompletion,
                enableLiveAutocompletion: ideSettings.enableLiveAutocompletion,
                showLineNumbers: true,
                showPrintMargin: false,
                fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
                enableSnippets: true,
                showFoldWidgets: true,
                foldStyle: 'markbeginend',
                cursorStyle: 'ace',
                mergeUndoDeltas: true
              }}
              editorProps={{ $blockScrolling: true }}
              style={{
                fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace"
              }}
            />
          ) : (
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Code size={64} style={{ marginBottom: 16, opacity: 0.3 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  No file selected
                </Typography>
                <Typography variant="body2">
                  Select a file from the explorer to start editing
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Terminal Panel */}
        <AnimatePresence>
          {showTerminal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 200, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            >
              <Paper
                elevation={0}
                sx={{
                  height: 200,
                  bgcolor: '#1e1e1e',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  p: 2,
                  overflow: 'auto'
                }}
              >
                <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.87)', mb: 2 }}>
                  TERMINAL
                </Typography>
                
                {executionResult ? (
                  <Box>
                    {executionResult.output?.stdout && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#4caf50', 
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          mb: 1
                        }}
                      >
                        {executionResult.output.stdout}
                      </Typography>
                    )}
                    {executionResult.output?.stderr && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#f44336', 
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          mb: 1
                        }}
                      >
                        {executionResult.output.stderr}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Exit Code: {executionResult.output?.exitCode || 0} | 
                      Time: {executionResult.output?.executionTime || 0}ms
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Run code to see output here
                  </Typography>
                )}
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {selectedNode && (
          [
            <MenuItem key="rename" onClick={() => {
              setContextMenu(null);
              // Implement rename functionality
            }}>
              <ListItemIcon><Edit3 size={16} /></ListItemIcon>
              <ListItemText>Rename</ListItemText>
            </MenuItem>,
            <MenuItem key="delete" onClick={() => {
              setContextMenu(null);
              deleteFile(selectedNode.id);
            }}>
              <ListItemIcon><Trash2 size={16} /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          ]
        )}
      </Menu>

      {/* New File Dialog */}
      <Dialog open={newFileDialog} onClose={() => setNewFileDialog(false)}>
        <DialogTitle>
          Create New {newFileType === 'file' ? 'File' : 'Folder'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={`${newFileType === 'file' ? 'File' : 'Folder'} Name`}
            fullWidth
            variant="outlined"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFileDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              if (newFileName.trim()) {
                createFile(newFileName.trim(), newFileType);
                setNewFileDialog(false);
                setNewFileName('');
              }
            }}
            variant="contained"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog 
        open={showSettings} 
        onClose={() => setShowSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>IDE Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Theme</InputLabel>
              <Select
                value={ideSettings.theme}
                onChange={(e) => setIdeSettings(prev => ({ ...prev, theme: e.target.value }))}
                label="Theme"
              >
                <MenuItem value="monokai">Monokai</MenuItem>
                <MenuItem value="github">GitHub</MenuItem>
                <MenuItem value="twilight">Twilight</MenuItem>
                <MenuItem value="terminal">Terminal</MenuItem>
                <MenuItem value="solarized_dark">Solarized Dark</MenuItem>
                <MenuItem value="solarized_light">Solarized Light</MenuItem>
                <MenuItem value="textmate">TextMate</MenuItem>
                <MenuItem value="tomorrow">Tomorrow</MenuItem>
                <MenuItem value="xcode">Xcode</MenuItem>
              </Select>
            </FormControl>

            <Typography gutterBottom>Font Size: {ideSettings.fontSize}px</Typography>
            <Slider
              value={ideSettings.fontSize}
              onChange={(e, value) => setIdeSettings(prev => ({ ...prev, fontSize: value }))}
              min={8}
              max={32}
              step={1}
              marks
              sx={{ mb: 3 }}
            />

            <Typography gutterBottom>Tab Size: {ideSettings.tabSize}</Typography>
            <Slider
              value={ideSettings.tabSize}
              onChange={(e, value) => setIdeSettings(prev => ({ ...prev, tabSize: value }))}
              min={2}
              max={8}
              step={1}
              marks
              sx={{ mb: 3 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={ideSettings.wordWrap}
                  onChange={(e) => setIdeSettings(prev => ({ ...prev, wordWrap: e.target.checked }))}
                />
              }
              label="Word Wrap"
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={ideSettings.showGutter}
                  onChange={(e) => setIdeSettings(prev => ({ ...prev, showGutter: e.target.checked }))}
                />
              }
              label="Show Line Numbers"
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={ideSettings.enableBasicAutocompletion}
                  onChange={(e) => setIdeSettings(prev => ({ ...prev, enableBasicAutocompletion: e.target.checked }))}
                />
              }
              label="Basic Autocompletion"
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={ideSettings.enableLiveAutocompletion}
                  onChange={(e) => setIdeSettings(prev => ({ ...prev, enableLiveAutocompletion: e.target.checked }))}
                />
              }
              label="Live Autocompletion"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Admin Panel Dialog */}
      {isAdmin && (
        <Dialog 
          open={showAdminPanel} 
          onClose={() => setShowAdminPanel(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Room Administration</DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              {/* Join Requests Section */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Join Requests ({joinRequests.length})
              </Typography>
              
              {joinRequests.length === 0 ? (
                <Alert severity="info" sx={{ mb: 3 }}>
                  No pending join requests
                </Alert>
              ) : (
                <List sx={{ mb: 3 }}>
                  {joinRequests.map((request) => (
                    <ListItem key={request._id} divider>
                      <ListItemText
                        primary={request.user.username}
                        secondary={`Requested at: ${new Date(request.requestedAt).toLocaleString()}`}
                      />
                      <ListItemSecondaryAction>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => approveJoinRequest(request._id)}
                          sx={{ mr: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => rejectJoinRequest(request._id)}
                        >
                          Reject
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Participants Management */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Participants ({participants.length})
              </Typography>
              
              <List>
                {participants.map((participant) => (
                  <ListItem key={participant._id} divider>
                    <ListItemText
                      primary={participant.user?.username || 'Unknown User'}
                      secondary={
                        <Box>
                          <Chip size="small" label={participant.role} sx={{ mr: 1 }} />
                          <Chip 
                            size="small" 
                            label={participant.status} 
                            color={participant.status === 'approved' ? 'success' : 'default'}
                          />
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => {
                          // Open permissions dialog
                          console.log('Edit permissions for:', participant);
                        }}
                      >
                        <Settings size={16} />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAdminPanel(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default EnhancedIDE;