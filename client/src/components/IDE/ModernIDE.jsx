import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Button,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Slider,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Card,
  CardContent,
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Play,
  Square,
  Terminal,
  Settings,
  Code,
  FileText,
  Folder,
  FolderPlus,
  FilePlus,
  Trash2,
  Download,
  Upload,
  Copy,
  RotateCcw,
  Minimize2,
  Save,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';

// CodeMirror 6 imports
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { php } from '@codemirror/lang-php';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

// Terminal import
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

import toast from 'react-hot-toast';
import FileExplorer from './FileExplorer';

// Language configurations with CodeMirror 6 support
const SUPPORTED_LANGUAGES = [
  { id: 63, key: 'javascript', name: 'JavaScript', extension: '.js', mode: javascript() },
  { id: 71, key: 'python', name: 'Python', extension: '.py', mode: python() },
  { id: 62, key: 'java', name: 'Java', extension: '.java', mode: java() },
  { id: 76, key: 'cpp', name: 'C++', extension: '.cpp', mode: cpp() },
  { id: 75, key: 'c', name: 'C', extension: '.c', mode: cpp() },
  { id: 51, key: 'csharp', name: 'C#', extension: '.cs', mode: javascript() },
  { id: 60, key: 'go', name: 'Go', extension: '.go', mode: go() },
  { id: 73, key: 'rust', name: 'Rust', extension: '.rs', mode: rust() },
  { id: 72, key: 'ruby', name: 'Ruby', extension: '.rb', mode: javascript() },
  { id: 68, key: 'php', name: 'PHP', extension: '.php', mode: php() }
];

const EDITOR_THEMES = [
  { key: 'light', name: 'Light', theme: undefined },
  { key: 'dark', name: 'One Dark', theme: oneDark }
];

