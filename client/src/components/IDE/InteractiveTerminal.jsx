import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { Clear, ContentCopy } from '@mui/icons-material';

const InteractiveTerminal = ({
  isExecuting,
  onSendInput,
  onClear,
  executionId,
  socketService,
  output
}) => {
  const [terminalLines, setTerminalLines] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

  const addTerminalLine = useCallback((content, type = 'output') => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLines(prev => [...prev, {
      id: Date.now() + Math.random(),
      content,
      type,
      timestamp
    }]);
  }, []);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // Focus input when waiting for input
  useEffect(() => {
    if (isWaitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isWaitingForInput]);

  // Display HTTP API output when it changes
  useEffect(() => {
    if (output && output.trim()) {
      setTerminalLines([]);
      addTerminalLine(output, 'output');
    }
  }, [output, addTerminalLine]);

  // Socket listeners for real-time execution updates
  useEffect(() => {
    if (!socketService?.socket || !executionId) return;

    const socket = socketService.socket;

    const handleExecutionOutput = (data) => {
      if (data.executionId === executionId) {
        addTerminalLine(data.output, 'output');
      }
    };

    const handleExecutionError = (data) => {
      if (data.executionId === executionId) {
        addTerminalLine(data.error, 'error');
      }
    };

    const handleInputRequest = (data) => {
      if (data.executionId === executionId) {
        setIsWaitingForInput(true);
        setInputPrompt(data.prompt || '');
        addTerminalLine(data.prompt || 'Enter input:', 'prompt');
      }
    };

    const handleExecutionComplete = (data) => {
      if (data.executionId === executionId) {
        setIsWaitingForInput(false);
        addTerminalLine(`\nExecution completed with exit code: ${data.exitCode}`, 'system');
        addTerminalLine(`Execution time: ${data.executionTime}ms`, 'system');
        addTerminalLine(`Memory used: ${data.memoryUsed}`, 'system');
      }
    };

    socket.on('execution-output', handleExecutionOutput);
    socket.on('execution-error', handleExecutionError);
    socket.on('execution-input-request', handleInputRequest);
    socket.on('execution-complete', handleExecutionComplete);

    return () => {
      socket.off('execution-output', handleExecutionOutput);
      socket.off('execution-error', handleExecutionError);
      socket.off('execution-input-request', handleInputRequest);
      socket.off('execution-complete', handleExecutionComplete);
    };
  }, [socketService, executionId, addTerminalLine]);

  const handleInputSubmit = (e) => {
    if (e.key === 'Enter' && isWaitingForInput) {
      const input = currentInput.trim();
      addTerminalLine(`${inputPrompt}${input}`, 'input');

      if (onSendInput) {
        onSendInput(input);
      }

      setCurrentInput('');
      setIsWaitingForInput(false);
      setInputPrompt('');
    }
  };

  const handleClear = () => {
    setTerminalLines([]);
    if (onClear) {
      onClear();
    }
  };

  const copyTerminalContent = () => {
    const content = terminalLines.map(line => line.content).join('\n');
    navigator.clipboard.writeText(content);
  };

  const getLineStyle = (type) => {
    switch (type) {
      case 'output':
        return { color: '#ecf0f1' };
      case 'error':
        return { color: '#e74c3c' };
      case 'prompt':
        return { color: '#f39c12' };
      case 'input':
        return { color: '#2ecc71' };
      case 'system':
        return { color: '#95a5a6', fontStyle: 'italic' };
      default:
        return { color: '#ecf0f1' };
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#2c3e50',
        color: '#ecf0f1',
        borderRadius: 1
      }}
    >
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1,
        borderBottom: '1px solid #34495e',
        bgcolor: '#34495e'
      }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#ecf0f1' }}>
          Interactive Terminal
        </Typography>
        <Box>
          <Tooltip title="Copy Output">
            <IconButton size="small" onClick={copyTerminalContent} sx={{ color: '#ecf0f1', mr: 0.5 }}>
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear Terminal">
            <IconButton size="small" onClick={handleClear} sx={{ color: '#ecf0f1' }}>
              <Clear fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        ref={terminalRef}
        sx={{
          flex: 1,
          p: 1,
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '0.875rem',
          lineHeight: 1.4,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {terminalLines.length === 0 && !isExecuting && (
          <Typography sx={{ color: '#95a5a6', fontStyle: 'italic' }}>
            Terminal ready. Click 'Run' to execute your code...
          </Typography>
        )}

        {terminalLines.map((line) => (
          <Box key={line.id} sx={getLineStyle(line.type)}>
            {line.content}
          </Box>
        ))}

        {isExecuting && terminalLines.length === 0 && (
          <Typography sx={{ color: '#3498db' }}>
            Starting execution...
          </Typography>
        )}

        {isWaitingForInput && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            <Box
              component="input"
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleInputSubmit}
              placeholder="Type your input and press Enter..."
              sx={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#2ecc71',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                width: '100%',
                '&::placeholder': {
                  color: '#7f8c8d'
                }
              }}
            />
            <Box sx={{
              width: '8px',
              height: '14px',
              bgcolor: '#2ecc71',
              animation: 'blink 1s infinite',
              '@keyframes blink': {
                '0%, 50%': { opacity: 1 },
                '51%, 100%': { opacity: 0 }
              }
            }} />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default InteractiveTerminal;