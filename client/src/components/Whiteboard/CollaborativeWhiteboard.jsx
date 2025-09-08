import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Transformer } from 'react-konva';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Box, 
  IconButton, 
  ButtonGroup, 
  Slider, 
  Typography, 
  Tooltip,
  Paper,
  Divider,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Fab,
  Badge
} from '@mui/material';
import {
  Brush,
  Circle as CircleIcon,
  Crop169,
  TextFields,
  Undo,
  Redo,
  Clear,
  Save,
  Download,
  Palette,
  ZoomIn,
  ZoomOut,
  ZoomOutMap,
  Settings,
  Layers,
  GridOn,
  GridOff,
  ColorLens,
  FormatShapes,
  GestureOutlined
} from '@mui/icons-material';
import {
  Pen,
  Square,
  Circle as CircleLucide,
  Type,
  Eraser,
  RotateCcw,
  RotateCw,
  Trash2,
  Download as DownloadLucide,
  Upload,
  Move,
  Hand,
  ZoomIn as ZoomInLucide,
  ZoomOut as ZoomOutLucide,
  Maximize,
  Settings as SettingsLucide,
  Users,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';

const TOOL_TYPES = {
  PEN: 'pen',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TEXT: 'text',
  ERASER: 'eraser',
  SELECT: 'select',
  HAND: 'hand'
};

const COLORS = [
  { color: '#000000', name: 'Black' },
  { color: '#FF0000', name: 'Red' },
  { color: '#00FF00', name: 'Green' },
  { color: '#0000FF', name: 'Blue' },
  { color: '#FFFF00', name: 'Yellow' },
  { color: '#FF00FF', name: 'Magenta' },
  { color: '#00FFFF', name: 'Cyan' },
  { color: '#FFA500', name: 'Orange' },
  { color: '#800080', name: 'Purple' },
  { color: '#008000', name: 'Dark Green' },
  { color: '#FFC0CB', name: 'Pink' },
  { color: '#A52A2A', name: 'Brown' },
  { color: '#808080', name: 'Gray' },
  { color: '#FFFFFF', name: 'White' }
];

const STROKE_SIZES = [
  { size: 1, name: 'Extra Fine' },
  { size: 2, name: 'Fine' },
  { size: 4, name: 'Medium' },
  { size: 6, name: 'Bold' },
  { size: 10, name: 'Extra Bold' },
  { size: 16, name: 'Marker' },
  { size: 24, name: 'Brush' }
];

const CollaborativeWhiteboard = ({ 
  socket, 
  roomId, 
  userId, 
  isEnabled = true,
  onSave,
  className 
}) => {
  const stageRef = useRef();
  const layerRef = useRef();
  const transformerRef = useRef();
  
  // Core state
  const [objects, setObjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [selectedId, setSelectedId] = useState(null);
  const [stageSize, setStageSize] = useState({ width: 1200, height: 800 });
  const [cursors, setCursors] = useState(new Map());
  
  // Tool state
  const [tool, setTool] = useState(TOOL_TYPES.PEN);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [color, setColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  
  // UI state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [colorMenuAnchor, setColorMenuAnchor] = useState(null);
  const [strokeMenuAnchor, setStrokeMenuAnchor] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCursors, setShowCursors] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  
  // Collaboration state
  const [collaborators, setCollaborators] = useState(new Map());
  const [activeUsers, setActiveUsers] = useState(new Set());

  useEffect(() => {
    if (socket && roomId) {
      socket.emit('whiteboard-sync-request', roomId);
      
      socket.on('whiteboard-update', handleRemoteUpdate);
      socket.on('whiteboard-cleared', handleRemoteCleared);
      socket.on('whiteboard-sync', handleWhiteboardSync);
      socket.on('whiteboard-cursor', handleRemoteCursor);
      socket.on('whiteboard-user-join', handleUserJoin);
      socket.on('whiteboard-user-leave', handleUserLeave);
      
      return () => {
        socket.off('whiteboard-update', handleRemoteUpdate);
        socket.off('whiteboard-cleared', handleRemoteCleared);
        socket.off('whiteboard-sync', handleWhiteboardSync);
        socket.off('whiteboard-cursor', handleRemoteCursor);
        socket.off('whiteboard-user-join', handleUserJoin);
        socket.off('whiteboard-user-leave', handleUserLeave);
      };
    }
  }, [socket, roomId]);

  useEffect(() => {
    const updateSize = () => {
      const container = stageRef.current?.container();
      if (container) {
        const rect = container.getBoundingClientRect();
        setStageSize({
          width: rect.width || 1200,
          height: rect.height || 800
        });
      }
    };

    const resizeObserver = new ResizeObserver(updateSize);
    const container = stageRef.current?.container();
    if (container) {
      resizeObserver.observe(container);
    }

    updateSize();
    
    return () => {
      if (container) {
        resizeObserver.unobserve(container);
      }
    };
  }, []);

  const saveToHistory = useCallback(() => {
    const currentState = [...objects];
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(currentState);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [objects, history, historyStep]);

  const handleRemoteUpdate = useCallback((data) => {
    const { drawData, userId: remoteUserId, username } = data;
    
    if (remoteUserId !== userId) {
      setObjects(prev => {
        const newObjects = [...prev];
        const existingIndex = newObjects.findIndex(obj => obj.id === drawData.id);
        
        if (existingIndex >= 0) {
          newObjects[existingIndex] = { ...drawData, remoteUser: username };
        } else {
          newObjects.push({ ...drawData, remoteUser: username });
        }
        
        return newObjects;
      });
    }
  }, [userId]);

  const handleRemoteCleared = useCallback((data) => {
    if (data.userId !== userId) {
      setObjects([]);
      setHistory([[]]);
      setHistoryStep(0);
    }
  }, [userId]);

  const handleWhiteboardSync = useCallback((data) => {
    if (data.drawData && Array.isArray(data.drawData)) {
      setObjects(data.drawData);
      setHistory([data.drawData]);
      setHistoryStep(0);
    }
  }, []);

  const handleRemoteCursor = useCallback((data) => {
    const { userId: remoteUserId, position, username, color: cursorColor } = data;
    setCursors(prev => {
      const newCursors = new Map(prev);
      newCursors.set(remoteUserId, {
        position,
        username,
        color: cursorColor || '#4285f4',
        timestamp: Date.now()
      });
      return newCursors;
    });

    setTimeout(() => {
      setCursors(prev => {
        const newCursors = new Map(prev);
        const cursor = newCursors.get(remoteUserId);
        if (cursor && Date.now() - cursor.timestamp >= 3000) {
          newCursors.delete(remoteUserId);
        }
        return newCursors;
      });
    }, 3000);
  }, []);

  const handleUserJoin = useCallback((data) => {
    setCollaborators(prev => new Map(prev.set(data.userId, data)));
    setActiveUsers(prev => new Set([...prev, data.userId]));
  }, []);

  const handleUserLeave = useCallback((data) => {
    setCollaborators(prev => {
      const newCollaborators = new Map(prev);
      newCollaborators.delete(data.userId);
      return newCollaborators;
    });
    setActiveUsers(prev => {
      const newActiveUsers = new Set(prev);
      newActiveUsers.delete(data.userId);
      return newActiveUsers;
    });
  }, []);

  const broadcastUpdate = useCallback((drawData) => {
    if (socket && roomId) {
      socket.emit('whiteboard-draw', {
        roomId,
        drawData
      });
    }
  }, [socket, roomId]);

  const broadcastCursor = useCallback((position) => {
    if (socket && roomId && showCursors) {
      socket.emit('whiteboard-cursor', {
        roomId,
        position,
        color
      });
    }
  }, [socket, roomId, color, showCursors]);

  const handleMouseDown = (e) => {
    if (!isEnabled || isLocked) return;
    
    const pos = e.target.getStage().getPointerPosition();
    setIsDrawing(true);
    
    const id = `${userId}-${Date.now()}-${Math.random()}`;
    
    if (tool === TOOL_TYPES.PEN) {
      const newLine = {
        id,
        type: 'line',
        points: [pos.x, pos.y],
        stroke: color,
        strokeWidth,
        tension: 0.5,
        lineCap: 'round',
        globalCompositeOperation: 'source-over'
      };
      
      setObjects(prev => [...prev, newLine]);
      broadcastUpdate(newLine);
    } else if (tool === TOOL_TYPES.RECTANGLE) {
      const newRect = {
        id,
        type: 'rectangle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: color,
        strokeWidth,
        fill: 'transparent'
      };
      
      setObjects(prev => [...prev, newRect]);
    } else if (tool === TOOL_TYPES.CIRCLE) {
      const newCircle = {
        id,
        type: 'circle',
        x: pos.x,
        y: pos.y,
        radius: 0,
        stroke: color,
        strokeWidth,
        fill: 'transparent'
      };
      
      setObjects(prev => [...prev, newCircle]);
    } else if (tool === TOOL_TYPES.ERASER) {
      // Find objects to erase at this position
      const objectsToRemove = objects.filter(obj => {
        // Simple hit detection - can be improved
        if (obj.type === 'line' && obj.points) {
          return obj.points.some((point, index) => {
            if (index % 2 === 0) {
              const x = point;
              const y = obj.points[index + 1];
              return Math.abs(x - pos.x) < strokeWidth * 2 && Math.abs(y - pos.y) < strokeWidth * 2;
            }
            return false;
          });
        }
        return false;
      });
      
      if (objectsToRemove.length > 0) {
        const newObjects = objects.filter(obj => !objectsToRemove.includes(obj));
        setObjects(newObjects);
        // Broadcast removal
        objectsToRemove.forEach(obj => {
          if (socket && roomId) {
            socket.emit('whiteboard-remove', { roomId, objectId: obj.id });
          }
        });
      }
    }
    
    broadcastCursor(pos);
  };

  const handleMouseMove = (e) => {
    if (!isEnabled) return;
    
    const pos = e.target.getStage().getPointerPosition();
    broadcastCursor(pos);
    
    if (!isDrawing || isLocked) return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    setObjects(prev => {
      const newObjects = [...prev];
      const lastObject = newObjects[newObjects.length - 1];
      
      if (tool === TOOL_TYPES.PEN && lastObject.type === 'line') {
        lastObject.points = [...lastObject.points, point.x, point.y];
        broadcastUpdate(lastObject);
      } else if (tool === TOOL_TYPES.RECTANGLE && lastObject.type === 'rectangle') {
        lastObject.width = point.x - lastObject.x;
        lastObject.height = point.y - lastObject.y;
        broadcastUpdate(lastObject);
      } else if (tool === TOOL_TYPES.CIRCLE && lastObject.type === 'circle') {
        const radius = Math.sqrt(
          Math.pow(point.x - lastObject.x, 2) + Math.pow(point.y - lastObject.y, 2)
        );
        lastObject.radius = radius;
        broadcastUpdate(lastObject);
      }
      
      return newObjects;
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    saveToHistory();
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(prev => prev - 1);
      setObjects(history[historyStep - 1] || []);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(prev => prev + 1);
      setObjects(history[historyStep + 1] || []);
    }
  };

  const handleClear = () => {
    setObjects([]);
    setHistory([[]]);
    setHistoryStep(0);
    
    if (socket && roomId) {
      socket.emit('whiteboard-clear', roomId);
    }
  };

  const handleSave = async () => {
    if (onSave) {
      const dataURL = stageRef.current.toDataURL({
        mimeType: 'image/png',
        quality: 1
      });
      onSave(dataURL, objects);
    }
  };

  const handleExport = () => {
    const dataURL = stageRef.current.toDataURL({
      mimeType: 'image/png',
      quality: 1
    });
    
    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}-${new Date().getTime()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const renderObject = (obj) => {
    switch (obj.type) {
      case 'line':
        return (
          <Line
            key={obj.id}
            points={obj.points}
            stroke={obj.stroke}
            strokeWidth={obj.strokeWidth}
            tension={obj.tension}
            lineCap={obj.lineCap}
            globalCompositeOperation={obj.globalCompositeOperation}
          />
        );
      case 'rectangle':
        return (
          <Rect
            key={obj.id}
            x={obj.x}
            y={obj.y}
            width={obj.width}
            height={obj.height}
            stroke={obj.stroke}
            strokeWidth={obj.strokeWidth}
            fill={obj.fill}
          />
        );
      case 'circle':
        return (
          <Circle
            key={obj.id}
            x={obj.x}
            y={obj.y}
            radius={obj.radius}
            stroke={obj.stroke}
            strokeWidth={obj.strokeWidth}
            fill={obj.fill}
          />
        );
      case 'text':
        return (
          <Text
            key={obj.id}
            x={obj.x}
            y={obj.y}
            text={obj.text}
            fontSize={obj.fontSize}
            fill={obj.fill}
          />
        );
      default:
        return null;
    }
  };

  const renderGrid = () => {
    if (!showGrid) return null;

    const gridSize = 20 * zoom;
    const lines = [];
    
    // Vertical lines
    for (let i = 0; i < stageSize.width / gridSize + 1; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * gridSize, 0, i * gridSize, stageSize.height]}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={1}
        />
      );
    }
    
    // Horizontal lines
    for (let i = 0; i < stageSize.height / gridSize + 1; i++) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i * gridSize, stageSize.width, i * gridSize]}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={1}
        />
      );
    }
    
    return lines;
  };

  const renderCursors = () => {
    if (!showCursors) return null;
    
    return Array.from(cursors.entries()).map(([cursorUserId, cursor]) => (
      <React.Fragment key={`cursor-${cursorUserId}`}>
        <Circle
          x={cursor.position.x}
          y={cursor.position.y}
          radius={4}
          fill={cursor.color}
          opacity={0.8}
        />
        <Text
          x={cursor.position.x + 8}
          y={cursor.position.y - 8}
          text={cursor.username}
          fontSize={12}
          fill={cursor.color}
          fontStyle="bold"
        />
      </React.Fragment>
    ));
  };

  return (
    <Box 
      className={className} 
      sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        background: '#202124',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Modern Toolbar */}
      <AnimatePresence>
        {toolbarVisible && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            <Paper 
              elevation={0}
              sx={{ 
                background: 'rgba(32, 33, 36, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 0,
                p: 1.5,
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                flexWrap: 'wrap',
                justifyContent: 'space-between'
              }}
            >
              {/* Left Section - Drawing Tools */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ButtonGroup variant="outlined" size="small">
                  {[
                    { tool: TOOL_TYPES.PEN, icon: <Pen size={18} />, tooltip: 'Pen' },
                    { tool: TOOL_TYPES.ERASER, icon: <Eraser size={18} />, tooltip: 'Eraser' },
                    { tool: TOOL_TYPES.RECTANGLE, icon: <Square size={18} />, tooltip: 'Rectangle' },
                    { tool: TOOL_TYPES.CIRCLE, icon: <CircleLucide size={18} />, tooltip: 'Circle' },
                    { tool: TOOL_TYPES.TEXT, icon: <Type size={18} />, tooltip: 'Text' },
                    { tool: TOOL_TYPES.SELECT, icon: <Move size={18} />, tooltip: 'Select' },
                    { tool: TOOL_TYPES.HAND, icon: <Hand size={18} />, tooltip: 'Pan' }
                  ].map(({ tool: toolType, icon, tooltip }) => (
                    <motion.div key={toolType} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Tooltip title={tooltip}>
                        <IconButton 
                          onClick={() => setTool(toolType)}
                          sx={{
                            color: tool === toolType ? '#4285f4' : 'rgba(255, 255, 255, 0.7)',
                            bgcolor: tool === toolType ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
                            border: tool === toolType ? '1px solid #4285f4' : '1px solid rgba(255, 255, 255, 0.2)',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.3)'
                            }
                          }}
                        >
                          {icon}
                        </IconButton>
                      </Tooltip>
                    </motion.div>
                  ))}
                </ButtonGroup>

                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }} />

                {/* Color Picker */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title="Color">
                    <IconButton
                      onClick={(e) => setColorMenuAnchor(e.currentTarget)}
                      sx={{
                        width: 32,
                        height: 32,
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        bgcolor: color,
                        '&:hover': {
                          border: '2px solid rgba(255, 255, 255, 0.5)'
                        }
                      }}
                    >
                      <ColorLens sx={{ display: 'none' }} />
                    </IconButton>
                  </Tooltip>
                  
                  {/* Stroke Width */}
                  <Tooltip title="Brush Size">
                    <IconButton
                      onClick={(e) => setStrokeMenuAnchor(e.currentTarget)}
                      sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      <Box sx={{ 
                        width: strokeWidth + 4, 
                        height: strokeWidth + 4, 
                        bgcolor: 'currentColor', 
                        borderRadius: '50%' 
                      }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Center Section - Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ButtonGroup variant="outlined" size="small">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Tooltip title="Undo">
                      <IconButton 
                        onClick={handleUndo} 
                        disabled={historyStep <= 0}
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        <RotateCcw size={18} />
                      </IconButton>
                    </Tooltip>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Tooltip title="Redo">
                      <IconButton 
                        onClick={handleRedo} 
                        disabled={historyStep >= history.length - 1}
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        <RotateCw size={18} />
                      </IconButton>
                    </Tooltip>
                  </motion.div>
                </ButtonGroup>

                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }} />

                <ButtonGroup variant="outlined" size="small">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Tooltip title="Clear All">
                      <IconButton 
                        onClick={handleClear}
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Tooltip>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Tooltip title="Export">
                      <IconButton 
                        onClick={handleExport}
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        <DownloadLucide size={18} />
                      </IconButton>
                    </Tooltip>
                  </motion.div>
                </ButtonGroup>
              </Box>

              {/* Right Section - View Controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ButtonGroup variant="outlined" size="small">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Tooltip title="Zoom In">
                      <IconButton onClick={handleZoomIn} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        <ZoomInLucide size={18} />
                      </IconButton>
                    </Tooltip>
                  </motion.div>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.7)', 
                      minWidth: '40px', 
                      textAlign: 'center' 
                    }}
                  >
                    {Math.round(zoom * 100)}%
                  </Typography>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Tooltip title="Zoom Out">
                      <IconButton onClick={handleZoomOut} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        <ZoomOutLucide size={18} />
                      </IconButton>
                    </Tooltip>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Tooltip title="Reset View">
                      <IconButton onClick={handleResetZoom} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        <Maximize size={18} />
                      </IconButton>
                    </Tooltip>
                  </motion.div>
                </ButtonGroup>

                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }} />

                {/* Collaboration Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title={`${activeUsers.size} active collaborators`}>
                    <Badge badgeContent={activeUsers.size} color="primary">
                      <Users size={18} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                    </Badge>
                  </Tooltip>
                  
                  <Tooltip title={isLocked ? 'Unlock whiteboard' : 'Lock whiteboard'}>
                    <IconButton 
                      onClick={() => setIsLocked(!isLocked)}
                      sx={{ 
                        color: isLocked ? '#f44336' : 'rgba(255, 255, 255, 0.7)' 
                      }}
                    >
                      {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Settings">
                    <IconButton 
                      onClick={() => setSettingsOpen(true)}
                      sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      <SettingsLucide size={18} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas Area */}
      <Box 
        sx={{ 
          flex: 1, 
          position: 'relative',
          overflow: 'hidden',
          cursor: tool === TOOL_TYPES.HAND ? 'grab' : 
                  tool === TOOL_TYPES.ERASER ? 'crosshair' :
                  'default'
        }}
      >
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          scaleX={zoom}
          scaleY={zoom}
          x={pan.x}
          y={pan.y}
          ref={stageRef}
        >
          <Layer>
            {showGrid && renderGrid()}
          </Layer>
          <Layer ref={layerRef}>
            {objects.map(renderObject)}
            {renderCursors()}
          </Layer>
          <Layer>
            <Transformer ref={transformerRef} />
          </Layer>
        </Stage>

        {/* Floating Toolbar Toggle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10
          }}
        >
          <Tooltip title={toolbarVisible ? 'Hide toolbar' : 'Show toolbar'}>
            <Fab
              size="small"
              onClick={() => setToolbarVisible(!toolbarVisible)}
              sx={{
                background: 'rgba(32, 33, 36, 0.9)',
                color: 'white',
                '&:hover': {
                  background: 'rgba(32, 33, 36, 1)'
                }
              }}
            >
              {toolbarVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </Fab>
          </Tooltip>
        </motion.div>

        {/* Status Bar */}
        <Paper
          elevation={0}
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: '8px',
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Typography variant="caption" sx={{ color: 'white' }}>
            Objects: {objects.length}
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
          <Typography variant="caption" sx={{ color: 'white' }}>
            Tool: {tool.charAt(0).toUpperCase() + tool.slice(1)}
          </Typography>
          {isLocked && (
            <>
              <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
              <Chip 
                label="Locked" 
                size="small" 
                color="error" 
                sx={{ 
                  height: 20,
                  '& .MuiChip-label': { fontSize: '0.7rem' }
                }} 
              />
            </>
          )}
        </Paper>
      </Box>

      {/* Color Menu */}
      <Menu
        anchorEl={colorMenuAnchor}
        open={Boolean(colorMenuAnchor)}
        onClose={() => setColorMenuAnchor(null)}
        PaperProps={{
          sx: {
            background: 'rgba(32, 33, 36, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {COLORS.map(({ color: colorValue, name }) => (
            <Tooltip key={colorValue} title={name}>
              <IconButton
                onClick={() => {
                  setColor(colorValue);
                  setColorMenuAnchor(null);
                }}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: colorValue,
                  border: color === colorValue ? '3px solid #4285f4' : '1px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    border: '2px solid rgba(255, 255, 255, 0.5)'
                  }
                }}
              />
            </Tooltip>
          ))}
        </Box>
      </Menu>

      {/* Stroke Size Menu */}
      <Menu
        anchorEl={strokeMenuAnchor}
        open={Boolean(strokeMenuAnchor)}
        onClose={() => setStrokeMenuAnchor(null)}
        PaperProps={{
          sx: {
            background: 'rgba(32, 33, 36, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          {STROKE_SIZES.map(({ size, name }) => (
            <MenuItem
              key={size}
              onClick={() => {
                setStrokeWidth(size);
                setStrokeMenuAnchor(null);
              }}
              sx={{
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: strokeWidth === size ? 'rgba(66, 133, 244, 0.1)' : 'transparent'
              }}
            >
              <Box sx={{ 
                width: size + 4, 
                height: size + 4, 
                bgcolor: 'white', 
                borderRadius: '50%' 
              }} />
              <Typography variant="body2">{name}</Typography>
            </MenuItem>
          ))}
        </Box>
      </Menu>

      {/* Settings Dialog */}
      <Dialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: {
            background: 'rgba(32, 33, 36, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white'
          }
        }}
      >
        <DialogTitle>Whiteboard Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Show Grid</Typography>
              <IconButton 
                onClick={() => setShowGrid(!showGrid)}
                sx={{ color: showGrid ? '#4285f4' : 'rgba(255, 255, 255, 0.7)' }}
              >
                {showGrid ? <GridOn /> : <GridOff />}
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Show Cursors</Typography>
              <IconButton 
                onClick={() => setShowCursors(!showCursors)}
                sx={{ color: showCursors ? '#4285f4' : 'rgba(255, 255, 255, 0.7)' }}
              >
                {showCursors ? <Eye /> : <EyeOff />}
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)} sx={{ color: 'white' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollaborativeWhiteboard;