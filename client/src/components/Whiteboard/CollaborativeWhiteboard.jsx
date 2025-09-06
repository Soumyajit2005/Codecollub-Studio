import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Transformer } from 'react-konva';
import { 
  Box, 
  IconButton, 
  ButtonGroup, 
  Slider, 
  Typography, 
  Tooltip,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel
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
  Palette
} from '@mui/icons-material';

const TOOL_TYPES = {
  PEN: 'pen',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TEXT: 'text',
  SELECT: 'select'
};

const COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
  '#800080', '#008000', '#FFC0CB', '#A52A2A'
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
  const [objects, setObjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [tool, setTool] = useState(TOOL_TYPES.PEN);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [color, setColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [cursors, setCursors] = useState(new Map());

  useEffect(() => {
    if (socket && roomId) {
      socket.emit('whiteboard-sync-request', roomId);
      
      socket.on('whiteboard-update', handleRemoteUpdate);
      socket.on('whiteboard-cleared', handleRemoteCleared);
      socket.on('whiteboard-sync', handleWhiteboardSync);
      socket.on('whiteboard-cursor', handleRemoteCursor);
      
      return () => {
        socket.off('whiteboard-update', handleRemoteUpdate);
        socket.off('whiteboard-cleared', handleRemoteCleared);
        socket.off('whiteboard-sync', handleWhiteboardSync);
        socket.off('whiteboard-cursor', handleRemoteCursor);
      };
    }
  }, [socket, roomId]);

  useEffect(() => {
    const updateSize = () => {
      const container = stageRef.current?.container();
      if (container) {
        const rect = container.getBoundingClientRect();
        setStageSize({
          width: rect.width || 800,
          height: rect.height || 600
        });
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize();
    
    return () => window.removeEventListener('resize', updateSize);
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
        color: cursorColor || '#ff0000',
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

  const broadcastUpdate = useCallback((drawData) => {
    if (socket && roomId) {
      socket.emit('whiteboard-draw', {
        roomId,
        drawData
      });
    }
  }, [socket, roomId]);

  const broadcastCursor = useCallback((position) => {
    if (socket && roomId) {
      socket.emit('whiteboard-cursor', {
        roomId,
        position,
        color
      });
    }
  }, [socket, roomId, color]);

  const handleMouseDown = (e) => {
    if (!isEnabled) return;
    
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
    }
    
    broadcastCursor(pos);
  };

  const handleMouseMove = (e) => {
    if (!isEnabled) return;
    
    const pos = e.target.getStage().getPointerPosition();
    broadcastCursor(pos);
    
    if (!isDrawing) return;
    
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

  const renderCursors = () => {
    return Array.from(cursors.entries()).map(([cursorUserId, cursor]) => (
      <Circle
        key={`cursor-${cursorUserId}`}
        x={cursor.position.x}
        y={cursor.position.y}
        radius={4}
        fill={cursor.color}
        opacity={0.7}
      />
    ));
  };

  return (
    <Box className={className} sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        sx={{ 
          p: 2, 
          mb: 1, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          flexWrap: 'wrap'
        }}
      >
        <ButtonGroup variant="outlined" size="small">
          <Tooltip title="Pen">
            <IconButton 
              onClick={() => setTool(TOOL_TYPES.PEN)}
              color={tool === TOOL_TYPES.PEN ? 'primary' : 'default'}
            >
              <Brush />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rectangle">
            <IconButton 
              onClick={() => setTool(TOOL_TYPES.RECTANGLE)}
              color={tool === TOOL_TYPES.RECTANGLE ? 'primary' : 'default'}
            >
              <Crop169 />
            </IconButton>
          </Tooltip>
          <Tooltip title="Circle">
            <IconButton 
              onClick={() => setTool(TOOL_TYPES.CIRCLE)}
              color={tool === TOOL_TYPES.CIRCLE ? 'primary' : 'default'}
            >
              <CircleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Text">
            <IconButton 
              onClick={() => setTool(TOOL_TYPES.TEXT)}
              color={tool === TOOL_TYPES.TEXT ? 'primary' : 'default'}
            >
              <TextFields />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
          <Typography variant="caption">Width:</Typography>
          <Slider
            value={strokeWidth}
            onChange={(e, value) => setStrokeWidth(value)}
            min={1}
            max={20}
            size="small"
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Palette fontSize="small" />
          {COLORS.map(c => (
            <Box
              key={c}
              onClick={() => setColor(c)}
              sx={{
                width: 20,
                height: 20,
                backgroundColor: c,
                border: color === c ? '2px solid #1976d2' : '1px solid #ccc',
                borderRadius: '50%',
                cursor: 'pointer'
              }}
            />
          ))}
        </Box>

        <ButtonGroup variant="outlined" size="small">
          <Tooltip title="Undo">
            <IconButton onClick={handleUndo} disabled={historyStep <= 0}>
              <Undo />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo">
            <IconButton onClick={handleRedo} disabled={historyStep >= history.length - 1}>
              <Redo />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear All">
            <IconButton onClick={handleClear}>
              <Clear />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save">
            <IconButton onClick={handleSave}>
              <Save />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export">
            <IconButton onClick={handleExport}>
              <Download />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      </Paper>

      <Box sx={{ flex: 1, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          ref={stageRef}
        >
          <Layer ref={layerRef}>
            {objects.map(renderObject)}
            {renderCursors()}
          </Layer>
          <Layer>
            <Transformer ref={transformerRef} />
          </Layer>
        </Stage>
      </Box>
    </Box>
  );
};

export default CollaborativeWhiteboard;