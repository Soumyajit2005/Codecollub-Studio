import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Fab,
  Badge,
  Chip,
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
  Alert
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Stop,
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  ScreenShare,
  StopScreenShare,
  Chat,
  ChatBubble,
  Send,
  Code,
  People,
  Settings,
  Share,
  ContentCopy,
  Fullscreen,
  FullscreenExit,
  Close,
  ExpandMore,
  ExpandLess,
  CallEnd,
  PictureInPicture
} from '@mui/icons-material';
import { 
  ArrowLeft, 
  Play, 
  Square,
  Video,
  VideoOff,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Monitor,
  MessageCircle,
  Users,
  Maximize2,
  Minimize2,
  PhoneOff,
  Layers,
  Terminal,
  Zap,
  Settings as SettingsIcon
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useAuthStore } from '../store/authStore';
import roomService from '../services/room.service';
import socketService from '../services/socket.service';
import webrtcService from '../services/webrtc.service';
import toast from 'react-hot-toast';

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const editorRef = useRef(null);
  const localVideoRef = useRef(null);
  const chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Room State
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Code State
  const [code, setCode] = useState('console.log("Hello, World!");');
  const [language, setLanguage] = useState('javascript');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  
  // UI Layout State
  const [layout, setLayout] = useState('editor'); // 'editor', 'meet', 'split'
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Video State
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [dominantSpeaker, setDominantSpeaker] = useState(null);
  
  // Chat State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const initializeRoom = async () => {
      try {
        setLoading(true);
        
        // Fetch room data
        const roomData = await roomService.getRoom(roomId);
        setRoom(roomData);
        setCode(roomData.code || 'console.log("Hello, World!");');
        setLanguage(roomData.language || 'javascript');
        
        // Initialize socket connection
        const token = localStorage.getItem('token');
        await socketService.connect(token);
        setupSocketListeners();
        
        // Join room
        socketService.joinRoom(roomId);
        
        // Initialize WebRTC
        webrtcService.initialize(socketService.socket, roomId, user.id);
        setupWebRTCCallbacks();
        
      } catch (err) {
        console.error('Failed to initialize room:', err);
        setError('Failed to load room. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (roomId && user) {
      initializeRoom();
    }

    return () => {
      socketService.leaveRoom(roomId);
      webrtcService.endCall();
      socketService.disconnect();
    };
  }, [roomId, user]);

  const setupSocketListeners = () => {
    const socket = socketService.socket;
    
    socket.on('code-update', handleCodeUpdate);
    socket.on('execution-result', handleExecutionResult);
    socket.on('new-message', handleNewMessage);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('room-participants', handleRoomParticipants);
  };

  const setupWebRTCCallbacks = () => {
    webrtcService.setCallbacks({
      onLocalStream: (stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
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
    setIsExecuting(false);
    setTerminalOpen(true);
  }, []);

  const handleNewMessage = useCallback((message) => {
    setMessages(prev => {
      if (prev.some(msg => msg.id === message.id)) {
        return prev;
      }
      const newMessages = [...prev, message];
      
      // Auto-scroll to bottom
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
      // Update unread count if chat is closed
      if (!chatOpen && message.username !== user.username) {
        setUnreadMessages(prev => prev + 1);
      }
      
      return newMessages;
    });
  }, [chatOpen, user.username]);

  const handleUserJoined = useCallback((userData) => {
    setParticipants(prev => [...prev.filter(p => p.userId !== userData.userId), userData]);
    setOnlineUsers(prev => new Set([...prev, userData.userId]));
    toast.success(`${userData.username} joined the room`);
  }, []);

  const handleUserLeft = useCallback((userData) => {
    setParticipants(prev => prev.filter(p => p.userId !== userData.userId));
    setOnlineUsers(prev => {
      const newUsers = new Set(prev);
      newUsers.delete(userData.userId);
      return newUsers;
    });
    toast.info(`${userData.username} left the room`);
  }, []);

  const handleRoomParticipants = useCallback((participantsData) => {
    setParticipants(participantsData);
    setOnlineUsers(new Set(participantsData.map(p => p.userId)));
  }, []);

  const handleCodeChange = (value) => {
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

  const executeCodeWithJudge0 = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    setTerminalOpen(true);

    try {
      console.log('Starting code execution for language:', language);
      console.log('Code to execute:', code);
      
      // Use Piston API (free alternative to Judge0)
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
        files: [
          {
            name: 'main',
            content: code
          }
        ],
        stdin: "",
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1
      };

      console.log('Request data:', requestData);

      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      const executionResult = {
        output: {
          stdout: result.run?.stdout || '',
          stderr: result.run?.stderr || result.compile?.stderr || '',
          exitCode: result.run?.code || 0,
          executionTime: Math.round((result.run?.runtime || 0) * 1000)
        }
      };

      console.log('Processed execution result:', executionResult);
      setExecutionResult(executionResult);
      
      // Show success message
      toast.success('Code executed successfully!');
      
      // Broadcast result to other participants
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
      setIsExecuting(false);
    }
  };

  const toggleVideo = async () => {
    try {
      if (!isVideoOn) {
        await webrtcService.startVideoCall();
        setIsVideoOn(true);
        if (layout === 'editor') {
          setLayout('split');
        }
      } else {
        webrtcService.endCall();
        setIsVideoOn(false);
      }
    } catch (error) {
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
    } catch (error) {
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

  const toggleChatOpen = () => {
    setChatOpen(!chatOpen);
    if (!chatOpen) {
      setUnreadMessages(0);
    }
  };

  const switchLayout = (newLayout) => {
    setLayout(newLayout);
    if (newLayout === 'meet') {
      setChatOpen(false);
    }
  };

  if (loading) {
    return (
      <Box 
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          position: 'relative'
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
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
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
              Loading room...
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
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
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
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
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                }}
              >
                Back to Dashboard
              </Button>
            </motion.div>
          </Paper>
        </motion.div>
      </Box>
    );
  }

  // Modern Video Meet Layout
  const VideoMeetLayout = () => (
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f1419 0%, #1a202c 100%)',
        position: 'relative'
      }}
    >
      {/* Background Effects */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          right: '-10%',
          width: '40%',
          height: '40%',
          background: 'radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      
      {/* Modern Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Paper
          elevation={0}
          sx={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 0,
            position: 'relative',
            zIndex: 10
          }}
        >
          <Toolbar sx={{ minHeight: 64, px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <IconButton 
                  onClick={() => switchLayout('editor')}
                  sx={{ 
                    mr: 2,
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  <Code />
                </IconButton>
              </motion.div>
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
                {room?.name}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              {[
                { 
                  icon: <MessageCircle size={20} />, 
                  badge: unreadMessages, 
                  onClick: toggleChatOpen,
                  color: 'error'
                },
                { 
                  icon: <Users size={20} />, 
                  badge: participants.length, 
                  onClick: () => setParticipantsOpen(!participantsOpen),
                  color: 'primary'
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <IconButton 
                    onClick={item.onClick}
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  >
                    <Badge 
                      badgeContent={item.badge} 
                      color={item.color}
                      sx={{
                        '& .MuiBadge-badge': {
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }
                      }}
                    >
                      {item.icon}
                    </Badge>
                  </IconButton>
                </motion.div>
              ))}
            </Box>
          </Toolbar>
        </Paper>
      </motion.div>

      {/* Modern Video Grid */}
      <Box sx={{ flexGrow: 1, p: 3, display: 'flex', flexWrap: 'wrap', gap: 3, overflow: 'auto', position: 'relative', zIndex: 5 }}>
        {/* Local Video */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          whileHover={{ y: -5 }}
          style={{ 
            width: remoteStreams.size > 0 ? '320px' : '100%', 
            height: remoteStreams.size > 0 ? '240px' : '70%',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              height: '100%',
              position: 'relative',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '20px',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              '&:hover': {
                border: '2px solid rgba(102, 126, 234, 0.6)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
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
              bottom: 16, 
              left: 16, 
              background: 'rgba(102, 126, 234, 0.9)',
              backdropFilter: 'blur(10px)', 
              px: 2, 
              py: 1, 
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, fontSize: '0.8rem' }}>
                {user.username} (You)
              </Typography>
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
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                style={{ 
                  width: '320px', 
                  height: '240px'
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    }
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
                    bottom: 16, 
                    left: 16, 
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)', 
                    px: 2, 
                    py: 1, 
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, fontSize: '0.8rem' }}>
                      {participant?.username || `User ${userId.slice(-4)}`}
                    </Typography>
                  </Box>
                </Paper>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </Box>

      {/* Modern Meet Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Paper
          elevation={0}
          sx={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 0,
            position: 'relative',
            zIndex: 10
          }}
        >
          <Box sx={{ 
            p: 3, 
            display: 'flex', 
            justifyContent: 'center'
          }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {[
                { 
                  icon: isAudioOn ? <MicIcon size={24} /> : <MicOffIcon size={24} />, 
                  onClick: toggleAudio,
                  active: isAudioOn,
                  error: !isAudioOn,
                  tooltip: isAudioOn ? 'Mute' : 'Unmute'
                },
                { 
                  icon: isVideoOn ? <Video size={24} /> : <VideoOff size={24} />, 
                  onClick: toggleVideo,
                  active: isVideoOn,
                  error: !isVideoOn,
                  tooltip: isVideoOn ? 'Turn off camera' : 'Turn on camera'
                },
                { 
                  icon: isScreenSharing ? <Monitor size={24} /> : <Monitor size={24} />, 
                  onClick: toggleScreenShare,
                  active: isScreenSharing,
                  tooltip: isScreenSharing ? 'Stop sharing' : 'Share screen'
                },
                { 
                  icon: <PhoneOff size={24} />, 
                  onClick: () => {
                    webrtcService.endCall();
                    setIsVideoOn(false);
                    setIsAudioOn(false);
                    switchLayout('editor');
                  },
                  error: true,
                  tooltip: 'End call'
                }
              ].map((control, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Tooltip title={control.tooltip} placement="top">
                    <IconButton 
                      size="large" 
                      onClick={control.onClick}
                      sx={{ 
                        width: 56,
                        height: 56,
                        background: control.error ? 
                          'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
                          control.active ? 
                            'rgba(255, 255, 255, 0.15)' : 
                            'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${control.error ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                        color: 'white',
                        transition: 'all 0.3s ease',
                        '&:hover': { 
                          background: control.error ? 
                            'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 
                            'rgba(255, 255, 255, 0.25)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        }
                      }}
                    >
                      {control.icon}
                    </IconButton>
                  </Tooltip>
                </motion.div>
              ))}
            </Box>
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );

  // Modern Code Editor Layout
  const CodeEditorLayout = () => (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#0a0a0a' }}>
      {/* Modern Editor Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Paper
          elevation={0}
          sx={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 0,
            position: 'relative',
            zIndex: 10
          }}
        >
          <Toolbar variant="dense" sx={{ minHeight: 60, px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  startIcon={<ArrowLeft size={16} />}
                  onClick={() => navigate('/dashboard')}
                  size="small"
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)',
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    px: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  Dashboard
                </Button>
              </motion.div>
              
              <Typography variant="h6" sx={{ color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>
                {room?.name}
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small">
                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  sx={{ 
                    height: 36,
                    minWidth: 120,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                    '& .MuiSelect-icon': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                  }}
                >
                  <MenuItem value="javascript">JavaScript</MenuItem>
                  <MenuItem value="python">Python</MenuItem>
                  <MenuItem value="cpp">C++</MenuItem>
                  <MenuItem value="java">Java</MenuItem>
                  <MenuItem value="go">Go</MenuItem>
                  <MenuItem value="rust">Rust</MenuItem>
                </Select>
              </FormControl>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="contained"
                  startIcon={isExecuting ? <CircularProgress size={16} color="inherit" /> : <Play size={16} />}
                  onClick={executeCodeWithJudge0}
                  disabled={isExecuting}
                  size="small"
                  sx={{ 
                    height: 36,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '8px',
                    px: 3,
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                    }
                  }}
                >
                  {isExecuting ? 'Running...' : 'Run'}
                </Button>
              </motion.div>

              <Box sx={{ display: 'flex', gap: 1 }}>
                {[
                  { 
                    icon: isVideoOn ? <Video size={18} /> : <VideoOff size={18} />, 
                    onClick: toggleVideo, 
                    active: isVideoOn,
                    tooltip: 'Toggle video'
                  },
                  { 
                    icon: <Layers size={18} />, 
                    onClick: () => switchLayout('meet'),
                    tooltip: 'Switch to meet view'
                  },
                  { 
                    icon: <MessageCircle size={18} />, 
                    onClick: toggleChatOpen, 
                    badge: unreadMessages,
                    tooltip: 'Toggle chat'
                  },
                  { 
                    icon: <Users size={18} />, 
                    onClick: () => setParticipantsOpen(!participantsOpen), 
                    badge: participants.length,
                    tooltip: 'View participants'
                  }
                ].map((control, index) => (
                  <motion.div key={index} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Tooltip title={control.tooltip} placement="bottom">
                      <IconButton 
                        size="small" 
                        onClick={control.onClick}
                        sx={{
                          color: control.active ? '#667eea' : 'rgba(255, 255, 255, 0.7)',
                          bgcolor: control.active ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                          }
                        }}
                      >
                        {control.badge ? (
                          <Badge 
                            badgeContent={control.badge} 
                            color="error"
                            sx={{
                              '& .MuiBadge-badge': {
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                fontSize: '0.6rem',
                                minWidth: 16,
                                height: 16,
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
              </Box>
            </Box>
          </Toolbar>
        </Paper>
      </motion.div>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Code Editor */}
        <Box sx={{ 
          flexGrow: chatOpen ? 0.7 : 1, 
          display: 'flex', 
          flexDirection: 'column',
          borderRight: chatOpen ? '1px solid #e5e7eb' : 'none'
        }}>
          <Box sx={{ flexGrow: terminalOpen ? 0.6 : 1 }}>
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={handleCodeChange}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              theme="vs-dark"
              options={{
                minimap: { enabled: window.innerWidth > 1200 },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 14,
                fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                selectOnLineNumbers: true,
                matchBrackets: 'always',
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true
              }}
            />
          </Box>

          {/* Terminal Output */}
          {terminalOpen && (
            <Paper sx={{ 
              height: '40%',
              bgcolor: '#1e1e1e', 
              color: '#fff', 
              overflow: 'auto',
              borderRadius: 0,
              borderTop: '1px solid #374151'
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                p: 1,
                borderBottom: '1px solid #374151',
                bgcolor: '#2d3748'
              }}>
                <Typography variant="subtitle2" color="white">
                  Terminal Output
                </Typography>
                <IconButton size="small" onClick={() => setTerminalOpen(false)}>
                  <Close sx={{ color: 'white', fontSize: 16 }} />
                </IconButton>
              </Box>
              <Box sx={{ p: 2 }}>
                {isExecuting ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: '#10b981' }}>
                    <CircularProgress size={16} sx={{ mr: 1, color: '#10b981' }} />
                    <Typography variant="body2">Executing code...</Typography>
                  </Box>
                ) : executionResult ? (
                  <Box>
                    {/* Always show execution info first */}
                    <Box sx={{ 
                      mb: 2,
                      p: 1.5,
                      bgcolor: '#2d3748',
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>Exit Code: {executionResult.output?.exitCode ?? 'N/A'}</span>
                      <span>Time: {executionResult.output?.executionTime ?? 0}ms</span>
                    </Box>

                    {/* Show stdout if available */}
                    {executionResult.output?.stdout ? (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ 
                          color: '#10b981', 
                          display: 'block', 
                          mb: 0.5,
                          fontWeight: 600 
                        }}>
                          ✓ OUTPUT
                        </Typography>
                        <Box sx={{ 
                          p: 2,
                          bgcolor: '#0f172a',
                          borderRadius: 1,
                          border: '1px solid #10b981'
                        }}>
                          <pre style={{ 
                            margin: 0, 
                            whiteSpace: 'pre-wrap',
                            color: '#e4e4e4',
                            fontFamily: "'Fira Code', 'Consolas', monospace",
                            fontSize: '13px',
                            lineHeight: '1.5'
                          }}>
                            {executionResult.output.stdout}
                          </pre>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ 
                          color: '#9ca3af', 
                          display: 'block', 
                          mb: 0.5,
                          fontStyle: 'italic'
                        }}>
                          No output produced
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Show stderr if available */}
                    {executionResult.output?.stderr && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ 
                          color: '#ef4444', 
                          display: 'block', 
                          mb: 0.5,
                          fontWeight: 600
                        }}>
                          ✗ ERROR
                        </Typography>
                        <Box sx={{ 
                          p: 2,
                          bgcolor: '#1e1b1b',
                          borderRadius: 1,
                          border: '1px solid #ef4444'
                        }}>
                          <pre style={{ 
                            margin: 0, 
                            whiteSpace: 'pre-wrap',
                            color: '#ff6b6b',
                            fontFamily: "'Fira Code', 'Consolas', monospace",
                            fontSize: '13px',
                            lineHeight: '1.5'
                          }}>
                            {executionResult.output.stderr}
                          </pre>
                        </Box>
                      </Box>
                    )}

                    {/* Debug info */}
                    <Box sx={{ 
                      mt: 2,
                      p: 1,
                      bgcolor: '#374151',
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      color: '#9ca3af'
                    }}>
                      <details>
                        <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Debug Info</summary>
                        <pre style={{ 
                          margin: 0, 
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.65rem'
                        }}>
                          {JSON.stringify(executionResult, null, 2)}
                        </pre>
                      </details>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100px',
                    color: '#9ca3af'
                  }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                      No output yet
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Click "Run" to execute your code
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </Box>

        {/* WhatsApp Style Chat Panel */}
        {chatOpen && (
          <Box sx={{ 
            width: '30%', 
            minWidth: 320,
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: '#f0f2f5'
          }}>
            {/* Chat Header */}
            <Box sx={{ 
              p: 2, 
              bgcolor: '#00a884',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Box>
                <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                  Room Chat
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {participants.length} participants
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setChatOpen(false)} sx={{ color: 'white' }}>
                <Close />
              </IconButton>
            </Box>
            
            {/* Messages Area */}
            <Box sx={{ 
              flexGrow: 1, 
              overflow: 'auto', 
              p: 1,
              bgcolor: '#efeae2',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h100v100H0z" fill="%23efeae2"/%3E%3C/svg%3E")',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#bbb',
                borderRadius: '3px',
              }
            }}>
              {messages.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  flexDirection: 'column',
                  color: '#667781'
                }}>
                  <ChatBubble sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    No messages yet.<br />Start the conversation!
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {messages.map((message, index) => (
                    <Box 
                      key={message.id || index} 
                      sx={{ 
                        display: 'flex',
                        justifyContent: message.username === user.username ? 'flex-end' : 'flex-start',
                        mb: 0.5
                      }}
                    >
                      <Box sx={{ 
                        maxWidth: '75%',
                        bgcolor: message.username === user.username ? '#d9fdd3' : 'white',
                        borderRadius: '8px',
                        p: 1.5,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        position: 'relative',
                        wordBreak: 'break-word'
                      }}>
                        {message.username !== user.username && (
                          <Typography variant="caption" sx={{ 
                            color: '#00a884',
                            fontWeight: 600,
                            display: 'block',
                            mb: 0.5
                          }}>
                            {message.username}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          {message.message}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: '#667781',
                          fontSize: '0.65rem',
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
            
            {/* Message Input */}
            <Box sx={{ 
              p: 1.5, 
              bgcolor: '#f0f2f5',
              borderTop: '1px solid #e4e6ea'
            }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
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
                      borderRadius: '20px',
                      bgcolor: 'white',
                      '& fieldset': {
                        borderColor: 'transparent',
                      },
                      '&:hover fieldset': {
                        borderColor: 'transparent',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#00a884',
                      },
                    },
                  }}
                />
                <IconButton 
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  sx={{ 
                    bgcolor: '#00a884', 
                    color: 'white',
                    '&:hover': { bgcolor: '#008f72' },
                    '&:disabled': { bgcolor: '#ccc' }
                  }}
                >
                  <Send />
                </IconButton>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );

  // Split Layout (Editor + Video)
  const SplitLayout = () => (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      {/* Left: Code Editor */}
      <Box sx={{ width: '70%', display: 'flex', flexDirection: 'column' }}>
        {CodeEditorLayout()}
      </Box>
      
      {/* Right: Video Chat */}
      <Box sx={{ width: '30%', bgcolor: '#0f1419' }}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1 }}>
          {/* Local Video */}
          <Card sx={{ mb: 1, bgcolor: '#000', height: '200px' }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Card>
          
          {/* Remote Videos */}
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <Card key={userId} sx={{ mb: 1, bgcolor: '#000', height: '200px' }}>
              <video
                autoPlay
                playsInline
                ref={(el) => {
                  if (el && stream) el.srcObject = stream;
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Card>
          ))}
          
          {/* Video Controls */}
          <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center', gap: 1, p: 1 }}>
            <IconButton onClick={toggleAudio} sx={{ color: isAudioOn ? 'white' : 'error.main' }}>
              {isAudioOn ? <Mic /> : <MicOff />}
            </IconButton>
            <IconButton onClick={toggleVideo} sx={{ color: isVideoOn ? 'white' : 'error.main' }}>
              {isVideoOn ? <Videocam /> : <VideocamOff />}
            </IconButton>
            <IconButton onClick={() => switchLayout('meet')} sx={{ color: 'white' }}>
              <Fullscreen />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  // Render based on layout
  if (layout === 'meet') {
    return VideoMeetLayout();
  } else if (layout === 'split') {
    return SplitLayout();
  } else {
    return CodeEditorLayout();
  }
};

export default RoomPage;