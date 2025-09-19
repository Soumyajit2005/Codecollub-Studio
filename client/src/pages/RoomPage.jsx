import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  IconButton,
  Button,
  Paper,
  Typography,
  Avatar,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Menu,
  MenuItem,
  Fab,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Switch,
  FormControlLabel,
  Slider
} from '@mui/material';
import {
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  ScreenShare,
  StopScreenShare,
  Chat,
  People,
  Code,
  Dashboard,
  CallEnd,
  MoreVert,
  Settings,
  Fullscreen,
  FullscreenExit,
  Close,
  Send,
  Brush,
  PictureInPicture,
  RecordVoiceOver,
  VolumeUp,
  VolumeOff
} from '@mui/icons-material';
import { 
  Video,
  VideoOff,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Monitor,
  MessageCircle,
  Users,
  Terminal,
  Layers,
  PhoneOff,
  Settings as SettingsIcon,
  Maximize2,
  Minimize2,
  Play,
  Square,
  ArrowLeft,
  Palette,
  Code as CodeIcon,
  Zap,
  Share2,
  UserPlus,
  Expand,
  Shrink
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import ModernIDE from '../components/IDE/ModernIDE';
import OnlineGDB_IDE from '../components/IDE/OnlineGDB_IDE';
import { useAuthStore } from '../store/authStore';
import roomService from '../services/room.service';
import socketService from '../services/socket.service';
import webrtcService from '../services/webrtc.service';
import CollaborativeWhiteboard from '../components/Whiteboard/CollaborativeWhiteboard';
import toast from 'react-hot-toast';

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const _editorRef = useRef(null);
  const localVideoRef = useRef(null);
  const _chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Determine if user is admin (for now, assume all users have admin privileges)
  // TODO: Implement proper role-based access control based on room permissions
  const isAdmin = true;

  // Room State
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Code State
  const [code, setCode] = useState('console.log("Hello, World!");');
  const [language, setLanguage] = useState('javascript');
  const [_isExecuting, _setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  
  // UI Layout State - Meet-style views
  const [viewMode, setViewMode] = useState('meet'); // 'meet', 'code', 'whiteboard', 'split'
  const [sidePanel, setSidePanel] = useState(null); // 'chat', 'participants', 'settings'
  const [_isFullscreen, _setIsFullscreen] = useState(false);
  const [_toolbarVisible, _setToolbarVisible] = useState(true);
  const [floatingPanels, setFloatingPanels] = useState({
    code: false,
    whiteboard: false,
    terminal: false
  });
  
  // Video State
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [_dominantSpeaker, _setDominantSpeaker] = useState(null);
  const [_gridLayout, _setGridLayout] = useState('gallery'); // 'gallery', 'speaker', 'sidebar'
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [cameraStream, setCameraStream] = useState(null); // Store camera stream separately
  
  // Chat State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Settings State
  const [_settings, _setSettings] = useState({
    audioInputDevice: 'default',
    videoInputDevice: 'default',
    audioOutputDevice: 'default',
    backgroundBlur: false,
    virtualBackground: false,
    autoGainControl: true,
    noiseSuppression: true,
    echoCancellation: true
  });

  // Initialize room
  useEffect(() => {
    const initializeRoom = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('=== ROOM INITIALIZATION START ===');
        console.log('Room ID:', roomId);
        console.log('User:', user);
        
        // First get room data
        console.log('1. Loading room data...');
        const roomData = await roomService.getRoom(roomId);
        console.log('2. Room data loaded successfully:', roomData);
        
        // Set initial room state
        setRoom(roomData);
        const initialCode = roomData.code || 'console.log("Hello, World!");';
        const initialLanguage = roomData.language || 'javascript';
        
        setCode(initialCode);
        setLanguage(initialLanguage);
        
        console.log('3. Room state set - Code:', initialCode.substring(0, 50) + '...', 'Language:', initialLanguage);
        
        // Connect to socket
        console.log('4. Connecting to socket...');
        const token = localStorage.getItem('token');
        const socket = socketService.connect(token);
        console.log('5. Socket service connected, socket status:', socket.connected);
        
        // Setup listeners immediately
        console.log('6. Setting up socket listeners...');
        setupSocketListeners();
        
        // Simpler approach - force connection and join
        const forceRoomJoin = () => {
          console.log('7. Forcing room join...');
          if (socketService.isConnected()) {
            console.log('8. Socket is connected, joining room...');
            socketService.joinRoom(roomId);
            
            // Request sync after joining
            setTimeout(() => {
              console.log('9. Requesting whiteboard sync...');
              socketService.requestWhiteboardSync(roomId);
            }, 1000);
          } else {
            console.log('8. Socket not connected yet, waiting...');
            setTimeout(forceRoomJoin, 500);
          }
        };
        
        // Start the join process
        forceRoomJoin();
        
        // Initialize WebRTC
        console.log('10. Initializing WebRTC...');
        webrtcService.initialize(socket, roomId, user.id);
        setupWebRTCCallbacks();
        
        console.log('=== ROOM INITIALIZATION COMPLETE ===');
        
      } catch (err) {
        console.error('=== ROOM INITIALIZATION FAILED ===', err);
        setError(`Failed to load room: ${err.message || 'Unknown error'}`);
      } finally {
        // Only set loading to false after everything is set up
        setTimeout(() => {
          console.log('11. Setting loading to false...');
          setLoading(false);
        }, 1500); // Give more time for socket events to process
      }
    };

    if (roomId && user) {
      console.log('Starting room initialization...');
      initializeRoom();
    } else {
      console.log('Missing roomId or user:', { roomId, user });
    }

    return () => {
      try {
        console.log('Cleaning up room...');
        if (socketService.isConnected()) {
          socketService.leaveRoom(roomId);
        }
        webrtcService.endCall();
        socketService.disconnect();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    };
  }, [roomId, user?.id]); // Only depend on user ID to prevent unnecessary re-renders

  const setupSocketListeners = () => {
    const socket = socketService.socket;
    if (!socket) return;
    
    console.log('Setting up socket listeners...');
    
    // Remove existing listeners to prevent duplicates
    socket.off('code-sync');
    socket.off('code-update');
    socket.off('execution-result');
    socket.off('new-message');
    socket.off('user-joined');
    socket.off('user-left');
    socket.off('room-participants');
    socket.off('room-participants-updated');
    socket.off('error');
    socket.off('whiteboard-update');
    socket.off('whiteboard-cleared');
    socket.off('whiteboard-sync');
    
    // Setup new listeners
    socket.on('code-sync', handleCodeSync);
    socket.on('code-update', handleCodeUpdate);
    socket.on('execution-result', handleExecutionResult);
    socket.on('new-message', handleNewMessage);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('room-participants', handleRoomParticipants);
    socket.on('room-participants-updated', handleRoomParticipants);
    socket.on('error', handleSocketError);
    
    // Whiteboard events
    socket.on('whiteboard-update', handleWhiteboardUpdate);
    socket.on('whiteboard-cleared', handleWhiteboardCleared);
    socket.on('whiteboard-sync', handleWhiteboardSync);
  };

  const setupWebRTCCallbacks = () => {
    webrtcService.setCallbacks({
      onLocalStream: (stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // Store camera stream separately for PiP mode during screen sharing
        if (!stream.getVideoTracks()[0].label.includes('screen')) {
          setCameraStream(stream);
        }
      },
      onRemoteStream: (stream, userId) => {
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.set(userId, stream);
          return newStreams;
        });
      },
      onPeerDisconnected: (userId) => {
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.delete(userId);
          return newStreams;
        });
      },
      onScreenShare: (stream, isLocal = false) => {
        if (isLocal && localVideoRef.current) {
          // Show the shared screen in local preview
          localVideoRef.current.srcObject = stream;
          // Enable Picture-in-Picture mode for camera feed
          setIsPiPMode(true);
          toast.success('Screen sharing started - you can see your shared screen');
        } else if (!isLocal) {
          // Handle remote screen shares
          toast.info(`Someone started sharing their screen`);
        }
      },
      onScreenShareStopped: () => {
        // Disable Picture-in-Picture mode
        setIsPiPMode(false);
        toast.info('Screen sharing stopped');
      },
      onError: (error) => {
        toast.error(error);
      }
    });
  };

  const handleCodeUpdate = useCallback((data) => {
    if (data.userId !== user.id) {
      setCode(data.code);
      setLanguage(data.language);
    }
  }, [user.id]);

  const handleExecutionResult = useCallback((result) => {
    setExecutionResult(result);
    _setIsExecuting(false);
    setFloatingPanels(prev => ({ ...prev, terminal: true }));
  }, []);

  const handleNewMessage = useCallback((message) => {
    setMessages(prev => {
      if (prev.some(msg => msg.id === message.id)) {
        return prev;
      }
      const newMessages = [...prev, message];
      
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
      if (sidePanel !== 'chat' && message.username !== user.username) {
        setUnreadMessages(prev => prev + 1);
      }
      
      return newMessages;
    });
  }, [sidePanel, user.username]);

  const handleUserJoined = useCallback((userData) => {
    console.log('👋 User joined:', userData);
    setParticipants(prev => [...prev.filter(p => p.userId !== userData.userId), userData]);
    setOnlineUsers(prev => new Set([...prev, userData.userId]));
    toast.success(`${userData.username} joined the meeting`);
  }, []);

  const handleUserLeft = useCallback((userData) => {
    console.log('👋 User left:', userData);
    setParticipants(prev => prev.filter(p => p.userId !== userData.userId));
    setOnlineUsers(prev => {
      const newUsers = new Set(prev);
      newUsers.delete(userData.userId);
      return newUsers;
    });
    toast.info(`${userData.username} left the meeting`);
  }, []);

  const handleRoomParticipants = useCallback((participantsData) => {
    console.log('🏠 Room participants received:', participantsData);
    
    // Ensure we have valid participant data
    const validParticipants = Array.isArray(participantsData) 
      ? participantsData.filter(p => p && p.userId && p.username)
      : [];
    
    // Remove duplicates based on userId
    const uniqueParticipants = validParticipants.reduce((acc, current) => {
      const exists = acc.find(p => p.userId === current.userId);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    console.log('🏠 Setting unique participants:', uniqueParticipants);
    setParticipants(uniqueParticipants);
    setOnlineUsers(new Set(uniqueParticipants.map(p => p.userId)));
  }, []);

  const handleCodeSync = useCallback((data) => {
    console.log('💻 Code sync received:', data);
    if (data.code !== undefined) {
      setCode(data.code);
      console.log('✅ Code updated from sync:', data.code.substring(0, 50) + '...');
    }
    if (data.language) {
      setLanguage(data.language);
      console.log('✅ Language updated from sync:', data.language);
    }
  }, []);

  const handleSocketError = useCallback((error) => {
    console.error('Socket error:', error);
    toast.error(error.message || 'Connection error occurred');
  }, []);

  const handleWhiteboardUpdate = useCallback((data) => {
    // Handle whiteboard updates from other users
    console.log('Whiteboard update received:', data);
  }, []);

  const handleWhiteboardCleared = useCallback((data) => {
    // Handle whiteboard clear from other users
    console.log('Whiteboard cleared by:', data.username);
  }, []);

  const handleWhiteboardSync = useCallback((data) => {
    // Handle whiteboard synchronization when joining
    console.log('Whiteboard sync received:', data);
  }, []);

  const _handleCodeChange = (value) => {
    setCode(value);
    if (socketService.socket) {
      socketService.socket.emit('code-change', {
        roomId,
        code: value,
        language,
        userId: user.id
      });
    }
  };

  const _executeCode = async () => {
    _setIsExecuting(true);
    setExecutionResult(null);
    setFloatingPanels(prev => ({ ...prev, terminal: true }));

    try {
      const languageMap = {
        'javascript': 'node',
        'python': 'python3',
        'cpp': 'cpp',
        'java': 'java',
        'go': 'go',
        'rust': 'rust'
      };

      const requestData = {
        language: languageMap[language] || 'node',
        version: '*',
        files: [{ name: 'main', content: code }],
        stdin: "",
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1
      };

      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      const executionResult = {
        output: {
          stdout: result.run?.stdout || '',
          stderr: result.run?.stderr || result.compile?.stderr || '',
          exitCode: result.run?.code || 0,
          executionTime: Math.round((result.run?.runtime || 0) * 1000)
        }
      };

      setExecutionResult(executionResult);
      toast.success('Code executed successfully!');
      
      if (socketService.socket) {
        socketService.socket.emit('execution-result', {
          roomId,
          result: executionResult,
          userId: user.id
        });
      }

    } catch (error) {
      console.error('Code execution failed:', error);
      const errorResult = {
        output: {
          stderr: `Execution failed: ${error.message}`,
          exitCode: 1,
          executionTime: 0
        }
      };
      setExecutionResult(errorResult);
      toast.error('Failed to execute code');
    } finally {
      _setIsExecuting(false);
    }
  };

  const toggleVideo = async () => {
    try {
      if (!isVideoOn) {
        await webrtcService.startVideoCall();
        setIsVideoOn(true);
      } else {
        webrtcService.endCall();
        setIsVideoOn(false);
      }
    } catch (_error) {
      toast.error('Failed to toggle video');
    }
  };

  const toggleAudio = () => {
    const isMuted = webrtcService.toggleMute();
    setIsAudioOn(!isMuted);
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await webrtcService.startScreenShare();
        setIsScreenSharing(true);
      } else {
        webrtcService.stopScreenShare();
        setIsScreenSharing(false);
      }
    } catch (_error) {
      toast.error('Failed to toggle screen sharing');
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && socketService.socket) {
      const messageData = {
        id: Date.now() + Math.random(),
        roomId,
        message: newMessage.trim(),
        type: 'text',
        username: user.username,
        userId: user.id,
        timestamp: new Date().toISOString()
      };
      
      socketService.socket.emit('chat-message', messageData);
      setNewMessage('');
    }
  };

  const toggleSidePanel = (panel) => {
    setSidePanel(current => current === panel ? null : panel);
    if (panel === 'chat') {
      setUnreadMessages(0);
    }
  };

  const toggleFloatingPanel = (panel) => {
    setFloatingPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };

  if (loading) {
    return (
      <Box 
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={0}
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 300
            }}
          >
            <CircularProgress size={60} sx={{ color: 'white', mb: 3 }} />
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
              Joining meeting...
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mt: 1, textAlign: 'center' }}>
              Setting up your collaborative workspace
            </Typography>
          </Paper>
        </motion.div>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          p: 2
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Paper
            elevation={0}
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              p: 4,
              maxWidth: 600,
              textAlign: 'center'
            }}
          >
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: '12px',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                color: 'white',
                '& .MuiAlert-icon': {
                  color: '#ff6b6b'
                }
              }}
            >
              {error}
            </Alert>
            <Button
              variant="contained"
              startIcon={<ArrowLeft size={20} />}
              onClick={() => navigate('/dashboard')}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none'
              }}
            >
              Back to Dashboard
            </Button>
          </Paper>
        </motion.div>
      </Box>
    );
  }

  // Debug state
  console.log('🔍 Current state:', { 
    loading, error, room: !!room, 
    code: code?.substring(0, 20) + '...', 
    language, participants: participants.length,
    roomId 
  });

  // Main Meet Interface
  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#202124',
      color: 'white',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Modern Header Bar */}
      <AnimatePresence>
        {toolbarVisible && (
          <motion.div
            initial={{ y: -60 }}
            animate={{ y: 0 }}
            exit={{ y: -60 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            <Paper
              elevation={0}
              sx={{
                background: 'rgba(32, 33, 36, 0.95)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: 1000,
                position: 'relative'
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                px: 3,
                py: 1.5
              }}>
                {/* Left Section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <IconButton 
                      onClick={() => navigate('/dashboard')}
                      sx={{ color: 'rgba(255,255,255,0.8)' }}
                    >
                      <ArrowLeft size={20} />
                    </IconButton>
                  </motion.div>
                  
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                      {room?.name}
                      {isScreenSharing && (
                        <Chip
                          size="small"
                          icon={<Monitor size={14} />}
                          label="Sharing Screen"
                          sx={{
                            ml: 2,
                            background: 'linear-gradient(135deg, #4285f4 0%, #1976d2 100%)',
                            color: 'white',
                            '& .MuiChip-icon': { color: 'white' }
                          }}
                        />
                      )}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      {participants.length} participants
                    </Typography>
                  </Box>
                </Box>

                {/* Center - View Mode Toggles */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[
                    { icon: <Users size={18} />, mode: 'meet', label: 'Meet View' },
                    { icon: <CodeIcon size={18} />, mode: 'code', label: 'Code View' },
                    { icon: <Palette size={18} />, mode: 'whiteboard', label: 'Whiteboard' },
                    { icon: <Layers size={18} />, mode: 'split', label: 'Split View' }
                  ].map((item) => (
                    <motion.div key={item.mode} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Tooltip title={item.label}>
                        <IconButton
                          onClick={() => setViewMode(item.mode)}
                          sx={{
                            color: viewMode === item.mode ? '#4285f4' : 'rgba(255,255,255,0.7)',
                            bgcolor: viewMode === item.mode ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.1)'
                            }
                          }}
                        >
                          {item.icon}
                        </IconButton>
                      </Tooltip>
                    </motion.div>
                  ))}
                </Box>

                {/* Right Section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ 
                    color: 'rgba(255,255,255,0.6)',
                    mr: 2,
                    fontFamily: 'monospace'
                  }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                  
                  <Tooltip title="Settings">
                    <IconButton 
                      onClick={() => toggleSidePanel('settings')}
                      sx={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      <SettingsIcon size={18} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Primary Content */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative'
        }}>
          {/* Video Grid for Meet View */}
          {viewMode === 'meet' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ flex: 1, padding: '20px', position: 'relative' }}
            >
              {/* Video Grid */}
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: remoteStreams.size === 0 ? '1fr' : 
                                   remoteStreams.size <= 4 ? 'repeat(2, 1fr)' : 
                                   'repeat(3, 1fr)',
                gap: 2,
                height: '100%',
                maxHeight: 'calc(100vh - 200px)'
              }}>
                {/* Local Video */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      height: '100%',
                      minHeight: '200px',
                      background: '#000',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      position: 'relative',
                      border: isScreenSharing ? '3px solid #34a853' : 
                             dominantSpeaker === user.id ? '3px solid #4285f4' : 
                             '1px solid rgba(255,255,255,0.1)',
                      transition: 'border 0.3s ease',
                      animation: isScreenSharing ? 'pulse 2s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%': { boxShadow: '0 0 0 0 rgba(52, 168, 83, 0.7)' },
                        '70%': { boxShadow: '0 0 0 10px rgba(52, 168, 83, 0)' },
                        '100%': { boxShadow: '0 0 0 0 rgba(52, 168, 83, 0)' }
                      }
                    }}
                  >
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <Box sx={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      background: 'rgba(0,0,0,0.7)',
                      borderRadius: '8px',
                      px: 1.5,
                      py: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}>
                      <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                        {user.username} (You) {isScreenSharing && '📺'}
                      </Typography>
                      {!isAudioOn && <MicOffIcon size={12} color="#ff6b6b" />}
                      {isScreenSharing && (
                        <Typography variant="caption" sx={{ color: '#4285f4', fontWeight: 600, ml: 0.5 }}>
                          Sharing
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </motion.div>

                {/* Remote Videos */}
                <AnimatePresence>
                  {Array.from(remoteStreams.entries()).map(([userId, stream], index) => {
                    const participant = participants.find(p => p.userId === userId);
                    return (
                      <motion.div
                        key={userId}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            height: '100%',
                            minHeight: '200px',
                            background: '#000',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            position: 'relative',
                            border: dominantSpeaker === userId ? '3px solid #4285f4' : '1px solid rgba(255,255,255,0.1)',
                            transition: 'border 0.3s ease'
                          }}
                        >
                          <video
                            autoPlay
                            playsInline
                            ref={(el) => {
                              if (el && stream) el.srcObject = stream;
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <Box sx={{
                            position: 'absolute',
                            bottom: 12,
                            left: 12,
                            background: 'rgba(0,0,0,0.7)',
                            borderRadius: '8px',
                            px: 1.5,
                            py: 0.5
                          }}>
                            <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                              {participant?.username || `User ${userId.slice(-4)}`}
                            </Typography>
                          </Box>
                        </Paper>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </Box>
            </motion.div>
          )}

          {/* OnlineGDB-style IDE View */}
          {viewMode === 'code' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <OnlineGDB_IDE
                roomId={roomId}
                user={user}
                socketService={socketService}
                isAdmin={isAdmin}
                initialLanguage="cpp"
              />
            </motion.div>
          )}

          {/* Whiteboard View */}
          {viewMode === 'whiteboard' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ flex: 1, padding: '20px' }}
            >
              <CollaborativeWhiteboard
                socket={socketService.socket}
                roomId={roomId}
                userId={user.id}
                isEnabled={true}
                onSave={(dataURL, objects) => {
                  console.log('Whiteboard saved:', objects.length, 'objects');
                }}
                className="h-full"
              />
            </motion.div>
          )}

          {/* Split View */}
          {viewMode === 'split' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex' }}
            >
              {/* Left: OnlineGDB-style IDE */}
              <Box sx={{ width: '50%', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                <OnlineGDB_IDE
                  roomId={roomId}
                  user={user}
                  socketService={socketService}
                  isAdmin={isAdmin}
                  initialLanguage="cpp"
                />
              </Box>
              
              {/* Right: Whiteboard */}
              <Box sx={{ width: '50%' }}>
                <CollaborativeWhiteboard
                  socket={socketService.socket}
                  roomId={roomId}
                  userId={user.id}
                  isEnabled={true}
                  className="h-full"
                />
              </Box>
            </motion.div>
          )}
        </Box>

        {/* Side Panel */}
        <AnimatePresence>
          {sidePanel && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <Paper
                elevation={0}
                sx={{
                  width: 350,
                  height: '100%',
                  background: 'rgba(32, 33, 36, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderLeft: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Panel Header */}
                <Box sx={{ 
                  p: 2, 
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {sidePanel === 'chat' ? '💬 Chat' : 
                     sidePanel === 'participants' ? '👥 Participants' : 
                     '⚙️ Settings'}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => setSidePanel(null)}
                    sx={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    <Close size={18} />
                  </IconButton>
                </Box>

                {/* Chat Panel */}
                {sidePanel === 'chat' && (
                  <>
                    <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                      {messages.length === 0 ? (
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          color: 'rgba(255,255,255,0.6)'
                        }}>
                          <MessageCircle size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                          <Typography variant="body2" sx={{ textAlign: 'center' }}>
                            No messages yet.<br />Start the conversation!
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {messages.map((message, index) => (
                            <Box key={message.id || index} sx={{ 
                              display: 'flex',
                              justifyContent: message.username === user.username ? 'flex-end' : 'flex-start',
                              mb: 1
                            }}>
                              <Box sx={{ 
                                maxWidth: '70%',
                                background: message.username === user.username ? 
                                  '#4285f4' : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                borderRadius: '12px',
                                p: 1.5,
                                wordBreak: 'break-word'
                              }}>
                                {message.username !== user.username && (
                                  <Typography variant="caption" sx={{ 
                                    color: 'rgba(255,255,255,0.7)',
                                    fontWeight: 600,
                                    display: 'block',
                                    mb: 0.5
                                  }}>
                                    {message.username}
                                  </Typography>
                                )}
                                <Typography variant="body2">
                                  {message.message}
                                </Typography>
                                <Typography variant="caption" sx={{ 
                                  color: 'rgba(255,255,255,0.5)',
                                  fontSize: '0.7rem',
                                  float: 'right',
                                  mt: 0.5
                                }}>
                                  {new Date(message.timestamp).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                          <div ref={messagesEndRef} />
                        </Box>
                      )}
                    </Box>
                    
                    <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                        <TextField
                          fullWidth
                          multiline
                          maxRows={3}
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              background: 'rgba(255,255,255,0.1)',
                              color: 'white',
                              borderRadius: '12px',
                              '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                              '&.Mui-focused fieldset': { borderColor: '#4285f4' }
                            }
                          }}
                        />
                        <IconButton 
                          onClick={sendMessage}
                          disabled={!newMessage.trim()}
                          sx={{ 
                            bgcolor: '#4285f4', 
                            color: 'white',
                            '&:hover': { bgcolor: '#3367d6' },
                            '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)' }
                          }}
                        >
                          <Send size={18} />
                        </IconButton>
                      </Box>
                    </Box>
                  </>
                )}

                {/* Participants Panel */}
                {sidePanel === 'participants' && (
                  <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <List>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar 
                            src={user.avatar} 
                            sx={{ bgcolor: '#4285f4', width: 40, height: 40 }}
                          >
                            {!user.avatar && user.username.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${user.username} (You)`}
                          secondary="Host"
                          sx={{ '& .MuiListItemText-primary': { color: 'white' } }}
                        />
                      </ListItem>
                      {participants.filter(p => p.userId !== user?.id).map((participant) => (
                        <ListItem key={participant.userId}>
                          <ListItemAvatar>
                            <Badge
                              variant="dot"
                              color="success"
                              invisible={!onlineUsers.has(participant.userId)}
                            >
                              <Avatar 
                                src={participant.avatar} 
                                sx={{ width: 40, height: 40 }}
                              >
                                {!participant.avatar && participant.username.charAt(0).toUpperCase()}
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={participant.username}
                            secondary={onlineUsers.has(participant.userId) ? 'Online' : 'Offline'}
                            sx={{ '& .MuiListItemText-primary': { color: 'white' } }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Bottom Control Bar */}
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      >
        <Paper
          elevation={0}
          sx={{
            background: 'rgba(32, 33, 36, 0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            p: 2
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: 1
          }}>
            {/* Main Controls */}
            {[
              { 
                icon: isAudioOn ? <Mic /> : <MicOff />, 
                onClick: toggleAudio,
                active: isAudioOn,
                color: !isAudioOn ? 'error' : 'default',
                tooltip: isAudioOn ? 'Mute' : 'Unmute'
              },
              { 
                icon: isVideoOn ? <Videocam /> : <VideocamOff />, 
                onClick: toggleVideo,
                active: isVideoOn,
                color: !isVideoOn ? 'error' : 'default',
                tooltip: isVideoOn ? 'Turn off camera' : 'Turn on camera'
              },
              { 
                icon: isScreenSharing ? <StopScreenShare /> : <ScreenShare />, 
                onClick: toggleScreenShare,
                active: isScreenSharing,
                color: isScreenSharing ? 'success' : 'default',
                tooltip: isScreenSharing ? 'Stop sharing' : 'Share screen'
              }
            ].map((control, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Tooltip title={control.tooltip}>
                  <IconButton
                    onClick={control.onClick}
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: control.color === 'error' ? '#ea4335' : 
                               control.color === 'success' ? '#34a853' :
                               control.active ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: control.color === 'error' || control.color === 'success' ? 'white' : '#e8eaed',
                      '&:hover': {
                        bgcolor: control.color === 'error' ? '#d33b2c' : 
                                control.color === 'success' ? '#2d7d32' :
                                'rgba(255,255,255,0.15)'
                      }
                    }}
                  >
                    {control.icon}
                  </IconButton>
                </Tooltip>
              </motion.div>
            ))}

            <Divider orientation="vertical" flexItem sx={{ mx: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />

            {/* Secondary Controls */}
            {[
              { 
                icon: <MessageCircle size={20} />, 
                onClick: () => toggleSidePanel('chat'),
                badge: unreadMessages,
                tooltip: 'Chat'
              },
              { 
                icon: <Users size={20} />, 
                onClick: () => toggleSidePanel('participants'),
                badge: participants.length,
                tooltip: 'Participants'
              },
              {
                icon: <CodeIcon size={20} />,
                onClick: () => toggleFloatingPanel('code'),
                tooltip: 'Code Editor'
              },
              {
                icon: <Palette size={20} />,
                onClick: () => toggleFloatingPanel('whiteboard'),
                tooltip: 'Whiteboard'
              }
            ].map((control, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Tooltip title={control.tooltip}>
                  <IconButton
                    onClick={control.onClick}
                    sx={{
                      width: 44,
                      height: 44,
                      color: '#e8eaed',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                    }}
                  >
                    {control.badge ? (
                      <Badge 
                        badgeContent={control.badge} 
                        color="error"
                        sx={{
                          '& .MuiBadge-badge': {
                            background: '#4285f4',
                            fontSize: '0.6rem',
                            minWidth: 16,
                            height: 16
                          }
                        }}
                      >
                        {control.icon}
                      </Badge>
                    ) : (
                      control.icon
                    )}
                  </IconButton>
                </Tooltip>
              </motion.div>
            ))}

            <Divider orientation="vertical" flexItem sx={{ mx: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />

            {/* End Call */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Tooltip title="Leave meeting">
                <IconButton
                  onClick={() => {
                    webrtcService.endCall();
                    navigate('/dashboard');
                  }}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: '#ea4335',
                    color: 'white',
                    '&:hover': { bgcolor: '#d33b2c' }
                  }}
                >
                  <CallEnd />
                </IconButton>
              </Tooltip>
            </motion.div>
          </Box>
        </Paper>
      </motion.div>

      {/* Floating Panels */}
      <AnimatePresence>
        {floatingPanels.terminal && executionResult && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed',
              bottom: 100,
              right: 20,
              width: 400,
              zIndex: 1000
            }}
          >
            <Paper
              elevation={8}
              sx={{
                background: 'rgba(0,0,0,0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ 
                p: 1.5, 
                bgcolor: 'rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="subtitle2" sx={{ color: 'white' }}>
                  Terminal Output
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setFloatingPanels(prev => ({ ...prev, terminal: false }))}
                  sx={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  <Close size={16} />
                </IconButton>
              </Box>
              <Box sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                {executionResult.output?.stdout && (
                  <Typography variant="body2" sx={{ 
                    color: '#4caf50', 
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    mb: 1
                  }}>
                    {executionResult.output.stdout}
                  </Typography>
                )}
                {executionResult.output?.stderr && (
                  <Typography variant="body2" sx={{ 
                    color: '#f44336', 
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {executionResult.output.stderr}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ 
                  color: 'rgba(255,255,255,0.5)',
                  display: 'block',
                  mt: 1
                }}>
                  Exit Code: {executionResult.output?.exitCode || 0} | 
                  Time: {executionResult.output?.executionTime || 0}ms
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Picture-in-Picture Video - Camera feed while screen sharing */}
      {isPiPMode && isScreenSharing && cameraStream && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          drag
          dragElastic={0.1}
          dragConstraints={{
            top: 80,
            left: 20,
            right: window.innerWidth - 220,
            bottom: window.innerHeight - 200
          }}
          style={{
            position: 'fixed',
            top: 100,
            right: 20,
            width: 200,
            height: 150,
            zIndex: 1000
          }}
        >
          <Paper
            elevation={8}
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#000',
              cursor: 'move',
              border: '2px solid #4285f4'
            }}
          >
            <video
              ref={(el) => {
                if (el && cameraStream) {
                  el.srcObject = cameraStream;
                }
              }}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <Box sx={{
              position: 'absolute',
              top: 8,
              right: 8
            }}>
              <IconButton
                size="small"
                onClick={() => setIsPiPMode(false)}
                sx={{ 
                  bgcolor: 'rgba(0,0,0,0.5)', 
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                }}
              >
                <Close size={14} />
              </IconButton>
            </Box>
            <Box sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: 'rgba(0,0,0,0.7)',
              borderRadius: '6px',
              px: 1,
              py: 0.5
            }}>
              <Typography variant="caption" sx={{ color: 'white', fontSize: '0.7rem' }}>
                📹 Camera
              </Typography>
            </Box>
          </Paper>
        </motion.div>
      )}
    </Box>
  );
};

export default RoomPage;