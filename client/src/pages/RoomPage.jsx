import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  TextField,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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
  Group,
  Code,
  Brush,
  Settings,
  Share,
  ContentCopy
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
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
  const editorRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef(new Map());

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // Video/Audio State
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  
  // Chat State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const initializeRoom = async () => {
      try {
        setLoading(true);
        
        // Fetch room data
        const roomData = await roomService.getRoom(roomId);
        setRoom(roomData);
        setCode(roomData.code || '');
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
      // Cleanup
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
  }, []);

  const handleNewMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
  }, []);

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

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    handleCodeChange(code);
  };

  const executeCode = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    
    if (socketService.socket) {
      socketService.socket.emit('execute-code', {
        roomId,
        code,
        language,
        input: ''
      });
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
      socketService.socket.emit('chat-message', {
        roomId,
        message: newMessage,
        type: 'text'
      });
      setNewMessage('');
    }
  };

  const copyRoomCode = () => {
    if (room?.roomCode) {
      navigator.clipboard.writeText(room.roomCode);
      toast.success('Room code copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading room...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Toolbar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            Dashboard
          </Button>
          
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {room?.name} {!room?.isPublic && (
              <Chip label="Private" size="small" sx={{ ml: 1 }} />
            )}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}>
              <IconButton onClick={toggleVideo}>
                {isVideoOn ? <Videocam /> : <VideocamOff />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title={isAudioOn ? 'Mute' : 'Unmute'}>
              <IconButton onClick={toggleAudio}>
                {isAudioOn ? <Mic /> : <MicOff />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
              <IconButton onClick={toggleScreenShare}>
                {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Participants">
              <IconButton onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Badge badgeContent={participants.length} color="primary">
                  <Group />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Chat">
              <IconButton onClick={() => setChatOpen(!chatOpen)}>
                <Badge badgeContent={messages.length} color="error">
                  <Chat />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Share room">
              <IconButton onClick={() => setShareDialogOpen(true)}>
                <Share />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex' }}>
        <PanelGroup direction="horizontal">
          {/* Sidebar */}
          {sidebarOpen && (
            <>
              <Panel defaultSize={20} minSize={15}>
                <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Tabs value={0} variant="fullWidth">
                    <Tab label="Participants" />
                  </Tabs>
                  
                  <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                    {participants.map((participant) => (
                      <ListItem key={participant.userId}>
                        <ListItemAvatar>
                          <Avatar src={participant.avatar}>
                            {participant.username?.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={participant.username}
                          secondary={onlineUsers.has(participant.userId) ? 'Online' : 'Offline'}
                        />
                        {onlineUsers.has(participant.userId) && (
                          <Box 
                            sx={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: '50%', 
                              bgcolor: 'success.main' 
                            }} 
                          />
                        )}
                      </ListItem>
                    ))}
                  </List>

                  {/* Video Streams */}
                  <Box sx={{ p: 1 }}>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{ 
                        width: '100%', 
                        height: '120px', 
                        objectFit: 'cover',
                        borderRadius: '8px',
                        backgroundColor: '#f0f0f0'
                      }}
                    />
                    {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
                      <video
                        key={userId}
                        autoPlay
                        playsInline
                        ref={(el) => {
                          if (el) el.srcObject = stream;
                        }}
                        style={{ 
                          width: '100%', 
                          height: '120px', 
                          objectFit: 'cover',
                          borderRadius: '8px',
                          backgroundColor: '#f0f0f0',
                          marginTop: '8px'
                        }}
                      />
                    ))}
                  </Box>
                </Paper>
              </Panel>
              <PanelResizeHandle />
            </>
          )}

          {/* Editor Area */}
          <Panel defaultSize={sidebarOpen ? 60 : 80}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box>
                  <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                    <Tab label="Code" icon={<Code />} />
                    <Tab label="Whiteboard" icon={<Brush />} />
                  </Tabs>
                </Box>
                
                {activeTab === 0 && (
                  <>
                    <select
                      value={language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="go">Go</option>
                      <option value="rust">Rust</option>
                    </select>
                    
                    <Button
                      variant="contained"
                      startIcon={isExecuting ? <CircularProgress size={16} /> : <PlayArrow />}
                      onClick={executeCode}
                      disabled={isExecuting}
                      size="small"
                    >
                      {isExecuting ? 'Running...' : 'Run'}
                    </Button>
                  </>
                )}
              </Box>

              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {activeTab === 0 ? (
                  <PanelGroup direction="vertical">
                    <Panel defaultSize={70}>
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
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                          fontSize: 14
                        }}
                      />
                    </Panel>
                    
                    {executionResult && (
                      <>
                        <PanelResizeHandle />
                        <Panel defaultSize={30}>
                          <Paper sx={{ height: '100%', p: 2, bgcolor: '#1e1e1e', color: '#fff', overflow: 'auto' }}>
                            <Typography variant="h6" gutterBottom>
                              Output:
                            </Typography>
                            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                              {executionResult.stdout}
                              {executionResult.stderr && (
                                <span style={{ color: '#ff6b6b' }}>{executionResult.stderr}</span>
                              )}
                            </pre>
                          </Paper>
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                ) : (
                  <CollaborativeWhiteboard
                    socket={socketService.socket}
                    roomId={roomId}
                    userId={user.id}
                    isEnabled={true}
                  />
                )}
              </Box>
            </Paper>
          </Panel>

          {/* Chat Panel */}
          {chatOpen && (
            <>
              <PanelResizeHandle />
              <Panel defaultSize={20} minSize={15}>
                <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    Chat
                  </Typography>
                  
                  <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
                    {messages.map((message, index) => (
                      <Box key={index} sx={{ mb: 1, p: 1, borderRadius: 1, bgcolor: 'grey.100' }}>
                        <Typography variant="caption" color="primary">
                          {message.username}
                        </Typography>
                        <Typography variant="body2">
                          {message.message}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  
                  <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <Button onClick={sendMessage}>Send</Button>
                  </Box>
                </Paper>
              </Panel>
            </>
          )}
        </PanelGroup>
      </Box>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>Share Room</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Share this room code with others:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <TextField
              fullWidth
              value={room?.roomCode || ''}
              InputProps={{ readOnly: true }}
            />
            <IconButton onClick={copyRoomCode}>
              <ContentCopy />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Room URL: {window.location.href}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoomPage;