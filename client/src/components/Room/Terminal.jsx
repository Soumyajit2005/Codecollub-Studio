import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Tabs, 
  Tab,
  CircularProgress 
} from '@mui/material';
import { 
  Close, 
  Terminal as TerminalIcon,
  PlayArrow,
  Stop,
  Clear
} from '@mui/icons-material';

const Terminal = ({ 
  isOpen, 
  onClose, 
  executionResult, 
  isExecuting, 
  onClearOutput 
}) => {
  const terminalRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (terminalRef.current && executionResult) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [executionResult]);

  if (!isOpen) return null;

  return (
    <Paper 
      sx={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40vh',
        zIndex: 1000,
        borderRadius: '12px 12px 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#1e1e1e',
        color: '#fff'
      }}
    >
      {/* Terminal Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1,
        borderBottom: '1px solid #333',
        bgcolor: '#252526'
      }}>
        <TerminalIcon sx={{ fontSize: 20, mr: 1, color: '#00d4ff' }} />
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          textColor="inherit"
          indicatorColor="primary"
          sx={{
            minHeight: 32,
            '& .MuiTab-root': { 
              minHeight: 32, 
              fontSize: '0.8rem',
              color: '#ccc',
              '&.Mui-selected': { color: '#fff' }
            }
          }}
        >
          <Tab label="Output" />
          <Tab label="Terminal" />
        </Tabs>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <IconButton 
          size="small" 
          onClick={onClearOutput}
          sx={{ color: '#ccc', mr: 1 }}
        >
          <Clear fontSize="small" />
        </IconButton>
        
        <IconButton 
          size="small" 
          onClick={onClose}
          sx={{ color: '#ccc' }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Terminal Content */}
      <Box 
        ref={terminalRef}
        sx={{ 
          flexGrow: 1, 
          p: 2,
          overflow: 'auto',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '13px',
          lineHeight: 1.4,
          bgcolor: '#1e1e1e'
        }}
      >
        {activeTab === 0 ? (
          // Output Tab
          <Box>
            {isExecuting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CircularProgress size={16} sx={{ mr: 1, color: '#00d4ff' }} />
                <Typography variant="body2" sx={{ color: '#00d4ff' }}>
                  Executing code...
                </Typography>
              </Box>
            ) : (
              executionResult?.output && (
                <Box>
                  {/* Success Output */}
                  {executionResult.output.stdout && (
                    <Box sx={{ mb: 2 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#4caf50', 
                          display: 'block', 
                          mb: 0.5,
                          fontSize: '0.75rem'
                        }}
                      >
                        ✓ OUTPUT
                      </Typography>
                      <pre style={{ 
                        margin: 0, 
                        whiteSpace: 'pre-wrap',
                        color: '#e4e4e4',
                        background: '#252526',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #333'
                      }}>
                        {executionResult.output.stdout}
                      </pre>
                    </Box>
                  )}
                  
                  {/* Error Output */}
                  {executionResult.output.stderr && (
                    <Box sx={{ mb: 2 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#f44336', 
                          display: 'block', 
                          mb: 0.5,
                          fontSize: '0.75rem'
                        }}
                      >
                        ✗ ERROR
                      </Typography>
                      <pre style={{ 
                        margin: 0, 
                        whiteSpace: 'pre-wrap',
                        color: '#ff6b6b',
                        background: '#2d1b1b',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #5d2828'
                      }}>
                        {executionResult.output.stderr}
                      </pre>
                    </Box>
                  )}

                  {/* Execution Info */}
                  <Box sx={{ 
                    mt: 2, 
                    pt: 2, 
                    borderTop: '1px solid #333',
                    display: 'flex',
                    gap: 3,
                    fontSize: '0.75rem',
                    color: '#888'
                  }}>
                    <span>Exit Code: {executionResult.output.exitCode || 0}</span>
                    <span>Time: {executionResult.output.executionTime}ms</span>
                    <span>Memory: {executionResult.output.memoryUsed || 'N/A'}</span>
                  </Box>
                </Box>
              )
            )}
            
            {!isExecuting && !executionResult?.output && (
              <Typography sx={{ color: '#666', fontStyle: 'italic' }}>
                No output yet. Click "Run" to execute your code.
              </Typography>
            )}
          </Box>
        ) : (
          // Terminal Tab
          <Box>
            <Typography sx={{ color: '#666' }}>
              Interactive terminal coming soon...
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default Terminal;