const ModernIDE = ({ 
  roomId, 
  user, 
  socketService, 
  isAdmin: _isAdmin = false,
  initialLanguage = 'javascript'
}) => {
  // Core state
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage);
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [_executionResult, _setExecutionResult] = useState(null);

  // UI state
  const [_activeTab, _setActiveTab] = useState('code');
  const [showTerminal, setShowTerminal] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // File system state
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);

  // Editor settings
  const [editorSettings, setEditorSettings] = useState({
    theme: 'dark',
    fontSize: 14,
    tabSize: 4,
    wordWrap: true,
    lineNumbers: true,
    highlightActiveLine: true,
    autocompletion: true
  });

  // Refs
  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);
  const fitAddon = useRef(null);

  // Initialize virtual file system
  useEffect(() => {
    loadFileTree();
  }, [roomId]);

  // Socket listeners
  useEffect(() => {
    if (socketService?.socket) {
      const socket = socketService.socket;
      
      socket.on('code-execution-result', handleExecutionResult);
      socket.on('language-changed', handleLanguageChange);
      socket.on('code-updated', handleCodeUpdate);
      socket.on('file-created', handleFileCreated);
      socket.on('file-updated', handleFileUpdated);
      socket.on('file-deleted', handleFileDeleted);

      return () => {
        socket.off('code-execution-result');
        socket.off('language-changed');
        socket.off('code-updated');
        socket.off('file-created');
        socket.off('file-updated');
        socket.off('file-deleted');
      };
    }
  }, [socketService]);

  // Initialize terminal
  useEffect(() => {
    if (showTerminal && terminalRef.current && !terminalInstance.current) {
      terminalInstance.current = new XTerm({
        cursorBlink: true,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
          selection: '#264f78'
        },
        fontSize: 14,
        fontFamily: '"Cascadia Code", "Fira Code", monospace'
      });

      fitAddon.current = new FitAddon();
      terminalInstance.current.loadAddon(fitAddon.current);
      terminalInstance.current.open(terminalRef.current);
      fitAddon.current.fit();

      // Welcome message
      terminalInstance.current.writeln('Welcome to CodeCollab Studio Terminal!');
      terminalInstance.current.writeln('Execute code to see output here.');
      terminalInstance.current.writeln('');
    }
  }, [showTerminal]);

  // File system operations
  const loadFileTree = async () => {
    try {
      const response = await fetch(`/api/files/${roomId}/virtual/tree`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data.tree?.children || []);
      }
    } catch (error) {
      console.error('Failed to load file tree:', error);
    }
  };

  const createFile = async (name, content = '', isDirectory = false) => {
    try {
      const path = activeFile ? `${activeFile.path}/${name}` : `/project/${name}`;
      
      const response = await fetch(`/api/files/${roomId}/virtual/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path, content, isDirectory })
      });
      
      if (response.ok) {
        loadFileTree();
        toast.success(`${isDirectory ? 'Folder' : 'File'} created successfully`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create file');
      }
    } catch (error) {
      toast.error('Failed to create file');
    }
  };

  const saveFile = async (path, content) => {
    try {
      const response = await fetch(`/api/files/${roomId}/virtual/write`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path, content })
      });
      
      if (response.ok) {
        toast.success('File saved successfully');
        
        // Notify other users
        if (socketService?.socket) {
          socketService.socket.emit('file-updated', {
            roomId,
            path,
            content,
            userId: user.id,
            username: user.username
          });
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save file');
      }
    } catch (error) {
      toast.error('Failed to save file');
    }
  };

  const loadFile = async (path) => {
    try {
      const response = await fetch(`/api/files/${roomId}/virtual/read?path=${encodeURIComponent(path)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.content;
      }
    } catch (error) {
      console.error('Failed to load file:', error);
    }
    return '';
  };

  // Socket event handlers
  const handleExecutionResult = useCallback((result) => {
    _setExecutionResult(result);
    setIsExecuting(false);
    
    // Display result in terminal
    if (terminalInstance.current) {
      terminalInstance.current.writeln(`\\x1b[32m--- Execution Result ---\\x1b[0m`);
      if (result.output?.stdout) {
        terminalInstance.current.writeln(result.output.stdout);
      }
      if (result.output?.stderr) {
        terminalInstance.current.writeln(`\\x1b[31m${result.output.stderr}\\x1b[0m`);
      }
      terminalInstance.current.writeln(`\\x1b[36mExecution Time: ${result.output?.executionTime}ms\\x1b[0m`);
      terminalInstance.current.writeln('');
    }
    
    if (result.success) {
      toast.success('Code executed successfully!');
    } else {
      toast.error('Code execution failed');
    }
  }, []);

  const handleLanguageChange = useCallback((data) => {
    if (data.userId !== user.id) {
      setCurrentLanguage(data.language);
      toast.info(`${data.username} changed language to ${data.language}`);
    }
  }, [user.id]);

  const handleCodeUpdate = useCallback((data) => {
    if (data.userId !== user.id) {
      setCode(data.code);
    }
  }, [user.id]);

  const handleFileCreated = useCallback(() => {
    loadFileTree();
  }, []);

  const handleFileUpdated = useCallback((data) => {
    if (data.userId !== user.id && activeFile?.path === data.path) {
      setCode(data.content);
    }
  }, [user.id, activeFile]);

  const handleFileDeleted = useCallback(() => {
    loadFileTree();
  }, []);

  // IDE operations
  const executeCode = async () => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    _setExecutionResult(null);
    setShowTerminal(true);
    
    if (terminalInstance.current) {
      terminalInstance.current.clear();
      terminalInstance.current.writeln(`\\x1b[33mExecuting ${getCurrentLanguageConfig().name} code...\\x1b[0m`);
    }
    
    try {
      const response = await fetch(`/api/code/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId,
          language: currentLanguage,
          code,
          input: input.trim()
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        handleExecutionResult(result);
        
        // Broadcast to other users
        if (socketService?.socket) {
          socketService.socket.emit('code-execution-result', {
            roomId,
            result,
            userId: user.id,
            username: user.username
          });
        }
      } else {
        throw new Error(result.error || 'Execution failed');
      }
    } catch (error) {
      console.error('Code execution error:', error);
      
      const errorResult = {
        success: false,
        status: 'failed',
        output: {
          error: error.message,
          stderr: error.message,
          stdout: '',
          exitCode: 1,
          executionTime: 0
        }
      };
      
      handleExecutionResult(errorResult);
    }
  };

  const onLanguageSelect = (language) => {
    setCurrentLanguage(language);
    
    // Load language template
    loadLanguageTemplate(language);
    
    // Notify other users
    if (socketService?.socket) {
      socketService.socket.emit('language-changed', {
        roomId,
        language,
        userId: user.id,
        username: user.username
      });
    }
  };

  const loadLanguageTemplate = async (language) => {
    try {
      const response = await fetch(`/api/code/template/${language}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCode(data.template || await getDefaultTemplate(language));
      } else {
        setCode(await getDefaultTemplate(language));
      }
    } catch (error) {
      setCode(await getDefaultTemplate(language));
    }
  };

  const getDefaultTemplate = async (language) => {
    // Try to fetch from API first
    try {
      const response = await fetch(`/api/ide/template/${language}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data.template;
      }
    } catch (error) {
      console.error('Failed to fetch template from API:', error);
    }

    // Fallback templates if API fails
    const templates = {
      javascript: 'console.log("Hello, World! 🚀");',
      python: 'print("Hello, World! 🚀")',
      java: 'public class Main { public static void main(String[] args) { System.out.println("Hello, World! 🚀"); } }',
      cpp: '#include <iostream>\\nint main() { std::cout << "Hello, World! 🚀" << std::endl; return 0; }',
      c: '#include <stdio.h>\\nint main() { printf("Hello, World! 🚀\\n"); return 0; }',
      go: 'package main\\nimport "fmt"\\nfunc main() { fmt.Println("Hello, World! 🚀") }',
      rust: 'fn main() { println!("Hello, World! 🚀"); }',
      php: '<?php echo "Hello, World! 🚀"; ?>'
    };
    return templates[language] || 'console.log("Hello, World! 🚀");';
  };

  const onCodeChange = (value) => {
    setCode(value);
    
    // Auto-save if a file is open
    if (activeFile) {
      saveFile(activeFile.path, value);
    }
    
    // Notify other users
    if (socketService?.socket) {
      socketService.socket.emit('code-change', {
        roomId,
        code: value,
        language: currentLanguage,
        userId: user.id
      });
    }
  };

  const getCurrentLanguageConfig = () => {
    return SUPPORTED_LANGUAGES.find(lang => lang.key === currentLanguage) || SUPPORTED_LANGUAGES[0];
  };

  const getCurrentTheme = () => {
    return EDITOR_THEMES.find(theme => theme.key === editorSettings.theme)?.theme;
  };

  const getLanguageExtensions = () => {
    const langConfig = getCurrentLanguageConfig();
    return langConfig?.mode ? [langConfig.mode] : [];
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      bgcolor: '#1e1e1e',
      overflow: 'hidden'
    }}>
      {/* Top Toolbar */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: '#2d2d30',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          px: 2,
          py: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={currentLanguage}
                onChange={(e) => onLanguageSelect(e.target.value)}
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.23)'
                  },
                  '& .MuiSvgIcon-root': { color: 'white' }
                }}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <MenuItem key={lang.key} value={lang.key}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Code size={16} style={{ marginRight: 8 }} />
                      {lang.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Chip
              label={`Judge0 ID: ${getCurrentLanguageConfig().id}`}
              size="small"
              sx={{
                bgcolor: 'rgba(66, 133, 244, 0.1)',
                color: '#4285f4',
                fontFamily: 'monospace'
              }}
            />
          </Box>

          {/* Right Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="File Explorer">
              <IconButton
                size="small"
                onClick={() => setShowFileExplorer(!showFileExplorer)}
                sx={{ 
                  color: showFileExplorer ? '#4285f4' : 'rgba(255, 255, 255, 0.7)',
                  bgcolor: showFileExplorer ? 'rgba(66, 133, 244, 0.1)' : 'transparent'
                }}
              >
                <Folder size={18} />
              </IconButton>
            </Tooltip>

            <Tooltip title={showTerminal ? "Hide Terminal" : "Show Terminal"}>
              <IconButton
                size="small"
                onClick={() => setShowTerminal(!showTerminal)}
                sx={{ 
                  color: showTerminal ? '#4285f4' : 'rgba(255, 255, 255, 0.7)',
                  bgcolor: showTerminal ? 'rgba(66, 133, 244, 0.1)' : 'transparent'
                }}
              >
                <Terminal size={18} />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />

            <Tooltip title={isExecuting ? "Stop Execution" : "Run Code"}>
              <IconButton
                onClick={isExecuting ? () => setIsExecuting(false) : executeCode}
                disabled={!code.trim()}
                sx={{
                  color: isExecuting ? '#ea4335' : '#34a853',
                  bgcolor: isExecuting ? 'rgba(234, 67, 53, 0.1)' : 'rgba(52, 168, 83, 0.1)',
                  '&:hover': {
                    bgcolor: isExecuting ? 'rgba(234, 67, 53, 0.2)' : 'rgba(52, 168, 83, 0.2)'
                  }
                }}
              >
                {isExecuting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Play size={18} />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton
                size="small"
                onClick={() => setShowSettings(true)}
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                <Settings size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* File Explorer */}
        <AnimatePresence>
          {showFileExplorer && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '250px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              <FileExplorer
                files={files}
                onCreateFile={createFile}
                onFileSelect={async (file) => {
                  if (file.type === 'file') {
                    const content = await loadFile(file.path);
                    setCode(content);
                    setActiveFile(file);
                    
                    // Add to open files if not already open
                    if (!openFiles.find(f => f.path === file.path)) {
                      setOpenFiles(prev => [...prev, file]);
                    }
                  }
                }}
                roomId={roomId}
                user={user}
                socketService={socketService}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Open Files Tabs */}
          {openFiles.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                bgcolor: '#2d2d30',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                minHeight: 48
              }}
            >
              <Tabs
                value={activeFile?.path || false}
                onChange={(e, newValue) => {
                  const file = openFiles.find(f => f.path === newValue);
                  if (file) {
                    setActiveFile(file);
                    loadFile(file.path).then(content => setCode(content));
                  }
                }}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': { 
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-selected': { color: 'white' }
                  },
                  '& .MuiTabs-indicator': { backgroundColor: '#4285f4' }
                }}
              >
                {openFiles.map((file) => (
                  <Tab
                    key={file.path}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FileText size={16} />
                        {file.name}
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFiles(prev => prev.filter(f => f.path !== file.path));
                            if (activeFile?.path === file.path) {
                              setActiveFile(null);
                              setCode('');
                            }
                          }}
                          sx={{ ml: 1, p: 0.5, color: 'inherit' }}
                        >
                          ×
                        </IconButton>
                      </Box>
                    }
                    value={file.path}
                  />
                ))}
              </Tabs>
            </Paper>
          )}

          {/* Editor */}
          <Box sx={{ flex: 1, position: 'relative' }}>
            <CodeMirror
              value={code}
              onChange={onCodeChange}
              theme={getCurrentTheme()}
              extensions={getLanguageExtensions()}
              height="100%"
              basicSetup={{
                lineNumbers: editorSettings.lineNumbers,
                foldGutter: true,
                dropCursor: false,
                allowMultipleSelections: false,
                autocompletion: editorSettings.autocompletion,
                bracketMatching: true,
                closeBrackets: true,
                highlightActiveLine: editorSettings.highlightActiveLine,
                highlightSelectionMatches: true
              }}
              style={{
                fontSize: editorSettings.fontSize,
                height: '100%',
                fontFamily: '"Cascadia Code", "Fira Code", monospace'
              }}
            />
            
            {/* Execution Status Overlay */}
            {isExecuting && (
              <Box sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                px: 2,
                py: 1,
                borderRadius: 1,
                zIndex: 1000
              }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="caption">Executing...</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Terminal Panel */}
        <AnimatePresence>
          {showTerminal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '300px', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'absolute',
                bottom: 0,
                left: showFileExplorer ? '250px' : 0,
                right: 0,
                zIndex: 1000,
                backgroundColor: '#1e1e1e'
              }}
            >
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Terminal Header */}
                <Box sx={{ 
                  p: 1, 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: '#2d2d30'
                }}>
                  <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 600 }}>
                    TERMINAL
                  </Typography>
                  <Box>
                    <Tooltip title="Clear Terminal">
                      <IconButton 
                        size="small" 
                        onClick={() => terminalInstance.current?.clear()}
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        <RotateCcw size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Close Terminal">
                      <IconButton 
                        size="small" 
                        onClick={() => setShowTerminal(false)}
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        <Minimize2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                
                {/* Terminal Content */}
                <Box sx={{ flex: 1, p: 0 }}>
                  <div ref={terminalRef} style={{ height: '100%' }} />
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

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
              <Typography gutterBottom>Theme</Typography>
              <Select
                value={editorSettings.theme}
                onChange={(e) => setEditorSettings(prev => ({ ...prev, theme: e.target.value }))}
              >
                {EDITOR_THEMES.map((theme) => (
                  <MenuItem key={theme.key} value={theme.key}>
                    {theme.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography gutterBottom>Font Size: {editorSettings.fontSize}px</Typography>
            <Slider
              value={editorSettings.fontSize}
              onChange={(e, value) => setEditorSettings(prev => ({ ...prev, fontSize: value }))}
              min={10}
              max={24}
              step={1}
              marks
              sx={{ mb: 3 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editorSettings.lineNumbers}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, lineNumbers: e.target.checked }))}
                />
              }
              label="Line Numbers"
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editorSettings.wordWrap}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, wordWrap: e.target.checked }))}
                />
              }
              label="Word Wrap"
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editorSettings.autocompletion}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, autocompletion: e.target.checked }))}
                />
              }
              label="Autocompletion"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Input Dialog */}
      <Dialog open={!!input} onClose={() => setInput('')} maxWidth="sm" fullWidth>
        <DialogTitle>Program Input</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Enter input for your program (stdin)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInput('')}>Cancel</Button>
          <Button onClick={executeCode} variant="contained">Run</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModernIDE;