import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import InteractiveTerminal from './InteractiveTerminal';
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
  Chip,
  Divider,
  Slider,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Fab
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Folder,
  FolderOpen,
  InsertDriveFile,
  Add,
  Save,
  Download,
  Upload,
  Settings,
  BugReport,
  Memory,
  Timer,
  Code,
  Terminal,
  Visibility,
  VisibilityOff,
  FullscreenExit,
  Fullscreen,
  ColorLens,
  FormatSize,
  Edit,
  Delete,
  FileCopy,
  Refresh
} from '@mui/icons-material';
import AceEditor from 'react-ace';
import ace from 'ace-builds/src-noconflict/ace';

// Configure ACE base path for dynamic loading
ace.config.set('basePath', '/node_modules/ace-builds/src-noconflict/');
ace.config.set('modePath', '/node_modules/ace-builds/src-noconflict/');
ace.config.set('themePath', '/node_modules/ace-builds/src-noconflict/');
ace.config.set('workerPath', '/node_modules/ace-builds/src-noconflict/');

// Import ACE Editor modes for multiple languages
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-csharp';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/mode-rust';
import 'ace-builds/src-noconflict/mode-php';
import 'ace-builds/src-noconflict/mode-ruby';

// Import ACE Editor themes
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/theme-terminal';
import 'ace-builds/src-noconflict/theme-solarized_dark';
import 'ace-builds/src-noconflict/theme-solarized_light';

// Import extensions
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';

import toast from 'react-hot-toast';
import AdvancedFileSystem from './AdvancedFileSystem';

// Language configurations mimicking OnlineGDB
const LANGUAGE_CONFIG = {
  'c': {
    name: 'C',
    mode: 'c_cpp',
    template: `#include <stdio.h>

int main() {
    printf("Hello World");
    return 0;
}`,
    extension: '.c',
    compiler: 'GCC 9.3.0'
  },
  'cpp': {
    name: 'C++',
    mode: 'c_cpp',
    template: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World";
    return 0;
}`,
    extension: '.cpp',
    compiler: 'G++ 9.3.0'
  },
  'java': {
    name: 'Java',
    mode: 'java',
    template: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`,
    extension: '.java',
    compiler: 'OpenJDK 14.0.1'
  },
  'python': {
    name: 'Python',
    mode: 'python',
    template: `print("Hello World")`,
    extension: '.py',
    compiler: 'Python 3.8.5'
  },
  'javascript': {
    name: 'JavaScript',
    mode: 'javascript',
    template: `console.log("Hello World");`,
    extension: '.js',
    compiler: 'Node.js 14.15.4'
  },
  'csharp': {
    name: 'C#',
    mode: 'csharp',
    template: `using System;

class HelloWorld {
    static void Main() {
        Console.WriteLine("Hello World");
    }
}`,
    extension: '.cs',
    compiler: '.NET Core 3.1'
  },
  'go': {
    name: 'Go',
    mode: 'golang',
    template: `package main

import "fmt"

func main() {
    fmt.Println("Hello World")
}`,
    extension: '.go',
    compiler: 'Go 1.16'
  },
  'rust': {
    name: 'Rust',
    mode: 'rust',
    template: `fn main() {
    println!("Hello World");
}`,
    extension: '.rs',
    compiler: 'Rust 1.50.0'
  },
  'php': {
    name: 'PHP',
    mode: 'php',
    template: `<?php
echo "Hello World";
?>`,
    extension: '.php',
    compiler: 'PHP 7.4.16'
  },
  'ruby': {
    name: 'Ruby',
    mode: 'ruby',
    template: `puts "Hello World"`,
    extension: '.rb',
    compiler: 'Ruby 2.7.0'
  }
};

// OnlineGDB style themes
const THEMES = [
  { value: 'github', name: 'Light' },
  { value: 'monokai', name: 'Dark' },
  { value: 'tomorrow', name: 'Tomorrow' },
  { value: 'twilight', name: 'Twilight' },
  { value: 'terminal', name: 'Terminal' },
  { value: 'solarized_dark', name: 'Solarized Dark' },
  { value: 'solarized_light', name: 'Solarized Light' }
];

const OnlineGDB_IDE = ({
  roomId,
  user,
  socketService,
  isAdmin = false,
  initialLanguage = 'cpp'
}) => {
  // Core state
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState(LANGUAGE_CONFIG[initialLanguage]?.template || '');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState(0);
  const [memoryUsed, setMemoryUsed] = useState(0);
  const [currentExecutionId, setCurrentExecutionId] = useState(null);
  const [useInteractiveMode, setUseInteractiveMode] = useState(true);
  const terminalRef = useRef(null);

  // UI state
  const [theme, setTheme] = useState('monokai');
  const [fontSize, setFontSize] = useState(14);
  const [showInput, setShowInput] = useState(true);
  const [showOutput, setShowOutput] = useState(true);
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: Result, 1: Debug, 2: Settings
  const [showSettings, setShowSettings] = useState(false);

  // File management state
  const [fileName, setFileName] = useState('main');
  const [selectedFile, setSelectedFile] = useState(null);
  const [files, setFiles] = useState([
    { name: 'main', content: LANGUAGE_CONFIG[initialLanguage]?.template || '', active: true }
  ]);

  // Editor settings
  const [editorSettings, setEditorSettings] = useState({
    wordWrap: false,
    showGutter: true,
    highlightActiveLine: true,
    autoIndent: true,
    tabSize: 4,
    useSoftTabs: true,
    showInvisibles: false,
    displayIndentGuides: true
  });

  const editorRef = useRef(null);
  const outputRef = useRef(null);

  // File selection handlers
  const handleFileSelect = (file) => {
    if (file && file.type === 'file') {
      setSelectedFile(file);
      setCode(file.content || '');
      setFileName(file.name);
      if (file.language) {
        setLanguage(file.language);
      }
      toast.info(`Opened ${file.name}`);
    }
  };

  const handleFileCreate = (file) => {
    // Automatically select newly created file
    if (file && file.type === 'file') {
      handleFileSelect(file);
    }
  };

  const handleFileDelete = (file) => {
    // If deleted file was selected, reset to default
    if (selectedFile && selectedFile.id === file.id) {
      setSelectedFile(null);
      setCode(LANGUAGE_CONFIG[language]?.template || '');
      setFileName('main');
    }
  };

  // Handle language change
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    const config = LANGUAGE_CONFIG[newLanguage];
    if (config) {
      setCode(config.template);
      setFileName('main');
      toast.success(`Switched to ${config.name}`);
    }
  };

  // Execute code function will be defined after executeCode

  const sendInputToExecution = (input) => {
    if (currentExecutionId && socketService?.socket) {
      socketService.socket.emit('send-execution-input', {
        executionId: currentExecutionId,
        input
      });
    }
  };

  const clearTerminal = () => {
    setOutput('');
  };

  const executeCode = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first!');
      return;
    }

    if (!roomId) {
      toast.error('Room ID is required for code execution');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication token is missing. Please login again.');
      return;
    }

    setIsExecuting(true);
    setOutput('');
    setExecutionTime(0);
    setMemoryUsed(0);
    setActiveTab(0); // Switch to Result tab

    try {
      const startTime = Date.now();

      console.log('Executing code:', { language, roomId, codeLength: code.length });

      const response = await fetch('/api/ide/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          language: language.toLowerCase(),
          code: code.trim(),
          input: input || '',
          roomId: roomId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.error || `HTTP ${response.status} error`;
        console.error('Execution API error:', errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const endTime = Date.now();

      if (!result.success) {
        throw new Error(result.message || 'Code execution failed');
      }

      const executionData = result.data;

      setExecutionTime(executionData.output.executionTime || (endTime - startTime));
      setMemoryUsed(parseInt(executionData.output.memoryUsed) || 0);

      let outputText = '';

      // Handle compilation errors
      if (executionData.output.compileOutput) {
        outputText += `Compilation Output:\n${executionData.output.compileOutput}\n\n`;
      }

      // Handle stdout
      if (executionData.output.stdout) {
        outputText += `Output:\n${executionData.output.stdout}\n\n`;
      }

      // Handle stderr
      if (executionData.output.stderr) {
        outputText += `Error:\n${executionData.output.stderr}\n\n`;
      }

      // Add execution info
      outputText += `Process exited with return code ${executionData.output.exitCode || 0}\n`;
      outputText += `Execution time: ${executionData.output.executionTime}ms\n`;
      outputText += `Memory used: ${executionData.output.memoryUsed}\n`;

      setOutput(outputText || 'No output');

      // Emit to other users
      if (socketService?.socket) {
        socketService.socket.emit('code-execution-result', {
          roomId,
          result: { output: outputText, executionTime: endTime - startTime },
          userId: user.id
        });
      }

      toast.success('Code executed successfully!');

    } catch (error) {
      console.error('Execution error:', error);
      setOutput(`Execution Error: ${error.message}`);
      toast.error('Failed to execute code');
    } finally {
      setIsExecuting(false);
    }
  };

  // Interactive execution function - just use the regular execute for now
  const executeCodeInteractive = executeCode;

  // Handle code change
  const handleCodeChange = (value) => {
    setCode(value);

    // Update current file
    const updatedFiles = files.map(file =>
      file.active ? { ...file, content: value } : file
    );
    setFiles(updatedFiles);

    // Emit to other users
    if (socketService?.socket) {
      socketService.socket.emit('code-change', {
        roomId,
        code: value,
        language,
        userId: user.id
      });
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (socketService?.socket) {
      const socket = socketService.socket;

      const handleCodeUpdate = (data) => {
        if (data.userId !== user.id) {
          setCode(data.code);
          setLanguage(data.language);
        }
      };

      const handleExecutionResult = (data) => {
        if (data.userId !== user.id) {
          setOutput(data.result.output);
          setActiveTab(0);
          toast.info(`${data.username || 'Someone'} executed code`);
        }
      };

      socket.on('code-update', handleCodeUpdate);
      socket.on('code-execution-result', handleExecutionResult);

      return () => {
        socket.off('code-update');
        socket.off('code-execution-result');
      };
    }
  }, [socketService, user.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeCode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [code, language, input]);

  return (
    <Box sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header Toolbar - OnlineGDB Style */}
      <Paper
        elevation={1}
        sx={{
          p: 1,
          bgcolor: '#2c3e50',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Language Selector */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '& .MuiSelect-icon': { color: 'white' }
              }}
            >
              {Object.entries(LANGUAGE_CONFIG).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  {config.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* File Name */}
          <TextField
            size="small"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            sx={{
              width: 120,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
              }
            }}
          />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {LANGUAGE_CONFIG[language]?.extension}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Execution Info */}
          {executionTime > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Timer sx={{ fontSize: 16 }} />
                <Typography variant="caption">{executionTime}ms</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Memory sx={{ fontSize: 16 }} />
                <Typography variant="caption">{memoryUsed}KB</Typography>
              </Box>
            </Box>
          )}

          {/* Action Buttons */}
          <Tooltip title="Run (Ctrl+Enter)">
            <Button
              variant="contained"
              color="success"
              startIcon={isExecuting ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
              onClick={useInteractiveMode ? executeCodeInteractive : executeCode}
              disabled={isExecuting}
              sx={{ fontWeight: 600 }}
            >
              {isExecuting ? 'Running...' : 'Run'}
            </Button>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)', mx: 1 }} />

          <Tooltip title={showFileExplorer ? 'Hide File Explorer' : 'Show File Explorer'}>
            <IconButton
              size="small"
              onClick={() => setShowFileExplorer(!showFileExplorer)}
              sx={{ color: showFileExplorer ? '#4285f4' : 'white' }}
            >
              <Folder />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton
              size="small"
              onClick={() => setShowSettings(true)}
              sx={{ color: 'white' }}
            >
              <Settings />
            </IconButton>
          </Tooltip>

          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton
              size="small"
              onClick={() => setIsFullscreen(!isFullscreen)}
              sx={{ color: 'white' }}
            >
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* File Explorer - Left Panel */}
        <AnimatePresence>
          {showFileExplorer && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              style={{ width: '300px', height: '100%' }}
            >
              <AdvancedFileSystem
                roomId={roomId}
                user={user}
                socketService={socketService}
                onFileSelect={handleFileSelect}
                onFileCreate={handleFileCreate}
                onFileDelete={handleFileDelete}
                selectedFile={selectedFile}
                isAdmin={isAdmin}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Code Editor */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #ddd'
        }}>
          {/* Editor Header */}
          <Paper
            elevation={0}
            sx={{
              p: 1,
              bgcolor: '#ecf0f1',
              borderBottom: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Code sx={{ fontSize: 16, color: '#7f8c8d' }} />
              <Typography variant="subtitle2" sx={{ color: '#2c3e50' }}>
                {LANGUAGE_CONFIG[language]?.name} Editor
              </Typography>
              <Chip
                size="small"
                label={LANGUAGE_CONFIG[language]?.compiler}
                sx={{ bgcolor: '#3498db', color: 'white', fontSize: '0.7rem' }}
              />
            </Box>
          </Paper>

          {/* Code Editor */}
          <Box sx={{ flex: 1, position: 'relative' }}>
            <AceEditor
              ref={editorRef}
              mode={LANGUAGE_CONFIG[language]?.mode || 'c_cpp'}
              theme={theme}
              value={code}
              onChange={handleCodeChange}
              width="100%"
              height="100%"
              fontSize={fontSize}
              showPrintMargin={false}
              showGutter={editorSettings.showGutter}
              highlightActiveLine={editorSettings.highlightActiveLine}
              wrapEnabled={editorSettings.wordWrap}
              tabSize={editorSettings.tabSize}
              setOptions={{
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
                showLineNumbers: true,
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                cursorStyle: 'ace',
                mergeUndoDeltas: true,
                useSoftTabs: editorSettings.useSoftTabs,
                displayIndentGuides: editorSettings.displayIndentGuides,
                showInvisibles: editorSettings.showInvisibles
              }}
              editorProps={{ $blockScrolling: true }}
            />
          </Box>
        </Box>

        {/* Right Panel - Input/Output */}
        <Box sx={{
          width: '40%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#white'
        }}>
          {/* Input Section */}
          <AnimatePresence>
            {showInput && !useInteractiveMode && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: '30%' }}
                exit={{ height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderBottom: '1px solid #ddd'
                  }}
                >
                  <Box sx={{
                    p: 1,
                    bgcolor: '#ecf0f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #ddd'
                  }}>
                    <Typography variant="subtitle2" sx={{ color: '#2c3e50', fontWeight: 600 }}>
                      INPUT
                    </Typography>
                    <Tooltip title="Hide Input">
                      <IconButton
                        size="small"
                        onClick={() => setShowInput(false)}
                      >
                        <VisibilityOff sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <TextField
                    multiline
                    fullWidth
                    placeholder="Input goes here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        height: '100%',
                        alignItems: 'flex-start',
                        fontFamily: 'monospace',
                        '& fieldset': { border: 'none' },
                        '& textarea': {
                          height: '100% !important',
                          overflow: 'auto !important'
                        }
                      }
                    }}
                  />
                </Paper>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Output Section */}
          <Box sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: showInput && !useInteractiveMode ? '70%' : '100%'
          }}>
            {/* Output Header with Tabs */}
            <Paper
              elevation={0}
              sx={{
                bgcolor: '#ecf0f1',
                borderBottom: '1px solid #ddd'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
                <Tabs
                  value={activeTab}
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  sx={{
                    minHeight: 36,
                    '& .MuiTab-root': {
                      minHeight: 36,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#7f8c8d'
                    }
                  }}
                >
                  <Tab label="Result" />
                  <Tab label="Debug" />
                  <Tab label="Memory" />
                </Tabs>
                <Box>
                  {!showInput && (
                    <Tooltip title="Show Input">
                      <IconButton
                        size="small"
                        onClick={() => setShowInput(true)}
                      >
                        <Visibility sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Clear Output">
                    <IconButton
                      size="small"
                      onClick={() => setOutput('')}
                    >
                      <Refresh sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>

            {/* Output Content */}
            <Box sx={{ flex: 1, position: 'relative' }}>
              {activeTab === 0 && useInteractiveMode && (
                <InteractiveTerminal
                  isExecuting={isExecuting}
                  onSendInput={sendInputToExecution}
                  onClear={clearTerminal}
                  executionId={currentExecutionId}
                  socketService={socketService}
                  output={output}
                />
              )}

              {activeTab === 0 && !useInteractiveMode && (
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    p: 1,
                    bgcolor: '#2c3e50',
                    color: '#ecf0f1',
                    fontFamily: 'monospace',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.9rem'
                  }}
                >
                  {isExecuting ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
                      <CircularProgress size={20} sx={{ color: '#3498db' }} />
                      <Typography>Executing code...</Typography>
                    </Box>
                  ) : (
                    output || (
                      <Typography sx={{ color: '#95a5a6', fontStyle: 'italic' }}>
                        Press Run to execute your code...
                      </Typography>
                    )
                  )}
                </Paper>
              )}

              {activeTab === 1 && (
                <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                  <Typography variant="body2" color="text.secondary">
                    Debug information will appear here...
                  </Typography>
                </Box>
              )}

              {activeTab === 2 && (
                <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                  <Typography variant="body2" color="text.secondary">
                    Memory usage: {memoryUsed}KB
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>IDE Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            {/* Theme Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Theme</InputLabel>
              <Select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                label="Theme"
              >
                {THEMES.map(t => (
                  <MenuItem key={t.value} value={t.value}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Font Size */}
            <Typography gutterBottom>Font Size: {fontSize}px</Typography>
            <Slider
              value={fontSize}
              onChange={(e, value) => setFontSize(value)}
              min={8}
              max={24}
              step={1}
              marks
              sx={{ mb: 3 }}
            />

            {/* Editor Options */}
            <FormControlLabel
              control={
                <Switch
                  checked={editorSettings.wordWrap}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, wordWrap: e.target.checked }))}
                />
              }
              label="Word Wrap"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editorSettings.showGutter}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, showGutter: e.target.checked }))}
                />
              }
              label="Show Line Numbers"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editorSettings.highlightActiveLine}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, highlightActiveLine: e.target.checked }))}
                />
              }
              label="Highlight Active Line"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editorSettings.autoIndent}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, autoIndent: e.target.checked }))}
                />
              }
              label="Auto Indent"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OnlineGDB_IDE;